"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import CountUp from "@/components/ui/CountUp";

const CHANNEL_COLORS: Record<string, string> = { instagram: "#E1306C", whatsapp: "#25D366", website: "#FF6B35" };
const STATUS_COLORS: Record<string, string> = { confirmed: "#16A34A", pending: "#FF6B35", cancelled: "#DC2626" };

// Round M8 FIX 6: full redesign. The previous version (icon-in-colored-
// square per metric, five separate bordered cards, a second row of two
// more bordered cards) read as a generic admin-template checklist, not a
// considered composition -- explicitly rejected. This version drops every
// decorative icon badge, replaces the boxed KPI grid with a single
// typographic metrics band (numbers carry the hierarchy, not colored
// squares), and reduces the page to two real surfaces (Conversations,
// Appointments) plus two lightweight, borderless sections below. Same
// real data throughout -- this is a visual rework only, no new metrics,
// no fabricated numbers.

function ChangeText({ change }: { change?: { pct?: number; newCount?: number } }) {
  if (!change) return null;
  if (change.newCount !== undefined) {
    return <span className="text-green-600 dark:text-green-400">+{change.newCount} new</span>;
  }
  if (change.pct === undefined) return null;
  const color = change.pct > 0 ? "text-green-600 dark:text-green-400" : change.pct < 0 ? "text-red-500 dark:text-red-400" : "text-[#9CA3AF] dark:text-[#6E6E76]";
  const sign = change.pct > 0 ? "+" : "";
  return <span className={color}>{sign}{change.pct}%</span>;
}

export type DashUIConv = { id: string; customer_name: string | null; channel: string; preview: string; time: string; isNew: boolean };
export type DashUIAppt = { id: string; time: string; name: string; service: string; status: string };
export type DashUIKPI  = { label: string; value: string; change?: { pct?: number; newCount?: number } };
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
  aiResolutionRate?: number | null;
  needsHumanCount?: number;
  leadPipeline?: DashUILeadPipeline;
  activity?: DashUIActivityItem[];
}

const PIPELINE_STAGE_ORDER = ["new", "contacted", "qualified", "booked", "client"] as const;
const PIPELINE_DOT: Record<string, string> = {
  new: "#9CA3AF", contacted: "#FF6B35", qualified: "#F59E0B", booked: "#16A34A", client: "#7C3AED",
};

