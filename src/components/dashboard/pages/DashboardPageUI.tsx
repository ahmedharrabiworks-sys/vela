"use client";

import { Fragment } from "react";
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

function StageArrow() {
  return (
    <div className="flex items-center justify-center shrink-0 pt-4" style={{ width: 18 }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#D1D5DB] dark:text-[#3A3A42]">
        <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
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

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "greeting.morning" : hour < 17 ? "greeting.afternoon" : "greeting.evening";
  const displayName = firstName || t("greeting.there");

  const pipelineTotal = leadPipeline
    ? PIPELINE_STAGE_ORDER.reduce((sum, s) => sum + (leadPipeline[s] ?? 0), 0)
    : 0;
  const pipelineMax = leadPipeline
    ? Math.max(1, ...PIPELINE_STAGE_ORDER.map((s) => leadPipeline[s] ?? 0))
    : 1;

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

        {/* Round M9 FIX 7: the metrics band already labels each figure
            "X Today" individually, but that lives in small 10.5px uppercase
            tracked text easy to skim past -- direct feedback was that the
            top numbers' time period wasn't unambiguous at a glance. One
            small pill above the whole band, not repeated per-metric, so it
            reads as "this whole row is live/today" without adding visual
            noise to numbers that already carry their own label. */}
        <div className="flex items-center gap-1.5 mb-3.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76]">
            {t("dashboard.todayLive")}
          </span>
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

      {/* Round M10 FIX 7 -- full redesign, real creative ownership.
          What was wrong: a 6px-tall progress strip plus a flat 5-item grid
          of dots/numbers underneath. It never communicated the one thing a
          pipeline is actually FOR -- showing volume AND flow between
          stages, so an owner can see at a glance where leads are piling up
          or falling off. It also carried almost no visual weight next to
          the 32px KPI numbers above it, so it read as an afterthought.
          Design decisions: (1) the total count gets the SAME typographic
          treatment as the KPI band (32px bold) so this card carries equal
          visual authority, not a lesser one. (2) Stages are laid out as a
          real left-to-right flow -- a light track behind each bar so every
          stage has a visible "slot" even at 0, a bar whose height is
          proportional to that stage's real share of the pipeline (so
          volume is legible at a glance, not just as a number), and a small
          chevron between stages reinforcing progression rather than five
          unrelated tiles. (3) Colour is used only for the small accent
          bars/dots, never as a text or fill background behind text -- every
          label and number stays in the standard heading/muted grey pair
          already proven high-contrast in light and dark mode elsewhere on
          this page. (4) Horizontal scroll only, never page-level, at 375px
          -- a funnel that got squashed into a 2-column grid on mobile would
          stop reading as a flow at all. */}
      {!loading && leadPipeline && (
        <div className="rounded-2xl border border-[#EDEDEF] dark:border-[#232328] p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76] mb-2">
                {t("dashboard.leadPipeline")}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] leading-none font-semibold tracking-tight text-[#111111] dark:text-white tabular-nums">
                  <CountUp value={pipelineTotal} />
                </span>
                <span className="text-[13px] text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.leadsInProgress")}</span>
              </div>
            </div>
            <a href={`${basePath}/leads`} className="text-xs font-semibold text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#FF6B35] dark:hover:text-[#FF6B35] transition-colors shrink-0 pt-1">
              {t("dashboard.viewAll")} →
            </a>
          </div>

          <div className="flex items-start overflow-x-auto -mx-1 px-1 pb-0.5">
            {PIPELINE_STAGE_ORDER.map((stage, idx) => {
              const count = leadPipeline[stage] ?? 0;
              const barH = Math.max(5, Math.round((count / pipelineMax) * 40));
              return (
                <Fragment key={stage}>
                  <div className="flex flex-col items-center gap-2.5 min-w-[58px] flex-1">
                    <div className="h-10 w-full flex items-end rounded-md bg-[#F9FAFB] dark:bg-[#1A1A1F] overflow-hidden">
                      <div className="w-full rounded-t-sm transition-all" style={{ height: barH, background: PIPELINE_DOT[stage] }} />
                    </div>
                    <p className="text-[17px] font-semibold text-[#111111] dark:text-white tabular-nums leading-none">{count}</p>
                    <p className="text-[10.5px] text-[#6B7280] dark:text-[#9CA3AF] text-center leading-tight">{t(`leads.stages.${stage}`)}</p>
                  </div>
                  {idx < PIPELINE_STAGE_ORDER.length - 1 && <StageArrow />}
                </Fragment>
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

      {/* Round M10 FIX 7 -- full redesign, real creative ownership.
          What was wrong: AI Activity and Recent Activity sat side by side
          as two visually unrelated boxes in an arbitrary 2/3 split -- the
          SAME split already used one row up for Conversations/Appointments,
          so the page read as two stacked, near-identical grids, which is
          exactly the kind of template rhythm the rest of this dashboard
          deliberately avoids. Neither box individually had enough content
          to justify its own card, so both felt thin. They're also not
          unrelated: AI Activity is "how the AI is doing," Recent Activity is
          "what just happened" -- close enough in subject that force-fitting
          them into two disconnected side-by-side cards was the wrong call to
          begin with. Design decisions: (1) merged into ONE full-width card
          -- a compact 3-up stat strip (Messages / Calls / Escalated) across
          the top, a divider, then the activity feed below at full width
          instead of squeezed into 3 of 5 columns, giving every row real
          room to breathe. (2) AI Resolution Rate is dropped from this card
          -- it already has its own full-weight cell in the KPI band above,
          repeating the identical number here was pure redundant clutter,
          not useful information. (3) Escalated-to-human turns amber only
          when >0 (a real signal worth noticing, not decoration) and stays
          the same neutral heading colour otherwise -- never colour-only
          without also being legible on both light and dark backgrounds.
          (4) the feed keeps the same real dot/label/sub/time shape, just
          with more breathing room (px-6, taller rows) now that it isn't
          fighting for width. */}
      {!loading && (
        <div className="rounded-2xl border border-[#EDEDEF] dark:border-[#232328] overflow-hidden">
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76] mb-4">
              {t("dashboard.aiActivity")}
            </h2>
            <div className="grid grid-cols-3 divide-x divide-[#F3F4F6] dark:divide-[#1E1E24]">
              <div className="pr-4">
                <p className="text-[22px] font-semibold text-[#111111] dark:text-white tabular-nums leading-none">{messagesToday}</p>
                <p className="text-[11px] text-[#9CA3AF] dark:text-[#6E6E76] mt-2 leading-tight">{t("dashboard.messagesHandled")}</p>
              </div>
              <div className="px-4">
                <p className="text-[22px] font-semibold text-[#111111] dark:text-white tabular-nums leading-none">{callsToday}</p>
                <p className="text-[11px] text-[#9CA3AF] dark:text-[#6E6E76] mt-2 leading-tight">{t("dashboard.callsHandled")}</p>
              </div>
              <div className="pl-4">
                <p className="text-[22px] font-semibold tabular-nums leading-none text-[#111111] dark:text-white" style={needsHumanCount > 0 ? { color: "#D97706" } : undefined}>
                  {needsHumanCount}
                </p>
                <p className="text-[11px] text-[#9CA3AF] dark:text-[#6E6E76] mt-2 leading-tight">{t("dashboard.escalatedToHuman")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 pt-4 pb-3 border-t border-[#EDEDEF] dark:border-[#232328]">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] dark:text-[#6E6E76]">
              {t("dashboard.recentActivity")}
            </h2>
            <a href={`${basePath}/conversations`} className="text-xs font-semibold text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#FF6B35] dark:hover:text-[#FF6B35] transition-colors">
              {t("dashboard.viewAll")} →
            </a>
          </div>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.noActivity")}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6] dark:divide-[#1E1E24]">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-6 py-3.5">
                  <ActivityDot type={item.type} />
                  <span className="text-[13px] font-medium text-[#111111] dark:text-white truncate">{item.label}</span>
                  <span className="text-[12px] text-[#9CA3AF] dark:text-[#6E6E76] truncate">{item.sub}</span>
                  <span className="text-[11px] text-[#C4C4CA] dark:text-[#4A4A52] shrink-0 ml-auto">{item.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
