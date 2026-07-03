import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * POST /api/whatsapp/webhook
 * Twilio sends incoming WhatsApp messages here as application/x-www-form-urlencoded.
 * Flow:
 *  1. Parse From/Body from Twilio payload
 *  2. Look up the tenant whose whatsapp_phone matches the "To" number
 *  3. Call /api/ai/reply to generate a response
 *  4. Send the reply back via Twilio Messages API
 */
export async function POST(req: NextRequest) {
  let from = "";
  let to = "";
  let messageBody = "";

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    from = params.get("From") ?? "";        // e.g. "whatsapp:+971501234567"
    to   = params.get("To")   ?? "";        // e.g. "whatsapp:+14155238886"
    messageBody = params.get("Body") ?? "";
  } else {
    const data = await req.json().catch(() => ({})) as Record<string, string>;
    from = data.From ?? "";
    to   = data.To   ?? "";
    messageBody = data.Body ?? "";
  }

  if (!from || !messageBody) {
    return new Response("OK", { status: 200 });
  }

  const customerPhone = from.replace("whatsapp:", "");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;

    // Find tenant by the receiving Twilio number
    const { data: configs } = await admin
      .from("tenant_config")
      .select("tenant_id")
      .eq("whatsapp_connected", true)
      .limit(1);

    if (!configs || configs.length === 0) {
      return new Response("OK", { status: 200 });
    }

    const tenantId = configs[0].tenant_id as string;

    // Call AI engine
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const aiRes = await fetch(`${appUrl}/api/ai/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        message: messageBody,
        channel: "whatsapp",
        customerName: customerPhone,
      }),
    });

    const aiData = await aiRes.json() as { reply?: string };
    const reply = aiData.reply;

    if (!reply) return new Response("OK", { status: 200 });

    // Send via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            From: to,
            To:   from,
            Body: reply,
          }).toString(),
        }
      );
    }
  } catch (err) {
    console.error("[whatsapp/webhook]", err);
  }

  return new Response("OK", { status: 200 });
}
