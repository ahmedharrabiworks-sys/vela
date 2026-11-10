import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { buildPhoneAssistant, resolveAgentName } from "@/lib/vapi-phone-assistant";
import { parseKnowledgeBase } from "@/lib/knowledge-base";
import { getVapiServerConfig, resolveTenantTimezone, samePhoneLine, wallClockNowText } from "@/lib/vapi-webhook";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { pointTwilioNumberAtVela } from "@/lib/twilio-voice";
import { isAdminUser } from "@/lib/admin-access";

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
  const { tenant, user } = result;
  const isAdmin = isAdminUser(user);

  const admin = createSupabaseAdmin() as any;
  const [{ data: cfg }, { data: row }] = await Promise.all([
    admin.from("tenant_config").select("vapi_phone_number, vapi_phone_number_id, vapi_assistant_id").eq("tenant_id", tenant.id).maybeSingle(),
    admin.from("tenants").select("phone").eq("id", tenant.id).maybeSingle(),
  ]);

  // Clients only ever see their own business number. The hidden bridge
  // number and the Vapi ids go to the Vela team, checked here, per request.
  return NextResponse.json({
    businessPhone: ((row as any)?.phone as string | null)?.trim() || null,
    isAdmin,
    ...(isAdmin ? {
      phoneNumber:   (cfg as any)?.vapi_phone_number   ?? null,
      phoneNumberId: (cfg as any)?.vapi_phone_number_id ?? null,
      assistantId:   (cfg as any)?.vapi_assistant_id   ?? null,
    } : {}),
  });
}

export async function POST(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!isAdminUser(result.user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
    .select("knowledge_base, agent_settings, vapi_assistant_id, vapi_phone_number_id, vapi_phone_number")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let agentSettings: Record<string, any> = {};
  try {
    if ((cfg as any)?.agent_settings) {
      const raw = (cfg as any).agent_settings;
      agentSettings = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
  } catch { /* ignore parse errors */ }
  const kb = parseKnowledgeBase((cfg as any)?.knowledge_base) as unknown as Record<string, any>;

  const agentName = resolveAgentName(agentSettings);

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

    // Importing or updating a number in Vapi can repoint Twilio at Vapi.
    // Vela must stay the front door, so a caller never hears Vapi's own
    // billing or error messages (see /api/voice/twilio-inbound).
    const twilioWebhook = phoneNumber?.startsWith("+") ? await pointTwilioNumberAtVela(phoneNumber) : "skipped";
    if (twilioWebhook === "failed") console.error("[ai-agent/phone] could not point the Twilio number at Vela");

    return NextResponse.json({ phoneNumber, phoneNumberId, assistantId, twilioWebhook });
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

// The owner's own business number: what customers dial, forwarded to the bridge.
export async function PATCH(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  const body = await req.json().catch(() => null) as { businessPhone?: unknown } | null;
  const raw = typeof body?.businessPhone === "string" ? body.businessPhone.trim() : "";
  // Digits with spaces, brackets or hyphens only: the parser alone forgives
  // trailing junk ("+12533239602x" would pass), and this field is stored as is.
  const parsed = /^\+?[0-9][0-9\s()-]{5,24}$/.test(raw) ? parsePhoneNumberFromString(raw) : undefined;
  if (!parsed?.isValid()) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin.from("tenant_config").select("vapi_phone_number").eq("tenant_id", tenant.id).maybeSingle();
  if (samePhoneLine(parsed.number, cfg?.vapi_phone_number as string | null)) return NextResponse.json({ error: "bridge" }, { status: 400 });

  const { error } = await admin.from("tenants").update({ phone: parsed.number }).eq("id", tenant.id);
  if (error) {
    console.error("[ai-agent/phone] saving business number failed:", error.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ businessPhone: parsed.number });
}

export async function DELETE(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if (!isAdminUser(result.user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { tenant } = result;

  const admin = createSupabaseAdmin() as any;
  await admin
    .from("tenant_config")
    .update({ vapi_phone_number: null, vapi_phone_number_id: null, vapi_assistant_id: null })
    .eq("tenant_id", tenant.id);

  return NextResponse.json({ ok: true });
}
