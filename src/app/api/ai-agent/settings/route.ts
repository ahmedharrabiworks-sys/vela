import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { getDefaultVoiceId, getVoiceConfig, clampSpeed } from "@/lib/vapi-agent-config";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Read existing settings + vapi_assistant_id in one query
  const { data: existingCfg } = await admin
    .from("tenant_config")
    .select("agent_settings, vapi_assistant_id")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const existing = ((existingCfg?.agent_settings as Record<string, unknown>) ?? {}) as AgentSettings;

  // Merge: only override fields explicitly present in the request body.
  // This prevents voice/page.tsx (which only sends voiceId+speed) from
  // clobbering agentName/personality/language saved via settings/page.tsx.
  const settings: AgentSettings = {
    ...existing,
    ...(body.voiceId            !== undefined ? { voiceId:            body.voiceId }            : {}),
    ...(typeof body.speed === "number"        ? { speed:              body.speed }              : {}),
    ...(body.tone               !== undefined ? { tone:               body.tone }               : {}),
    ...(body.customInstructions !== undefined ? { customInstructions: body.customInstructions } : {}),
    ...(body.agentName          !== undefined ? { agentName:          body.agentName }          : {}),
    ...(body.personality        !== undefined ? { personality:        body.personality }        : {}),
    ...(body.greetingStyle      !== undefined ? { greetingStyle:      body.greetingStyle }      : {}),
    ...(body.language           !== undefined ? { language:           body.language }           : {}),
  };

  const { error: upsertErr } = await admin
    .from("tenant_config")
    .upsert(
      { tenant_id: tenant.id, agent_settings: settings },
      { onConflict: "tenant_id" }
    );

  if (upsertErr) {
    console.error("[ai-agent/settings] upsert error:", upsertErr.code, upsertErr.message);
    const isMissingColumn =
      upsertErr.code === "42703" ||
      (typeof upsertErr.message === "string" && upsertErr.message.includes("does not exist"));
    if (isMissingColumn) {
      return NextResponse.json(
        { error: "Database column missing — run Migration v6 in your Supabase SQL Editor to create the required columns." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: upsertErr.message ?? "Failed to save settings", code: upsertErr.code },
      { status: 500 }
    );
  }

  // Sync voice to the Vapi assistant immediately so inbound calls hear the new voice
  // without requiring a re-provision. Fire-and-forget — never block the settings save.
  const assistantId = existingCfg?.vapi_assistant_id as string | null | undefined;
  const vapiKey = process.env.VAPI_API_KEY;
  if (assistantId && vapiKey) {
    const lang    = (settings.language as string | undefined) || "";
    const voiceId = (settings.voiceId  as string | undefined) || getDefaultVoiceId(lang);
    const speed   = typeof settings.speed === "number" ? settings.speed : 0.85;
    fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${vapiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ voice: getVoiceConfig(voiceId, clampSpeed(speed)) }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
