import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/whatsapp/send-code
 * Sends a 6-digit OTP to the given phone via Twilio Verify.
 * If TWILIO_* vars are not set, returns a graceful "not configured" message.
 */
export async function POST(req: NextRequest) {
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
      message: "Twilio not configured yet — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID to your .env.local to send real SMS codes.",
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
