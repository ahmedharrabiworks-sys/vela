"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import CountUp from "@/components/ui/CountUp";
import GlassBlobs from "@/components/ui/GlassBlobs";

// Dashboard redesign round: replaces the prior "Linear/Vercel minimal
// typography" direction (Round M12/M13 -- see git history) with glass
// cards + soft orange ambient, per Oussama's explicit current request. The
// M12/M13 comments explicitly reasoned against cards/badges/fill color;
// this is a deliberate, acknowledged style reversal for THIS round, not an
// accidental redo of settled work.

export type Range = "7d" | "30d" | "90d";
export type Trend = { direction: "up" | "down" | "flat"; pct: number } | null;
export type DashKPI = { value: number; previous: number; trend: Trend };
export type SeriesPoint = { bucket: string; label: string; value: number };
export type ChannelRow = { channel: "whatsapp" | "instagram" | "phone"; conversations: number; appointments: number; share: number };

export interface DashboardPayload {
  businessName: string;
  range: Range;
  kpis: {
    conversations: DashKPI;
    appointments: DashKPI;
    aiResolutionRate: { value: number | null; previous: number | null; trend: Trend };
    newCustomers: DashKPI;
  };
  series: { conversations: SeriesPoint[]; appointments: SeriesPoint[] };
  channels: ChannelRow[];
  connectedChannels: { whatsapp: boolean; instagram: boolean; phone: boolean };
  hasAnyDataEver: boolean;
  plan: string;
  usage: { messages: { used: number; limit: number | null }; voiceMinutes: { used: number; limit: number | null } };
}

interface Props {
  data: DashboardPayload | null;
  loading: boolean;
  error: boolean;
  range: Range;
  onRangeChange: (r: Range) => void;
  onRetry: () => void;
  onExport: () => void;
  businessName: string;
  showOnboardingBanner: boolean;
  onDismissOnboarding: () => void;
  showKbBanner: boolean;
  kbScore: number;
  onDismissKbBanner: () => void;
  basePath?: string;
}

const CHANNEL_META: Record<ChannelRow["channel"], { color: string; labelKey: string }> = {
  whatsapp: { color: "#25D366", labelKey: "dashboardV2.channelWhatsApp" },
  instagram: { color: "#E1306C", labelKey: "dashboardV2.channelInstagram" },
  phone: { color: "#FF6B35", labelKey: "dashboardV2.channelPhone" },
};

