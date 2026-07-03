import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/whatsapp/verify-code
 * Verifies the OTP via Twilio Verify, then stores the WhatsApp number in Supabase.
 * Falls back to demo mode (any 6-digit code accepted) if Twilio is not configured.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { phone?: string; code?: string };
  const { phone, code } = body;

  if (!phone || !code) {
    return NextResponse.json({ success: false, message: "Phone and code required" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const verifySid  = process.env.TWILIO_VERIFY_SERVICE_SID;

  let verified = false;

  if (!accountSid || !authToken || !verifySid) {
    // Demo mode — accept any 6-digit code
    verified = /^\d{6}$/.test(code);
  } else {
    try {
      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          },
          body: new URLSearchParams({ To: phone, Code: code }).toString(),
        }
      );
      const data = await res.json() as { status?: string };
      verified = data.status === "approved";
    } catch {
      return NextResponse.json({ success: false, message: "Verification check failed" }, { status: 500 });
    }
  }

  if (!verified) {
    return NextResponse.json({ success: false, message: "Invalid or expired code" }, { status: 400 });
  }

  // Store verified phone in Supabase
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (tenant) {
      await admin.from("tenant_config").upsert(
        { tenant_id: tenant.id, whatsapp_connected: true, whatsapp_phone: phone },
        { onConflict: "tenant_id" }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to save connection" }, { status: 500 });
  }
}
