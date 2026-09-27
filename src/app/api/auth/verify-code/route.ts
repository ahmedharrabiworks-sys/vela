import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { normalizeEmail, isValidEmailSyntax } from "@/lib/auth/email";
import { rateHit, peekRateCount } from "@/lib/auth/rate-limit-db";
import { getClientIp, isBodyTooLarge } from "@/lib/auth/rate-limit";

// Verifies the 6-digit code from a signup or password-reset email
// (supabase.auth.verifyOtp with a `token`, not a token_hash -- this is the
// manually-typed-code path; the one-tap link path is /auth/confirm). Runs
// through the Route Handler client so a successful verify writes real
// session cookies onto this response -- the browser is authenticated
// immediately after, same as /auth/confirm and the old PKCE exchange.
const ALLOWED_TYPES = new Set(["signup", "recovery"]);
const WRONG_CODE_LIMIT = 5;
const WRONG_CODE_WINDOW_S = 15 * 60;
const MAX_BODY_BYTES = 1_000;

export async function POST(req: Request) {
  try {
    if (isBodyTooLarge(req, MAX_BODY_BYTES)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipCheck = await rateHit(`verify:ip:${ip}`, 30, 15 * 60);
    if (!ipCheck.allowed) {
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { email: rawEmail, code, type } = body as Record<string, unknown>;

    if (
      typeof rawEmail !== "string" || !isValidEmailSyntax(rawEmail) ||
      typeof code !== "string" || !/^\d{6}$/.test(code) ||
      typeof type !== "string" || !ALLOWED_TYPES.has(type)
    ) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const email = normalizeEmail(rawEmail);
    const lockKey = `verify:wrong:${type}:${email}`;

    // Read-only check: an email already at the wrong-attempt ceiling is
    // blocked before even calling Supabase, without this check itself
    // burning an attempt (only a genuine wrong code increments below).
    const existing = await peekRateCount(lockKey, WRONG_CODE_WINDOW_S);
    if (existing && existing.count >= WRONG_CODE_LIMIT) {
      const minutes = Math.ceil(WRONG_CODE_WINDOW_S / 60);
      return NextResponse.json({ error: "too_many_attempts", minutes }, { status: 429 });
    }

    const supabase = createSupabaseRouteHandlerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: type as "signup" | "recovery",
    });

    if (error || !data.session) {
      const hit = await rateHit(lockKey, WRONG_CODE_LIMIT, WRONG_CODE_WINDOW_S);
      console.warn(`[verify-code] wrong code: type=${type} email=${email} remaining=${hit.remaining}`);
      if (!hit.allowed || hit.remaining <= 0) {
        const minutes = Math.ceil(WRONG_CODE_WINDOW_S / 60);
        return NextResponse.json({ error: "too_many_attempts", minutes }, { status: 429 });
      }
      return NextResponse.json({ error: "wrong_code", remaining: hit.remaining }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[verify-code] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
