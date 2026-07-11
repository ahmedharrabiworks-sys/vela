import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import {
  DEFAULT_VOICE_ID,
  getDefaultVoiceId,
  getTranscriberConfig,
  getSpeakingPlanConfig,
  getVoiceConfig,
  buildInboundSystem,
} from "@/lib/vapi-agent-config";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VAPI_BASE = "https://api.vapi.ai";

async function vapiRequest(path: string, method: string, body?: unknown) {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY not configured");
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any)?.message ?? `Vapi ${method} ${path} → ${res.status}`);
  return data;
}

/* buildInboundSystem moved to src/lib/vapi-agent-config.ts */

async function getAuthAndTenant(req: NextRequest) {
  void req;
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return { user, tenant };
  } catch {
    return { error: "Account setup required", status: 500 };
  }
}


export async function GET(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("vapi_phone_number, vapi_phone_number_id, vapi_assistant_id")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  return NextResponse.json({
    phoneNumber:   (cfg as any)?.vapi_phone_number   ?? null,
    phoneNumberId: (cfg as any)?.vapi_phone_number_id ?? null,
    assistantId:   (cfg as any)?.vapi_assistant_id   ?? null,
  });
}

export async function POST(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: "VAPI_API_KEY not configured on server" }, { status: 422 });
  }

  const admin = createSupabaseAdmin() as any;

  // Load tenant KB + settings
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base, agent_settings, vapi_assistant_id, vapi_phone_number_id, vapi_phone_number")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let kb: Record<string, any> = {};
  let agentSettings: Record<string, any> = {};
  try {
    if ((cfg as any)?.knowledge_base) {
      const raw = (cfg as any).knowledge_base;
      kb = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
    if ((cfg as any)?.agent_settings) {
      const raw = (cfg as any).agent_settings;
      agentSettings = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
  } catch { /* ignore parse errors */ }

  const agentName = (agentSettings.agentName as string | undefined) || "Vela";
  const language  = (agentSettings.language as string | undefined) || "";
  // Owner's explicit choice wins; smart Arabic default only when nothing is saved
  const voiceId   = (agentSettings.voiceId as string | undefined) || getDefaultVoiceId(language);
  const speed     = typeof agentSettings.speed === "number" ? agentSettings.speed : 0.85;

  // App URL for webhook serverUrl
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const webhookUrl = appUrl
    ? `${appUrl}/api/ai-agent/call-webhook?tenantId=${tenant.id}`
    : "";

  const systemPrompt = buildInboundSystem(agentName, tenant.business_name || "your business", kb, agentSettings);
  const { stopSpeakingPlan, startSpeakingPlan } = getSpeakingPlanConfig();

  try {
    // Create or update the Vapi assistant
    let assistantId = (cfg as any)?.vapi_assistant_id as string | null ?? null;
    const assistantBody = {
      name: `${agentName} — ${tenant.business_name || "Business"}`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
      },
      voice: getVoiceConfig(voiceId, speed),
      transcriber: getTranscriberConfig(),
      firstMessageMode: "assistant-speaks-first-with-model-generated-message",
      stopSpeakingPlan,
      startSpeakingPlan,
      ...(webhookUrl ? { serverUrl: webhookUrl } : {}),
    };

    if (assistantId) {
      try {
        await vapiRequest(`/assistant/${assistantId}`, "PATCH", assistantBody);
      } catch (patchErr: any) {
        // Stored ID no longer exists in Vapi (e.g. manually deleted from dashboard)
        const msg = (patchErr?.message ?? "") as string;
        if (/not found|404/i.test(msg)) {
          const created = await vapiRequest("/assistant", "POST", assistantBody) as any;
          assistantId = created.id as string;
        } else {
          throw patchErr;
        }
      }
    } else {
      const created = await vapiRequest("/assistant", "POST", assistantBody) as any;
      assistantId = created.id as string;
    }

    // Provision phone number if not already done
    let phoneNumber = (cfg as any)?.vapi_phone_number as string | null ?? null;
    let phoneNumberId = (cfg as any)?.vapi_phone_number_id as string | null ?? null;

    if (!phoneNumberId) {
      // Create phone number with serverUrl for dynamic assistant-request resolution —
      // every inbound call will read fresh settings from Supabase via the webhook.
      const numPayload: Record<string, unknown> = {
        provider: "vapi",
        name: `${tenant.business_name || "Business"} — Vela`,
      };
      if (webhookUrl) {
        numPayload.serverUrl = webhookUrl;
      } else {
        numPayload.assistantId = assistantId;
      }
      const numRes = await vapiRequest("/phone-number", "POST", numPayload) as any;
      phoneNumber   = (numRes.number ?? numRes.id) as string;
      phoneNumberId = numRes.id as string;
    } else if (webhookUrl) {
      // Upgrade existing phone number to dynamic resolution (best-effort)
      try {
        await vapiRequest(`/phone-number/${phoneNumberId}`, "PATCH", { serverUrl: webhookUrl });
      } catch { /* ignore — non-fatal */ }
    }

    // Save to tenant_config — upsert so a missing row doesn't cause a silent no-op
    await admin
      .from("tenant_config")
      .upsert(
        {
          tenant_id:            tenant.id,
          vapi_assistant_id:    assistantId,
          vapi_phone_number:    phoneNumber,
          vapi_phone_number_id: phoneNumberId,
        },
        { onConflict: "tenant_id" }
      );

    return NextResponse.json({ phoneNumber, phoneNumberId, assistantId });
  } catch (err: any) {
    console.error("[ai-agent/phone] provision error:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to provision phone number" },
      { status: 502 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  const admin = createSupabaseAdmin() as any;
  await admin
    .from("tenant_config")
    .update({ vapi_phone_number: null, vapi_phone_number_id: null, vapi_assistant_id: null })
    .eq("tenant_id", tenant.id);

  return NextResponse.json({ ok: true });
}
