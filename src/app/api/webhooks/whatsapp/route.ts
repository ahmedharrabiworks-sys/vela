import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let payload: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    params.forEach((val, key) => { payload[key] = val; });
  } else {
    payload = await req.json().catch(() => ({})) as Record<string, string>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Resolve tenant by matched whatsapp_connected flag (single-tenant lookup for now)
  let tenantId: string | null = null;
  const toNumber = (payload.To ?? "").replace("whatsapp:", "");

  if (toNumber) {
    // In a multi-tenant setup, match by the Twilio number assigned per tenant
    // For now, find any connected tenant (extend with per-tenant Twilio numbers later)
    const { data: cfg } = await admin
      .from("tenant_config")
      .select("tenant_id")
      .eq("whatsapp_connected", true)
      .limit(1)
      .maybeSingle();
    if (cfg?.tenant_id) tenantId = cfg.tenant_id as string;
  }

  // Log the incoming message — best-effort; logging failure must never prevent the 200 ACK.
  // Never chain .catch() directly on a Supabase builder (builders expose .then() but not
  // .catch() — see webhooks/instagram and marketing route for the same fix rationale).
  try {
    const { error: logErr } = await admin.from("webhook_logs").insert({
      tenant_id: tenantId,
      channel: "whatsapp",
      event_type: "incoming_message",
      payload,
      processed: false,
    });
    if (logErr) console.error("[webhook/whatsapp] log insert failed (non-fatal):", logErr.message);
  } catch (logEx) {
    console.error("[webhook/whatsapp] log save threw (non-fatal):", logEx instanceof Error ? logEx.message : logEx);
  }

  return NextResponse.json({ ok: true });
}