function ActivityDot({ type }: { type: "conversation" | "appointment" }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: type === "conversation" ? "#2563EB" : "#16A34A" }}
    />
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

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "greeting.morning" : hour < 17 ? "greeting.afternoon" : "greeting.evening";
  const displayName = firstName || t("greeting.there");

  const pipelineTotal = leadPipeline
    ? PIPELINE_STAGE_ORDER.reduce((sum, s) => sum + (leadPipeline[s] ?? 0), 0)
    : 0;

  const messagesToday = kpis.find((k) => k.label === "kpiMessagesToday")?.value ?? "0";
  const callsToday = kpis.find((k) => k.label === "kpiCallsToday")?.value ?? "0";

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-10">

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

      {/* ── Header: greeting + primary metrics band, one composition ── */}
      <div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-8">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-[#111111] dark:text-white">
            {loading ? t("common.loading") : `${t(greetKey)}, ${displayName}`}
          </h1>
          <p className="text-sm text-[#9CA3AF] dark:text-[#6E6E76]">{bName ? `${bName} · ` : ""}{today}</p>
        </div>

        {/* Metrics band -- no cards, no icon badges; typography and a single
            hairline rule carry the whole thing. Grid so it degrades cleanly
            to 2 columns at 375px without any divider math breaking. */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-7 pb-7 border-b border-[#EDEDEF] dark:border-[#232328]">
          {loading
            ? [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-16 mb-3" />
                  <div className="h-8 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-12" />
                </div>
              ))
            : kpis.map((k) => {
                const numeric = Number(k.value);
                const isNumeric = Number.isFinite(numeric) && String(numeric) === k.value.trim();
                return (
                  <div key={k.label} className="min-w-0">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76] mb-2 truncate">
                      {t(`dashboard.${k.label}`)}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-[32px] leading-none font-semibold tracking-tight text-[#111111] dark:text-white tabular-nums">
                        {isNumeric ? <CountUp value={numeric} /> : k.value}
                      </p>
                      <span className="text-[11px] font-semibold shrink-0"><ChangeText change={k.change} /></span>
                    </div>
                  </div>
                );
              })}

          {!loading && (
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76] mb-2 truncate">
                {t("dashboard.aiResolutionRate")}
              </p>
              {aiResolutionRate === null ? (
                <p className="text-sm text-[#9CA3AF] dark:text-[#6E6E76] pt-2.5">{t("dashboard.noDataYet")}</p>
              ) : (
                <p className="text-[32px] leading-none font-semibold tracking-tight text-[#111111] dark:text-white tabular-nums">
                  <CountUp value={aiResolutionRate} suffix="%" />
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Lead Pipeline — a real proportional flow, not a row of numbers ── */}
      {!loading && leadPipeline && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76]">
              {t("dashboard.leadPipeline")}
            </h2>
            <a href={`${basePath}/leads`} className="text-xs font-semibold text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#FF6B35] dark:hover:text-[#FF6B35] transition-colors">
              {t("dashboard.viewAll")} →
            </a>
          </div>

          {pipelineTotal === 0 ? (
            <div className="h-1.5 rounded-full bg-[#F3F4F6] dark:bg-[#1E1E24]" />
          ) : (
            <div className="flex items-center gap-[3px] h-1.5">
              {PIPELINE_STAGE_ORDER.map((stage) => {
                const count = leadPipeline[stage] ?? 0;
                const grow = count > 0 ? count : 0.001;
                return (
                  <div
                    key={stage}
                    className="h-full rounded-full transition-all first:rounded-l-full last:rounded-r-full"
                    style={{ flexGrow: grow, flexBasis: 0, background: PIPELINE_DOT[stage], minWidth: count > 0 ? "3px" : "0px", opacity: count > 0 ? 1 : 0 }}
                  />
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-3 mt-4">
            {PIPELINE_STAGE_ORDER.map((stage) => {
              const count = leadPipeline[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PIPELINE_DOT[stage] }} />
                  <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">{t(`leads.stages.${stage}`)}</span>
                  <span className="text-xs font-semibold text-[#111111] dark:text-white ml-auto tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main grid: Conversations + Appointments ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Conversations — 2 cols */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76]">
              {t("dashboard.recentMessages")}
            </h2>
            <a href={`${basePath}/conversations`} className="text-xs font-semibold text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#FF6B35] dark:hover:text-[#FF6B35] transition-colors">
              {t("dashboard.viewAll")} →
            </a>
          </div>
          <div className="rounded-2xl border border-[#EDEDEF] dark:border-[#232328] overflow-hidden">
            {loading ? (
              <div className="divide-y divide-[#F3F4F6] dark:divide-[#1E1E24]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-[#F3F4F6] dark:bg-[#1E1E24] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-2/3" />
                      <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : convs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">{t("dashboard.noConversations")}</p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76] mb-4">{t("dashboard.connectToReceive")}</p>
                <Link href={`${basePath}/channels`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vp-color)" }}>
                  {t("dashboard.connectChannel")}
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6] dark:divide-[#1E1E24]">
                {convs.map((c) => (
                  <a key={c.id} href={`${basePath}/conversations`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFAFA] dark:hover:bg-[#16161A] transition-colors cursor-pointer">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-full bg-[#F3F4F6] dark:bg-[#1E1E24] flex items-center justify-center text-[11px] font-semibold text-[#374151] dark:text-[#D1D5DB]">
                        {(c.customer_name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0F0F12]"
                        style={{ background: CHANNEL_COLORS[c.channel] || "#9CA3AF" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13px] truncate ${c.isNew ? "font-semibold text-[#111111] dark:text-white" : "font-medium text-[#374151] dark:text-[#D1D5DB]"}`}>
                          {c.customer_name ?? t("dashboard.unknown")}
                        </span>
                        {c.isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] shrink-0" />}
                      </div>
                      <p className="text-[11.5px] text-[#9CA3AF] dark:text-[#6E6E76] truncate mt-0.5">{c.preview || t("dashboard.noMessages")}</p>
                    </div>
                    <span className="text-[10.5px] text-[#C4C4CA] dark:text-[#4A4A52] shrink-0">{c.time}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Appointments — 3 cols */}
        <div className="lg:col-span-3 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76]">
              {t("dashboard.todayAppointments")}
            </h2>
            <a href={`${basePath}/appointments`} className="text-xs font-semibold text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#FF6B35] dark:hover:text-[#FF6B35] transition-colors">
              {t("dashboard.viewAll")} →
            </a>
          </div>
          <div className="rounded-2xl border border-[#EDEDEF] dark:border-[#232328] overflow-hidden">
            {loading ? (
              <div className="divide-y divide-[#F3F4F6] dark:divide-[#1E1E24]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                    <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-1/2" />
                      <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-1">{t("dashboard.noAppointments")}</p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.appointmentsHint")}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6] dark:divide-[#1E1E24]">
                {appts.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAFA] dark:hover:bg-[#16161A] transition-colors cursor-pointer">
                    <span className="text-[11.5px] font-medium text-[#9CA3AF] dark:text-[#6E6E76] w-11 shrink-0 tabular-nums">{a.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111111] dark:text-white truncate">{a.name}</p>
                      <p className="text-[11.5px] text-[#9CA3AF] dark:text-[#6E6E76] truncate mt-0.5">{a.service}</p>
                    </div>
                    <span className="text-[10.5px] font-medium capitalize shrink-0" style={{ color: STATUS_COLORS[a.status] || "#9CA3AF" }}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Activity + Recent Activity — lightweight, borderless ── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* AI Activity — 2 cols, inline stat row, no card */}
          <div className="lg:col-span-2 min-w-0">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76] mb-4">
              {t("dashboard.aiActivity")}
            </h2>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{t("dashboard.messagesHandled")}</span>
                <span className="text-[13px] font-semibold text-[#111111] dark:text-white tabular-nums">{messagesToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{t("dashboard.callsHandled")}</span>
                <span className="text-[13px] font-semibold text-[#111111] dark:text-white tabular-nums">{callsToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{t("dashboard.escalatedToHuman")}</span>
                <span className="text-[13px] font-semibold text-[#111111] dark:text-white tabular-nums">{needsHumanCount}</span>
              </div>
              {aiResolutionRate !== null && (
                <div className="flex items-center justify-between pt-3.5 border-t border-[#EDEDEF] dark:border-[#232328]">
                  <span className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{t("dashboard.aiResolutionRate")}</span>
                  <span className="text-[13px] font-semibold text-green-600 dark:text-green-400 tabular-nums">{aiResolutionRate}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity — 3 cols */}
          <div className="lg:col-span-3 min-w-0">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76] mb-4">
              {t("dashboard.recentActivity")}
            </h2>
            {activity.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.noActivity")}</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <ActivityDot type={item.type} />
                    <span className="text-[13px] font-medium text-[#111111] dark:text-white truncate">{item.label}</span>
                    <span className="text-[12px] text-[#9CA3AF] dark:text-[#6E6E76] truncate">{item.sub}</span>
                    <span className="text-[11px] text-[#C4C4CA] dark:text-[#4A4A52] shrink-0 ml-auto">{item.time}</span>
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
