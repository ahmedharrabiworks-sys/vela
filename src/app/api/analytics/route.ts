import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tenantId: string;
  let businessName: string;
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    tenantId = tenant.id;
    businessName = tenant.business_name;
    console.log("[analytics] tenant resolved:", tenantId, "user:", user.id);
  } catch (err) {
    console.error("[analytics] ensureTenant failed for user", user.id, ":", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Fetch 180 days so we can compute period-over-period for any range, and
  // so the same payload doubles as "full real history" for the per-metric
  // detail view (Analytics redesign) without a second endpoint.
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  // UTC-day boundary, matching the same convention every other "today"
  // calculation in this file already uses (created_at.slice(0,10) against
  // ISO/UTC timestamps) -- used below for the hourly-today breakdown.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Real website-visit time series (site_visits, per-visit rows) — joined
  // via this tenant's website ids. Graceful: an empty/missing table (e.g.
  // migration_v28.sql not yet run) just yields no rows, never an error that
  // breaks the rest of the page.
  const { data: websiteRows } = await admin.from("websites").select("id").eq("tenant_id", tenantId);
  const websiteIds = ((websiteRows as { id: string }[] | null) ?? []).map((w) => w.id);

  // Round M FIX 11: real, confirmed cause of the Dashboard-vs-Analytics
  // count mismatch reported live -- Dashboard (lib/stats.ts) does bounded
  // per-window count() queries with server-computed date boundaries;
  // Analytics does this ONE wide 180-day fetch, bucketed into UTC-calendar-
  // day maps, then SUMMED CLIENT-SIDE in analytics/page.tsx (periodSum/
  // buildDayArray) against the browser's own Date.now() -- a genuinely
  // different architecture, not just a different window. Two real,
  // concrete gaps closed here that were unconditionally over-counting
  // relative to Dashboard AND the Leads/CRM list itself: neither leads nor
  // conversations were ever filtered by deleted_at (a soft-deleted/Recycle
  // Bin row still counted here). The remaining difference -- Dashboard's
  // "today" figure has no Analytics equivalent at all (Analytics has no
  // day view, only 7d/30d/90d) -- is a real architectural difference, not
  // a bug: comparing Dashboard's "leads today" against Analytics' 7-day
  // sum was never actually the same period to begin with.
  const [leadsRes, convsRes, apptsRes, configRes, visitsRes] = await Promise.all([
    admin.from("leads").select("id, channel, created_at").eq("tenant_id", tenantId).is("deleted_at", null).gte("created_at", oneEightyDaysAgo),
    admin.from("conversations").select("channel, created_at, lead_id, needs_human, needs_human_resolved_at").eq("tenant_id", tenantId).is("deleted_at", null).gte("created_at", oneEightyDaysAgo),
    admin.from("appointments").select("created_at, status, conversation_id").eq("tenant_id", tenantId).is("deleted_at", null).gte("created_at", oneEightyDaysAgo),
    admin.from("tenant_config").select("website_visit_count").eq("tenant_id", tenantId).maybeSingle(),
    websiteIds.length > 0
      ? admin.from("site_visits").select("created_at").in("website_id", websiteIds).gte("created_at", oneEightyDaysAgo)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (leadsRes.error) console.error("[analytics] leads query error:", leadsRes.error.message, leadsRes.error.code);
  if (convsRes.error) console.error("[analytics] conversations query error:", convsRes.error.message, convsRes.error.code);
  if (apptsRes.error) console.error("[analytics] appointments query error:", apptsRes.error.message, apptsRes.error.code);
  if (visitsRes.error) console.error("[analytics] site_visits query error (non-fatal — likely migration_v28.sql pending):", visitsRes.error.message, visitsRes.error.code);
  const websiteVisits = ((configRes.data as Record<string, unknown> | null)?.website_visit_count as number | null) ?? 0;

  const leads: { id: string; channel: string | null; created_at: string }[] = leadsRes.data ?? [];
  const conversations: { channel: string; created_at: string; lead_id: string | null; needs_human: boolean; needs_human_resolved_at: string | null }[] = convsRes.data ?? [];
  const appointments: { created_at: string; status: string; conversation_id: string | null }[] = apptsRes.data ?? [];
  const visits: { created_at: string }[] = visitsRes.data ?? [];
  console.log("[analytics] data counts:", { leads: leads.length, conversations: conversations.length, appointments: appointments.length, visits: visits.length });

  // Daily counts for past 180 days (leads, conversations, appointments, visits)
  const dailyCounts: Record<string, number> = {};
  const dailyConvCounts: Record<string, number> = {};
  const dailyApptCounts: Record<string, number> = {};
  const dailyVisitCounts: Record<string, number> = {};
  // Real day-by-day AI-resolution buckets, so the AI Resolution Rate KPI
  // card can respect the same 7d/30d/90d range selector as every other
  // card (previously fixed to a single 180-day window regardless of the
  // selected range) and get a real period-over-period trend badge, the
  // same way the other 3 cards already do. FIX 4 (round P): definition
  // matches computeAiResolutionRate in lib/stats.ts -- CURRENT needs_human
  // value (resolved, whether or not a human was ever involved along the
  // way), not "never escalated" -- see that file for the full root-cause
  // explanation of why the stricter definition made this number unable to
  // move when an owner actually resolved something.
  const dailyConvAiHandled: Record<string, number> = {};
  // Real AI-attributed appointment count, day by day -- an appointment is
  // AI-booked when it carries a conversation_id (only ai/reply's booking
  // flow sets this; manually-added appointments from the Appointments page
  // never do). Used for the honest "Booked by Vela AI" subtitle -- omitted
  // entirely when this is 0 rather than ever implying AI booked something
  // a human added by hand.
  const dailyApptAiBooked: Record<string, number> = {};

  // Round M10 FIX 5: real, confirmed cause of Leads showing 0 for "Today"
  // while Conversations/Appointments correctly showed 1 for the SAME real
  // activity -- live data check found a real conversation + real
  // appointment created today, both referencing a real lead whose OWN
  // created_at was from yesterday (a returning customer engaging again, not
  // a brand-new lead). dailyCounts (leads) buckets strictly by
  // leads.created_at, so a repeat lead's renewed activity today is
  // invisible to it, even though it's exactly as real as today's
  // conversation/appointment. dailyLeadTouches is a separate, additive
  // signal: the same distinct-lead-via-real-FK technique the channel
  // breakdown below already uses (see its own "CRITICAL FIX" comment) --
  // a lead counts for a given day if it was CREATED that day OR REFERENCED
  // by a conversation created that day (deduplicated via a Set, so a lead
  // with both events on the same day only counts once). Used only for the
  // single-day "Today" view (analytics/page.tsx) -- 7d/30d/90d keep using
  // plain dailyCounts unchanged, since summing per-day distinct-lead sets
  // across a multi-day range would double-count a repeat lead active on
  // more than one day within that range, which was never reported as wrong
  // and risks a real regression for no reported benefit.
  const leadTouchSets: Record<string, Set<string>> = {};
  const dailyLeadTouches: Record<string, number> = {};

  leads.forEach((l) => {
    const date = l.created_at.slice(0, 10);
    dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
    (leadTouchSets[date] ??= new Set()).add(l.id);
  });
  conversations.forEach((c) => {
    const date = c.created_at.slice(0, 10);
    dailyConvCounts[date] = (dailyConvCounts[date] ?? 0) + 1;
    if (c.needs_human === false) {
      dailyConvAiHandled[date] = (dailyConvAiHandled[date] ?? 0) + 1;
    }
    if (c.lead_id) {
      (leadTouchSets[date] ??= new Set()).add(c.lead_id);
    }
  });
  Object.entries(leadTouchSets).forEach(([date, set]) => { dailyLeadTouches[date] = set.size; });

  // Round M10 FIX 5 follow-up: real, confirmed cause of the "Today" chart
  // showing a single dot with no line -- live data check found genuine
  // intra-day spread (two real conversations today, ~12.5 hours apart:
  // 07:28 and 19:59 UTC), so this is a real bucketing bug, not "correctly
  // just one point" -- the day-level maps above collapse an entire day into
  // ONE bucket by design (needed for the 7d/30d/90d line charts), so a
  // single-day range can only ever plot one x-axis point from them. Adds a
  // SEPARATE, additive 24-length hourly breakdown covering ONLY today (UTC
  // hour 0-23), used exclusively by the client's "1d"/Today chart view --
  // 7d/30d/90d keep reading the unchanged day-level maps above. Leads use
  // the same touch-based definition as dailyLeadTouches above (a lead
  // created that hour OR referenced by a conversation created that hour),
  // for the same consistency reason that fix already established.
  const hourlyLeadTouchSets: Set<string>[] = Array.from({ length: 24 }, () => new Set<string>());
  const hourlyConvCounts: number[] = Array(24).fill(0);
  const hourlyApptCounts: number[] = Array(24).fill(0);
  const todayStartMs = todayStart.getTime();
  const tomorrowStartMs = todayStartMs + 24 * 60 * 60 * 1000;
  const hourIndexIfToday = (iso: string): number | null => {
    const ms = new Date(iso).getTime();
    if (ms < todayStartMs || ms >= tomorrowStartMs) return null;
    return Math.floor((ms - todayStartMs) / (60 * 60 * 1000));
  };
  leads.forEach((l) => {
    const h = hourIndexIfToday(l.created_at);
    if (h !== null) hourlyLeadTouchSets[h].add(l.id);
  });
  conversations.forEach((c) => {
    const h = hourIndexIfToday(c.created_at);
    if (h === null) return;
    hourlyConvCounts[h] += 1;
    if (c.lead_id) hourlyLeadTouchSets[h].add(c.lead_id);
  });
  appointments.forEach((a) => {
    const h = hourIndexIfToday(a.created_at);
    if (h !== null) hourlyApptCounts[h] += 1;
  });
  const hourlyLeadTouches = hourlyLeadTouchSets.map((s) => s.size);

  appointments.forEach((a) => {
    const date = a.created_at.slice(0, 10);
    dailyApptCounts[date] = (dailyApptCounts[date] ?? 0) + 1;
    if (a.conversation_id) {
      dailyApptAiBooked[date] = (dailyApptAiBooked[date] ?? 0) + 1;
    }
  });
  visits.forEach((v) => {
    const date = v.created_at.slice(0, 10);
    dailyVisitCounts[date] = (dailyVisitCounts[date] ?? 0) + 1;
  });

  // Channel breakdown (last 90 days) — leads AND conversations per channel,
  // matching the reference design's two-column breakdown table.
  //
  // CRITICAL FIX: "Leads" per channel previously came from an independent
  // leads.channel query, with no trace back to a real conversation on that
  // channel -- confirmed live, this let Leads exceed Conversations for the
  // same channel (e.g. leads created directly by the website booking form,
  // or manually in Leads/CRM, carry a channel value but were never part of
  // any conversation). Fixed by deriving Leads per channel from the real FK
  // instead: conversations.lead_id, counted as DISTINCT lead ids per
  // channel. This makes Leads <= Conversations for a channel a mathematical
  // guarantee (every counted lead requires at least one conversation on
  // that channel to have referenced it) rather than a display-side clamp --
  // no independent leads-table channel count is used for this table anymore.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const convChannelMap: Record<string, number> = {};
  const leadChannelSets: Record<string, Set<string>> = {};
  const normalizeChannel = (raw: string | null | undefined) => {
    const ch = (raw || "website").toLowerCase();
    return ch === "whatsapp" ? "WhatsApp" : ch === "instagram" ? "Instagram" : "Website";
  };
  conversations
    .filter((c) => c.created_at >= ninetyDaysAgo)
    .forEach((c) => {
      const label = normalizeChannel(c.channel);
      convChannelMap[label] = (convChannelMap[label] ?? 0) + 1;
      if (c.lead_id) {
        (leadChannelSets[label] ??= new Set()).add(c.lead_id);
      }
    });

  const knownChannels = ["WhatsApp", "Instagram", "Website"];
  const leadChannelMap: Record<string, number> = Object.fromEntries(
    knownChannels.map((ch) => [ch, leadChannelSets[ch]?.size ?? 0])
  );
  const totalChannelLeads = knownChannels.reduce((sum, ch) => sum + leadChannelMap[ch], 0);
  const channelBreakdown = knownChannels.map((ch) => ({
    channel: ch,
    conversations: convChannelMap[ch] ?? 0,
    leads: leadChannelMap[ch],
    share: totalChannelLeads > 0 ? Math.round((leadChannelMap[ch] / totalChannelLeads) * 100) : 0,
  }));

  // Count totals for last 90 days
  const totalLeads = leads.filter((l) => l.created_at >= ninetyDaysAgo).length;
  const totalConversations = conversations.filter((c) => c.created_at >= ninetyDaysAgo).length;
  const totalAppointments = appointments.filter((a) => a.created_at >= ninetyDaysAgo).length;
  const totalVisits90d = visits.filter((v) => v.created_at >= ninetyDaysAgo).length;

  return NextResponse.json({
    businessName,
    totalLeads,
    totalConversations,
    totalAppointments,
    totalVisits90d,
    dailyCounts,
    dailyLeadTouches,
    dailyConvCounts,
    dailyApptCounts,
    dailyVisitCounts,
    hourlyLeadTouches,
    hourlyConvCounts,
    hourlyApptCounts,
    dailyConvAiHandled,
    dailyApptAiBooked,
    channelBreakdown,
    websiteVisits,
  });
}
