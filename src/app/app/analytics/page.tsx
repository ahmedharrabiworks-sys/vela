"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { useI18n } from "@/lib/i18n";
import CountUp from "@/components/ui/CountUp";
import CircularProgress from "@/components/ui/CircularProgress";
import { useTheme } from "@/lib/theme";

type Range = "1d" | "7d" | "30d" | "90d";
type Series = "leads" | "conversations" | "appointments";

type ChannelRow = { channel: string; conversations: number; leads: number; share: number };

type AnalyticsData = {
  businessName: string;
  totalLeads: number;
  totalConversations: number;
  totalAppointments: number;
  totalVisits90d: number;
  dailyCounts: Record<string, number>;
  dailyLeadTouches: Record<string, number>;
  dailyConvCounts: Record<string, number>;
  dailyApptCounts: Record<string, number>;
  dailyVisitCounts: Record<string, number>;
  dailyConvAiHandled: Record<string, number>;
  dailyApptAiBooked: Record<string, number>;
  hourlyLeadTouches: number[];
  hourlyConvCounts: number[];
  hourlyApptCounts: number[];
  channelBreakdown: ChannelRow[];
  websiteVisits: number;
};

const CHANNEL_DOT: Record<string, string> = { WhatsApp: "#25D366", Instagram: "#E1306C", Website: "#9CA3AF" };
const CHANNEL_BAR: Record<string, string> = { WhatsApp: "#25D366", Instagram: "#E1306C", Website: "#9CA3AF" };

function buildDayArray(dailyCounts: Record<string, number>, days: number, offsetDays = 0): number[] {
  const arr: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - (i + offsetDays) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    arr.push(dailyCounts[key] ?? 0);
  }
  return arr;
}

function periodSum(dailyCounts: Record<string, number>, days: number, offsetDays = 0): number {
  return buildDayArray(dailyCounts, days, offsetDays).reduce((a, b) => a + b, 0);
}

// FIX 6 (round Q) root cause: both the "prior=0, current=0" (a real "no
// change" state) and "prior=0, current>0" (a real increase from a zero
// base, just not expressible as a percentage) cases collapsed into the
// same `null` return here, which TrendBadge then rendered as an identical
// neutral "no data to compare" placeholder -- losing the real distinction
// between them. Both prior and current here are always real, defined
// counts (periodSum defaults an empty bucket to a real 0, never "missing")
// -- there is no genuine "no data" case left to represent, so this no
// longer returns null at all.
// FIX 4 (round R): isNew replaced the round-Q "newCount" raw delta with a
// plain "New" label.
// FIX 1 (round S): reverted back to a real "+X new" figure per explicit
// request -- "New" lost the actual magnitude (0->5 and 0->100 looked
// identical). newCount carries the real current count.
type ChangeResult = { pct: number } | { newCount: number };
function computeChange(current: number, prior: number): ChangeResult {
  if (prior === 0 && current === 0) return { pct: 0 };
  if (prior === 0) return { newCount: current };
  return { pct: Math.round(((current - prior) / prior) * 100) };
}

