"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import CountUp from "@/components/ui/CountUp";
import CircularProgress from "@/components/ui/CircularProgress";

const CHANNEL_COLORS: Record<string, string> = { instagram: "#E1306C", whatsapp: "#25D366", website: "#FF6B35" };

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { confirmed: "#16A34A", pending: "#FF6B35", cancelled: "#DC2626" };
  return <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: colors[status] || "#9CA3AF" }} />;
}

// FIX 4 (round R): no more arrow icons -- pct (including a real 0)
// renders as plain colored text.
// FIX 1 (round S): reverted back to a real "+X new" figure (using the
// true current count) instead of a plain "New" label -- see lib/stats.ts's
// ChangeInfo for the full definition of each case.
function ChangeText({ change }: { change?: { pct?: number; newCount?: number } }) {
  if (!change) return null;
  if (change.newCount !== undefined) {
    return <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">+{change.newCount} new</span>;
  }
  if (change.pct === undefined) return null;
  const color = change.pct > 0 ? "text-green-600 dark:text-green-400" : change.pct < 0 ? "text-red-500 dark:text-red-400" : "text-[#9CA3AF] dark:text-[#6E6E76]";
  const sign = change.pct > 0 ? "+" : "";
  return <span className={`text-[11px] font-semibold ${color}`}>{sign}{change.pct}%</span>;
}

// Round M5 FIX 7 (Dashboard redesign): small icon badges to give the KPI
// strip more visual hierarchy -- purely decorative, no new data. Plain
// Tailwind dark: classes (no inline style) so the class-based dark-mode
// strategy (tailwind.config.ts darkMode:"class") applies without a
// separate styled-jsx style tag re-injected on every render.
const KPI_ICON_BG_CLASS: Record<string, string> = {
  kpiLeadsToday: "bg-[#FFF5F0] dark:bg-[#3D2418]",
  kpiAppointmentsToday: "bg-[#F0FDF4] dark:bg-[#052E16]",
  kpiMessagesToday: "bg-[#EFF6FF] dark:bg-[#172554]",
  kpiCallsToday: "bg-[#F5F3FF] dark:bg-[#2E1065]",
};
const KPI_ICON_COLOR: Record<string, string> = {
  kpiLeadsToday: "#FF6B35", kpiAppointmentsToday: "#16A34A", kpiMessagesToday: "#2563EB", kpiCallsToday: "#7C3AED",
};

function KpiIcon({ label }: { label: string }) {
  const color = KPI_ICON_COLOR[label] || "#6B7280";
  const paths: Record<string, JSX.Element> = {
    kpiLeadsToday: <path d="M7 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 12c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />,
    kpiAppointmentsToday: <><rect x="1.5" y="2.5" width="11" height="10" rx="1.3" stroke={color} strokeWidth="1.3" /><path d="M4.5 1.5v2M9.5 1.5v2M1.5 5.5h11" stroke={color} strokeWidth="1.3" strokeLinecap="round" /></>,
    kpiMessagesToday: <path d="M12.5 8.2a1 1 0 0 1-1 1H5l-2.5 2.3V2.8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />,
    kpiCallsToday: <path d="M2.5 2.7c0-.6.5-1.1 1.1-1.1h1.3c.5 0 .9.3 1 .8l.5 1.9c.1.4 0 .9-.3 1.2l-.9.9a8 8 0 0 0 3.4 3.4l.9-.9c.3-.3.8-.4 1.2-.3l1.9.5c.5.1.8.5.8 1v1.3c0 .6-.5 1.1-1.1 1.1C6.9 12.5 1.5 7.1 1.5 3.8" stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />,
  };
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${KPI_ICON_BG_CLASS[label] || "bg-[#F3F4F6] dark:bg-[#1E1E24]"}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">{paths[label] ?? null}</svg>
    </div>
  );
}

export type DashUIConv = { id: string; customer_name: string | null; channel: string; preview: string; time: string; isNew: boolean };
export type DashUIAppt = { id: string; time: string; name: string; service: string; status: string };
// FIX 6 (round Q): change is a real ChangeInfo now, never a bare number --
// pct is present for a real percentage (including a genuine 0%), newCount
// is present instead when the prior period was 0 and current > 0 (no
// valid percentage exists from a zero base). See lib/stats.ts's ChangeInfo.
export type DashUIKPI  = { label: string; value: string; change?: { pct?: number; newCount?: number } };
// Round M5 FIX 7 (Dashboard redesign)
export type DashUILeadPipeline = { new: number; contacted: number; qualified: number; booked: number; client: number };
export type DashUIActivityItem = { id: string; type: "conversation" | "appointment"; label: string; sub: string; time: string };

