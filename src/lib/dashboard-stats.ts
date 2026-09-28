// Server-only dashboard aggregation (Dashboard redesign round). Real data
// only -- every number here is a genuine COUNT/GROUP BY against the
// tenant's own rows, explicitly scoped by tenant_id on every query (the
// admin client bypasses RLS, so this explicit filter is the only thing
// standing between one tenant's numbers and another's -- see the
// cross-tenant test, src/scripts/test-dashboard-cross-tenant.mjs).
//
// Bucketing strategy: one real row-fetch per table for the full window
// (current period + previous period, so period-over-period comparisons
// never need a second round trip), then bucketed in JS -- the same
// established pattern already used by /api/analytics and lib/stats.ts in
// this codebase (a real SQL COUNT/WHERE per query, orchestrated from the
// server, not raw GROUP BY SQL text). Fetching 200-ish rows and bucketing
// them is materially cheaper than issuing up to 90 separate per-day COUNT
// queries, and is the only practical way to get real period-over-period
// totals AND a real day-by-day series from one fetch.

export type DashboardRange = "7d" | "30d" | "90d";

export const RANGE_DAYS: Record<DashboardRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function isValidRange(v: unknown): v is DashboardRange {
  return v === "7d" || v === "30d" || v === "90d";
}

// Default tenant timezone -- no per-tenant timezone column exists in the
// schema yet (checked supabase/schema.sql + all migrations), so this is a
// fixed default, not yet configurable. Qatar has no DST (fixed UTC+3 year
// round), which is what makes a simple Intl-based conversion reliable here
// without a full IANA-timezone library.
export const DEFAULT_TENANT_TIMEZONE = "Asia/Qatar";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEFAULT_TENANT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in the tenant's timezone (default Asia/Qatar), not UTC. */
export function tenantDayKey(iso: string): string {
  return dayKeyFormatter.format(new Date(iso));
}

/** Real calendar-day boundaries in the tenant timezone, expressed as UTC ISO instants. */
export function tenantDayBoundsUTC(daysAgo: number, tzOffsetMinutes = 180): { startISO: string; endISO: string } {
  // Asia/Qatar is a fixed UTC+3 offset (180 min), no DST -- see the
  // DEFAULT_TENANT_TIMEZONE comment above. A real IANA lookup (e.g. via
  // Intl) would be needed to generalize this to a DST-observing timezone.
  const now = new Date();
  const nowTenantMs = now.getTime() + tzOffsetMinutes * 60_000;
  const tenantMidnightMs = Math.floor(nowTenantMs / 86_400_000) * 86_400_000 - daysAgo * 86_400_000;
  const startUTCMs = tenantMidnightMs - tzOffsetMinutes * 60_000;
  return { startISO: new Date(startUTCMs).toISOString(), endISO: new Date(startUTCMs + 86_400_000).toISOString() };
}

export interface TrendPill {
  direction: "up" | "down" | "flat";
  pct: number;
}

/**
 * Real period-over-period trend. Returns null (no pill) whenever the prior
 * period is 0 -- there is no honest percentage to show from a zero base,
 * and this dashboard never fabricates one (unlike lib/stats.ts's
 * ChangeInfo, which shows "+N new" for that case -- this task explicitly
 * asked for no pill at all here instead).
 */
export function computeTrendPill(current: number, previous: number): TrendPill | null {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat", pct };
}

export interface SeriesPoint { bucket: string; label: string; value: number }

export interface ChannelRow {
  channel: "whatsapp" | "instagram" | "phone";
  conversations: number;
  appointments: number;
  share: number;
}

export interface DashboardKPI {
  value: number;
  previous: number;
  trend: TrendPill | null;
}

export interface DashboardData {
  businessName: string;
  range: DashboardRange;
  kpis: {
    conversations: DashboardKPI;
    appointments: DashboardKPI;
    aiResolutionRate: { value: number | null; previous: number | null; trend: TrendPill | null };
    newCustomers: DashboardKPI;
  };
  series: {
    conversations: SeriesPoint[];
    appointments: SeriesPoint[];
  };
  channels: ChannelRow[];
  connectedChannels: { whatsapp: boolean; instagram: boolean; phone: boolean };
  hasAnyDataEver: boolean;
}

