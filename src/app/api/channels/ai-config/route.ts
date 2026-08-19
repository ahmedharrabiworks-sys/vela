import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

/**
 * Per-channel AI-behavior config (tone + language) for Instagram, WhatsApp,
 * and Website -- FIX 2 round F (Instagram/WhatsApp), widened FIX 3 round H
 * (Website, surfaced from the Website Builder Analytics panel instead of a
 * separate modal). Reuses the exact tone/language vocabulary already wired
 * into ai/reply/route.ts's global tenant_config.tone/language (Settings ->
 * AI Configuration), just scoped per channel via the
 * tenant_config.channel_ai_config JSONB column. A channel with no override
 * saved here falls back to the tenant's global tone/language -- never a
 * hardcoded default that could silently diverge from what Settings shows.
 *
 * GET  ?channel=instagram|whatsapp|website -> { tone, language, isOverride }
 * PUT  { channel, tone, language }          -> saves an override for that channel
 */

const VALID_CHANNELS = ["instagram", "whatsapp", "website"] as const;
type Channel = typeof VALID_CHANNELS[number];

async function getTenantId(): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", user.id).single();
  return (tenant?.id as string | undefined) ?? null;
}

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") as Channel | null;
  if (!channel || !VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "channel must be instagram, whatsapp, or website" }, { status: 400 });
  }

  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: cfg, error } = await admin
    .from("tenant_config")
    .select("tone, language, channel_ai_config")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error?.code === "PGRST204" || error?.code === "42703") {
    // migration_v30.sql hasn't run yet -- fall back to the global tone/language only.
    const { data: legacyCfg } = await admin.from("tenant_config").select("tone, language").eq("tenant_id", tenantId).maybeSingle();
    return NextResponse.json({ tone: legacyCfg?.tone ?? "professional", language: legacyCfg?.language ?? "Auto-detect", isOverride: false });
  }

  const override = (cfg?.channel_ai_config as Record<string, { tone?: string; language?: string }> | null)?.[channel];
  return NextResponse.json({
    tone: override?.tone ?? cfg?.tone ?? "professional",
    language: override?.language ?? cfg?.language ?? "Auto-detect",
    isOverride: !!override,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { channel?: string; tone?: string; language?: string };
  const { channel, tone, language } = body;
  if (!channel || !VALID_CHANNELS.includes(channel as Channel)) {
    return NextResponse.json({ error: "channel must be instagram, whatsapp, or website" }, { status: 400 });
  }
  if (!tone || !language) {
    return NextResponse.json({ error: "tone and language are required" }, { status: 400 });
  }

  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: existing } = await admin.from("tenant_config").select("channel_ai_config").eq("tenant_id", tenantId).maybeSingle();
  const nextConfig = {
    ...((existing?.channel_ai_config as Record<string, unknown>) ?? {}),
    [channel]: { tone, language },
  };

  const { error } = await admin.from("tenant_config").upsert({ tenant_id: tenantId, channel_ai_config: nextConfig }, { onConflict: "tenant_id" });

  if (error?.code === "PGRST204" || error?.code === "42703") {
    return NextResponse.json({ error: "Per-channel AI config isn't set up yet. Run migration_v30.sql." }, { status: 503 });
  }
  if (error) {
    console.error("[channels/ai-config] save failed:", error.message);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
