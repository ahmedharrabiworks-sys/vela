import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { normalizeEmail, isValidEmailSyntax } from "@/lib/auth/email";
import { getClientIp, isBodyTooLarge } from "@/lib/auth/rate-limit";
import { rateHit } from "@/lib/auth/rate-limit-db";

// Wraps supabase.auth.resend({type:"signup"}) server-side so the 60s
// cooldown shown in the UI is actually enforced (a client can't be
// trusted to self-limit) rather than merely displayed. Same generic
// response regardless of whether the email is real/registered/already
// confirmed -- no enumeration signal here either. Rate limiting is now
// DB-backed (durable across cold starts) via rate-limit-db.ts, per FIX 1.
const RESEND_COOLDOWN_S = 55; // slightly under the UI's 60s countdown
const RESEND_HOURLY_LIMIT = 5;
const RESEND_HOURLY_WINDOW_S = 60 * 60;

export async function POST(req: Request) {
  try {
    if (isBodyTooLarge(req, 2_000)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const ip = getClientIp(req);
    const ipHit = await rateHit(`resend:ip:${ip}`, 20, RESEND_HOURLY_WINDOW_S);
    if (!ipHit.allowed) {
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = (body as Record<string, unknown>).email;
    if (typeof rawEmail !== "string" || !isValidEmailSyntax(rawEmail)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const email = normalizeEmail(rawEmail);

    const cooldownHit = await rateHit(`resend:cooldown:${email}`, 1, RESEND_COOLDOWN_S);
    if (!cooldownHit.allowed) {
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }
    const hourlyHit = await rateHit(`resend:hourly:${email}`, RESEND_HOURLY_LIMIT, RESEND_HOURLY_WINDOW_S);
    if (!hourlyHit.allowed) {
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co").replace(/\/$/, "");
    const supabase = createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${appUrl}/auth/confirm` },
    });

    if (error) {
      // Logged, never surfaced -- an already-confirmed or nonexistent
      // email both look identical to the client either way.
      console.warn("[resend-confirmation] resend error (masked to client):", error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[resend-confirmation] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