interface Row { created_at: string }
interface ConvRow extends Row { channel: string | null; needs_human: boolean; lead_id: string | null; deleted_at: string | null }
interface ApptRow extends Row { status: string; conversation_id: string | null; deleted_at: string | null; lead_id: string | null }
interface LeadRow extends Row { channel: string | null; deleted_at: string | null }
interface CallRow extends Row { call_type: string }

function normalizeChannel(raw: string | null | undefined): "whatsapp" | "instagram" | "phone" | null {
  const ch = (raw ?? "").toLowerCase();
  if (ch === "whatsapp") return "whatsapp";
  if (ch === "instagram") return "instagram";
  if (ch === "phone") return "phone";
  return null; // "website" and anything else -- not one of the 3 rows this table shows
}

// Real bug found live during the cross-tenant verification test (not a
// simulation -- a genuine tenant with 5 real conversation rows only showed
// 3 in the aggregated result): this MUST compare real parsed instants, not
// raw ISO strings. Postgres/PostgREST returns timestamptz values with a
// variable number of fractional-second digits (trailing zeros trimmed --
// confirmed live, e.g. "...99728+00:00" vs "...119161+00:00", 5 digits vs
// 6) and a "+00:00" offset suffix, while JS's Date.toISOString() always
// emits exactly 3 fractional digits and a "Z" suffix. Two ISO-8601 strings
// in DIFFERENT formats do not reliably lexicographically sort against each
// other -- a plain string >= / < comparison silently drops rows whose
// fractional-second digit count differs from the comparison boundary's,
// exactly like the missing 2-of-5 rows this test caught. Parsing both
// sides to a real numeric timestamp before comparing is correct regardless
// of either string's format/precision.
function inWindow(iso: string, startISO: string, endISO: string): boolean {
  const t = new Date(iso).getTime();
  return t >= new Date(startISO).getTime() && t < new Date(endISO).getTime();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDashboardData(admin: any, tenantId: string, range: DashboardRange): Promise<DashboardData> {
  const days = RANGE_DAYS[range];
  const now = new Date();
  // KPI current/previous period boundaries are a plain rolling N-day
  // window (now minus N days), not calendar-day-aligned -- deliberately
  // different from the chart's buildSeries() below, which DOES align every
  // bucket edge to real Qatar-calendar-day midnights. A rolling window is
  // the correct, expected meaning for "last 30 days" style KPI comparisons
  // (not "this calendar month"); day-alignment only matters for the chart,
  // where a visually legible, consistent x-axis needs real day boundaries.
  const currentStart = new Date(now.getTime() - days * 86_400_000).toISOString();
  const previousStart = new Date(now.getTime() - days * 2 * 86_400_000).toISOString();
  const nowISO = now.toISOString();

  const [tenantRes, convRes, apptRes, leadRes, callRes, tenantConfigRes, everAnyRes] = await Promise.all([
    admin.from("tenants").select("business_name").eq("id", tenantId).maybeSingle(),
    admin.from("conversations")
      .select("created_at, channel, needs_human, lead_id, deleted_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", previousStart),
    admin.from("appointments")
      .select("created_at, status, conversation_id, deleted_at, lead_id")
      .eq("tenant_id", tenantId)
      .gte("created_at", previousStart),
    admin.from("leads")
      .select("created_at, channel, deleted_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", previousStart),
    admin.from("agent_calls")
      .select("created_at, call_type")
      .eq("tenant_id", tenantId)
      .eq("call_type", "live")
      .gte("created_at", previousStart),
    admin.from("tenant_config")
      .select("instagram_connected, whatsapp_connected, vapi_phone_number")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    // Cheap existence checks (head:true, no rows returned) to distinguish a
    // genuinely brand-new tenant (never had ANY activity, ever) from one
    // that simply has nothing in the current 2N-day window -- drives the
    // empty-state CTA choice ("Connect a channel" vs "Train your AI").
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  const businessName = (tenantRes.data?.business_name as string | undefined) ?? "";
  const conversations: ConvRow[] = (convRes.data ?? []).filter((c: ConvRow) => !c.deleted_at);
  const appointments: ApptRow[] = (apptRes.data ?? []).filter((a: ApptRow) => !a.deleted_at && a.status !== "cancelled");
  const leads: LeadRow[] = (leadRes.data ?? []).filter((l: LeadRow) => !l.deleted_at);
  const calls: CallRow[] = callRes.data ?? [];
  const cfg = tenantConfigRes.data as { instagram_connected?: boolean; whatsapp_connected?: boolean; vapi_phone_number?: string | null } | null;
  const hasAnyDataEver = (everAnyRes.count ?? 0) > 0;

  // ── KPI: Conversations (chat channels + live phone calls, current vs previous period) ──
  const convCurrent = conversations.filter((c) => inWindow(c.created_at, currentStart, nowISO)).length
    + calls.filter((c) => inWindow(c.created_at, currentStart, nowISO)).length;
  const convPrevious = conversations.filter((c) => inWindow(c.created_at, previousStart, currentStart)).length
    + calls.filter((c) => inWindow(c.created_at, previousStart, currentStart)).length;

  // ── KPI: Appointments booked ──
  const apptCurrent = appointments.filter((a) => inWindow(a.created_at, currentStart, nowISO)).length;
  const apptPrevious = appointments.filter((a) => inWindow(a.created_at, previousStart, currentStart)).length;

  // ── KPI: AI resolution rate -- conversations whose CURRENT needs_human
  // value is false, as a % of all conversations in the period. Same
  // definition as lib/stats.ts's computeAiResolutionRate (see that file's
  // own comment for the full "resolved means resolved, whether the AI or a
  // human closed it" reasoning) -- kept in sync deliberately so Dashboard
  // and any other surface never show two different numbers for the same
  // real thing. null (not 0%) when there are no conversations in the
  // period at all -- an honest "no data," never a fabricated rate.
  const aiHandledCurrent = conversations.filter((c) => inWindow(c.created_at, currentStart, nowISO) && c.needs_human === false).length;
  const aiHandledPrevious = conversations.filter((c) => inWindow(c.created_at, previousStart, currentStart) && c.needs_human === false).length;
  const convCurrentChatOnly = conversations.filter((c) => inWindow(c.created_at, currentStart, nowISO)).length;
  const convPreviousChatOnly = conversations.filter((c) => inWindow(c.created_at, previousStart, currentStart)).length;
  const aiRateCurrent = convCurrentChatOnly > 0 ? Math.round((aiHandledCurrent / convCurrentChatOnly) * 100) : null;
  const aiRatePrevious = convPreviousChatOnly > 0 ? Math.round((aiHandledPrevious / convPreviousChatOnly) * 100) : null;

  // ── KPI: New customers -- unique real leads first seen in the period. ──
  const custCurrent = leads.filter((l) => inWindow(l.created_at, currentStart, nowISO)).length;
  const custPrevious = leads.filter((l) => inWindow(l.created_at, previousStart, currentStart)).length;

  // ── Time series (day buckets, week buckets for 90d), tenant timezone ──
  // Bucket EDGES (not just labels) are aligned to real Qatar-calendar-day
  // midnights via tenantDayBoundsUTC, not "24 hours before now" -- a plain
  // now-minus-N-days boundary would put e.g. a 2pm Doha conversation in a
  // different bucket than a 1am Doha one on the same real calendar day,
  // which is exactly the kind of off-by-timezone bug this range param
  // exists to avoid.
  const bucketDays = range === "90d" ? 7 : 1;
  const numBuckets = Math.ceil(days / bucketDays);
  function buildSeries(rows: Row[]): SeriesPoint[] {
    const points: SeriesPoint[] = [];
    // i = how many buckets back from today (0 = today's/this week's bucket).
    // A bucket's newest day is i*bucketDays days ago; its oldest day is
    // (i*bucketDays + bucketDays - 1) days ago.
    for (let i = numBuckets - 1; i >= 0; i--) {
      const oldestDayAgo = i * bucketDays + (bucketDays - 1);
      const newestDayAgo = i * bucketDays;
      const startISO = tenantDayBoundsUTC(oldestDayAgo).startISO;
      const endISO = tenantDayBoundsUTC(newestDayAgo).endISO;
      // Same real-Date-parse comparison as inWindow() above -- raw ISO
      // string comparison is not safe against Postgres's variable-
      // precision timestamp format (see inWindow's comment for the full,
      // live-confirmed root cause).
      const value = rows.filter((r) => inWindow(r.created_at, startISO, endISO)).length;
      const label = tenantDayKey(startISO);
      points.push({ bucket: label, label, value });
    }
    return points;
  }
  const convSeriesRows: Row[] = [...conversations, ...calls];
  const series = {
    conversations: buildSeries(convSeriesRows),
    appointments: buildSeries(appointments),
  };

  // ── Channel breakdown: WhatsApp / Instagram / Phone, current period only ──
  const channelConvCounts: Record<string, number> = { whatsapp: 0, instagram: 0, phone: 0 };
  const channelApptCounts: Record<string, number> = { whatsapp: 0, instagram: 0, phone: 0 };
  // An appointment has no channel of its own -- it's derived from the real
  // lead it belongs to (leads.channel is set at creation time regardless of
  // which channel originated it, including "phone" for Vapi bookings -- see
  // call-webhook/route.ts). id+channel only, fetched separately since the
  // leads query above (for the New Customers KPI) doesn't select id.
  const { data: leadIdChannelRows } = await admin
    .from("leads")
    .select("id, channel")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  const leadChannelById = new Map<string, "whatsapp" | "instagram" | "phone">();
  ((leadIdChannelRows ?? []) as { id: string; channel: string | null }[]).forEach((l) => {
    const ch = normalizeChannel(l.channel);
    if (ch) leadChannelById.set(l.id, ch);
  });

  conversations
    .filter((c) => inWindow(c.created_at, currentStart, nowISO))
    .forEach((c) => {
      const ch = normalizeChannel(c.channel);
      if (ch) channelConvCounts[ch] += 1;
    });
  calls
    .filter((c) => inWindow(c.created_at, currentStart, nowISO))
    .forEach(() => { channelConvCounts.phone += 1; });
  appointments
    .filter((a) => inWindow(a.created_at, currentStart, nowISO))
    .forEach((a) => {
      const ch = a.lead_id ? leadChannelById.get(a.lead_id) : undefined;
      if (ch) channelApptCounts[ch] += 1;
    });

  const connectedChannels = {
    whatsapp: !!cfg?.whatsapp_connected,
    instagram: !!cfg?.instagram_connected,
    phone: !!cfg?.vapi_phone_number,
  };

  const CHANNEL_ORDER: ("whatsapp" | "instagram" | "phone")[] = ["whatsapp", "instagram", "phone"];
  // Only channels that are connected OR have real data in the period --
  // never a placeholder row for a channel the tenant has no relationship
  // with at all.
  const relevantChannels = CHANNEL_ORDER.filter(
    (ch) => connectedChannels[ch] || channelConvCounts[ch] > 0 || channelApptCounts[ch] > 0
  );
  const totalConvForShare = relevantChannels.reduce((sum, ch) => sum + channelConvCounts[ch], 0);
  const channels: ChannelRow[] = relevantChannels.map((ch) => ({
    channel: ch,
    conversations: channelConvCounts[ch],
    appointments: channelApptCounts[ch],
    share: totalConvForShare > 0 ? Math.round((channelConvCounts[ch] / totalConvForShare) * 100) : 0,
  }));

  return {
    businessName,
    range,
    kpis: {
      conversations: { value: convCurrent, previous: convPrevious, trend: computeTrendPill(convCurrent, convPrevious) },
      appointments: { value: apptCurrent, previous: apptPrevious, trend: computeTrendPill(apptCurrent, apptPrevious) },
      aiResolutionRate: {
        value: aiRateCurrent,
        previous: aiRatePrevious,
        trend: aiRateCurrent !== null && aiRatePrevious !== null ? computeTrendPill(aiRateCurrent, aiRatePrevious) : null,
      },
      newCustomers: { value: custCurrent, previous: custPrevious, trend: computeTrendPill(custCurrent, custPrevious) },
    },
    series,
    channels,
    connectedChannels,
    hasAnyDataEver,
  };
}