// FIX 10 (pixel match): reference puts the pill top-right of the card next
// to the label, showing only the delta ("↑23%") -- the "vs last Nd" text
// lives as its own small caption line below the value instead of being
// baked into the pill. Split out of what used to be a single combined
// string so both cards and this component stay reusable.
// FIX 2 (round I): confirmed via live DOM inspection that the colored %
// badge genuinely renders correctly whenever real prior-period data exists
// -- this was never a rendering bug (6 reports of "still not showing" were
// all real users looking at a card whose PRIOR period is genuinely zero,
// e.g. a brand-new tenant, where computeChange correctly returns null).
// Round F removed a "New" placeholder pill for this null case entirely,
// matching Dashboard's own omit-when-null KPI cards -- but Dashboard's KPIs
// compare to yesterday (rarely null) while these compare to a full prior
// period (commonly null for weeks after signup), so "omit" reads as "this
// card's badge feature doesn't exist" rather than "no signal yet." Now
// renders a neutral, honest "–" chip instead of nothing -- never a
// fabricated direction/percentage, just visual confirmation the badge slot
// is real and simply has nothing to compare against yet.
// FIX 6 (round Q): change is null only while analytics itself hasn't
// loaded yet (the "–" placeholder still applies there); once real data
// exists, computeChange above always returns a real, renderable value now
// -- either a genuine percentage (pct, including a real 0%) or a real
// absolute increase from a zero base (newCount) -- never hidden.
// FIX 4 (round R): plain colored text, no arrow icons, no pill background
// -- matches the Dashboard's own ChangeText styling exactly.
// FIX 1 (round S): newCount renders as "+X new" using the real current
// count (reverted from the plain "New" label); a real 0% renders as
// literal "0%" text, never hidden or replaced by a vague phrase.
function TrendBadge({ change }: { change: ChangeResult | null }) {
  if (change === null) {
    return (
      <span className="text-[11px] font-semibold text-[#9CA3AF] dark:text-[#6E6E76]" title="No prior-period data to compare yet">
        –
      </span>
    );
  }
  if ("newCount" in change) {
    return <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">+{change.newCount} new</span>;
  }
  const color = change.pct > 0 ? "text-green-600 dark:text-green-400" : change.pct < 0 ? "text-red-500 dark:text-red-400" : "text-[#9CA3AF] dark:text-[#6E6E76]";
  const sign = change.pct > 0 ? "+" : "";
  return <span className={`text-[11px] font-semibold ${color}`}>{sign}{change.pct}%</span>;
}

