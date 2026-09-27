import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { checkPasswordRules } from "@/lib/auth/password";
import { getExtendedCommonPasswordList } from "@/lib/auth/password-common-server";
import { checkEmailServerSide } from "@/lib/auth/email-server";
import { isRateLimited, getClientIp, isBodyTooLarge } from "@/lib/auth/rate-limit";

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
const SIGNUP_IP_WINDOW_MS = 60 * 60_000;
const SIGNUP_EMAIL_LIMIT = 3;
const SIGNUP_EMAIL_WINDOW_MS = 60 * 60_000;
const MAX_BODY_BYTES = 5_000;
const MAX_NAME_LEN = 80;
const MIN_NAME_LEN = 2;

export async function POST(req: Request) {
  try {
    if (isBodyTooLarge(req, MAX_BODY_BYTES)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const ip = getClientIp(req);
    if (isRateLimited(`signup:ip:${ip}`, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_MS)) {
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

    if (isRateLimited(`signup:email:${email}`, SIGNUP_EMAIL_LIMIT, SIGNUP_EMAIL_WINDOW_MS)) {
      console.warn(`[signup] email rate limit hit: ${email}`);
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
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

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co").replace(/\/$/, "");

    const supabase = createSupabaseRouteHandlerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: { full_name: trimmedName },
      },
    });

    if (error) {
      // Supabase signals "this email is already registered" two different
      // ways depending on the project's "Confirm email" setting: when it's
      // ON, an unconfirmed duplicate comes back as success with an empty
      // identities array (handled below); when it's OFF, an already-
      // confirmed duplicate comes back as a genuine 422 "User already
      // registered" error instead. Both must produce the exact same
      // response as a real new signup -- otherwise the error/success split
      // itself becomes the enumeration oracle, regardless of message text.
      const isDuplicate = error.status === 422 && /already registered/i.test(error.message);
      if (isDuplicate) {
        console.warn(`[signup] signup attempt for already-registered email (no enumeration signal sent to client)`);
        return NextResponse.json({ success: true, needsEmailConfirmation: true });
      }
      // Never return the raw Supabase error message to the client.
      console.error("[signup] signUp error:", error.status, error.message);
      return NextResponse.json({ error: "create_failed" }, { status: 400 });
    }

    // Supabase's own anti-enumeration signal for "this email is already
    // registered": a user object comes back with an EMPTY identities
    // array and no error, rather than an explicit "already exists" error.
    // Returning the exact same response shape either way is what makes
    // this route non-enumerable (FIX 3).
    const alreadyRegistered = !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if (alreadyRegistered) {
      console.warn(`[signup] signup attempt for already-registered email (no enumeration signal sent to client)`);
      return NextResponse.json({ success: true, needsEmailConfirmation: true });
    }

    const sessionCreated = !!data.session;
    return NextResponse.json({ success: true, needsEmailConfirmation: !sessionCreated });
  } catch (err) {
    console.error("[signup] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
