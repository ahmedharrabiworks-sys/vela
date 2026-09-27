import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { normalizeEmail, isValidEmailSyntax } from "@/lib/auth/email";
import { isRateLimited, getClientIp, isBodyTooLarge } from "@/lib/auth/rate-limit";

// Always returns the exact same generic response regardless of whether
// the email exists, belongs to a Google-only account, or is malformed
// past basic syntax -- FIX 5's explicit no-enumeration requirement.
// Supabase's own resetPasswordForEmail already behaves this way (it does
// not reveal whether the email is registered), this route's job is
// mainly the rate limiting Supabase itself doesn't enforce for us.
const FORGOT_EMAIL_LIMIT = 3;
const FORGOT_EMAIL_WINDOW_MS = 60 * 60_000;
const FORGOT_IP_LIMIT = 10;
const FORGOT_IP_WINDOW_MS = 60 * 60_000;
const RESEND_COOLDOWN_MS = 55_000;

const GENERIC_RESPONSE = { success: true } as const;

export async function POST(req: Request) {
  try {
    if (isBodyTooLarge(req, 2_000)) {
      return NextResponse.json(GENERIC_RESPONSE);
    }
    const ip = getClientIp(req);
    if (isRateLimited(`forgot:ip:${ip}`, FORGOT_IP_LIMIT, FORGOT_IP_WINDOW_MS)) {
      console.warn(`[forgot-password] IP rate limit hit: ${ip}`);
      // Even the rate-limit response stays generic to the client --
      // returning 429 here would itself leak information (confirms
      // "someone is hammering this specific email"), so this still
      // returns the same 200 shape; the real protection is that no email
      // actually gets sent once the limiter trips.
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = (body as Record<string, unknown>).email;
    if (typeof rawEmail !== "string" || !isValidEmailSyntax(rawEmail)) {
      return NextResponse.json(GENERIC_RESPONSE);
    }
    const email = normalizeEmail(rawEmail);

    const cooldownHit = isRateLimited(`forgot:cooldown:${email}`, 1, RESEND_COOLDOWN_MS);
    const emailLimitHit = isRateLimited(`forgot:email:${email}`, FORGOT_EMAIL_LIMIT, FORGOT_EMAIL_WINDOW_MS);

    if (!cooldownHit && !emailLimitHit) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co").replace(/\/$/, "");
      const supabase = createSupabaseRouteHandlerClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/reset-password`,
      });
      if (error) {
        console.warn("[forgot-password] resetPasswordForEmail error (masked to client):", error.message);
      }
    } else {
      console.warn(`[forgot-password] rate limited: email=${email} cooldown=${cooldownHit} hourly=${emailLimitHit}`);
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
