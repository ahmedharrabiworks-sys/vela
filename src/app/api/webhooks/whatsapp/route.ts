import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-send";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/webhooks/whatsapp
 * Meta webhook verification challenge — same pattern as webhooks/instagram/route.ts.
 * Fail-closed: META_WHATSAPP_VERIFY_TOKEN must be set (separate from Instagram's
 * META_WEBHOOK_VERIFY_TOKEN — different verify tokens per webhook endpoint).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[webhooks/whatsapp GET] META_WHATSAPP_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Receives incoming WhatsApp messages from Meta Cloud API.
 *
 * Flow:
 *   1. Verify HMAC-SHA256 signature using META_APP_SECRET (fail-closed)
 *   2. For each entry/change with field="messages":
 *      a. Extract phone_number_id from metadata
 *      b. Look up whatsapp_accounts by phone_number_id (is_active=true)
 *      c. For each text message: call /api/ai/reply, send reply via Graph API
 *   3. Always return 200 — never let processing errors cause Meta to retry
 *
 * Multi-tenant routing: phone_number_id is the routing key (unique per account).
 * If no matching account: log silently, return 200 (don't leak tenant existence).
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // ── Signature verification — fail closed ──────────────────────────────────
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error("[webhooks/whatsapp POST] META_APP_SECRET not configured — rejecting request");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (signature !== expected) {
    console.warn("[webhooks/whatsapp] Signature validation failed — possible forged request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdmin() as any;

  type WaMessage = {
    from?: string;
    id?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
  };

  type WaContact  = { profile?: { name?: string }; wa_id?: string };
  type WaMetadata = { phone_number_id?: string; display_phone_number?: string };

  type WaChangeValue = {
    messaging_product?: string;
    metadata?: WaMetadata;
    messages?: WaMessage[];
    statuses?: unknown[];   // delivery/read receipts — skip
    contacts?: WaContact[];
  };

  type WaEntry = {
    id?: string;
    changes?: Array<{ value?: WaChangeValue; field?: string }>;
  };

  const entries = (payload.entry as WaEntry[]) ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      // Only process message events; skip status updates (delivery/read receipts)
      if (change.field !== "messages") continue;

      const value = change.value;
      if (!value?.messages?.length) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // ── Tenant lookup via phone_number_id ──────────────────────────────────
      const { data: waAccount } = await admin
        .from("whatsapp_accounts")
        .select("tenant_id, access_token")
        .eq("phone_number_id", phoneNumberId)
        .eq("is_active", true)
        .maybeSingle();

      if (!waAccount) {
        // No active account — log and skip; don't 4xx (would cause Meta retries)
        console.warn("[webhooks/whatsapp] No active account for phone_number_id:", phoneNumberId);
        continue;
      }

      const tenantId   = waAccount.tenant_id as string;
      const accessToken = waAccount.access_token as string;

      // ── Process each incoming text message ────────────────────────────────
      for (const msg of value.messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;

        const from        = msg.from;
        const messageText = msg.text.body;

        if (!from || !messageText) continue;

        // Resolve customer name from contacts block (populated by Meta)
        const contact      = value.contacts?.find((c) => c.wa_id === from);
        const customerName = contact?.profile?.name ?? from;

        // ── Call AI reply engine ─────────────────────────────────────────────
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

        let aiReply = "";
        try {
          const aiRes  = await fetch(`${appUrl}/api/ai/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId,
              message: messageText,
              channel: "whatsapp",
              customerName,
            }),
          });
          const aiData = await aiRes.json() as { reply?: string };
          aiReply = aiData.reply ?? "";
        } catch (err) {
          console.error("[webhooks/whatsapp] AI reply error for tenant", tenantId, ":", err);
          continue; // Don't send an empty or broken reply
        }

        if (!aiReply) continue;

        // ── Send reply via WhatsApp Cloud API ────────────────────────────────
        try {
          await sendWhatsAppMessage(phoneNumberId, accessToken, from, aiReply);
        } catch (err) {
          // Log but don't throw — one failed send should not block other messages
          console.error("[webhooks/whatsapp] Send reply error for tenant", tenantId, ":", err);
        }
      }
    }
  }

  // Always return 200 to Meta — processing errors must never trigger retries
  return NextResponse.json({ ok: true });
}
