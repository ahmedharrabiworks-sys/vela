"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import CountUp from "@/components/ui/CountUp";
import GlassBlobs from "@/components/ui/GlassBlobs";
import { ActivityChart, ChartCard, ChartSummary, RingCard, SeriesToggle, toDayPoints } from "@/components/dashboard/ActivityCharts";

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
    aiResolutionRate: { value: number | null; previous: number | null; trend: Trend; handled?: number; needed?: number };
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
  const color = trend.direction === "up" ? "text-green-600 bg-green-50 "
    : trend.direction === "down" ? "text-red-600 bg-red-50 "
    : "text-[#6B7280] bg-[#F3F4F6] ";
  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const sign = trend.pct > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${color}`}>
      {arrow} {sign}{trend.pct}%
    </span>
  );
}

function KpiCard({ label, value, suffix, trend, periodLabel, subDim }: {
  label: string; value: number | null; suffix?: string; trend: Trend; periodLabel: string | null; subDim?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">{label}</p>
        <TrendPillView trend={trend} />
      </div>
      {value === null ? (
        <p className="text-sm text-[#9CA3AF] py-1.5">{subDim}</p>
      ) : (
        <p className="text-[28px] sm:text-[32px] font-bold text-[#111111] leading-none tabular-nums">
          <CountUp value={value} suffix={suffix} />
        </p>
      )}
      {periodLabel && <p data-testid="kpi-comparison" className="text-[11px] text-[#9CA3AF] mt-1.5">{periodLabel}</p>}
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
  const { t, locale } = useI18n();
  const [series, setSeries] = useState<"conversations" | "appointments">("conversations");

  const periodLabel = `${t("dashboardV2.vs")} ${t(`dashboardV2.range.${range}`)}`;
  const chartPoints = data ? toDayPoints(data.series[series].map((p) => ({ date: p.label, value: p.value })), locale) : [];
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
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2a3 3 0 0 1 3 3c0 .9-.4 1.7-1 2.3L10.5 12h-7L5 7.3A3 3 0 0 1 4 5a3 3 0 0 1 3-3z" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M5.5 12h3" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111111] ">{t("dashboard.kbBannerPre")}{kbScore}{t("dashboard.kbBannerPost")}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{t("dashboard.kbBannerSub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`${basePath}/ai-training`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
                {t("dashboard.trainAI")}
              </Link>
              <button onClick={onDismissKbBanner} className="w-11 h-11 sm:w-auto sm:h-auto sm:p-1.5 -m-2 sm:m-0 flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
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
                <p className="text-xs font-bold text-[#111111] ">{t("dashboard.onboardingTitle")}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{t("dashboard.onboardingDesc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`${basePath}/welcome`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
                {t("dashboard.continueSetup")}
              </Link>
              <button onClick={onDismissOnboarding} className="w-11 h-11 sm:w-auto sm:h-auto sm:p-1.5 -m-2 sm:m-0 flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Header + range toggle */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111111] ">{t("dashboardV2.title")}</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {t("dashboardV2.subtitle")}{businessName ? ` ${businessName}` : ""}
            </p>
          </div>
          <div className="glass flex items-center gap-1 rounded-xl p-1">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <button key={r} onClick={() => onRangeChange(r)}
                className={`px-3 min-w-[44px] h-11 sm:h-auto sm:min-w-0 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? "text-white" : "text-[#6B7280] hover:text-[#111111] "}`}
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
            <p className="text-sm text-red-700 flex-1">{t("dashboardV2.errorMessage")}</p>
            <button onClick={onRetry} className="text-xs font-bold text-red-700 hover:text-red-900 shrink-0 px-3 py-1.5 border border-red-300 rounded-lg hover:bg-red-100 transition-colors">
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
                  <KpiCard label={t("dashboardV2.kpiConversations")} value={data!.kpis.conversations.value} trend={data!.kpis.conversations.trend} periodLabel={data!.kpis.conversations.trend ? periodLabel : null} />
                  <KpiCard label={t("dashboardV2.kpiAppointments")} value={data!.kpis.appointments.value} trend={data!.kpis.appointments.trend} periodLabel={data!.kpis.appointments.trend ? periodLabel : null} />
                  <KpiCard label={t("dashboardV2.kpiAiResolution")} value={data!.kpis.aiResolutionRate.value} suffix="%" trend={data!.kpis.aiResolutionRate.trend} periodLabel={data!.kpis.aiResolutionRate.trend ? periodLabel : null} subDim={t("dashboardV2.noDataYet")} />
                  <KpiCard label={t("dashboardV2.kpiNewCustomers")} value={data!.kpis.newCustomers.value} trend={data!.kpis.newCustomers.trend} periodLabel={data!.kpis.newCustomers.trend ? periodLabel : null} />
                </>
              )}
            </div>

            {/* Activity (2/3) + AI handled ring and plan usage (1/3) */}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SkeletonCard className="h-[236px] lg:col-span-2" />
                <SkeletonCard className="h-[236px]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <div className="lg:col-span-2">
                  <ChartCard
                    fill
                    title={t("dashboardV2.activityOverTime")}
                    right={<SeriesToggle value={series} onChange={setSeries} options={(["conversations", "appointments"] as const).map((s) => ({ value: s, label: t(`dashboardV2.series.${s}`) }))} />}
                  >
                    <ActivityChart
                      points={chartPoints}
                      unit={t(`dashboardV2.series.${series}`)}
                      emptyText={data!.hasAnyDataEver ? undefined : t("dashboardV2.firstConversationsHint")}
                    />
                    <ChartSummary points={chartPoints} labels={{ total: t("agentUi.charts.total"), peak: t("agentUi.charts.peak"), average: t("agentUi.charts.average") }} />
                    {!data!.hasAnyDataEver && (
                      <div className="text-center mt-2">
                        <Link href={noChannelConnected ? `${basePath}/channels` : `${basePath}/ai-training`} className="text-xs font-semibold text-[#FF6B35] hover:underline">
                          {noChannelConnected ? t("dashboardV2.connectChannel") : t("dashboard.trainAI")}
                        </Link>
                      </div>
                    )}
                  </ChartCard>
                </div>
                <RingCard
                  fill
                  title={t("agentUi.charts.aiHandled")}
                  value={data!.kpis.aiResolutionRate.value}
                  ringLabel={t("agentUi.charts.ofConversations")}
                  emptyText={t("dashboardV2.noDataYet")}
                  usageTitle={t("dashboardV2.planUsage")}
                  unlimitedLabel={t("dashboardV2.unlimited")}
                  notIncludedLabel={t("agentUi.charts.notIncluded")}
                  legend={[
                    { label: t("agentUi.charts.handledByAi"), value: data!.kpis.aiResolutionRate.handled ?? 0, color: "#FF6B35" },
                    { label: t("agentUi.charts.neededHuman"), value: data!.kpis.aiResolutionRate.needed ?? 0, color: "#D1D5DB" },
                  ]}
                  rows={(["messages", "voiceMinutes"] as const).map((key) => ({ label: t(`dashboardV2.usage.${key}`), used: data!.usage[key].used, limit: data!.usage[key].limit }))}
                />
              </div>
            )}

            {/* Channel breakdown */}
            {loading ? (
              <SkeletonCard className="h-[220px]" />
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-black/[0.06] ">
                  <p className="text-sm font-bold text-[#111111] ">{t("dashboardV2.channelBreakdown")}</p>
                </div>
                {!hasAnyChannel ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-[#9CA3AF] ">{t("dashboardV2.noChannelYet")}</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop/tablet: table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full min-w-[480px]">
                        <thead>
                          <tr className="border-b border-black/[0.06] ">
                            {[t("dashboardV2.channel"), t("dashboardV2.kpiConversations"), t("dashboardV2.kpiAppointments"), t("dashboardV2.share")].map((h) => (
                              <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data!.channels.map((row) => (
                            <tr key={row.channel} className="border-b border-black/[0.04] last:border-none">
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] ">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHANNEL_META[row.channel].color }} />
                                  {t(CHANNEL_META[row.channel].labelKey)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-[#374151] "><CountUp value={row.conversations} /></td>
                              <td className="px-6 py-4 text-sm text-[#374151] "><CountUp value={row.appointments} /></td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2.5 min-w-[110px]">
                                  <div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${row.share}%`, background: CHANNEL_META[row.channel].color }} />
                                  </div>
                                  <span className="text-xs font-semibold text-[#6B7280] w-8 text-right shrink-0">{row.share}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile: stacked rows */}
                    <div className="sm:hidden divide-y divide-black/[0.06] ">
                      {data!.channels.map((row) => (
                        <div key={row.channel} className="px-4 py-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] ">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHANNEL_META[row.channel].color }} />
                              {t(CHANNEL_META[row.channel].labelKey)}
                            </span>
                            <span className="text-xs font-semibold text-[#6B7280] ">{row.share}%</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-[#6B7280] mb-2">
                            <span>{t("dashboardV2.kpiConversations")}: <span className="font-semibold text-[#111111] ">{row.conversations}</span></span>
                            <span>{t("dashboardV2.kpiAppointments")}: <span className="font-semibold text-[#111111] ">{row.appointments}</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.share}%`, background: CHANNEL_META[row.channel].color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 sm:px-6 py-4 border-t border-black/[0.06] flex justify-end">
                      <button onClick={onExport}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-black/[0.08] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
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
