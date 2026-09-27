import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { checkPasswordRules } from "@/lib/auth/password";
import { getExtendedCommonPasswordList } from "@/lib/auth/password-common-server";
import { checkEmailServerSide } from "@/lib/auth/email-server";
import { getClientIp, isBodyTooLarge } from "@/lib/auth/rate-limit";
import { rateHit, getEmailAccountStatus } from "@/lib/auth/rate-limit-db";

// Account creation ONLY. Business info (company, description, country,
// city, phone, plan) is collected in signup steps 2-3 and only turns
// into a real tenant row once the user has an authenticated session --
// see /api/auth/complete-google-signup, which both the Google OAuth path
// AND this email/password path now share for that step (a user who just
// confirmed their email is, at that point, authenticated exactly the
// same way a Google sign-in user is -- there's nothing Google-specific
// left to do).
//
// Security-audit history on THIS route: the previous version called
// admin.auth.admin.createUser({ email_confirm: true }), which bypasses
// Supabase's email confirmation entirely regardless of the project's
// "Confirm email" setting -- a deliberate workaround at the time for
// Supabase's free-tier email rate limit (2/hour), which is no longer
// needed now that Custom SMTP (Resend) is configured. This version calls
// the real supabase.auth.signUp() through a Route-Handler client (so any
// session Supabase does create is written back as real cookies on this
// response), which correctly respects whatever "Confirm email" is set to
// -- detected from whether a session comes back, never hardcoded either
// way (see needsEmailConfirmation in the response).
const SIGNUP_IP_LIMIT = 5;
const SIGNUP_IP_WINDOW_S = 60 * 60;
const SIGNUP_EMAIL_LIMIT = 3;
const SIGNUP_EMAIL_WINDOW_S = 60 * 60;
const MAX_BODY_BYTES = 5_000;
const MAX_NAME_LEN = 80;
const MIN_NAME_LEN = 2;

export async function POST(req: Request) {
  try {
    if (isBodyTooLarge(req, MAX_BODY_BYTES)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipHit = await rateHit(`signup:ip:${ip}`, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_S);
    if (!ipHit.allowed) {
      console.warn(`[signup] IP rate limit hit: ${ip}`);
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const { fullName, email: rawEmail, password } = body as Record<string, unknown>;

    if (typeof fullName !== "string" || typeof rawEmail !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const trimmedName = fullName.trim();
    if (trimmedName.length < MIN_NAME_LEN || trimmedName.length > MAX_NAME_LEN) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const emailCheck = await checkEmailServerSide(rawEmail);
    if (!emailCheck.ok) {
      console.warn(`[signup] blocked email, reason=${emailCheck.reason}`);
      const errorMap: Record<string, string> = {
        invalid_syntax: "invalid_email",
        disposable_domain: "disposable_email",
        no_mx_record: "invalid_email_domain",
      };
      return NextResponse.json({ error: errorMap[emailCheck.reason] ?? "invalid_email" }, { status: 400 });
    }
    const email = emailCheck.email;

    const emailHit = await rateHit(`signup:email:${email}`, SIGNUP_EMAIL_LIMIT, SIGNUP_EMAIL_WINDOW_S);
    if (!emailHit.allowed) {
      console.warn(`[signup] email rate limit hit: ${email}`);
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    // Oussama's explicit call (auth-system follow-up round, FIX 2): signup
    // no longer masks whether an email already has an account -- it tells
    // the visitor directly and points them at sign-in, same treatment
    // forgot-password now gets. Deliberate reversal of the previous
    // round's strict no-enumeration posture, not a regression. Falls back
    // to the old generic-success masking below when the DB status lookup
    // is unavailable (migration not run yet) -- see the isDuplicate branch.
    const status = await getEmailAccountStatus(email);

    if (status === "password" || status === "google_only") {
      return NextResponse.json(
        { error: "email_exists", provider: status === "google_only" ? "google" : "password" },
        { status: 409 }
      );
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co").replace(/\/$/, "");
    const supabase = createSupabaseRouteHandlerClient();

    if (status === "unconfirmed") {
      // Already has an unconfirmed account -- resend the signup code
      // instead of erroring, since that's genuinely what they need next.
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${appUrl}/auth/confirm` },
      });
      if (resendErr) console.warn("[signup] resend for unconfirmed account failed (masked to client):", resendErr.message);
      return NextResponse.json({ success: true, needsCode: true });
    }

    const passwordCheck = checkPasswordRules(password, {
      email,
      fullName: trimmedName,
      commonList: getExtendedCommonPasswordList(),
    });
    if (!passwordCheck.valid) {
      console.warn(`[signup] weak password, reason=${passwordCheck.firstError}`);
      return NextResponse.json({ error: "weak_password", reason: passwordCheck.firstError }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/confirm`,
        data: { full_name: trimmedName },
      },
    });

    if (error) {
      // Only reachable when the DB status lookup above was unavailable
      // (status === null) -- Supabase itself signals "already registered"
      // as a 422 here when Confirm Email is off. Falls back to the old
      // generic-success masking since we can't tell the visitor WHICH
      // account state this is without the lookup.
      // Confirm Email on: re-signing up the same email within Supabase's
      // own internal resend cooldown throws a 429 "you can only request
      // this after N seconds" -- found live while verifying this route.
      // Always means "a signup/code was already just triggered for this
      // email," so needsCode:true is the correct response in every case
      // this fires, not just the literal duplicate-account case.
      const isDuplicate =
        (error.status === 422 && /already registered/i.test(error.message)) ||
        (error.status === 429 && /security purposes/i.test(error.message));
      if (isDuplicate) {
        console.warn(`[signup] duplicate/cooldown detected via signUp() fallback path (DB status lookup unavailable): ${error.status}`);
        return NextResponse.json({ success: true, needsCode: true });
      }
      // Never return the raw Supabase error message to the client.
      console.error("[signup] signUp error:", error.status, error.message);
      return NextResponse.json({ error: "create_failed" }, { status: 400 });
    }

    // Same fallback-only duplicate signal as above, for when Confirm Email
    // is on: an unconfirmed duplicate comes back as success with an empty
    // identities array instead of an error.
    const alreadyRegistered = !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if (alreadyRegistered) {
      console.warn(`[signup] duplicate detected via signUp() fallback path (DB status lookup unavailable)`);
      return NextResponse.json({ success: true, needsCode: true });
    }

    const sessionCreated = !!data.session;
    return NextResponse.json({ success: true, needsCode: !sessionCreated });
  } catch (err) {
    console.error("[signup] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
