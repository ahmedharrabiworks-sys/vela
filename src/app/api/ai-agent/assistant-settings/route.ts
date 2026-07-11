import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface AssistantSettings {
  voiceId?: string;
  speed?: number;
  conversationStyle?: string;
  preferredLanguage?: string;
}

async function getAuthAndTenant(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Unauthorized", status: 401 };
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return { user, tenant };
  } catch {
    return { error: "Account setup required", status: 500 };
  }
  void req;
}

export async function GET(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { tenant } = result;

  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("assistant_settings")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let settings: AssistantSettings = {};
  if (cfg?.assistant_settings) {
    try {
      const raw = typeof cfg.assistant_settings === "string"
        ? JSON.parse(cfg.assistant_settings)
        : cfg.assistant_settings;
      settings = raw as AssistantSettings;
    } catch { /* ignore */ }
  }

  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { tenant } = result;

  const body = await req.json().catch(() => ({})) as AssistantSettings;

  const admin = createSupabaseAdmin() as any;

  // Read existing settings to merge (prevents partial saves from clobbering other fields)
  const { data: existingCfg } = await admin
    .from("tenant_config")
    .select("assistant_settings")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const existing = ((existingCfg?.assistant_settings as Record<string, unknown>) ?? {}) as AssistantSettings;

  const settings: AssistantSettings = {
    ...existing,
    ...(body.voiceId            !== undefined ? { voiceId:            body.voiceId }            : {}),
    ...(typeof body.speed === "number"        ? { speed:              body.speed }              : {}),
    ...(body.conversationStyle  !== undefined ? { conversationStyle:  body.conversationStyle }  : {}),
    ...(body.preferredLanguage  !== undefined ? { preferredLanguage:  body.preferredLanguage }  : {}),
  };

  const { error: upsertErr } = await admin
    .from("tenant_config")
    .upsert(
      { tenant_id: tenant.id, assistant_settings: settings },
      { onConflict: "tenant_id" }
    );

  if (upsertErr) {
    console.error("[ai-agent/assistant-settings] upsert error:", upsertErr.code, upsertErr.message);
    if (upsertErr.code === "42703") {
      return NextResponse.json(
        { error: "Run SQL migration: ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS assistant_settings JSONB DEFAULT '{}'::jsonb" },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
