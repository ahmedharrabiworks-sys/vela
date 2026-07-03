import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";

// GET: Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "vela_webhook_token";

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: Handle incoming Instagram events
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify HMAC-SHA256 signature
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const secret = process.env.META_APP_SECRET ?? "";

  if (secret && signature) {
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
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

  // Log all events for audit/debugging
  await admin.from("webhook_logs").insert({
    tenant_id: tenantId,
    channel: "instagram",
    event_type: (payload.object as string) || "unknown",
    payload,
    processed: false,
  }).catch(() => null);

  // Acknowledge immediately (Meta requires 200 within 20s)
  return NextResponse.json({ ok: true });
}
