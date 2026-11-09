/**
 * Per-call setup shared by the two ways a real inbound call reaches the
 * phone agent:
 *  - Vela front door: /api/voice/twilio-inbound (Twilio -> Vela -> Vapi)
 *  - Vapi assistant-request: /api/ai-agent/call-webhook (Twilio -> Vapi)
 * Both build the identical receptionist v2 assistant from fresh data.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { parseKnowledgeBase } from "@/lib/knowledge-base";
import { formatBookedSlotsText } from "@/lib/availability";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { buildPhoneAssistant, resolveAgentName } from "@/lib/vapi-phone-assistant";
import { getVapiServerConfig, isReliableCallerId, resolveTenantTimezone, wallClockNow, wallClockNowText } from "@/lib/vapi-webhook";

export type TenantPhoneCfg = {
  tenant_id: string;
  vapi_phone_number_id: string | null;
  vapi_phone_number: string | null;
  agent_settings: unknown;
  knowledge_base: unknown;
};

export const TENANT_PHONE_COLS = "tenant_id, vapi_phone_number_id, vapi_phone_number, agent_settings, knowledge_base";

export function parseJson(raw: unknown): Record<string, any> {
  if (!raw) return {};
  try { return (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>; } catch { return {}; }
}

export type PreparedCall =
  | { ok: true; assistant: ReturnType<typeof buildPhoneAssistant>; businessName: string; ownerId: string | null }
  | { ok: false; reason: "plan_paused" | "server_config"; businessName: string; ownerId: string | null };

export async function prepareInboundCall(admin: any, cfg: TenantPhoneCfg, callerNumber: string | null): Promise<PreparedCall> {
  const { data: tenantData } = await admin
    .from("tenants")
    .select("business_name, plan, phone, owner_id")
    .eq("id", cfg.tenant_id)
    .maybeSingle();
  const businessName = (tenantData?.business_name as string | undefined) || "your business";
  const ownerId = (tenantData?.owner_id as string | undefined) ?? null;

  // Plan gate: Starter pauses voice (the number stays linked).
  const planId = ((tenantData?.plan as string | undefined) ?? "starter").toLowerCase() as PlanId;
  if (!(PLAN_CONFIG[planId] ?? PLAN_CONFIG.starter).voiceAgent) {
    return { ok: false, reason: "plan_paused", businessName, ownerId };
  }

  const serverCfg = getVapiServerConfig(cfg.tenant_id);
  if (!serverCfg.ok) {
    console.error("[phone-call-setup] cannot build server config:", serverCfg.reason);
    return { ok: false, reason: "server_config", businessName, ownerId };
  }

  const kb = parseKnowledgeBase(cfg.knowledge_base) as unknown as Record<string, any>;
  const settings = parseJson(cfg.agent_settings);
  const timezone = resolveTenantTimezone(settings);
  const agentName = resolveAgentName(settings);

  // Real upcoming schedule snapshot (book_appointment re-checks at booking time).
  let bookedSlotsText = "";
  try {
    const { data: bookedSlots } = await admin
      .from("appointments")
      .select("datetime, service_name")
      .eq("tenant_id", cfg.tenant_id)
      .neq("status", "cancelled")
      .is("deleted_at", null)
      .gte("datetime", wallClockNow(timezone).asDate.toISOString())
      .order("datetime", { ascending: true })
      .limit(20);
    bookedSlotsText = formatBookedSlotsText(bookedSlots as { datetime: string; service_name?: string }[] | null);
  } catch (err) {
    console.error("[phone-call-setup] failed to fetch booked slots:", err);
  }

  // Caller ID is only offered back to the caller when it is trustworthy.
  const reliable = isReliableCallerId(callerNumber, [tenantData?.phone as string | undefined, cfg.vapi_phone_number]);

  return {
    ok: true,
    businessName,
    ownerId,
    assistant: buildPhoneAssistant({
      agentName,
      businessName,
      kb,
      settings,
      nowText: wallClockNowText(timezone),
      bookedSlotsText,
      caller: { number: callerNumber, reliable },
      server: serverCfg.server,
    }),
  };
}
