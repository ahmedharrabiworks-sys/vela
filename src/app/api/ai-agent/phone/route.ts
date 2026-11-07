import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { buildPhoneAssistant } from "@/lib/vapi-phone-assistant";
import { mergeKnowledgeBases } from "@/lib/knowledge-base";
import { getVapiServerConfig, resolveTenantTimezone, wallClockNowText } from "@/lib/vapi-webhook";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VAPI_BASE = "https://api.vapi.ai";

class VapiError extends Error {
  constructor(public step: "assistant" | "number", public status: number, detail: string) {
    super(detail);
  }
}

/** Short, non-sensitive reason for the UI (Vapi validation text, never keys). */
function safeDetail(msg: unknown): string {
  const s = Array.isArray(msg) ? msg.join("; ") : String(msg ?? "");
  return s.replace(/(sk|pk|key|secret|token)[-_A-Za-z0-9]{8,}/gi, "[redacted]").slice(0, 160);
}

async function vapiRequest(step: "assistant" | "number", path: string, method: string, body?: unknown) {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new VapiError(step, 0, "VAPI_API_KEY not configured");
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = safeDetail((data as any)?.message ?? `HTTP ${res.status}`);
    console.error(`[ai-agent/phone] Vapi ${method} ${path} failed: ${res.status} ${detail}`);
    throw new VapiError(step, res.status, detail);
  }
  return data;
}

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
    console.error("[ai-agent/phone] VAPI_API_KEY not configured");
    return NextResponse.json({ error: "Phone service is not configured. Contact support." }, { status: 422 });
  }

  const admin = createSupabaseAdmin() as any;

  // Plan gate (server-side): the phone agent needs a plan with voiceAgent.
  // Nothing is unlinked here; a paused number simply can't be (re)connected
  // until the plan includes voice again.
  const { data: planRow } = await admin.from("tenants").select("plan").eq("id", tenant.id).maybeSingle();
  const planId = ((planRow?.plan as string | undefined) ?? "starter").toLowerCase() as PlanId;
  if (!(PLAN_CONFIG[planId] ?? PLAN_CONFIG.starter).voiceAgent) {
    return NextResponse.json({ error: "The phone agent is paused on your current plan. Upgrade to Pro to turn it back on.", step: "plan" }, { status: 403 });
  }

  // Load tenant KB + settings
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base, phone_agent_knowledge_base, agent_settings, vapi_assistant_id, vapi_phone_number_id, vapi_phone_number")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let rawKb: Record<string, any> = {};
  let rawPhoneKb: Record<string, any> = {};
  let agentSettings: Record<string, any> = {};
  try {
    if ((cfg as any)?.knowledge_base) {
      const raw = (cfg as any).knowledge_base;
      rawKb = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
    if ((cfg as any)?.phone_agent_knowledge_base) {
      const raw = (cfg as any).phone_agent_knowledge_base;
      rawPhoneKb = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
    if ((cfg as any)?.agent_settings) {
      const raw = (cfg as any).agent_settings;
      agentSettings = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
  } catch { /* ignore parse errors */ }
  const kb = mergeKnowledgeBases(rawKb, rawPhoneKb);

  const agentName = (agentSettings.agentName as string | undefined) || "Vela";

  // C1: every Vapi object that calls back into Vela gets { url, headers: { x-vapi-secret } }.
  // Without the secret our fail-closed webhook rejects every call, so refuse
  // to provision half-configured instead of pretending it worked.
  const serverCfg = getVapiServerConfig(tenant.id);
  if (!serverCfg.ok) {
    console.error("[ai-agent/phone] cannot provision:", serverCfg.reason);
    return NextResponse.json({ error: "Phone service is not fully configured yet (webhook security). Contact support." }, { status: 422 });
  }
  const server = serverCfg.server;
  const timezone = resolveTenantTimezone(agentSettings);

  let assistantId = (cfg as any)?.vapi_assistant_id as string | null ?? null;
  let phoneNumber = (cfg as any)?.vapi_phone_number as string | null ?? null;
  let phoneNumberId = (cfg as any)?.vapi_phone_number_id as string | null ?? null;

  try {
    // ── Assistant: create or update, always with the signed server config + tool
    // Stored fallback assistant (same receptionist v2 builder as the
    // per-call one in call-webhook, minus caller ID and live schedule; real
    // inbound calls get the fresh per-call assistant via assistant-request).
    const assistantBody = buildPhoneAssistant({
      name: `${agentName}, ${tenant.business_name || "Business"}`,
      agentName,
      businessName: tenant.business_name || "your business",
      kb,
      settings: agentSettings,
      nowText: wallClockNowText(timezone),
      server,
    });

    if (assistantId) {
      try {
        await vapiRequest("assistant", `/assistant/${assistantId}`, "PATCH", assistantBody);
      } catch (patchErr) {
        // Stored ID no longer exists in Vapi (e.g. deleted from the dashboard)
        if (patchErr instanceof VapiError && patchErr.status === 404) {
          const created = await vapiRequest("assistant", "/assistant", "POST", assistantBody) as any;
          assistantId = created.id as string;
        } else {
          throw patchErr;
        }
      }
    } else {
      const created = await vapiRequest("assistant", "/assistant", "POST", assistantBody) as any;
      assistantId = created.id as string;
    }

    // ── Phone number
    // C2: a number already linked to this tenant (e.g. the Twilio bridge
    // number imported into Vapi) is NEVER replaced: we only attach the
    // webhook + secret to it. No assistantId on the number, so Vapi asks
    // call-webhook (assistant-request) on every call and gets this tenant's
    // fresh assistant. Only a tenant with no number at all gets a new
    // Vapi-owned one.
    if (phoneNumberId) {
      const updated = await vapiRequest("number", `/phone-number/${phoneNumberId}`, "PATCH", { server }) as any;
      if (!phoneNumber && typeof updated?.number === "string") phoneNumber = updated.number;
      if (updated?.assistantId) {
        console.warn(`[ai-agent/phone] number ${phoneNumberId} has a fixed assistantId set in Vapi; per-call assistant-request will not fire for it`);
      }
    } else {
      const numRes = await vapiRequest("number", "/phone-number", "POST", {
        provider: "vapi",
        name: `${tenant.business_name || "Business"}, Vela`,
        server,
      }) as any;
      phoneNumber   = (numRes.number ?? numRes.id) as string;
      phoneNumberId = numRes.id as string;
    }

    // Save to tenant_config, upsert so a missing row doesn't cause a silent no-op
    const { error: saveErr } = await admin
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
    if (saveErr) {
      console.error("[ai-agent/phone] saving Vapi ids failed:", saveErr.message);
      return NextResponse.json({ error: "Connected in Vapi, but saving to your account failed. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ phoneNumber, phoneNumberId, assistantId });
  } catch (err) {
    const step = err instanceof VapiError ? err.step : "assistant";
    const detail = err instanceof VapiError ? err.message : safeDetail((err as any)?.message);
    console.error(`[ai-agent/phone] provision error at ${step}:`, detail);
    const what = step === "number"
      ? "Couldn't connect your phone number to Vela"
      : "Couldn't update your Vela phone assistant";
    return NextResponse.json({ error: `${what}. Reason: ${detail}`, step }, { status: 502 });
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
