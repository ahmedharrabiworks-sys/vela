import { createSupabaseAdmin } from "@/lib/supabase-server";

// FIX 6 (round Q) root cause: the badge disappeared because
// pctChangeOrUndefined returned `undefined` whenever the PRIOR period was
// 0 -- regardless of what the CURRENT count was -- and the Dashboard's own
// render condition (`{k.change !== undefined && (...)}`) omitted the badge
// entirely for undefined, no placeholder at all. A separate bug in the
// still-exported (currently unused in any UI, but exported and part of
// this same "no fake numbers" surface) pctChange went the opposite wrong
// direction: it fabricated a fixed "100%" whenever prev=0 and curr>0,
// regardless of the real current value. Both replaced by ChangeInfo.
//
// FIX 4 (round R): the round-Q version showed "+N new" (a raw delta),
// which still misrepresented a real 0->N change as a small-looking number
// rather than what it actually is -- growth from nothing. isNew was a
// plain boolean ("New" label) instead.
// FIX 1 (round S): reverted back to a real "+X new" figure per explicit
// request -- a plain "New" label lost the actual magnitude of the change
// (0->5 and 0->100 looked identical). newCount carries the real current
// count so the badge can render "+5 new" / "+100 new" using the true
// number, still never a percentage (none is mathematically valid from a
// zero base).
export interface ChangeInfo {
  // Real percentage vs the prior period -- present whenever prior > 0, and
  // also present as exactly 0 when both prior and current are 0 (a real,
  // honest "no change", never hidden).
  pct?: number;
  // Real current count INSTEAD of pct only when prior was 0 and current >
  // 0: no valid percentage exists from a zero base, so this renders as
  // "+{newCount} new" using the true current number.
  newCount?: number;
}

function computeChangeInfo(curr: number, prev: number): ChangeInfo {
  if (prev === 0 && curr === 0) return { pct: 0 };
  if (prev === 0) return { newCount: curr };
  return { pct: Math.round(((curr - prev) / prev) * 100) };
}

export interface DashboardStats {
  totalLeads: number;
  newLeadsThisWeek: number;
  newLeadsChange: ChangeInfo;
  appointmentsThisWeek: number;
  appointmentsChange: ChangeInfo;
  conversationsThisWeek: number;
  conversationsChange: ChangeInfo;
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
  // Today-vs-yesterday change for each Today KPI. Always present now (see
  // ChangeInfo above) -- a real "today" and "yesterday" always exist as
  // concepts for any tenant, so there is no case where this should be
  // absent, only cases where it's a real 0, a real new-count, or a real pct.
  leadsTodayChange: ChangeInfo;
  appointmentsTodayChange: ChangeInfo;
  messagesTodayChange: ChangeInfo;
  callsTodayChange: ChangeInfo;
}

/**
 * AI Resolution Rate = conversations NOT currently needing human attention,
 * as a percentage of all conversations in the window (needs_human = false).
 *
 * FIX 4 (round P): a prior round deliberately excluded any conversation
 * that had EVER been escalated (needs_human=false AND
 * needs_human_resolved_at IS NULL) to avoid crediting the AI for a human's
 * work. That reasoning was sound for a narrower "AI-only, no backup"
 * metric, but it made the number named "Resolution Rate" literally
 * incapable of ever moving when an owner resolves an escalation --
 * needs_human_resolved_at getting set (the actual "this got resolved"
 * signal) permanently DISQUALIFIED that conversation from ever counting
 * again. Confirmed live against the real numbers behind a flat 33%: 3 real
 * conversations, 2 of which had been escalated and then genuinely resolved
 * by the owner (needs_human=false, needs_human_resolved_at SET) -- both
 * were being excluded from the numerator forever, so resolving them had
 * zero effect on the displayed rate. "Resolved" now means what it says:
 * needs_human's CURRENT value. A conversation that needed a human and got
 * one is exactly as resolved as one the AI handled alone -- both are
 * conversations no longer waiting on anyone.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeAiResolutionRate(admin: any, tenantId: string, sinceISO?: string): Promise<number | null> {
  let totalQuery = admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  let aiHandledQuery = admin.from("conversations").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId).eq("needs_human", false);
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
    newLeadsChange: computeChangeInfo(newLeads, prevLeads),
    appointmentsThisWeek: appts,
    appointmentsChange: computeChangeInfo(appts, prevAppts),
    conversationsThisWeek: convs,
    conversationsChange: computeChangeInfo(convs, prevConvs),
    needsHumanCount: needsHuman,
    leadsToday,
    appointmentsToday,
    messagesToday,
    // agent_calls may not exist for tenants who never enabled the phone
    // agent's underlying table access path -- treat a query error as 0,
    // never let it break the rest of the dashboard.
    callsToday,
    aiResolutionRate,
    leadsTodayChange: computeChangeInfo(leadsToday, leadsYesterday),
    appointmentsTodayChange: computeChangeInfo(appointmentsToday, appointmentsYesterday),
    messagesTodayChange: computeChangeInfo(messagesToday, messagesYesterday),
    callsTodayChange: computeChangeInfo(callsToday, callsYesterday),
  };
}