interface Props {
  loading: boolean;
  firstName: string;
  bName: string;
  kpis: DashUIKPI[];
  convs: DashUIConv[];
  appts: DashUIAppt[];
  basePath?: string;
  showBanner?: boolean;
  onDismissBanner?: () => void;
  showKbBanner?: boolean;
  kbScore?: number;
  onDismissKbBanner?: () => void;
  // AI Resolution Rate — real percentage (0-100) of conversations the AI
  // handled without ever needing a human handoff. null = no real data yet
  // (honest empty state, never a fabricated 0%/100%).
  aiResolutionRate?: number | null;
  // Round M5 FIX 7 (Dashboard redesign) — all real, all optional so the
  // props stay backward-compatible with any caller that hasn't wired them.
  needsHumanCount?: number;
  leadPipeline?: DashUILeadPipeline;
  activity?: DashUIActivityItem[];
}

const PIPELINE_STAGE_ORDER = ["new", "contacted", "qualified", "booked", "client"] as const;
const PIPELINE_DOT: Record<string, string> = {
  new: "#9CA3AF", contacted: "#FF6B35", qualified: "#F59E0B", booked: "#16A34A", client: "#7C3AED",
};

function ActivityIcon({ type }: { type: "conversation" | "appointment" }) {
  return type === "conversation" ? (
    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-[#172554] flex items-center justify-center shrink-0">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M12.5 8.2a1 1 0 0 1-1 1H5l-2.5 2.3V2.8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1z" stroke="#2563EB" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  ) : (
    <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-[#052E16] flex items-center justify-center shrink-0">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="2.5" width="11" height="10" rx="1.3" stroke="#16A34A" strokeWidth="1.3" />
        <path d="M4.5 1.5v2M9.5 1.5v2M1.5 5.5h11" stroke="#16A34A" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function DashboardPageUI({
  loading, firstName, bName, kpis, convs, appts,
  basePath = "/app",
  showBanner = false, onDismissBanner,
  showKbBanner = false, kbScore = 0, onDismissKbBanner,
  aiResolutionRate = null,
  needsHumanCount = 0,
  leadPipeline,
  activity = [],
}: Props) {
  const { t } = useI18n();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "greeting.morning" : hour < 17 ? "greeting.afternoon" : "greeting.evening";
  const displayName = firstName || t("greeting.there");

  const pipelineTotal = leadPipeline
    ? PIPELINE_STAGE_ORDER.reduce((sum, s) => sum + (leadPipeline[s] ?? 0), 0)
    : 0;

  const messagesToday = kpis.find((k) => k.label === "kpiMessagesToday")?.value ?? "0";
  const callsToday = kpis.find((k) => k.label === "kpiCallsToday")?.value ?? "0";

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-5">

      {/* KB low-score banner */}
      {showKbBanner && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2a3 3 0 0 1 3 3c0 .9-.4 1.7-1 2.3L10.5 12h-7L5 7.3A3 3 0 0 1 4 5a3 3 0 0 1 3-3z" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M5.5 12h3" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111111] dark:text-white">{t("dashboard.kbBannerPre")}{kbScore}{t("dashboard.kbBannerPost")}</p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{t("dashboard.kbBannerSub")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`${basePath}/ai-training`}
              className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vela-gradient)" }}>
              {t("dashboard.trainAI")}
            </Link>
            <button onClick={onDismissKbBanner} className="p-1.5 text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Onboarding banner */}
      {showBanner && !loading && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#FF6B35]/30 dark:border-[#FF6B35]/25 bg-[#FFF8F5] dark:bg-[#2A1810]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5v11M1.5 7h11" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111111] dark:text-white">{t("dashboard.onboardingTitle")}</p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{t("dashboard.onboardingDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`${basePath}/welcome`}
              className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vela-gradient)" }}>
              {t("dashboard.continueSetup")}
            </Link>
            <button onClick={onDismissBanner} className="p-1.5 text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#111111] dark:text-white">
          {loading ? t("common.loading") : `${t(greetKey)}, ${displayName}`}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{bName ? `${bName} · ` : ""}{today}</p>
      </div>

      {/* KPI strip */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading
            ? [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-5 py-5 animate-pulse">
                  <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-2/3 mb-3" />
                  <div className="h-7 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-1/3 mb-2" />
                </div>
              ))
            : kpis.map((k) => {
                const numeric = Number(k.value);
                const isNumeric = Number.isFinite(numeric) && String(numeric) === k.value.trim();
                return (
                  <div key={k.label} className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-5 py-5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <KpiIcon label={k.label} />
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{t(`dashboard.${k.label}`)}</p>
                      </div>
                      {/* FIX 4 (round R): plain colored text, no arrow icon,
                          no pill background -- and never the vague "Same
                          as yesterday" phrase; a real 0% renders as the
                          literal text "0%". See ChangeText above. */}
                      <ChangeText change={k.change} />
                    </div>
                    <p className="text-2xl font-bold text-[#111111] dark:text-white leading-none">
                      {isNumeric ? <CountUp value={numeric} /> : k.value}
                    </p>
                  </div>
                );
              })}

          {/* AI Resolution Rate — real circular indicator, honest zero-state */}
          {!loading && (
            <div className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-5 py-5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mb-3">{t("dashboard.aiResolutionRate")}</p>
                {aiResolutionRate === null ? (
                  <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.noDataYet")}</p>
                ) : (
                  <p className="text-2xl font-bold text-[#111111] dark:text-white leading-none"><CountUp value={aiResolutionRate} suffix="%" /></p>
                )}
              </div>
              {aiResolutionRate !== null && <CircularProgress value={aiResolutionRate} size={40} strokeWidth={4} color="#16A34A" />}
            </div>
          )}
        </div>
      </div>

      {/* Lead Pipeline — compact real stage bar, real counts only */}
      {!loading && leadPipeline && (
        <div className="bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-xs font-bold text-[#111111] dark:text-white uppercase tracking-wide">{t("dashboard.leadPipeline")}</h2>
            <a href={`${basePath}/leads`} className="text-xs text-[#FF6B35] font-semibold hover:underline">{t("dashboard.viewAll")}</a>
          </div>
          <div className="flex items-stretch gap-1">
            {PIPELINE_STAGE_ORDER.map((stage, i) => {
              const count = leadPipeline[stage] ?? 0;
              const pct = pipelineTotal > 0 ? Math.max((count / pipelineTotal) * 100, count > 0 ? 4 : 0) : 0;
              return (
                <div key={stage} className={`flex-1 min-w-0 ${i > 0 ? "border-l border-[#F3F4F6] dark:border-[#2A2A32] pl-3" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PIPELINE_DOT[stage] }} />
                    <p className="text-[10px] font-semibold text-[#9CA3AF] dark:text-[#6E6E76] uppercase tracking-wide truncate">
                      {t(`leads.stages.${stage}`)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#111111] dark:text-white leading-none mb-2">{count}</p>
                  <div className="h-1 rounded-full bg-[#F3F4F6] dark:bg-[#1E1E24] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PIPELINE_DOT[stage] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Conversations — 2 cols */}
        <div className="lg:col-span-2 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6] dark:border-[#2A2A32]">
            <h2 className="text-sm font-bold text-[#111111] dark:text-white">{t("dashboard.recentMessages")}</h2>
            <a href={`${basePath}/conversations`} className="text-xs text-[#FF6B35] font-semibold hover:underline">{t("dashboard.viewAll")}</a>
          </div>
          {loading ? (
            <div className="divide-y divide-[#F9FAFB] dark:divide-[#2A2A32]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-[#1E1E24] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-2/3" />
                    <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1E1E24] flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M16 2H2a1 1 0 0 0-1 1v12l3-3h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="#9CA3AF" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">{t("dashboard.noConversations")}</p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76] mb-3">{t("dashboard.connectToReceive")}</p>
              <Link href={`${basePath}/channels`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vp-color)" }}>
                {t("dashboard.connectChannel")}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F9FAFB] dark:divide-[#2A2A32]">
              {convs.map((c) => (
                <a key={c.id} href={`${basePath}/conversations`} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] dark:hover:bg-[#1E1E24] transition-colors cursor-pointer">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-[#1E1E24] flex items-center justify-center text-xs font-bold text-[#374151] dark:text-[#D1D5DB]">
                      {(c.customer_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                      style={{ background: CHANNEL_COLORS[c.channel] || "#9CA3AF" }}>
                    </div>
                    {c.isNew && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF6B35] border-2 border-white dark:border-[#17171C]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#111111] dark:text-white truncate">{c.customer_name ?? t("dashboard.unknown")}</span>
                      <span className="text-[10px] text-[#9CA3AF] dark:text-[#6E6E76] shrink-0 ml-2">{c.time}</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">{c.preview || t("dashboard.noMessages")}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Appointments — 3 cols */}
        <div className="lg:col-span-3 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6] dark:border-[#2A2A32]">
            <h2 className="text-sm font-bold text-[#111111] dark:text-white">{t("dashboard.todayAppointments")}</h2>
            <a href={`${basePath}/appointments`} className="text-xs text-[#FF6B35] font-semibold hover:underline">{t("dashboard.viewAll")}</a>
          </div>
          {loading ? (
            <div className="divide-y divide-[#F9FAFB] dark:divide-[#2A2A32]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-5 px-6 py-4 animate-pulse">
                  <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-12" />
                  <div className="w-px h-8 bg-[#F3F4F6] dark:bg-[#1E1E24]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-1/2" />
                    <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : appts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1E1E24] flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="14" height="13" rx="1.5" stroke="#9CA3AF" strokeWidth="1.3"/>
                  <path d="M6 2v2M12 2v2M2 7h14" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">{t("dashboard.noAppointments")}</p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.appointmentsHint")}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F9FAFB] dark:divide-[#2A2A32]">
              {appts.map((a) => (
                <div key={a.id} className="flex items-center gap-5 px-6 py-4 hover:bg-[#FAFAFA] dark:hover:bg-[#1E1E24] transition-colors cursor-pointer">
                  <span className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF] w-12 shrink-0">{a.time}</span>
                  <div className="w-px h-8 bg-[#FF6B35] rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111111] dark:text-white truncate">{a.name}</p>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{a.service}</p>
                  </div>
                  <StatusDot status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Activity + Recent Activity — real, existing data-layer metrics only */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* AI Activity — 2 cols */}
          <div className="lg:col-span-2 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6] dark:border-[#2A2A32]">
              <h2 className="text-sm font-bold text-[#111111] dark:text-white">{t("dashboard.aiActivity")}</h2>
              {aiResolutionRate !== null && (
                <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">{aiResolutionRate}% {t("dashboard.aiResolutionRate")}</span>
              )}
            </div>
            <div className="divide-y divide-[#F9FAFB] dark:divide-[#2A2A32]">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-[#172554] flex items-center justify-center shrink-0">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M12.5 8.2a1 1 0 0 1-1 1H5l-2.5 2.3V2.8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1z" stroke="#2563EB" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">{t("dashboard.messagesHandled")}</p>
                </div>
                <p className="text-sm font-bold text-[#111111] dark:text-white shrink-0">{messagesToday}</p>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-[#2E1065] flex items-center justify-center shrink-0">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 2.7c0-.6.5-1.1 1.1-1.1h1.3c.5 0 .9.3 1 .8l.5 1.9c.1.4 0 .9-.3 1.2l-.9.9a8 8 0 0 0 3.4 3.4l.9-.9c.3-.3.8-.4 1.2-.3l1.9.5c.5.1.8.5.8 1v1.3c0 .6-.5 1.1-1.1 1.1C6.9 12.5 1.5 7.1 1.5 3.8" stroke="#7C3AED" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">{t("dashboard.callsHandled")}</p>
                </div>
                <p className="text-sm font-bold text-[#111111] dark:text-white shrink-0">{callsToday}</p>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M7 2a3 3 0 0 1 3 3c0 .9-.4 1.7-1 2.3L10.5 12h-7L5 7.3A3 3 0 0 1 4 5a3 3 0 0 1 3-3z" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round"/>
                      <path d="M5.5 12h3" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">{t("dashboard.escalatedToHuman")}</p>
                </div>
                <p className="text-sm font-bold text-[#111111] dark:text-white shrink-0">{needsHumanCount}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity — 3 cols */}
          <div className="lg:col-span-3 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6] dark:border-[#2A2A32]">
              <h2 className="text-sm font-bold text-[#111111] dark:text-white">{t("dashboard.recentActivity")}</h2>
            </div>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.noActivity")}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F9FAFB] dark:divide-[#2A2A32]">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-6 py-3.5">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#111111] dark:text-white truncate">{item.label}</span>
                        <span className="text-[10px] text-[#9CA3AF] dark:text-[#6E6E76] shrink-0 ml-2">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
