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
      // whatsapp_waba_id omitted — migration_v9.sql (PENDING); WA status comes from whatsapp_accounts table
      .select("knowledge_base_updated_at, instagram_connected")
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

// ── 8. Employee roster (all employees + department + latest signals) ──────────

export type EmployeeSignalMap = Record<
  string,
  { value: number | null; realDescription: string; computedAt: string }
>;

export interface EmployeeRow {
  id: string;
  name: string;
  roleDescription: string;
  domainDescription: string;
  status: string;
  safeDefaultAction: string | null;
  createdAt: string;
  department: { id: string; name: string; isStaffed: boolean } | null;
  latestSignals: EmployeeSignalMap;
}

export async function getEmployeeRoster(admin: AdminClient): Promise<EmployeeRow[]> {
  const [empRes, sigRes] = await Promise.all([
    admin
      .from("employees")
      .select("id, name, role_description, domain_description, status, safe_default_action, created_at, department:departments(id, name, is_staffed)")
      .order("created_at", { ascending: true }),
    admin
      .from("employee_signals")
      .select("employee_id, signal_name, value, real_description, computed_at")
      .order("computed_at", { ascending: false }),
  ]);

  if (empRes.error) throw new Error(`getEmployeeRoster: ${empRes.error.message}`);

  // Group signals by employee, keep only the most recent value per signal_name
  const signalsByEmployee = new Map<string, EmployeeSignalMap>();
  for (const s of sigRes.data ?? []) {
    if (!signalsByEmployee.has(s.employee_id)) signalsByEmployee.set(s.employee_id, {});
    const map = signalsByEmployee.get(s.employee_id)!;
    if (!map[s.signal_name]) {
      // First occurrence = most recent (ordered DESC)
      map[s.signal_name] = {
        value: s.value,
        realDescription: s.real_description,
        computedAt: s.computed_at,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (empRes.data ?? []).map((e: any) => ({
    id: e.id,
    name: e.name,
    roleDescription: e.role_description,
    domainDescription: e.domain_description,
    status: e.status,
    safeDefaultAction: e.safe_default_action ?? null,
    createdAt: e.created_at,
    department: e.department
      ? { id: e.department.id, name: e.department.name, isStaffed: e.department.is_staffed }
      : null,
    latestSignals: signalsByEmployee.get(e.id) ?? {},
  }));
}

// ── 9. Employee detail (single employee + full signal history + learning_log) ─

export interface EmployeeSignalEntry {
  signalName: string;
  value: number | null;
  realDescription: string;
  computedAt: string;
}

export interface LearningLogEntry {
  id: string;
  taskRef: string | null;
  outcome: "success" | "failure" | "neutral";
  conclusion: string;
  createdAt: string;
}

export interface EmployeeDetail {
  employee: EmployeeRow;
  signalHistory: EmployeeSignalEntry[];
  learningLog: LearningLogEntry[];
}

export async function getEmployeeDetail(
  admin: AdminClient,
  employeeId: string,
): Promise<EmployeeDetail | null> {
  const [empRes, sigRes, logRes] = await Promise.all([
    admin
      .from("employees")
      .select("id, name, role_description, domain_description, status, safe_default_action, created_at, department:departments(id, name, is_staffed)")
      .eq("id", employeeId)
      .single(),
    admin
      .from("employee_signals")
      .select("signal_name, value, real_description, computed_at")
      .eq("employee_id", employeeId)
      .order("computed_at", { ascending: false })
      .limit(50),
    admin
      .from("learning_log")
      .select("id, task_ref, outcome, conclusion, created_at")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (empRes.error?.code === "PGRST116") return null;
  if (empRes.error) throw new Error(`getEmployeeDetail: ${empRes.error.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e: any = empRes.data;
  const employee: EmployeeRow = {
    id: e.id,
    name: e.name,
    roleDescription: e.role_description,
    domainDescription: e.domain_description,
    status: e.status,
    safeDefaultAction: e.safe_default_action ?? null,
    createdAt: e.created_at,
    department: e.department
      ? { id: e.department.id, name: e.department.name, isStaffed: e.department.is_staffed }
      : null,
    latestSignals: {},
  };

  return {
    employee,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signalHistory: (sigRes.data ?? []).map((s: any) => ({
      signalName: s.signal_name,
      value: s.value,
      realDescription: s.real_description,
      computedAt: s.computed_at,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    learningLog: (logRes.data ?? []).map((l: any) => ({
      id: l.id,
      taskRef: l.task_ref ?? null,
      outcome: l.outcome,
      conclusion: l.conclusion,
      createdAt: l.created_at,
    })),
  };
}

// ── 10. Compute + write Website Agent signals ─────────────────────────────────
// Source of truth: websites table (all tenants, all time).
// Writes one new row per signal name into employee_signals.
// Hard Rule 22: every trait maps to a named, queryable real signal.

export interface WebsiteAgentSignalResult {
  employeeId: string;
  signalsWritten: number;
  signals: Array<{ signalName: string; value: number; realDescription: string }>;
}

export async function computeWebsiteAgentSignals(
  admin: AdminClient,
  employeeId: string,
): Promise<WebsiteAgentSignalResult> {
  const { data: rows, error } = await admin
    .from("websites")
    .select("id, draft_html, is_published");

  if (error) throw new Error(`computeWebsiteAgentSignals/query: ${error.message}`);

  const totalSites: number = (rows ?? []).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sitesWithDraft: number = (rows ?? []).filter((r: any) => r.draft_html != null).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publishedSites: number = (rows ?? []).filter((r: any) => r.is_published === true).length;
  const generationSuccessRate = totalSites > 0
    ? parseFloat(((sitesWithDraft / totalSites) * 100).toFixed(1))
    : 0;
  const publishRate = totalSites > 0
    ? parseFloat(((publishedSites / totalSites) * 100).toFixed(1))
    : 0;

  const signals = [
    {
      signalName: "total_sites",
      value: totalSites,
      realDescription: "Total websites rows across all tenants (websites table, all time)",
    },
    {
      signalName: "sites_with_draft",
      value: sitesWithDraft,
      realDescription: "Websites where draft_html IS NOT NULL — proxy for at least one successful generation",
    },
    {
      signalName: "published_sites",
      value: publishedSites,
      realDescription: "Websites where is_published = true — owner explicitly published",
    },
    {
      signalName: "generation_success_rate",
      value: generationSuccessRate,
      realDescription: "sites_with_draft / total_sites × 100 — all-time generation success rate (%)",
    },
    {
      signalName: "publish_rate",
      value: publishRate,
      realDescription: "published_sites / total_sites × 100 — share of created sites that were published (%)",
    },
  ];

  const now = new Date().toISOString();
  const insertRows = signals.map((s) => ({
    employee_id: employeeId,
    signal_name: s.signalName,
    real_description: s.realDescription,
    value: s.value,
    computed_at: now,
  }));

  const { error: insertError } = await admin.from("employee_signals").insert(insertRows);
  if (insertError) throw new Error(`computeWebsiteAgentSignals/insert: ${insertError.message}`);

  return { employeeId, signalsWritten: signals.length, signals };
}

// ── 11. Compute + write Phone Agent signals ───────────────────────────────────
// Source of truth: agent_calls table — confirmed live with real data in Phase 1
// (migration_v13b, e2e-agent-calls-verify.mjs 17/17, commit 0ad59bc).
// Signal window: 90-day recent window + all-time totals.
// Caveat: Twilio inbound not yet connected (VAPI_WEBHOOK_SECRET placeholder) —
// call volume is low/near-zero in production until final integration day.
// Hard Rule 22: every trait maps to a named, queryable real signal.

export interface PhoneAgentSignalResult {
  employeeId: string;
  signalsWritten: number;
  signals: Array<{ signalName: string; value: number; realDescription: string }>;
}

const CALL_WINDOW_DAYS = 90;

export async function computePhoneAgentSignals(
  admin: AdminClient,
  employeeId: string,
): Promise<PhoneAgentSignalResult> {
  const windowStart = new Date(Date.now() - CALL_WINDOW_DAYS * 86_400_000).toISOString();

  const [allCallsRes, windowCallsRes] = await Promise.all([
    admin.from("agent_calls").select("tenant_id, duration_seconds"),
    admin.from("agent_calls").select("tenant_id, duration_seconds").gte("created_at", windowStart),
  ]);

  if (allCallsRes.error) throw new Error(`computePhoneAgentSignals/all: ${allCallsRes.error.message}`);
  if (windowCallsRes.error) throw new Error(`computePhoneAgentSignals/window: ${windowCallsRes.error.message}`);

  const allCalls: Array<{ tenant_id: string; duration_seconds: number | null }> = allCallsRes.data ?? [];
  const windowCalls: Array<{ tenant_id: string; duration_seconds: number | null }> = windowCallsRes.data ?? [];

  const totalCalls = allCalls.length;
  const calls90d = windowCalls.length;
  const tenantsWithCalls = new Set(allCalls.map((c) => c.tenant_id)).size;

  const callsWithDuration = allCalls.filter((c) => c.duration_seconds != null);
  const avgDurationSecs = callsWithDuration.length > 0
    ? parseFloat((
        callsWithDuration.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / callsWithDuration.length
      ).toFixed(1))
    : 0;

  const totalVoiceMinutes = parseFloat((
    allCalls.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / 60
  ).toFixed(1));

  const signals = [
    {
      signalName: "total_calls",
      value: totalCalls,
      realDescription: "Total agent_calls rows all time — all inbound/outbound voice calls recorded",
    },
    {
      signalName: "calls_90d",
      value: calls90d,
      realDescription: `agent_calls rows in the last ${CALL_WINDOW_DAYS} days — recent call volume`,
    },
    {
      signalName: "tenants_with_calls",
      value: tenantsWithCalls,
      realDescription: "Distinct tenant_id values in agent_calls — tenants that have made at least one call",
    },
    {
      signalName: "avg_duration_secs",
      value: avgDurationSecs,
      realDescription: "Average duration_seconds across all calls with non-null duration — call length proxy",
    },
    {
      signalName: "total_voice_minutes",
      value: totalVoiceMinutes,
      realDescription: "Sum of duration_seconds / 60 across all agent_calls — total voice minutes consumed all time",
    },
  ];

  const now_iso = new Date().toISOString();
  const insertRows = signals.map((s) => ({
    employee_id: employeeId,
    signal_name: s.signalName,
    real_description: s.realDescription,
    value: s.value,
    computed_at: now_iso,
  }));

  const { error: insertError } = await admin.from("employee_signals").insert(insertRows);
  if (insertError) throw new Error(`computePhoneAgentSignals/insert: ${insertError.message}`);

  return { employeeId, signalsWritten: signals.length, signals };
}

// ── 13. Compute + write Trainer Agent signals ─────────────────────────────────
// Source of truth: tenants table (count) + tenant_config.knowledge_base_updated_at
// (written by save-call/route.ts and ai-training/route.ts on every KB save —
// added in migration_v13b, confirmed live July 31, 2026).
// Hard Rule 22: every trait maps to a named, queryable real signal.

export interface TrainerAgentSignalResult {
  employeeId: string;
  signalsWritten: number;
  signals: Array<{ signalName: string; value: number; realDescription: string }>;
}

const KB_STALE_DAYS = 90;

export async function computeTrainerAgentSignals(
  admin: AdminClient,
  employeeId: string,
): Promise<TrainerAgentSignalResult> {
  const [tenantsRes, configsRes] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("tenant_config").select("tenant_id, knowledge_base_updated_at"),
  ]);

  if (tenantsRes.error) throw new Error(`computeTrainerAgentSignals/tenants: ${tenantsRes.error.message}`);
  if (configsRes.error) throw new Error(`computeTrainerAgentSignals/configs: ${configsRes.error.message}`);

  const totalTenants = tenantsRes.count ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configs: Array<{ knowledge_base_updated_at: string | null }> = configsRes.data ?? [];

  const now = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trainedConfigs = configs.filter((c: any) => c.knowledge_base_updated_at != null);
  const tenantsWithKb = trainedConfigs.length;

  const kbTrainedRate = totalTenants > 0
    ? parseFloat(((tenantsWithKb / totalTenants) * 100).toFixed(1))
    : 0;

  const avgKbAgeDays = tenantsWithKb > 0
    ? parseFloat((
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trainedConfigs.reduce((sum: number, c: any) =>
          sum + Math.floor((now - new Date(c.knowledge_base_updated_at).getTime()) / 86_400_000), 0
        ) / tenantsWithKb
      ).toFixed(1))
    : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kbStaleCount = trainedConfigs.filter((c: any) =>
    Math.floor((now - new Date(c.knowledge_base_updated_at).getTime()) / 86_400_000) > KB_STALE_DAYS
  ).length;

  const signals = [
    {
      signalName: "total_tenants",
      value: totalTenants,
      realDescription: "Total tenant rows (tenants table, all time)",
    },
    {
      signalName: "tenants_with_kb",
      value: tenantsWithKb,
      realDescription: "Tenants where knowledge_base_updated_at IS NOT NULL — at least one AI training session completed",
    },
    {
      signalName: "kb_trained_rate",
      value: kbTrainedRate,
      realDescription: "tenants_with_kb / total_tenants × 100 — share of tenants that have completed at least one AI training session (%)",
    },
    {
      signalName: "avg_kb_age_days",
      value: avgKbAgeDays,
      realDescription: "Average days since knowledge_base_updated_at across trained tenants — KB freshness proxy",
    },
    {
      signalName: "kb_stale_count",
      value: kbStaleCount,
      realDescription: `Trained tenants where knowledge_base_updated_at is older than ${KB_STALE_DAYS} days — staleness proxy`,
    },
  ];

  const now_iso = new Date().toISOString();
  const insertRows = signals.map((s) => ({
    employee_id: employeeId,
    signal_name: s.signalName,
    real_description: s.realDescription,
    value: s.value,
    computed_at: now_iso,
  }));

  const { error: insertError } = await admin.from("employee_signals").insert(insertRows);
  if (insertError) throw new Error(`computeTrainerAgentSignals/insert: ${insertError.message}`);

  return { employeeId, signalsWritten: signals.length, signals };
}

// ── 12. Compute + write Support Agent signals ─────────────────────────────────
// Source of truth: conversations table — needs_human flag and needs_human_resolved_at.
// Written by /api/conversations/[id]/resolve (sets needs_human=false + resolved_at).
// Level 0 — observed only. No ticket system, no inbound email, no SLA tracking.
// Hard Rule 22: every trait maps to a named, queryable real signal.

export interface SupportAgentSignalResult {
  employeeId: string;
  signalsWritten: number;
  signals: Array<{ signalName: string; value: number; realDescription: string }>;
}

export async function computeSupportAgentSignals(
  admin: AdminClient,
  employeeId: string,
): Promise<SupportAgentSignalResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const [openRes, staleRes, tenantsRes, resolvedRes] = await Promise.all([
    // open escalations: needs_human = true (all tenants, all time)
    admin
      .from("conversations")
      .select("id, tenant_id", { count: "exact", head: true })
      .eq("needs_human", true),
    // stale: needs_human = true AND last_message_at older than 24h
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("needs_human", true)
      .lt("last_message_at", twentyFourHoursAgo),
    // distinct tenants with open escalations (needs full rows to deduplicate)
    admin
      .from("conversations")
      .select("tenant_id")
      .eq("needs_human", true),
    // resolved in last 30 days
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .not("needs_human_resolved_at", "is", null)
      .gte("needs_human_resolved_at", thirtyDaysAgo),
  ]);

  if (openRes.error) throw new Error(`computeSupportAgentSignals/open: ${openRes.error.message}`);
  if (staleRes.error) throw new Error(`computeSupportAgentSignals/stale: ${staleRes.error.message}`);
  if (resolvedRes.error) throw new Error(`computeSupportAgentSignals/resolved: ${resolvedRes.error.message}`);

  const openCount = openRes.count ?? 0;
  const staleCount = staleRes.count ?? 0;
  const tenantsWithEscalations = new Set(
    (tenantsRes.data ?? []).map((r: { tenant_id: string }) => r.tenant_id),
  ).size;
  const resolvedLast30d = resolvedRes.count ?? 0;

  const signals = [
    {
      signalName: "open_escalations_count",
      value: openCount,
      realDescription:
        "conversations table COUNT WHERE needs_human = true — total open human-handoff requests (all tenants, never reset without explicit resolve)",
    },
    {
      signalName: "stale_escalations_count",
      value: staleCount,
      realDescription:
        "conversations WHERE needs_human = true AND last_message_at < now() - 24h — escalations with no recent activity (aging proxy)",
    },
    {
      signalName: "tenants_with_escalations",
      value: tenantsWithEscalations,
      realDescription:
        "COUNT DISTINCT tenant_id WHERE needs_human = true — number of tenants that currently have at least one open escalation",
    },
    {
      signalName: "resolved_last_30_days",
      value: resolvedLast30d,
      realDescription:
        "conversations WHERE needs_human_resolved_at IS NOT NULL AND needs_human_resolved_at >= now() - 30 days — escalations explicitly marked resolved in the last 30 days",
    },
  ];

  const now_iso = new Date().toISOString();
  const insertRows = signals.map((s) => ({
    employee_id: employeeId,
    signal_name: s.signalName,
    real_description: s.realDescription,
    value: s.value,
    computed_at: now_iso,
  }));

  const { error: insertError } = await admin.from("employee_signals").insert(insertRows);
  if (insertError) throw new Error(`computeSupportAgentSignals/insert: ${insertError.message}`);

  return { employeeId, signalsWritten: signals.length, signals };
}

// ── 14. Compute + write Analytics/Insights Agent signals ─────────────────────
// Source of truth: getPlatformActivitySummary() — reuses the same four COUNT
// queries already verified in Phase 1 (conversations, leads, appointments,
// agent_calls, all scoped to the current UTC month).
// Level 0 capability only: real-data reporting. Correlation-detection and
// Company-Brain-writing are future tiers — not built, not described here.
// Hard Rule 22: every trait maps to a named, queryable real signal.

export interface AnalyticsAgentSignalResult {
  employeeId: string;
  signalsWritten: number;
  signals: Array<{ signalName: string; value: number; realDescription: string }>;
}

export async function computeAnalyticsAgentSignals(
  admin: AdminClient,
  employeeId: string,
): Promise<AnalyticsAgentSignalResult> {
  const activity = await getPlatformActivitySummary(admin);

  const totalEvents =
    activity.conversations + activity.leads + activity.appointments + activity.calls;

  const signals = [
    {
      signalName: "conversations_this_month",
      value: activity.conversations,
      realDescription: `conversations table COUNT WHERE created_at >= ${activity.periodStart} — inbound messages this month`,
    },
    {
      signalName: "leads_this_month",
      value: activity.leads,
      realDescription: `leads table COUNT WHERE created_at >= ${activity.periodStart} — new leads captured this month`,
    },
    {
      signalName: "appointments_this_month",
      value: activity.appointments,
      realDescription: `appointments table COUNT WHERE created_at >= ${activity.periodStart} — bookings made this month`,
    },
    {
      signalName: "calls_this_month",
      value: activity.calls,
      realDescription: `agent_calls table COUNT WHERE created_at >= ${activity.periodStart} — voice calls this month`,
    },
    {
      signalName: "total_events_this_month",
      value: totalEvents,
      realDescription: "Sum of conversations + leads + appointments + calls for the current UTC month — combined platform activity signal",
    },
  ];

  const now_iso = new Date().toISOString();
  const insertRows = signals.map((s) => ({
    employee_id: employeeId,
    signal_name: s.signalName,
    real_description: s.realDescription,
    value: s.value,
    computed_at: now_iso,
  }));

  const { error: insertError } = await admin.from("employee_signals").insert(insertRows);
  if (insertError) throw new Error(`computeAnalyticsAgentSignals/insert: ${insertError.message}`);

  return { employeeId, signalsWritten: signals.length, signals };
}
