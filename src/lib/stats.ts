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
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
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
    computeAiResolutionRate(admin, tenantId),
  ]);

  const totalLeads = totalLeadsRes.count ?? 0;
  const newLeads = newLeadsRes.count ?? 0;
  const prevLeads = prevLeadsRes.count ?? 0;
  const appts = apptsRes.count ?? 0;
  const prevAppts = prevApptsRes.count ?? 0;
  const convs = convsRes.count ?? 0;
  const prevConvs = prevConvsRes.count ?? 0;
  const needsHuman = needsHumanRes.count ?? 0;

  return {
    totalLeads,
    newLeadsThisWeek: newLeads,
    newLeadsChange: pctChange(newLeads, prevLeads),
    appointmentsThisWeek: appts,
    appointmentsChange: pctChange(appts, prevAppts),
    conversationsThisWeek: convs,
    conversationsChange: pctChange(convs, prevConvs),
    needsHumanCount: needsHuman,
    leadsToday: leadsTodayRes.count ?? 0,
    appointmentsToday: apptsTodayRes.count ?? 0,
    messagesToday: messagesTodayRes.count ?? 0,
    // agent_calls may not exist for tenants who never enabled the phone
    // agent's underlying table access path -- treat a query error as 0,
    // never let it break the rest of the dashboard.
    callsToday: callsTodayRes?.count ?? 0,
    aiResolutionRate,
  };
}