// Round M10 FIX 5 follow-up: 24 real UTC-hour labels for the "Today" chart
// (see buildHourArray below) -- every 3rd hour labeled (0/3/6/9/...21) to
// stay legible without crowding, matching the same "label every Nth point"
// pattern already used for the 30d/90d cases below.
function buildHourLabels(): string[] {
  return Array.from({ length: 24 }, (_, h) => {
    if (h % 3 !== 0) return "";
    const period = h < 12 ? "am" : "pm";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}${period}`;
  });
}

function buildLabels(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    if (days === 7) return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    if (days === 30) return i % 5 === 0 ? `${d.getDate()} ${d.toLocaleString("default",{month:"short"})}` : "";
    if (days === 90) return i % 15 === 0 ? `${d.getDate()} ${d.toLocaleString("default",{month:"short"})}` : "";
    return i % 20 === 0 ? `${d.getDate()} ${d.toLocaleString("default",{month:"short"})}` : "";
  });
}

// No charting library dependency exists in this project (checked package.json) --
// this SVG line chart is 100% hand-rolled. Real interactive hover tooltip:
// viewBox uses preserveAspectRatio="none" (scales non-uniformly to fill its
// container), so cursor position is converted from screen pixels to the
// 800x140 viewBox coordinate space via the actual rendered bounding rect.
function LineChart({ data, labels, days, hourly = false, unitLabel }: { data: number[]; labels: string[]; days: number; hourly?: boolean; unitLabel: string }) {
  const { theme } = useTheme();
  // SVG stroke/fill are presentation attributes, invisible to the app's
  // class-based dark-mode system -- gridlines specifically need a real dark
  // value, since the light-mode near-white (#F3F4F6) reads as unsubtly
  // BRIGHT against a dark card instead of the intended barely-there effect.
  const gridColor = theme === "dark" ? "#2A2A32" : "#F3F4F6";
  const axisTextColor = theme === "dark" ? "#6E6E76" : "#9CA3AF";
  const W = 800, H = 140, padX = 8, padTop = 12, padBottom = 24;
  const chartH = H - padTop - padBottom;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const n = data.length;
  const [hover, setHover] = useState<{ i: number; clientX: number; clientY: number } | null>(null);

  const pts = data.map((v, i) => ({
    x: padX + (i / Math.max(n - 1, 1)) * (W - padX * 2),
    y: padTop + ((max - v) / range) * chartH,
  }));

  // FIX 4 (round F): reverted back to a smoothed curve per explicit
  // request -- the sharp/angular straight-segment style from the previous
  // round is undone. Per-segment cubic bezier, control points at each
  // side's own y with the midpoint x, rounds every join.
  let d = pts.length > 0 ? `M ${pts[0].x} ${pts[0].y}` : "";
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = pts.length > 0 ? d + ` L ${pts[pts.length - 1].x} ${H - padBottom} L ${pts[0].x} ${H - padBottom} Z` : "";
  const hasData = data.some((v) => v > 0);

  // Round M10 FIX 5 follow-up: index i is an hour-of-day (0-23), not a day
  // offset, when hourly -- the original day-offset math would otherwise
  // compute nonsense (future dates jumping a full day per hover step).
  const dateForIndex = (i: number): string => {
    if (hourly) {
      const period = i < 12 ? "am" : "pm";
      const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
      return `${displayHour}:00${period} today`;
    }
    const dt = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    return dt.toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric" });
  };

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((relX - padX) / (W - padX * 2)) * Math.max(n - 1, 1))));
    setHover({ i, clientX: e.clientX, clientY: e.clientY });
  };

  const hp = hover ? pts[hover.i] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* FIX 10 (pixel match): reference shows a light 4-line horizontal
            grid, not zero lines -- restored to that exact count (was
            reduced to a single baseline in an earlier pass, which undershot
            the reference rather than matching it). Kept thin and faint so
            it reads as subtle context, not clutter. */}
        {[0, 1, 2, 3].map((i) => {
          const y = padTop + (i / 3) * chartH;
          return <line key={i} x1={padX} x2={W - padX} y1={y} y2={y} stroke={gridColor} strokeWidth="1"/>;
        })}
        {hasData && (
          <>
            <path d={areaD} fill="url(#lineGrad)"/>
            <path d={d} fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {/* FIX 3 (round D): reference shows exactly one dot marker, at
                the most recent data point -- not one every few days. The
                periodic dots read as chart-junk next to the reference's
                clean single endpoint marker. */}
            {pts.length > 0 && (
              <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill="#FF6B35" stroke="white" strokeWidth="1.5"/>
            )}
            {hp && (
              <>
                <line x1={hp.x} x2={hp.x} y1={padTop} y2={H - padBottom} stroke="#FF6B35" strokeWidth="1" strokeDasharray="3,3" opacity="0.4"/>
                <circle cx={hp.x} cy={hp.y} r="5" fill="#FF6B35" stroke="white" strokeWidth="2"/>
              </>
            )}
          </>
        )}
        {!hasData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill={axisTextColor}>
            No data yet
          </text>
        )}
        {labels.map((lbl, i) => lbl ? (
          <text key={i} x={padX + (i / Math.max(n - 1, 1)) * (W - padX * 2)} y={H - 4} textAnchor="middle" fontSize="9" fill={axisTextColor}>{lbl}</text>
        ) : null)}
      </svg>
      {hover && hasData && (
        <div
          className="fixed z-50 pointer-events-none bg-[#111111] text-white text-xs rounded-lg px-3 py-2 shadow-lg"
          style={{ left: hover.clientX + 14, top: hover.clientY - 44 }}
        >
          <p className="font-semibold whitespace-nowrap">{dateForIndex(hover.i)}</p>
          <p className="text-[#FF6B35] font-bold">{data[hover.i]} {unitLabel}</p>
        </div>
      )}
    </div>
  );
}

function SkeletonKPI() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 animate-pulse">
      <div className="h-2.5 bg-[#F3F4F6] rounded w-20 mb-3" />
      <div className="h-8 bg-[#F3F4F6] rounded w-16 mb-2" />
      <div className="h-2 bg-[#F3F4F6] rounded w-24" />
    </div>
  );
}

export default function AnalyticsPage() {
  // FIX 1 (round H): default changed 30d -> 7d. The badge/chart code was
  // never broken (confirmed live on the 7d tab in the prior round -- real
  // green/red % badges render correctly whenever a comparable prior period
  // has any data). The real problem was the DEFAULT tab: 30d-vs-previous-30d
  // needs 60 days of account history before a badge can ever appear, so
  // every newer or lower-volume tenant lands on a view that looks
  // permanently broken even though nothing is. 7d-vs-previous-7d only needs
  // 14 days, and is the standard "at a glance" default for this kind of
  // dashboard anyway.
  const [range, setRange] = useState<Range>("7d");
  const [series, setSeries] = useState<Series>("leads");
  const { isPro, planLoaded } = usePlan();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<"5xx" | null>(null);

  const doFetch = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    fetch("/api/analytics")
      .then(async (r) => {
        const d = await r.json() as AnalyticsData & { error?: string };
        if (r.ok && !d.error) {
          setAnalytics(d);
        } else if (r.status >= 500) {
          console.error("[analytics] server error:", r.status, d?.error);
          setFetchError("5xx");
        } else {
          console.error("[analytics] API error:", r.status, d?.error);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[analytics] fetch failed:", err);
        setLoading(false);
      });
  }, []);

  // Round M3 FIX 4: wait for usePlan()'s async check to actually settle
  // before deciding to skip this fetch -- gating on isPro alone used its
  // FIRST-RENDER value (a synchronous localStorage guess that defaults to
  // "starter" whenever vela_profile has no plan field yet), which could
  // read as false for a genuine Pro/Premium tenant just long enough for
  // this effect to already have skipped fetching real data.
  useEffect(() => {
    if (!planLoaded) return;
    if (!isPro) { setLoading(false); return; }
    doFetch();
  }, [planLoaded, isPro, doFetch]);

  const days = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
  // Round M9 FIX 5: Round M8 made "1d" mean strict calendar-yesterday
  // (baseOffset=1), which is precisely why it showed no data live -- the
  // real test activity happened TODAY, and yesterday's real bucket was
  // genuinely empty. That's not a bug in the math, but it's not what a
  // business owner clicking "1d" actually wants either: Dashboard's own
  // "Today" KPIs are calendar-day-so-far (lib/stats.ts's todayStart is
  // midnight-to-now, not a trailing 24h window), so "1d" here now means
  // the same thing -- today's real activity so far, offset 0, exactly like
  // every other range already worked before that change. The label below
  // says "Today" (not "1d") so the meaning is never ambiguous again. The
  // period-over-period comparison naturally becomes today vs. yesterday
  // with zero special-casing, since offset+days=1 already lands on
  // yesterday's real bucket.
  const baseOffset = 0;

  // Round M10 FIX 5: "Today" (range==="1d") uses dailyLeadTouches instead of
  // plain dailyCounts -- see the server's own comment (api/analytics/
  // route.ts) for the confirmed root cause (a real lead's OWN created_at
  // predates today even though a real conversation/appointment involving
  // them happened today). 7d/30d/90d keep the original leads.created_at
  // bucketing unchanged -- summing dailyLeadTouches across a multi-day
  // range would double-count a repeat lead active on more than one day in
  // that range, which was never reported as wrong.
  const leadsSourceForRange = range === "1d" ? (analytics?.dailyLeadTouches ?? {}) : (analytics?.dailyCounts ?? {});

  const dailyBySeries: Record<Series, Record<string, number>> = useMemo(() => ({
    leads: range === "1d" ? (analytics?.dailyLeadTouches ?? {}) : (analytics?.dailyCounts ?? {}),
    conversations: analytics?.dailyConvCounts ?? {},
    appointments: analytics?.dailyApptCounts ?? {},
  }), [analytics, range]);

  // Round M10 FIX 5 follow-up: real, confirmed cause of the "Today" chart
  // showing a single dot with no line -- live data check found genuine
  // intra-day spread (two real conversations ~12.5 hours apart today), so
  // this was a real bucketing bug, not a correct single-point day. The
  // day-level maps above collapse an entire day into ONE bucket by design
  // (that's what makes the 7d/30d/90d line charts work), so a 1-day range
  // could only ever plot one x-axis point from them -- a hand-rolled line
  // chart can't show movement from one point no matter what. The server now
  // also computes a real 24-hour breakdown for today specifically
  // (hourlyLeadTouches/hourlyConvCounts/hourlyApptCounts); used here only
  // for range==="1d", so 7d/30d/90d are completely unaffected.
  const hourlyBySeries: Record<Series, number[]> = useMemo(() => ({
    leads: analytics?.hourlyLeadTouches ?? Array(24).fill(0),
    conversations: analytics?.hourlyConvCounts ?? Array(24).fill(0),
    appointments: analytics?.hourlyApptCounts ?? Array(24).fill(0),
  }), [analytics]);

  const chartData = range === "1d" ? hourlyBySeries[series] : buildDayArray(dailyBySeries[series], days, baseOffset);
  const chartLabels = range === "1d" ? buildHourLabels() : buildLabels(days);

  const totalLeads = analytics ? periodSum(leadsSourceForRange, days, baseOffset) : 0;
  const totalConvs = analytics ? periodSum(analytics.dailyConvCounts, days, baseOffset) : 0;
  const totalAppts = analytics ? periodSum(analytics.dailyApptCounts, days, baseOffset) : 0;
  const websiteVisits = analytics?.websiteVisits ?? 0;
  const channelTable = analytics?.channelBreakdown ?? [];

  const leadsChange = analytics ? computeChange(periodSum(leadsSourceForRange, days, baseOffset), periodSum(leadsSourceForRange, days, baseOffset + days)) : null;
  const apptsChange = analytics ? computeChange(periodSum(analytics.dailyApptCounts, days, baseOffset), periodSum(analytics.dailyApptCounts, days, baseOffset + days)) : null;
  const convsChange = analytics ? computeChange(periodSum(analytics.dailyConvCounts, days, baseOffset), periodSum(analytics.dailyConvCounts, days, baseOffset + days)) : null;

  // AI Resolution Rate -- FIX: previously computed once server-side over a
  // fixed 180-day window regardless of the 7d/30d/90d selector, so it never
  // actually moved when the range changed and had no real trend to compare
  // against. Now derived client-side from the same daily-bucketed data as
  // every other card (dailyConvAiHandled / dailyConvCounts, summed over the
  // selected range), so it respects the range selector and gets a real
  // period-over-period badge exactly like Leads/Conversations/Appointments.
  const aiHandledForRange = analytics ? periodSum(analytics.dailyConvAiHandled, days, baseOffset) : 0;
  const aiResolutionRate = totalConvs > 0 ? Math.round((aiHandledForRange / totalConvs) * 100) : null;
  const priorConvTotal = analytics ? periodSum(analytics.dailyConvCounts, days, baseOffset + days) : 0;
  const priorAiHandled = analytics ? periodSum(analytics.dailyConvAiHandled, days, baseOffset + days) : 0;
  const priorAiRate = priorConvTotal > 0 ? Math.round((priorAiHandled / priorConvTotal) * 100) : null;
  const aiRateChange = aiResolutionRate !== null && priorAiRate !== null ? computeChange(aiResolutionRate, priorAiRate) : null;

  const CHART_TITLES: Record<Series, string> = {
    leads: t("analytics.chartTitleLeads"),
    conversations: t("analytics.chartTitleConversations"),
    appointments: t("analytics.chartTitleAppointments"),
  };

  // FIX 1 (round D): Visits dropped from the switchable series -- 3 tabs
  // only, matching the reference exactly (Leads / Convs / Appts).
  const seriesToggles: { key: Series; label: string }[] = [
    { key: "leads", label: t("analytics.leadsShort") },
    { key: "conversations", label: t("analytics.convsShort") },
    { key: "appointments", label: t("analytics.apptsShort") },
  ];

  const hasChannelData = channelTable.some((r) => r.conversations > 0 || r.leads > 0);

  const periodLabel = range === "1d" ? "vs yesterday" : `${t("analytics.vsLast")} ${range}`;

  // FIX 7: real client-side CSV export of the currently-loaded data -- no
  // new backend endpoint needed (analytics is already fully loaded into
  // this page's state), so this stays a straightforward client-side export
  // rather than guessing at a PDF-generation route that doesn't exist.
  const exportReport = () => {
    if (!analytics) return;
    track("analytics_export", { format: "csv" });
    const lines: string[] = [];
    lines.push("Metric,Value");
    lines.push(`Leads (${range}),${totalLeads}`);
    lines.push(`Conversations (${range}),${totalConvs}`);
    lines.push(`Appointments (${range}),${totalAppts}`);
    lines.push(`Website Visits (${range}),${websiteVisits}`);
    lines.push(`AI Resolution Rate (${range}),${aiResolutionRate === null ? "N/A" : `${aiResolutionRate}%`}`);
    lines.push("");
    lines.push("Channel,Leads,Conversations,Share");
    channelTable.forEach((row) => lines.push(`${row.channel},${row.leads},${row.conversations},${row.share}%`));
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vela-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      {/* Header — FIX: no special background here anymore, same as every
          other dashboard page (was a hardcoded orange/pink gradient that
          didn't match Conversations/Leads/Channels and looked worse in
          dark mode, since an inline style isn't touched by the dark-mode
          class-override system in globals.css). */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111111]">{t("analytics.title")}</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {t("analytics.subtitle")}{analytics?.businessName ? ` ${analytics.businessName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
            {(["1d", "7d", "30d", "90d"] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? "bg-[#FF6B35] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
                {r === "1d" ? "Today" : r}
              </button>
            ))}
          </div>
        </div>

        {/* 5xx error */}
        {isPro && fetchError === "5xx" && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 mb-5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.3"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">We couldn&apos;t load your analytics right now. Tap retry.</p>
            <button onClick={doFetch} className="text-xs font-bold text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 shrink-0 px-3 py-1.5 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Friendly empty state */}
        {isPro && !loading && !analytics && !fetchError && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "var(--vela-gradient-tint2)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="4" y="14" width="5" height="10" rx="1.5" fill="#FF6B35" fillOpacity="0.4"/>
                <rect x="11.5" y="8" width="5" height="16" rx="1.5" fill="#FF6B35" fillOpacity="0.65"/>
                <rect x="19" y="4" width="5" height="20" rx="1.5" fill="#FF6B35"/>
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#111111] mb-2">Your analytics will appear here</h3>
            <p className="text-sm text-[#6B7280] mb-6 max-w-xs mx-auto">Connect a channel so Vela can start capturing conversations and bookings.</p>
            <Link href="/app/channels" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
              Connect a channel →
            </Link>
          </div>
        )}

        {/* KPI strip */}
        {(!isPro || loading || analytics !== null) && (
        <div className={!isPro ? "blur-sm pointer-events-none select-none" : ""}>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0,1,2,3].map((i) => <SkeletonKPI key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* FIX 2 (round D): the top 3 cards are two-way synced with
                  the chart's series tabs below -- clicking a card selects
                  its series (active border + orange ring), and the matching
                  tab lights up the matching card. AI Resolution Rate has no
                  matching chart series, so it stays non-interactive.
                  FIX 4 (round D): "vs prior period" replaced with the real
                  selected range ("vs last 7d/30d/90d"); AI Resolution Rate
                  now gets the same real trend badge as the others (derived
                  from real daily-bucketed data, see aiRateChange above). */}
              <button onClick={() => setSeries("leads")}
                className={`text-left bg-white border rounded-xl p-4 transition-colors ${series === "leads" ? "border-[#FF6B35] ring-1 ring-[#FF6B35]/30" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] text-[#6B7280]">{t("analytics.totalLeads")}</p>
                  <TrendBadge change={leadsChange} />
                </div>
                <p className="text-2xl font-bold text-[#111111] leading-none"><CountUp value={totalLeads} /></p>
                <p className="text-[10px] text-[#9CA3AF] mt-1">{periodLabel}</p>
              </button>

              <button onClick={() => setSeries("conversations")}
                className={`text-left bg-white border rounded-xl p-4 transition-colors ${series === "conversations" ? "border-[#FF6B35] ring-1 ring-[#FF6B35]/30" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] text-[#6B7280]">{t("analytics.conversations")}</p>
                  <TrendBadge change={convsChange} />
                </div>
                <p className="text-2xl font-bold text-[#111111] leading-none"><CountUp value={totalConvs} /></p>
                {/* FIX 1 (round F): "Handled by Vela" subtitle removed per
                    explicit request -- periodLabel only, matching the other cards. */}
                <p className="text-[10px] text-[#9CA3AF] mt-1">{periodLabel}</p>
              </button>

              <button onClick={() => setSeries("appointments")}
                className={`text-left bg-white border rounded-xl p-4 transition-colors ${series === "appointments" ? "border-[#FF6B35] ring-1 ring-[#FF6B35]/30" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] text-[#6B7280]">{t("analytics.appointments")}</p>
                  <TrendBadge change={apptsChange} />
                </div>
                <p className="text-2xl font-bold text-[#111111] leading-none"><CountUp value={totalAppts} /></p>
                {/* FIX 1 (round F): "Booked by Vela AI" subtitle removed per
                    explicit request -- periodLabel only, matching the other cards. */}
                <p className="text-[10px] text-[#9CA3AF] mt-1">{periodLabel}</p>
              </button>

              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[11px] text-[#6B7280]">{t("analytics.aiResolutionRate")}</p>
                    {aiResolutionRate !== null && <TrendBadge change={aiRateChange} />}
                  </div>
                  {aiResolutionRate === null ? (
                    <p className="text-sm text-[#9CA3AF]">{t("analytics.noDataYet")}</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-[#111111] leading-none"><CountUp value={aiResolutionRate} suffix="%" /></p>
                      <p className="text-[10px] text-[#9CA3AF] mt-1">{periodLabel}</p>
                    </>
                  )}
                </div>
                {aiResolutionRate !== null && (
                  <CircularProgress value={aiResolutionRate} size={40} strokeWidth={4} color="#16A34A" />
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {(!isPro || loading || analytics !== null) && (
      <div className="relative">
        <div className={`space-y-5 ${!isPro ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* Line chart */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              {/* FIX 2 (round D): dynamic title -- reflects whichever
                  series tab is active, synced with the KPI cards above. */}
              <p className="text-sm font-bold text-[#111111]">{CHART_TITLES[series]}</p>
              <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-1">
                {seriesToggles.map((s) => (
                  <button key={s.key} onClick={() => setSeries(s.key)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${series === s.key ? "bg-[#FF6B35] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="h-40 bg-[#F9FAFB] rounded-xl animate-pulse" />
            ) : (
              <LineChart data={chartData} labels={chartLabels} days={days} hourly={range === "1d"} unitLabel={seriesToggles.find((s) => s.key === series)?.label.toLowerCase() ?? ""} />
            )}
          </div>

          {/* Channel breakdown */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <p className="text-sm font-bold text-[#111111]">{t("analytics.channelBreakdown")}</p>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[0,1,2].map((i) => <div key={i} className="h-8 bg-[#F3F4F6] rounded animate-pulse" />)}
              </div>
            ) : !hasChannelData ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">Connect a channel to start seeing traffic breakdown here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-[#F3F4F6]">
                      {[t("analytics.channel"), t("analytics.leads"), t("analytics.conversations"), t("analytics.share")].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {channelTable.map((row) => (
                      <tr key={row.channel} className="border-b border-[#F9FAFB] last:border-none">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111]">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHANNEL_DOT[row.channel] ?? "#9CA3AF" }} />
                            {row.channel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#374151]"><CountUp value={row.leads} /></td>
                        <td className="px-6 py-4 text-sm text-[#374151]"><CountUp value={row.conversations} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5 min-w-[110px]">
                            <div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${row.share}%`, background: CHANNEL_BAR[row.channel] ?? "#9CA3AF" }} />
                            </div>
                            <span className="text-xs font-semibold text-[#6B7280] w-8 text-right shrink-0">{row.share}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasChannelData && (
              <div className="px-6 py-4 border-t border-[#F3F4F6] flex justify-end">
                <button onClick={exportReport}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1.5v6M3.5 5.5L6 8l2.5-2.5M2 9.5v1a1 1 0 001 1h6a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Export Report
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Upgrade overlay */}
        {!isPro && (
          <div className="absolute inset-0 flex items-center justify-center upgrade-lock-backdrop">
            <div className="max-w-sm text-center p-8 bg-white upgrade-lock-card rounded-2xl border border-[#E5E7EB] shadow-xl mx-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--vela-gradient-tint)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#FF6B35" strokeWidth="1.8"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#111111] mb-2">{t("analytics.upgradeCta")}</h3>
              <p className="text-sm text-[#6B7280] mb-5">{t("analytics.upgradeDesc")}</p>
              <Link href="/pricing" onClick={() => track("upgrade_clicked", { source: "analytics" })}
                className="inline-block px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
                Upgrade to Pro →
              </Link>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
