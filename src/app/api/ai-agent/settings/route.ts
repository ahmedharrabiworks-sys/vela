import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

interface AgentSettings {
  voiceId?: string;
  speed?: number;
  tone?: string;
  customInstructions?: string;
  agentName?: string;
  personality?: string;
  greetingStyle?: string;
  language?: string;
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
  // req is required by Next.js route handler signature
  void req;
}

export async function GET(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { tenant } = result;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("agent_settings")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let settings: AgentSettings = {};
  if (cfg?.agent_settings) {
    try {
      const raw = typeof cfg.agent_settings === "string"
        ? JSON.parse(cfg.agent_settings)
        : cfg.agent_settings;
      settings = raw as AgentSettings;
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

  const body = await req.json().catch(() => ({})) as AgentSettings;
  const settings: AgentSettings = {
    voiceId:            body.voiceId            ?? undefined,
    speed:              typeof body.speed === "number" ? body.speed : undefined,
    tone:               body.tone               ?? undefined,
    customInstructions: body.customInstructions ?? "",
    agentName:          body.agentName          ?? undefined,
    personality:        body.personality        ?? undefined,
    greetingStyle:      body.greetingStyle      ?? undefined,
    language:           body.language           ?? undefined,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { error: updateErr } = await admin
    .from("tenant_config")
    .update({ agent_settings: settings })
    .eq("tenant_id", tenant.id);

  if (updateErr) {
    // Column may not exist yet — report but don't hard fail
    console.error("[ai-agent/settings] update error:", updateErr.code, updateErr.message);
    if (updateErr.code === "42703") {
      return NextResponse.json(
        { error: "Run SQL migration: ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS agent_settings JSONB DEFAULT '{}'::jsonb" },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