function TrendPillView({ trend }: { trend: Trend }) {
  if (!trend) return null;
  const color = trend.direction === "up" ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40"
    : trend.direction === "down" ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
    : "text-[#6B7280] dark:text-[#9CA3AF] bg-[#F3F4F6] dark:bg-white/5";
  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const sign = trend.pct > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${color}`}>
      {arrow} {sign}{trend.pct}%
    </span>
  );
}

function KpiCard({ label, value, suffix, trend, periodLabel, subDim }: {
  label: string; value: number | null; suffix?: string; trend: Trend; periodLabel: string; subDim?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wide">{label}</p>
        <TrendPillView trend={trend} />
      </div>
      {value === null ? (
        <p className="text-sm text-[#9CA3AF] dark:text-[#6E6E76] py-1.5">{subDim}</p>
      ) : (
        <p className="text-[28px] sm:text-[32px] font-bold text-[#111111] dark:text-white leading-none tabular-nums">
          <CountUp value={value} suffix={suffix} />
        </p>
      )}
      <p className="text-[11px] text-[#9CA3AF] dark:text-[#6E6E76] mt-1.5">{periodLabel}</p>
    </div>
  );
}

// Hand-rolled SVG line chart -- no charting library dependency exists in
// this project (same conclusion already reached and documented in the old
// analytics/page.tsx); this is the "chart library already in the project"
// referred to, reused/adapted here rather than introducing a new npm dep.
function LineChart({ data, unitLabel }: { data: SeriesPoint[]; unitLabel: string }) {
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "#2A2A32" : "#F3F4F6";
  const axisTextColor = theme === "dark" ? "#6E6E76" : "#9CA3AF";
  const W = 800, H = 160, padX = 8, padTop = 12, padBottom = 24;
  const chartH = H - padTop - padBottom;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const n = data.length;
  const [hover, setHover] = useState<{ i: number; clientX: number; clientY: number } | null>(null);

  const pts = data.map((d, i) => ({
    x: padX + (i / Math.max(n - 1, 1)) * (W - padX * 2),
    y: padTop + ((max - d.value) / range) * chartH,
  }));

  let d = pts.length > 0 ? `M ${pts[0].x} ${pts[0].y}` : "";
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const areaD = pts.length > 0 ? d + ` L ${pts[pts.length - 1].x} ${H - padBottom} L ${pts[0].x} ${H - padBottom} Z` : "";
  const hasData = values.some((v) => v > 0);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((relX - padX) / (W - padX * 2)) * Math.max(n - 1, 1))));
    setHover({ i, clientX: e.clientX, clientY: e.clientY });
  };
  const hp = hover ? pts[hover.i] : null;
  const labelEvery = n > 45 ? 15 : n > 14 ? 5 : 1;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="dashLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => {
          const y = padTop + (i / 3) * chartH;
          return <line key={i} x1={padX} x2={W - padX} y1={y} y2={y} stroke={gridColor} strokeWidth="1" />;
        })}
        {hasData ? (
          <>
            <path d={areaD} fill="url(#dashLineGrad)" />
            <path d={d} fill="none" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.length > 0 && (
              <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill="#FF6B35" stroke="white" strokeWidth="1.5" />
            )}
            {hp && (
              <>
                <line x1={hp.x} x2={hp.x} y1={padTop} y2={H - padBottom} stroke="#FF6B35" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                <circle cx={hp.x} cy={hp.y} r="5" fill="#FF6B35" stroke="white" strokeWidth="2" />
              </>
            )}
          </>
        ) : (
          // Faint flat baseline for a genuine zero state, per the task spec
          // -- "nothing fake, nothing blank-looking."
          <line x1={padX} x2={W - padX} y1={H - padBottom - chartH / 3} y2={H - padBottom - chartH / 3} stroke="#FF6B35" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="4,4" />
        )}
        {data.map((pt, i) => (i % labelEvery === 0 ? (
          <text key={i} x={padX + (i / Math.max(n - 1, 1)) * (W - padX * 2)} y={H - 4} textAnchor="middle" fontSize="9" fill={axisTextColor}>
            {pt.label.slice(5)}
          </text>
        ) : null))}
      </svg>
      {hover && hasData && (
        <div className="fixed z-50 pointer-events-none bg-[#111111] text-white text-xs rounded-lg px-3 py-2 shadow-lg"
          style={{ left: hover.clientX + 14, top: hover.clientY - 44 }}>
          <p className="font-semibold whitespace-nowrap">{data[hover.i].label}</p>
          <p className="text-[#FF9466] font-bold">{data[hover.i].value} {unitLabel}</p>
        </div>
      )}
    </div>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`glass rounded-2xl animate-pulse ${className}`} />;
}

export default function DashboardPageUI({
  data, loading, error, range, onRangeChange, onRetry, onExport, businessName,
  showOnboardingBanner, onDismissOnboarding, showKbBanner, kbScore, onDismissKbBanner,
  basePath = "/app",
}: Props) {
  const { t } = useI18n();
  const [series, setSeries] = useState<"conversations" | "appointments">("conversations");

  const periodLabel = `${t("dashboardV2.vs")} ${t(`dashboardV2.range.${range}`)}`;
  const hasAnyChannel = data ? data.channels.length > 0 : false;
  const noChannelConnected = data ? !data.connectedChannels.whatsapp && !data.connectedChannels.instagram && !data.connectedChannels.phone : false;

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6 relative">
      <GlassBlobs variant="spread" />
      <div className="relative z-10 space-y-6">

        {/* KB low-score banner */}
        {showKbBanner && !loading && (
          <div className="glass rounded-2xl flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2a3 3 0 0 1 3 3c0 .9-.4 1.7-1 2.3L10.5 12h-7L5 7.3A3 3 0 0 1 4 5a3 3 0 0 1 3-3z" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M5.5 12h3" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111111] dark:text-white">{t("dashboard.kbBannerPre")}{kbScore}{t("dashboard.kbBannerPost")}</p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{t("dashboard.kbBannerSub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`${basePath}/ai-training`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
                {t("dashboard.trainAI")}
              </Link>
              <button onClick={onDismissKbBanner} className="p-1.5 text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Onboarding checklist -- existing logic (connect a channel, train your AI), restyled as a glass card. */}
        {showOnboardingBanner && !loading && (
          <div className="glass-warm glass rounded-2xl flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111111] dark:text-white">{t("dashboard.onboardingTitle")}</p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{t("dashboard.onboardingDesc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`${basePath}/welcome`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
                {t("dashboard.continueSetup")}
              </Link>
              <button onClick={onDismissOnboarding} className="p-1.5 text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Header + range toggle */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111111] dark:text-white">{t("dashboardV2.title")}</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              {t("dashboardV2.subtitle")}{businessName ? ` ${businessName}` : ""}
            </p>
          </div>
          <div className="glass flex items-center gap-1 rounded-xl p-1">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <button key={r} onClick={() => onRangeChange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? "text-white" : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-white"}`}
                style={range === r ? { background: "var(--vela-gradient)" } : undefined}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="glass rounded-2xl flex items-center gap-3 p-4">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.3" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">{t("dashboardV2.errorMessage")}</p>
            <button onClick={onRetry} className="text-xs font-bold text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 shrink-0 px-3 py-1.5 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors">
              {t("dashboardV2.retry")}
            </button>
          </div>
        )}

        {!error && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                [0, 1, 2, 3].map((i) => <SkeletonCard key={i} className="h-[112px]" />)
              ) : (
                <>
                  <KpiCard label={t("dashboardV2.kpiConversations")} value={data!.kpis.conversations.value} trend={data!.kpis.conversations.trend} periodLabel={periodLabel} />
                  <KpiCard label={t("dashboardV2.kpiAppointments")} value={data!.kpis.appointments.value} trend={data!.kpis.appointments.trend} periodLabel={periodLabel} />
                  <KpiCard label={t("dashboardV2.kpiAiResolution")} value={data!.kpis.aiResolutionRate.value} suffix="%" trend={data!.kpis.aiResolutionRate.trend} periodLabel={periodLabel} subDim={t("dashboardV2.noDataYet")} />
                  <KpiCard label={t("dashboardV2.kpiNewCustomers")} value={data!.kpis.newCustomers.value} trend={data!.kpis.newCustomers.trend} periodLabel={periodLabel} />
                </>
              )}
            </div>

            {/* Plan usage card */}
            {loading ? (
              <SkeletonCard className="h-[110px]" />
            ) : (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <p className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wide mb-3">{t("dashboardV2.planUsage")}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(["messages", "voiceMinutes"] as const).map((key) => {
                    const u = data!.usage[key];
                    const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0;
                    const barColor = pct >= 100 ? "#DC2626" : pct >= 80 ? "#F59E0B" : "var(--vela-gradient)";
                    return (
                      <div key={key}>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">{t(`dashboardV2.usage.${key}`)}</span>
                          <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                            {u.limit === null
                              ? <span className="text-green-600 dark:text-green-400 font-medium">{t("dashboardV2.unlimited")}</span>
                              : <>{u.used.toLocaleString()} <span className="text-[#9CA3AF] dark:text-[#6E6E76]">/ {u.limit.toLocaleString()}</span></>}
                          </span>
                        </div>
                        {u.limit !== null ? (
                          <div className="h-1.5 rounded-full bg-[#F3F4F6] dark:bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        ) : (
                          <div className="h-1.5 rounded-full bg-green-100 dark:bg-green-950/40" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Line chart */}
            {loading ? (
              <SkeletonCard className="h-[260px]" />
            ) : (
              <div className="glass rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <p className="text-sm font-bold text-[#111111] dark:text-white">{t("dashboardV2.activityOverTime")}</p>
                  <div className="flex items-center gap-1 bg-[#F3F4F6] dark:bg-white/5 rounded-lg p-1">
                    {(["conversations", "appointments"] as const).map((s) => (
                      <button key={s} onClick={() => setSeries(s)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${series === s ? "text-white" : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-white"}`}
                        style={series === s ? { background: "var(--vela-gradient)" } : undefined}>
                        {t(`dashboardV2.series.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>
                {!data!.hasAnyDataEver ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <LineChart data={data!.series[series]} unitLabel={t(`dashboardV2.series.${series}`).toLowerCase()} />
                    <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-2 mb-4">{t("dashboardV2.firstConversationsHint")}</p>
                    {noChannelConnected ? (
                      <Link href={`${basePath}/channels`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
                        {t("dashboardV2.connectChannel")} →
                      </Link>
                    ) : (
                      <Link href={`${basePath}/ai-training`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
                        {t("dashboard.trainAI")} →
                      </Link>
                    )}
                  </div>
                ) : (
                  <LineChart data={data!.series[series]} unitLabel={t(`dashboardV2.series.${series}`).toLowerCase()} />
                )}
              </div>
            )}

            {/* Channel breakdown */}
            {loading ? (
              <SkeletonCard className="h-[220px]" />
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <p className="text-sm font-bold text-[#111111] dark:text-white">{t("dashboardV2.channelBreakdown")}</p>
                </div>
                {!hasAnyChannel ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboardV2.noChannelYet")}</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop/tablet: table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full min-w-[480px]">
                        <thead>
                          <tr className="border-b border-black/[0.06] dark:border-white/[0.08]">
                            {[t("dashboardV2.channel"), t("dashboardV2.kpiConversations"), t("dashboardV2.kpiAppointments"), t("dashboardV2.share")].map((h) => (
                              <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold text-[#9CA3AF] dark:text-[#6E6E76] uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data!.channels.map((row) => (
                            <tr key={row.channel} className="border-b border-black/[0.04] dark:border-white/[0.05] last:border-none">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] dark:text-white">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHANNEL_META[row.channel].color }} />
                                  {t(CHANNEL_META[row.channel].labelKey)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-[#374151] dark:text-[#D1D5DB]"><CountUp value={row.conversations} /></td>
                              <td className="px-6 py-4 text-sm text-[#374151] dark:text-[#D1D5DB]"><CountUp value={row.appointments} /></td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2.5 min-w-[110px]">
                                  <div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6] dark:bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${row.share}%`, background: CHANNEL_META[row.channel].color }} />
                                  </div>
                                  <span className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] w-8 text-right shrink-0">{row.share}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile: stacked rows */}
                    <div className="sm:hidden divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {data!.channels.map((row) => (
                        <div key={row.channel} className="px-4 py-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] dark:text-white">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHANNEL_META[row.channel].color }} />
                              {t(CHANNEL_META[row.channel].labelKey)}
                            </span>
                            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">{row.share}%</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-2">
                            <span>{t("dashboardV2.kpiConversations")}: <span className="font-semibold text-[#111111] dark:text-white">{row.conversations}</span></span>
                            <span>{t("dashboardV2.kpiAppointments")}: <span className="font-semibold text-[#111111] dark:text-white">{row.appointments}</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#F3F4F6] dark:bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.share}%`, background: CHANNEL_META[row.channel].color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 sm:px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-end">
                      <button onClick={onExport}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.1] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1.5v6M3.5 5.5L6 8l2.5-2.5M2 9.5v1a1 1 0 001 1h6a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t("dashboardV2.exportCsv")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
