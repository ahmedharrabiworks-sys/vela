import { createSupabaseAdmin } from "@/lib/supabase-server";

export interface DashboardStats {
  totalLeads: number;
  newLeadsThisWeek: number;
  newLeadsChange: number;
  appointmentsThisWeek: number;
  appointmentsChange: number;
  conversationsThisWeek: number;
  conversationsChange: number;
  needsHumanCount: number;
  // Today's real counts — command-center view (Dashboard redesign)
  leadsToday: number;
  appointmentsToday: number;
  messagesToday: number;
  callsToday: number;
  // AI Resolution Rate — real percentage of conversations the AI handled
  // without ever needing a human handoff (see computeAiResolutionRate below
  // for the exact definition). null when there's no real data yet (honest
  // zero-state, never a fabricated 0% or 100%).
  aiResolutionRate: number | null;
  // Today-vs-yesterday percent change for each Today KPI. undefined (key
  // omitted from the object) when yesterday has zero of that metric --
  // never fabricated as a misleading "100%" or "0%" against an empty prior
  // period. See pctChangeOrUndefined below.
  leadsTodayChange?: number;
  appointmentsTodayChange?: number;
  messagesTodayChange?: number;
  callsTodayChange?: number;
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

// Unlike pctChange above (used for the existing weekly fields), this never
// fabricates a change percentage when there's no real prior-period data to
// compare against -- returns undefined so the caller can omit the badge
// entirely rather than showing a misleading "up 100%" against zero.
function pctChangeOrUndefined(curr: number, prev: number): number | undefined {
  if (prev === 0) return undefined;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * AI Resolution Rate = conversations the AI fully handled without EVER
 * needing a human handoff, as a percentage of all conversations in the
 * window. Deliberately NOT "needs_human = false" alone -- that column is
 * reset to false once an owner resolves an escalation (see
 * conversations/[id]/resolve/route.ts), so a plain needs_human=false count
 * would wrongly credit the AI for conversations a human actually stepped
 * in on. needs_human_resolved_at is only ever set once an escalation
 * happened, so "never escalated" is the real signal: needs_human = false
 * AND needs_human_resolved_at IS NULL.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeAiResolutionRate(admin: any, tenantId: string, sinceISO?: string): Promise<number | null> {
  let totalQuery = admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  let aiHandledQuery = admin.from("conversations").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId).eq("needs_human", false).is("needs_human_resolved_at", null);
  if (sinceISO) {
    totalQuery = totalQuery.gte("created_at", sinceISO);
    aiHandledQuery = aiHandledQuery.gte("created_at", sinceISO);
  }
  const [{ count: total }, { count: aiHandled }] = await Promise.all([totalQuery, aiHandledQuery]);
  if (!total || total === 0) return null;
  return Math.round(((aiHandled ?? 0) / total) * 100);
}

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalLeadsRes,
    newLeadsRes,
    prevLeadsRes,
    apptsRes,
    prevApptsRes,
    convsRes,
    prevConvsRes,
    needsHumanRes,
    leadsTodayRes,
    apptsTodayRes,
    messagesTodayRes,
    callsTodayRes,
    leadsYesterdayRes,
    apptsYesterdayRes,
    messagesYesterdayRes,
    callsYesterdayRes,
    aiResolutionRate,
  ] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("needs_human", true),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", todayStart.toISOString()),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", todayStart.toISOString()),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_test", false).gte("created_at", todayStart.toISOString()),
    admin.from("agent_calls").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", todayStart.toISOString()),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_test", false).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
    admin.from("agent_calls").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
    // CRITICAL FIX: this previously computed over ALL-TIME conversations
    // (no sinceISO), while every other figure in this "Today" command-center
    // is scoped to today -- confirmed live, a tenant with old resolved
    // conversations but zero activity today showed a misleading "100%" next
    // to four genuine zeros. Scoped to today so a day with no conversations
    // correctly returns null ("No data yet"), consistent with the rest of
    // this KPI strip and with how Analytics scopes its own version to its
    // selected window rather than all time.
    computeAiResolutionRate(admin, tenantId, todayStart.toISOString()),
  ]);

  const totalLeads = totalLeadsRes.count ?? 0;
  const newLeads = newLeadsRes.count ?? 0;
  const prevLeads = prevLeadsRes.count ?? 0;
  const appts = apptsRes.count ?? 0;
  const prevAppts = prevApptsRes.count ?? 0;
  const convs = convsRes.count ?? 0;
  const prevConvs = prevConvsRes.count ?? 0;
  const needsHuman = needsHumanRes.count ?? 0;

  const leadsToday = leadsTodayRes.count ?? 0;
  const appointmentsToday = apptsTodayRes.count ?? 0;
  const messagesToday = messagesTodayRes.count ?? 0;
  const callsToday = callsTodayRes?.count ?? 0;
  const leadsYesterday = leadsYesterdayRes.count ?? 0;
  const appointmentsYesterday = apptsYesterdayRes.count ?? 0;
  const messagesYesterday = messagesYesterdayRes.count ?? 0;
  const callsYesterday = callsYesterdayRes?.count ?? 0;

  return {
    totalLeads,
    newLeadsThisWeek: newLeads,
    newLeadsChange: pctChange(newLeads, prevLeads),
    appointmentsThisWeek: appts,
    appointmentsChange: pctChange(appts, prevAppts),
    conversationsThisWeek: convs,
    conversationsChange: pctChange(convs, prevConvs),
    needsHumanCount: needsHuman,
    leadsToday,
    appointmentsToday,
    messagesToday,
    // agent_calls may not exist for tenants who never enabled the phone
    // agent's underlying table access path -- treat a query error as 0,
    // never let it break the rest of the dashboard.
    callsToday,
    aiResolutionRate,
    leadsTodayChange: pctChangeOrUndefined(leadsToday, leadsYesterday),
    appointmentsTodayChange: pctChangeOrUndefined(appointmentsToday, appointmentsYesterday),
    messagesTodayChange: pctChangeOrUndefined(messagesToday, messagesYesterday),
    callsTodayChange: pctChangeOrUndefined(callsToday, callsYesterday),
  };
}
