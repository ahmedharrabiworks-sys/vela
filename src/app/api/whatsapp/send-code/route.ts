import { NextRequest, NextResponse } from "next/server";

// Security audit Part 1: this route is dead (Twilio paths are unused --
// replaced by WhatsApp Embedded Signup) and currently inert (TWILIO_* is
// unset in production, so it always hits the "not configured" branch below
// and never reaches Twilio). It has no rate limiting at all, which would
// become a real SMS-pumping vector the moment Twilio credentials are ever
// added -- fixed now so this isn't a landmine to rediscover later. Same
// in-memory per-IP pattern used elsewhere in this codebase.
const RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS  = 60 * 60_000;

function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = RATE_MAP.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

/**
 * POST /api/whatsapp/send-code
 * Sends a 6-digit OTP to the given phone via Twilio Verify.
 * If TWILIO_* vars are not set, returns a graceful "not configured" message.
 */
export async function POST(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();
  if (isRateLimited(ip)) {
    return NextResponse.json({ success: false, message: "Too many requests. Please wait before trying again." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as { phone?: string };
  const { phone } = body;

  if (!phone) {
    return NextResponse.json({ success: false, message: "Phone number required" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const verifySid  = process.env.TWILIO_VERIFY_SERVICE_SID;

  // Graceful fallback when Twilio is not yet configured
  if (!accountSid || !authToken || !verifySid) {
    return NextResponse.json({
      success: false,
      notConfigured: true,
      message: "Twilio not configured yet, add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID to your .env.local to send real SMS codes.",
    });
  }

  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({ To: phone, Channel: "sms" }).toString(),
      }
    );

    if (!res.ok) {
      const data = await res.json() as { message?: string };
      return NextResponse.json({ success: false, message: data.message ?? "Failed to send code" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Network error while sending code" }, { status: 500 });
  }
}
