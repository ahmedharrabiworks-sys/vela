import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { sendInstagramMessage } from "@/lib/instagram-send";
import { isDuplicateWebhookMessage } from "@/lib/webhook-idempotency";

// GET: Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Fail closed — hardcoded fallback removed; META_WEBHOOK_VERIFY_TOKEN must be set in env.
  // Without it this endpoint cannot safely validate Meta's challenge request.
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[webhook/instagram GET] META_WEBHOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: Handle incoming Instagram events
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify HMAC-SHA256 signature — fail closed.
  // META_APP_SECRET must be set; without it we cannot verify the request origin
  // and must not process events (a forged webhook could pollute tenant data).
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error("[webhook/instagram POST] META_APP_SECRET not configured — rejecting request");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  const signature = req.headers.get("x-hub-signature-256") ?? "";
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // ── Resolve tenant + credentials from Instagram Business Account ID ───────────
  // entry[].id is the Instagram Business Account ID (populated when the webhook
  // was subscribed via the IG Business Account).
  const entries = (payload.entry as { id?: string; messaging?: unknown[] }[]) ?? [];
  let tenantId:    string | null = null;
  let igPageId:    string | null = null;
  let igPageToken: string | null = null;

  for (const entry of entries) {
    if (!entry.id) continue;
    const { data: cfg } = await admin
      .from("tenant_config")
      .select("tenant_id, instagram_page_id, instagram_access_token")
      .eq("instagram_business_id", entry.id)
      .maybeSingle();
    if (cfg?.tenant_id) {
      tenantId    = cfg.tenant_id            as string;
      igPageId    = cfg.instagram_page_id    as string | null;
      igPageToken = cfg.instagram_access_token as string | null;
      break;
    }
  }

  // ── DM reply loop ─────────────────────────────────────────────────────────────
  // Errors at each step are isolated — they must never prevent the 200 ACK to Meta.
  if (tenantId) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

    for (const entry of entries) {
      for (const msg of ((entry.messaging ?? []) as { sender?: { id?: string }; message?: { mid?: string; text?: string } }[])) {
        const senderId = msg?.sender?.id;
        const msgText  = msg?.message?.text ?? "";
        const msgId    = msg?.message?.mid;

        if (!senderId || !msgText) continue;
        if (msgText.length > 2000) continue; // input cap — Hard Rule 2

        // CRITICAL FIX (duplicate messages): same root cause and fix as
        // webhooks/whatsapp — see webhook-idempotency.ts. mid is Meta's
        // own unique message id for this DM.
        if (msgId && isDuplicateWebhookMessage(`ig:${msgId}`)) {
          console.warn("[webhook/instagram] Skipping duplicate delivery of message:", msgId);
          continue;
        }

        let aiReply = "";
        try {
          const aiRes  = await fetch(`${appUrl}/api/ai/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId,
              message: msgText,
              channel: "instagram",
              customerName: senderId,
            }),
          });
          const aiData = await aiRes.json() as { reply?: string };
          aiReply = aiData.reply ?? "";
        } catch (err) {
          console.error("[webhook/instagram] AI reply error for tenant", tenantId, ":", err);
          continue;
        }

        if (!aiReply) continue;

        if (!igPageId || !igPageToken) {
          // Page credentials missing — tenant connected before migration_v12 ran.
          // They must reconnect Instagram to refresh stored credentials.
          console.warn("[webhook/instagram] Missing page credentials for tenant", tenantId,
            "— user must reconnect Instagram to get Page token");
          continue;
        }

        try {
          await sendInstagramMessage(igPageId, igPageToken, senderId, aiReply);
        } catch (err) {
          console.error("[webhook/instagram] Send reply error for tenant", tenantId, ":", err);
        }
      }
    }
  }

  // Log all events — best-effort; logging failure must never prevent the 200 ACK.
  // Never chain .catch() directly on a Supabase builder (builders expose .then() but not
  // .catch() — same fix as webhooks/whatsapp and marketing route).
  try {
    const { error: logErr } = await admin.from("webhook_logs").insert({
      tenant_id: tenantId,
      channel: "instagram",
      event_type: (payload.object as string) || "unknown",
      payload,
      processed: tenantId !== null,
    });
    if (logErr) console.error("[webhook/instagram] log insert failed (non-fatal):", logErr.message);
  } catch (logEx) {
    console.error("[webhook/instagram] log save threw (non-fatal):", logEx instanceof Error ? logEx.message : logEx);
  }

  // Acknowledge immediately (Meta requires 200 within 20s)
  return NextResponse.json({ ok: true });
}
