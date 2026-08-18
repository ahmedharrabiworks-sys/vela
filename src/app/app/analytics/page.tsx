"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { useI18n } from "@/lib/i18n";
import CountUp from "@/components/ui/CountUp";
import CircularProgress from "@/components/ui/CircularProgress";

type Range = "7d" | "30d" | "90d";
type Series = "conversations" | "appointments" | "visits";

type ChannelRow = { channel: string; conversations: number; leads: number; share: number };

type AnalyticsData = {
  businessName: string;
  totalLeads: number;
  totalConversations: number;
  totalAppointments: number;
  totalVisits90d: number;
  dailyCounts: Record<string, number>;
  dailyConvCounts: Record<string, number>;
  dailyApptCounts: Record<string, number>;
  dailyVisitCounts: Record<string, number>;
  channelBreakdown: ChannelRow[];
  websiteVisits: number;
  aiResolutionRate: number | null;
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

function computeChange(current: number, prior: number): number | null {
  if (prior === 0 && current === 0) return null;
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

function TrendBadge({ change, label }: { change: number | null; label: string }) {
  if (change === null) {
    return <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">New</span>;
  }
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
      {up ? "↑" : "↓"} {Math.abs(change)}% {label}
    </span>
  );
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
function LineChart({ data, labels, days, unitLabel }: { data: number[]; labels: string[]; days: number; unitLabel: string }) {
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

  let d = pts.length > 0 ? `M ${pts[0].x} ${pts[0].y}` : "";
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = pts.length > 0 ? d + ` L ${pts[pts.length - 1].x} ${H - padBottom} L ${pts[0].x} ${H - padBottom} Z` : "";
  const labelStep = Math.max(1, Math.floor(n / 7));
  const hasData = data.some((v) => v > 0);

  const dateForIndex = (i: number): string => {
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
        {[0, 0.25, 0.5, 0.75, 1].map((tt) => {
          const y = padTop + tt * chartH;
          return <line key={tt} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#F3F4F6" strokeWidth="1"/>;
        })}
        {hasData && (
          <>
            <path d={areaD} fill="url(#lineGrad)"/>
            <path d={d} fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.filter((_, i) => i % labelStep === 0 || i === n - 1).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#FF6B35" stroke="white" strokeWidth="1.5"/>
            ))}
            {hp && (
              <>
                <line x1={hp.x} x2={hp.x} y1={padTop} y2={H - padBottom} stroke="#FF6B35" strokeWidth="1" strokeDasharray="3,3" opacity="0.4"/>
                <circle cx={hp.x} cy={hp.y} r="5" fill="#FF6B35" stroke="white" strokeWidth="2"/>
              </>
            )}
          </>
        )}
        {!hasData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="#9CA3AF">
            No data yet
          </text>
        )}
        {labels.map((lbl, i) => lbl ? (
          <text key={i} x={padX + (i / Math.max(n - 1, 1)) * (W - padX * 2)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9CA3AF">{lbl}</text>
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

type DetailMetric = { key: Series | "aiRate"; label: string; total: number; daily?: Record<string, number> };

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [series, setSeries] = useState<Series>("conversations");
  const { isPro } = usePlan();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<"5xx" | null>(null);
  const [detail, setDetail] = useState<DetailMetric | null>(null);

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

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    doFetch();
  }, [isPro, doFetch]);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  const dailyBySeries: Record<Series, Record<string, number>> = useMemo(() => ({
    conversations: analytics?.dailyConvCounts ?? {},
    appointments: analytics?.dailyApptCounts ?? {},
    visits: analytics?.dailyVisitCounts ?? {},
  }), [analytics]);

  const chartData = buildDayArray(dailyBySeries[series], days);
  const chartLabels = buildLabels(days);

  const totalConvs = analytics?.totalConversations ?? 0;
  const totalAppts = analytics?.totalAppointments ?? 0;
  const websiteVisits = analytics?.websiteVisits ?? 0;
  const aiResolutionRate = analytics?.aiResolutionRate ?? null;
  const channelTable = analytics?.channelBreakdown ?? [];

  const apptsChange = analytics ? computeChange(periodSum(analytics.dailyApptCounts, days), periodSum(analytics.dailyApptCounts, days, days)) : null;
  const convsChange = analytics ? computeChange(periodSum(analytics.dailyConvCounts, days), periodSum(analytics.dailyConvCounts, days, days)) : null;
  const visitsChange = analytics ? computeChange(periodSum(analytics.dailyVisitCounts, days), periodSum(analytics.dailyVisitCounts, days, days)) : null;

  const seriesToggles: { key: Series; label: string }[] = [
    { key: "conversations", label: t("analytics.convsShort") },
    { key: "appointments", label: t("analytics.apptsShort") },
    { key: "visits", label: t("analytics.visitsShort") },
  ];

  const hasChannelData = channelTable.some((r) => r.conversations > 0 || r.leads > 0);

  const openDetail = (metric: DetailMetric) => {
    track("analytics_card_expanded", { metric: metric.key });
    setDetail(metric);
  };

  const detailFullData = detail?.daily ? buildDayArray(detail.daily, 180) : [];
  const detailHasData = detailFullData.some((v) => v > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      {/* Header — soft gradient wash behind title + KPI row, matching reference */}
      <div className="rounded-2xl p-5 -mx-1" style={{ background: "linear-gradient(135deg, rgba(255,107,53,0.06), rgba(255,51,102,0.03) 60%, transparent)" }}>
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111111]">{t("analytics.title")}</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {t("analytics.subtitle")}{analytics?.businessName ? ` ${analytics.businessName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? "bg-[#FF6B35] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 5xx error */}
        {isPro && fetchError === "5xx" && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 mb-5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.3"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-sm text-red-700 flex-1">We couldn&apos;t load your analytics right now. Tap retry.</p>
            <button onClick={doFetch} className="text-xs font-bold text-red-700 hover:text-red-900 shrink-0 px-3 py-1.5 border border-red-300 rounded-lg hover:bg-red-100 transition-colors">
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
              <button onClick={() => setSeries("conversations")}
                className={`text-left bg-white border rounded-xl p-5 transition-colors ${series === "conversations" ? "border-[#FF6B35]" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>
                <p className="text-[11px] text-[#6B7280] mb-3">{t("analytics.conversations")}</p>
                <p className="text-3xl font-bold text-[#111111] leading-none mb-2"><CountUp value={totalConvs} /></p>
                <TrendBadge change={convsChange} label={t("analytics.vsPriorPeriod")} />
              </button>

              <button onClick={() => setSeries("appointments")}
                className={`text-left bg-white border rounded-xl p-5 transition-colors ${series === "appointments" ? "border-[#FF6B35]" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>
                <p className="text-[11px] text-[#6B7280] mb-3">{t("analytics.appointments")}</p>
                <p className="text-3xl font-bold text-[#111111] leading-none mb-2"><CountUp value={totalAppts} /></p>
                <TrendBadge change={apptsChange} label={t("analytics.vsPriorPeriod")} />
              </button>

              <button onClick={() => setSeries("visits")}
                className={`text-left bg-white border rounded-xl p-5 transition-colors ${series === "visits" ? "border-[#FF6B35]" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>
                <p className="text-[11px] text-[#6B7280] mb-3">{t("analytics.websiteVisits")}</p>
                <p className="text-3xl font-bold text-[#111111] leading-none mb-2"><CountUp value={websiteVisits} /></p>
                <TrendBadge change={visitsChange} label={t("analytics.vsPriorPeriod")} />
              </button>

              <button
                onClick={() => openDetail({ key: "aiRate", label: t("analytics.aiResolutionRate"), total: aiResolutionRate ?? 0 })}
                className="text-left bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#D1D5DB] transition-colors flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#6B7280] mb-3">{t("analytics.aiResolutionRate")}</p>
                  {aiResolutionRate === null ? (
                    <p className="text-sm text-[#9CA3AF]">{t("analytics.noDataYet")}</p>
                  ) : (
                    <p className="text-3xl font-bold text-[#111111] leading-none"><CountUp value={aiResolutionRate} suffix="%" /></p>
                  )}
                </div>
                {aiResolutionRate !== null && (
                  <CircularProgress value={aiResolutionRate} size={44} strokeWidth={4} color="#16A34A" />
                )}
              </button>
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
              <p className="text-sm font-bold text-[#111111]">{t("analytics.activityOverTime")}</p>
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
              <LineChart data={chartData} labels={chartLabels} days={days} unitLabel={seriesToggles.find((s) => s.key === series)?.label.toLowerCase() ?? ""} />
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
          </div>

          {/* AI Performance */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <p className="text-sm font-bold text-[#111111] mb-5">{t("analytics.aiPerformance")}</p>
            <div className="grid grid-cols-2 gap-0 divide-x divide-[#E5E7EB]">
              <button onClick={() => openDetail({ key: "conversations", label: t("analytics.messagesHandled"), total: totalConvs, daily: analytics?.dailyConvCounts })}
                className="px-6 first:pl-0 last:pr-0 text-left hover:opacity-80 transition-opacity">
                <p className="text-2xl font-bold text-[#FF6B35] mb-1"><CountUp value={totalConvs} /></p>
                <p className="text-xs text-[#6B7280]">{t("analytics.messagesHandled")}</p>
              </button>
              <button onClick={() => openDetail({ key: "appointments", label: t("analytics.bookingsByAI"), total: totalAppts, daily: analytics?.dailyApptCounts })}
                className="px-6 first:pl-0 last:pr-0 text-left hover:opacity-80 transition-opacity">
                <p className="text-2xl font-bold text-[#FF6B35] mb-1"><CountUp value={totalAppts} /></p>
                <p className="text-xs text-[#6B7280]">{t("analytics.bookingsByAI")}</p>
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#9CA3AF]">{t("analytics.clickForDetails")}</p>
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

      {/* Metric detail modal — real full history, honest zero-state */}
      {detail && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6] sticky top-0 bg-white">
              <div>
                <p className="text-sm font-bold text-[#111111]">{detail.label}</p>
                {detail.key !== "aiRate" && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{t("analytics.fullHistory")}</p>}
              </div>
              <button onClick={() => setDetail(null)} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111111] transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="p-6">
              {detail.key === "aiRate" ? (
                aiResolutionRate === null ? (
                  <div className="text-center py-10">
                    <p className="text-sm font-semibold text-[#374151] mb-1">{t("analytics.noHistoryYet")}</p>
                    <p className="text-xs text-[#9CA3AF]">Connect a channel and start real conversations to see this here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6">
                    <CircularProgress value={aiResolutionRate} size={140} strokeWidth={12} color="#16A34A" />
                    <p className="text-sm text-[#6B7280] mt-6 text-center max-w-xs">
                      Of all real conversations recorded, this is the share the AI resolved fully on its own, with no human handoff needed.
                    </p>
                  </div>
                )
              ) : !detailHasData ? (
                <div className="text-center py-10">
                  <p className="text-sm font-semibold text-[#374151] mb-1">
                    {t("analytics.noHistoryYet")}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">No real activity has been recorded for this yet.</p>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-[#111111] mb-4"><CountUp value={detail.total} /></p>
                  <LineChart data={detailFullData} labels={buildLabels(180)} days={180} unitLabel={detail.label.toLowerCase()} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
