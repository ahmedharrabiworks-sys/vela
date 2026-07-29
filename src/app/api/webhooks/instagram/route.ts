import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";

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

  // Resolve tenant from Instagram Business Account ID
  const entries = (payload.entry as { id?: string }[]) ?? [];
  let tenantId: string | null = null;

  for (const entry of entries) {
    if (!entry.id) continue;
    const { data: cfg } = await admin
      .from("tenant_config")
      .select("tenant_id")
      .eq("instagram_business_id", entry.id)
      .maybeSingle();
    if (cfg?.tenant_id) {
      tenantId = cfg.tenant_id as string;
      break;
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
      processed: false,
    });
    if (logErr) console.error("[webhook/instagram] log insert failed (non-fatal):", logErr.message);
  } catch (logEx) {
    console.error("[webhook/instagram] log save threw (non-fatal):", logEx instanceof Error ? logEx.message : logEx);
  }

  // Acknowledge immediately (Meta requires 200 within 20s)
  return NextResponse.json({ ok: true });
}
