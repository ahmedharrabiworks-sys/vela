/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseKnowledgeBase, type KnowledgeBase } from "@/lib/knowledge-base";
import { buildPhoneAssistant } from "@/lib/vapi-phone-assistant";
import { getVapiServerConfig, resolveTenantTimezone, wallClockNowText } from "@/lib/vapi-webhook";

export async function loadKnowledgeBase(admin: any, tenantId: string): Promise<KnowledgeBase> {
  const { data } = await admin.from("tenant_config").select("knowledge_base").eq("tenant_id", tenantId).maybeSingle();
  return parseKnowledgeBase(data?.knowledge_base);
}

export type PhoneSync = "ok" | "failed" | "skipped";

/**
 * Pushes the current knowledge to the tenant's stored phone assistant. Real
 * calls already build a fresh assistant per call; this keeps the stored
 * fallback identical. Never throws: a saved knowledge base is never undone by
 * a sync problem.
 */
export async function syncStoredPhoneAssistant(admin: any, tenantId: string): Promise<PhoneSync> {
  try {
    const key = process.env.VAPI_API_KEY;
    const [{ data: cfg }, { data: tenant }] = await Promise.all([
      admin.from("tenant_config").select("knowledge_base, agent_settings, vapi_assistant_id").eq("tenant_id", tenantId).maybeSingle(),
      admin.from("tenants").select("business_name").eq("id", tenantId).maybeSingle(),
    ]);
    const assistantId = cfg?.vapi_assistant_id as string | null | undefined;
    if (!key || !assistantId) return "skipped";
    const serverCfg = getVapiServerConfig(tenantId);
    if (!serverCfg.ok) return "skipped";

    let settings: Record<string, any> = {};
    try {
      const raw = cfg?.agent_settings;
      settings = (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
    } catch { /* defaults */ }

    const agentName = (settings.agentName as string | undefined) || "Vela";
    const businessName = (tenant?.business_name as string | undefined) || "your business";
    const body = buildPhoneAssistant({
      name: `${agentName}, ${businessName}`,
      agentName,
      businessName,
      kb: parseKnowledgeBase(cfg?.knowledge_base) as unknown as Record<string, any>,
      settings,
      nowText: wallClockNowText(resolveTenantTimezone(settings)),
      server: serverCfg.server,
    });
    const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[knowledge-base] phone assistant sync failed:", res.status);
    return res.ok ? "ok" : "failed";
  } catch (err) {
    console.error("[knowledge-base] phone assistant sync error:", (err as Error)?.message);
    return "failed";
  }
}

/** The one write path for owner-driven knowledge changes. */
export async function saveKnowledgeBase(admin: any, tenantId: string, kb: KnowledgeBase): Promise<{ error: string | null; phoneSync: PhoneSync }> {
  const { error } = await admin.from("tenant_config").upsert(
    { tenant_id: tenantId, knowledge_base: JSON.stringify(kb), knowledge_base_updated_at: new Date().toISOString() },
    { onConflict: "tenant_id" },
  );
  if (error) return { error: error.message as string, phoneSync: "skipped" };
  return { error: null, phoneSync: await syncStoredPhoneAssistant(admin, tenantId) };
}
