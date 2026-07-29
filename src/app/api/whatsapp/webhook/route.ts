import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// Twilio signature validation — implements the official algorithm documented at
// https://www.twilio.com/docs/usage/webhooks/webhooks-security#validating-signatures-from-twilio
// Uses HMAC-SHA1 (Twilio's algorithm, not SHA-256).
// Avoids importing the full twilio SDK for a single utility function.
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature) return false;
  const sortedStr = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + (params[k] ?? ""), "");
  const computed = crypto.createHmac("sha1", authToken).update(url + sortedStr, "utf8").digest("base64");
  try {
    const a = Buffer.from(computed, "utf8");
    const b = Buffer.from(signature, "utf8");
    // timingSafeEqual requires same length — unequal lengths = invalid signature
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/whatsapp/webhook
 * Twilio sends incoming WhatsApp messages here as application/x-www-form-urlencoded.
 * Flow:
 *  1. Verify Twilio HMAC-SHA1 signature (fail closed — reject if absent or invalid)
 *  2. Parse From/Body from Twilio payload
 *  3. Look up the tenant whose whatsapp_phone matches the "To" number
 *  4. Call /api/ai/reply to generate a response
 *  5. Send the reply back via Twilio Messages API
 */
export async function POST(req: NextRequest) {
  // Fail closed — TWILIO_AUTH_TOKEN must be set; without it we cannot verify requests
  // and must not process any webhook (a forged POST would trigger real AI + DB writes).
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("[whatsapp/webhook] TWILIO_AUTH_TOKEN not configured — rejecting all requests");
    return new Response("Service misconfigured", { status: 500 });
  }

  const twilioSig = req.headers.get("x-twilio-signature") ?? "";

  // Reconstruct the exact URL Twilio signed against (must match what's configured in Twilio console).
  // Use x-forwarded-host from Vercel edge headers to capture the actual domain (handles tryvela.com alias).
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host  = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const webhookUrl = `${proto}://${host}/api/whatsapp/webhook`;

  // Parse body ONCE — Twilio signature is computed over the form params
  const contentType = req.headers.get("content-type") ?? "";
  const params: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
  } else {
    const data = await req.json().catch(() => ({})) as Record<string, string>;
    Object.assign(params, data);
  }

  // Reject unsigned or incorrectly signed requests before any processing
  if (!validateTwilioSignature(authToken, twilioSig, webhookUrl, params)) {
    console.warn("[whatsapp/webhook] Signature validation failed — possible forged request");
    return new Response("Forbidden", { status: 403 });
  }

  const from        = params.From ?? "";   // e.g. "whatsapp:+971501234567"
  const to          = params.To   ?? "";   // e.g. "whatsapp:+14155238886"
  const messageBody = params.Body ?? "";

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
