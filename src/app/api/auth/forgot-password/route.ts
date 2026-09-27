import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { checkEmailServerSide } from "@/lib/auth/email-server";
import { getClientIp, isBodyTooLarge } from "@/lib/auth/rate-limit";
import { rateHit, getEmailAccountStatus } from "@/lib/auth/rate-limit-db";

// Oussama's explicit call (auth-system follow-up round, FIX 2): forgot-
// password no longer stays silent about whether an email has an account --
// it tells the visitor directly: no account, Google-only, unconfirmed, or
// a real reset in progress. This is a deliberate reversal of the previous
// round's strict no-enumeration posture for this route specifically, not a
// regression. Falls back to the OLD fully-generic behavior (status:
// "generic", always attempt the send) when the DB status lookup is
// unavailable -- see getEmailAccountStatus's own fail-safe comment.
const FORGOT_EMAIL_LIMIT = 3;
const FORGOT_EMAIL_WINDOW_S = 60 * 60;
const FORGOT_IP_LIMIT = 5;
const FORGOT_IP_WINDOW_S = 60 * 60;
const RESEND_COOLDOWN_S = 55;

export type ForgotPasswordStatus = "none" | "google_only" | "unconfirmed" | "password" | "generic";

export async function POST(req: Request) {
  try {
    if (isBodyTooLarge(req, 2_000)) {
      return NextResponse.json({ status: "generic" satisfies ForgotPasswordStatus });
    }

    const ip = getClientIp(req);
    const ipHit = await rateHit(`forgot:ip:${ip}`, FORGOT_IP_LIMIT, FORGOT_IP_WINDOW_S);
    if (!ipHit.allowed) {
      console.warn(`[forgot-password] IP rate limit hit: ${ip}`);
      // Stays generic even on a rate-limit trip -- a 429 here would itself
      // leak "someone is hammering this specific email." No email is
      // actually sent once the limiter trips; the client just sees the
      // same neutral state as a real send.
      return NextResponse.json({ status: "generic" satisfies ForgotPasswordStatus });
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = (body as Record<string, unknown>).email;
    if (typeof rawEmail !== "string") {
      return NextResponse.json({ status: "generic" satisfies ForgotPasswordStatus });
    }

    const emailCheck = await checkEmailServerSide(rawEmail);
    if (!emailCheck.ok) {
      // Syntactically invalid, disposable, or no-MX -- none of these can
      // ever have a real Vela account (signup itself blocks them), so
      // "none" is factually accurate here, not just a fallback.
      return NextResponse.json({ status: "none" satisfies ForgotPasswordStatus });
    }
    const email = emailCheck.email;

    const cooldownHit = await rateHit(`forgot:cooldown:${email}`, 1, RESEND_COOLDOWN_S);
    const emailHit = await rateHit(`forgot:email:${email}`, FORGOT_EMAIL_LIMIT, FORGOT_EMAIL_WINDOW_S);
    if (!cooldownHit.allowed || !emailHit.allowed) {
      console.warn(`[forgot-password] rate limited: email=${email} cooldown=${!cooldownHit.allowed} hourly=${!emailHit.allowed}`);
      // Same neutral response as a real send -- see the IP branch's comment.
      return NextResponse.json({ status: "generic" satisfies ForgotPasswordStatus });
    }

    const status = await getEmailAccountStatus(email);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co").replace(/\/$/, "");
    const supabase = createSupabaseRouteHandlerClient();

    if (status === "none") {
      return NextResponse.json({ status: "none" satisfies ForgotPasswordStatus });
    }
    if (status === "google_only") {
      return NextResponse.json({ status: "google_only" satisfies ForgotPasswordStatus });
    }
    if (status === "unconfirmed") {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${appUrl}/auth/confirm` },
      });
      if (error) console.warn("[forgot-password] resend for unconfirmed account failed:", error.message);
      return NextResponse.json({ status: "unconfirmed" satisfies ForgotPasswordStatus });
    }

    // status === "password", or null (DB lookup unavailable) -- either way
    // a real reset code/link is the correct thing to send.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/confirm`,
    });
    if (error) {
      console.warn("[forgot-password] resetPasswordForEmail error (masked to client):", error.message);
    }
    return NextResponse.json({ status: (status === "password" ? "password" : "generic") satisfies ForgotPasswordStatus });
  } catch (err) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json({ status: "generic" satisfies ForgotPasswordStatus });
  }
}
