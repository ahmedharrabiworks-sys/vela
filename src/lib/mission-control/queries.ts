// Mission Control — reusable query functions
// All functions accept an admin client (service-role) and return plain data.
// No route logic, no auth checks, no Next.js imports here.
//
// LABELING DISCIPLINE (Hard Rule — not optional):
//   Any figure derived from plan price × tenant count (not actual billing)
//   must be named/labeled "theoretical*".  Actual revenue (Stripe) is absent
//   until that integration is live — do not stub with zeros.

import { PLAN_CONFIG, type PlanId } from "../plan-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const VOICE_COST_PER_MIN = 0.12; // $0.12 / voice-minute (Vapi + ElevenLabs + GPT-4o)

function periodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// ── 1. Tenant roster ──────────────────────────────────────────────────────────

export async function getTenantRoster(admin: AdminClient) {
  const { data, error } = await admin
    .from("tenants")
    .select("id, business_name, plan, created_at, industry, city")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getTenantRoster: ${error.message}`);
  const tenants = (data ?? []) as Array<{
    id: string;
    business_name: string;
    plan: string;
    created_at: string;
    industry: string | null;
    city: string | null;
  }>;

  const planBreakdown: Record<string, number> = {};
  for (const t of tenants) {
    planBreakdown[t.plan] = (planBreakdown[t.plan] ?? 0) + 1;
  }

  return { tenants, planBreakdown, totalCount: tenants.length };
}

// ── 2. Theoretical MRR ───────────────────────────────────────────────────────
// "Theoretical" = plan price × active tenant count.
// Actual revenue requires Stripe — that field is intentionally absent here.

export async function getTheoreticalMRR(admin: AdminClient) {
  const { data, error } = await admin
    .from("tenants")
    .select("plan");

  if (error) throw new Error(`getTheoreticalMRR: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.plan] = (counts[row.plan] ?? 0) + 1;
  }

  const byPlan = Object.entries(counts).map(([plan, count]) => {
    const cfg = PLAN_CONFIG[plan as PlanId] ?? PLAN_CONFIG.starter;
    const pricePerTenant = cfg.price;
    return { plan, count, pricePerTenant, subtotal: pricePerTenant * count };
  });

  const total = byPlan.reduce((s, r) => s + r.subtotal, 0);

  return {
    theoreticalMRR: total,
    byPlan,
    note: "Theoretical: plan price × active tenants. Actual billing unavailable until Stripe is live.",
  };
}

// ── 3. Voice margin ───────────────────────────────────────────────────────────
// Cost incurred: agent_calls.duration_seconds × $0.12/min.
// Compared against the tenant's theoretical plan revenue (full plan price —
// voice cost is not isolated; this shows how much voice cost each tenant generates).

export async function getVoiceMarginSummary(admin: AdminClient) {
  const ps = periodStart();

  const [tenantsRes, callsRes] = await Promise.all([
    admin.from("tenants").select("id, business_name, plan"),
    admin
      .from("agent_calls")
      .select("tenant_id, duration_seconds")
      .gte("created_at", ps),
  ]);

  if (tenantsRes.error) throw new Error(`getVoiceMarginSummary/tenants: ${tenantsRes.error.message}`);

  // Sum seconds per tenant
  const secondsMap = new Map<string, number>();
  for (const row of callsRes.data ?? []) {
    secondsMap.set(row.tenant_id, (secondsMap.get(row.tenant_id) ?? 0) + (row.duration_seconds ?? 0));
  }

  const tenants = (tenantsRes.data ?? []).map((t: { id: string; business_name: string; plan: string }) => {
    const cfg = PLAN_CONFIG[t.plan as PlanId] ?? PLAN_CONFIG.starter;
    const voiceMinutesUsed = Math.round((secondsMap.get(t.id) ?? 0) / 60);
    const voiceCostUSD = parseFloat((voiceMinutesUsed * VOICE_COST_PER_MIN).toFixed(2));
    const theoreticalMRR = cfg.price;
    return {
      tenantId: t.id,
      businessName: t.business_name,
      plan: t.plan,
      voiceMinutesUsed,
      voiceCostUSD,
      theoreticalMRR,
    };
  });

  const aggregate = tenants.reduce(
    (acc, t) => ({
      totalVoiceMinutes: acc.totalVoiceMinutes + t.voiceMinutesUsed,
      totalVoiceCostUSD: parseFloat((acc.totalVoiceCostUSD + t.voiceCostUSD).toFixed(2)),
      totalTheoreticalMRR: acc.totalTheoreticalMRR + t.theoreticalMRR,
    }),
    { totalVoiceMinutes: 0, totalVoiceCostUSD: 0, totalTheoreticalMRR: 0 },
  );

  return { periodStart: ps, tenants, aggregate };
}

// ── 4. Tenant engagement (single tenant) ─────────────────────────────────────

export async function getTenantEngagement(admin: AdminClient, tenantId: string) {
  const [tenantRes, configRes, publishedRes, waRes] = await Promise.all([
    admin.from("tenants").select("owner_id").eq("id", tenantId).single(),
    admin
      .from("tenant_config")
      .select("knowledge_base_updated_at, instagram_connected, whatsapp_waba_id")
      .eq("tenant_id", tenantId)
      .single(),
    admin
      .from("websites")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_published", true),
    admin
      .from("whatsapp_accounts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  let lastSignInAt: string | null = null;
  const ownerId = tenantRes.data?.owner_id;
  if (ownerId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: authUser } = await (admin.auth.admin as any).getUserById(ownerId);
    lastSignInAt = authUser?.user?.last_sign_in_at ?? null;
  }

  const now = Date.now();
  const kbUpdatedAt: string | null = configRes.data?.knowledge_base_updated_at ?? null;

  return {
    tenantId,
    lastSignInAt,
    daysSinceLastSignIn: lastSignInAt
      ? Math.floor((now - new Date(lastSignInAt).getTime()) / 86_400_000)
      : null,
    websitePublished: (publishedRes.count ?? 0) > 0,
    instagramConnected: configRes.data?.instagram_connected === true,
    whatsappConnected: (waRes.count ?? 0) > 0,
    kbLastUpdatedAt: kbUpdatedAt,
    kbDaysSinceUpdate: kbUpdatedAt
      ? Math.floor((now - new Date(kbUpdatedAt).getTime()) / 86_400_000)
      : null,
  };
}

// ── 5. Tenant activity drill-down (single tenant) ────────────────────────────

export async function getTenantActivity(
  admin: AdminClient,
  tenantId: string,
  limit = 20,
) {
  const [convsRes, leadsRes, apptRes, callsRes] = await Promise.all([
    admin
      .from("conversations")
      .select("id, channel, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("leads")
      .select("id, name, channel, status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("appointments")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("agent_calls")
      .select("id, call_type, duration_seconds, outcome, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  return {
    tenantId,
    recentConversations: convsRes.data ?? [],
    recentLeads: leadsRes.data ?? [],
    recentAppointments: apptRes.data ?? [],
    recentCalls: callsRes.data ?? [],
  };
}

// ── 6. Platform activity summary (current month, all tenants) ─────────────────

export async function getPlatformActivitySummary(admin: AdminClient) {
  const ps = periodStart();

  const [convsRes, leadsRes, apptRes, callsRes] = await Promise.all([
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", ps),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", ps),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", ps),
    admin
      .from("agent_calls")
      .select("id", { count: "exact", head: true })
      .gte("created_at", ps),
  ]);

  return {
    periodStart: ps,
    conversations: convsRes.count ?? 0,
    leads: leadsRes.count ?? 0,
    appointments: apptRes.count ?? 0,
    calls: callsRes.count ?? 0,
  };
}

// ── 7. At-risk tenants (computed fresh, never cached) ─────────────────────────
// Risk factors (OR logic — any one triggers at-risk status):
//   no_recent_login  — no Supabase auth sign-in in 14+ days (or never)
//   kb_never_trained — knowledge_base_updated_at IS NULL
//   no_recent_calls  — zero agent_calls in the last 30 days
//
// These are behavioral proxies ONLY. Label: "At-Risk (behavioral)".
// Never label as "churned" — that requires a confirmed cancellation event.

export async function getAtRiskTenants(admin: AdminClient) {
  const now = Date.now();
  const fourteenDaysAgo = new Date(now - 14 * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();

  const [tenantsRes, configsRes, callsRes, authRes] = await Promise.all([
    admin.from("tenants").select("id, owner_id, business_name, plan"),
    admin.from("tenant_config").select("tenant_id, knowledge_base_updated_at"),
    admin
      .from("agent_calls")
      .select("tenant_id")
      .gte("created_at", thirtyDaysAgo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.auth.admin as any).listUsers({ perPage: 1000 }),
  ]);

  if (tenantsRes.error) throw new Error(`getAtRiskTenants/tenants: ${tenantsRes.error.message}`);

  const configMap = new Map<string, { knowledge_base_updated_at: string | null }>(
    (configsRes.data ?? []).map((c: { tenant_id: string; knowledge_base_updated_at: string | null }) => [
      c.tenant_id,
      c,
    ]),
  );

  const recentCallTenants = new Set<string>(
    (callsRes.data ?? []).map((c: { tenant_id: string }) => c.tenant_id),
  );

  const authMap = new Map<string, string | null>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((authRes.data?.users ?? []) as any[]).map((u) => [u.id, u.last_sign_in_at ?? null]),
  );

  const atRisk: Array<{
    tenantId: string;
    businessName: string;
    plan: string;
    riskFactors: string[];
    note: string;
  }> = [];

  for (const tenant of tenantsRes.data ?? []) {
    const t = tenant as { id: string; owner_id: string; business_name: string; plan: string };
    const config = configMap.get(t.id);
    const lastSignIn: string | null = authMap.get(t.owner_id) ?? null;
    const kbUpdatedAt: string | null = config?.knowledge_base_updated_at ?? null;

    const riskFactors: string[] = [];

    if (!lastSignIn || lastSignIn < fourteenDaysAgo) riskFactors.push("no_recent_login");
    if (!kbUpdatedAt) riskFactors.push("kb_never_trained");
    if (!recentCallTenants.has(t.id)) riskFactors.push("no_recent_calls");

    if (riskFactors.length > 0) {
      atRisk.push({
        tenantId: t.id,
        businessName: t.business_name,
        plan: t.plan,
        riskFactors,
        note: "At-Risk (behavioral proxy only — not confirmed churn)",
      });
    }
  }

  return atRisk;
}
