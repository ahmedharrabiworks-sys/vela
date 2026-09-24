"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import CountUp from "@/components/ui/CountUp";

// Round M12 -- final visual pass, concrete references: Linear's app
// (linear.app) and Vercel's dashboard (vercel.com/dashboard). Both are
// near-monochrome -- no colored badges, no icon-in-circle avatars, no
// bordered/shadowed cards for plain data, hairline dividers instead of
// boxes, one accent color reserved for the one or two things that are
// genuinely live/actionable. Channel and appointment status used to be
// colored dots/text (Instagram pink, WhatsApp green, confirmed green/
// pending orange/cancelled red) -- pure decoration once you look at what
// it was actually communicating (which channel a message came from is
// metadata, not urgency). Replaced with plain quiet text labels; the ONE
// color that survives is the orange "isNew" dot on an unread conversation,
// because that is real, current status a business owner needs to notice
// right now -- exactly the "live indicator" carve-out.
const CHANNEL_LABEL: Record<string, string> = { instagram: "Instagram", whatsapp: "WhatsApp", website: "Website" };

// Round M13: literal structural clone, not creative reinterpretation --
// 5 rounds of written direction hadn't landed, so this round extracted
// REAL computed CSS values directly from linear.app via a headless browser
// (getComputedStyle on real rendered elements, including linear.app's own
// embedded product-UI screenshots -- e.g. real issue-row markup with real
// issue-id labels like "ENG-2085"), not memory or description. Concrete
// findings applied here, real numbers not approximations:
// - Small labels/eyebrows: real examples ("ENG-2085" etc) measured
//   font-weight 400-510, letter-spacing normal to -0.15px -- NOT the wide
//   +0.08em tracking + font-semibold(600) this file used through Round M12.
//   Changed to font-medium(500) + tracking-[0.02em] (near-zero, kept just
//   above literal 0 since 0 tracking on 10-11px uppercase text is
//   genuinely harder to read, not a stylistic choice against the evidence).
// - Large display numbers (real h1/h2 equivalents): measured font-weight
//   510, line-height == font-size (ratio 1.0). Changed KPI numbers and the
//   greeting from font-semibold(600) to font-medium(500) -- 500 is closer
//   to the real 510 than 600 is. leading-none (line-height 1) was already
//   correct and unchanged.
// - Borders/dividers: real values were low-opacity white-on-dark
//   (rgba(255,255,255,0.05) to 0.08), never solid gray hex. Changed every
//   border-[#EDEDEF]/divide-[#F3F4F6] pair to border-black/[0.06] (light)
//   and dark:border-white/[0.08] (dark) -- opacity-based, matching the
//   real measured values instead of a fixed hex guess.
// - Surface layering: real page background vs. real content-panel
//   background measured only ~7 RGB units apart (rgb(8,9,10) vs
//   rgb(15,16,17)) -- confirms this file's existing flat, single-surface
//   approach (no card fill anywhere) is already correct, if anything more
//   restrained than Linear's own barely-there second surface. No card
//   background was added.
// - Row density: real embedded issue-row spacing was tighter (8-12px)
//   than this file's Round M12 py-4 (16px). Tightened list rows to py-3.5
//   (14px) -- not all the way to Linear's single-line-row density, since
//   these rows carry two lines of real content (name + preview/service),
//   but a real, measured reduction in the same direction.
// - Row TITLE text (customer name / appointment name) was deliberately
//   NOT reduced to font-medium -- real h3/h4 heading weight measured 590,
//   closer to this file's existing font-semibold(600) than to 500, so
//   that weight already matched the evidence and was left alone.
// See src/scripts/round-m13-linear-audit.mjs and round-m13-linear-audit2.mjs
// for the extraction scripts and raw real output this is based on.

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
//
// Round M11 FIX B: Lead Pipeline and the AI Activity/Recent Activity card
// are REMOVED, not redesigned again -- 3 rounds of visual rework on these
// exact two sections were each explicitly rejected. Path chosen: full
// removal (over a 4th attempt at a "simpler" card/list layout), leaving
// KPI band + Recent Messages + Today's Appointments as the whole Dashboard.
// Reasoning: Recent Activity duplicated Conversations/Appointments content
// under a different layout, adding no real information the page didn't
// already show. AI Activity's own numbers (messages/calls handled) were
// ALSO already duplicated in the KPI band above it (kpiMessagesToday/
// kpiCallsToday) -- the only genuinely unique real signal in the whole
// removed area was needsHumanCount ("escalated to a human"), which now
// lives as its own cell in the KPI band instead of a dedicated section,
// so no real information is lost, only the two sections that kept failing.

function ChangeText({ change }: { change?: { pct?: number; newCount?: number } }) {
  if (!change) return null;
  if (change.newCount !== undefined) {
    return <span className="font-medium text-emerald-700/80 dark:text-emerald-400/80">+{change.newCount} new</span>;
  }
  if (change.pct === undefined) return null;
  const color = change.pct > 0 ? "text-emerald-700/80 dark:text-emerald-400/80" : change.pct < 0 ? "text-red-600/70 dark:text-red-400/70" : "text-[#9CA3AF] dark:text-[#6E6E76]";
  const sign = change.pct > 0 ? "+" : "";
  return <span className={`font-medium ${color}`}>{sign}{change.pct}%</span>;
}

export type DashUIConv = { id: string; customer_name: string | null; channel: string; preview: string; time: string; isNew: boolean };
export type DashUIAppt = { id: string; time: string; name: string; service: string; status: string };
export type DashUIKPI  = { label: string; value: string; change?: { pct?: number; newCount?: number } };

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
}

export default function DashboardPageUI({
  loading, firstName, bName, kpis, convs, appts,
  basePath = "/app",
  showBanner = false, onDismissBanner,
  showKbBanner = false, kbScore = 0, onDismissKbBanner,
  aiResolutionRate = null,
  needsHumanCount = 0,
}: Props) {
  const { t } = useI18n();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "greeting.morning" : hour < 17 ? "greeting.afternoon" : "greeting.evening";
  const displayName = firstName || t("greeting.there");

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-12">

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

      {/* ── Header: greeting + primary metrics band, one composition ──
          Round M12: real reference implementation, Linear + Vercel
          dashboard. Both run almost entirely on typography and space --
          no card, no shadow, no fill color anywhere in this whole section.
          Whitespace increased throughout (mb-10/mb-4 instead of mb-8/mb-3.5,
          pb-9/gap-y-9 instead of pb-7/gap-y-7) so the band reads as composed
          breathing room, not just "less stuff." */}
      <div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-10">
          <h1 className="text-[26px] leading-tight font-medium tracking-tight text-[#111111] dark:text-white">
            {loading ? t("common.loading") : `${t(greetKey)}, ${displayName}`}
          </h1>
          <p className="text-sm text-[#9CA3AF] dark:text-[#6E6E76]">{bName ? `${bName} · ` : ""}{today}</p>
        </div>

        {/* The ONE live-status use of Vela orange on this whole page -- this
            dot is real, current status ("these numbers are moving right
            now"), which is exactly the carve-out for accent color. It was
            green before, which had drifted into decoration (green usually
            means "success/confirmed," not "this is orange-brand Vela's
            live indicator"). */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
          <span className="text-[10.5px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] dark:text-[#6E6E76]">
            {t("dashboard.todayLive")}
          </span>
        </div>

        {/* Metrics band -- the numbers are the ONLY thing with real visual
            weight on the entire page (36px, was 32px), always monochrome
            (the amber "escalated" conditional is gone -- a plain stat
            number changing color by severity is exactly the kind of
            decorative color Linear/Vercel dashboards don't do; the number
            itself, sitting in a dedicated cell with a plain label, already
            says everything it needs to). Comparison badges stay small and
            quiet underneath -- real signal, never bold or badge-shaped. */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-x-8 gap-y-9 pb-9 border-b border-black/[0.06] dark:border-white/[0.08]">
          {loading
            ? [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-16 mb-3" />
                  <div className="h-9 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-12" />
                </div>
              ))
            : kpis.map((k) => {
                const numeric = Number(k.value);
                const isNumeric = Number.isFinite(numeric) && String(numeric) === k.value.trim();
                return (
                  <div key={k.label} className="min-w-0">
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] dark:text-[#6E6E76] mb-2.5 truncate">
                      {t(`dashboard.${k.label}`)}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-[36px] leading-none font-medium tracking-tight text-[#111111] dark:text-white tabular-nums">
                        {isNumeric ? <CountUp value={numeric} /> : k.value}
                      </p>
                      <span className="text-[11px] shrink-0"><ChangeText change={k.change} /></span>
                    </div>
                  </div>
                );
              })}

          {!loading && (
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] dark:text-[#6E6E76] mb-2.5 truncate">
                {t("dashboard.aiResolutionRate")}
              </p>
              {aiResolutionRate === null ? (
                <p className="text-sm text-[#9CA3AF] dark:text-[#6E6E76] pt-2.5">{t("dashboard.noDataYet")}</p>
              ) : (
                <p className="text-[36px] leading-none font-medium tracking-tight text-[#111111] dark:text-white tabular-nums">
                  <CountUp value={aiResolutionRate} suffix="%" />
                </p>
              )}
            </div>
          )}

          {!loading && (
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] dark:text-[#6E6E76] mb-2.5 truncate">
                {t("dashboard.escalatedToHuman")}
              </p>
              <p className="text-[36px] leading-none font-medium tracking-tight tabular-nums text-[#111111] dark:text-white">
                <CountUp value={needsHumanCount} />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid: Conversations + Appointments ──
          Round M12: this is the section the reference direction calls out
          by name -- "clean lists/tables, not bordered cards with icons,
          closer to how Linear renders an issue list." Concretely: the
          rounded-2xl border card wrapper is gone entirely (both lists now
          sit directly on the page background, only a hairline divide-y
          between rows), the circular colored-ring avatar is gone (it was
          the single most "icon-in-a-box" element on the page), and channel/
          appointment-status both switched from saturated color to plain
          quiet text -- neither is genuinely urgent status, both are
          metadata, and metadata doesn't need a color. A vertical hairline
          between the two columns (lg+ only, where they actually sit side
          by side) replaces the two separate card boundaries with one quiet
          shared edge, closer to a real split view than two floating boxes. */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10 gap-y-10">

        {/* Conversations, 2 cols */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10.5px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] dark:text-[#6E6E76]">
              {t("dashboard.recentMessages")}
            </h2>
            <a href={`${basePath}/conversations`} className="text-xs font-medium text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#FF6B35] dark:hover:text-[#FF6B35] transition-colors">
              {t("dashboard.viewAll")} →
            </a>
          </div>
          {loading ? (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3.5 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-2/3" />
                    <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1">{t("dashboard.noConversations")}</p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76] mb-4">{t("dashboard.connectToReceive")}</p>
              <Link href={`${basePath}/channels`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vp-color)" }}>
                {t("dashboard.connectChannel")}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {convs.map((c) => (
                <a key={c.id} href={`${basePath}/conversations`} className="flex items-center gap-4 py-3.5 -mx-3 px-3 rounded-lg hover:bg-[#FAFAFA] dark:hover:bg-[#16161A] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13.5px] truncate ${c.isNew ? "font-semibold text-[#111111] dark:text-white" : "font-medium text-[#374151] dark:text-[#D1D5DB]"}`}>
                        {c.customer_name ?? t("dashboard.unknown")}
                      </span>
                      {/* The one accent color surviving in this list -- a
                          real unread signal, not decoration. */}
                      {c.isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] shrink-0" />}
                      <span className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#C4C4CA] dark:text-[#4A4A52] shrink-0">
                        {CHANNEL_LABEL[c.channel] ?? c.channel}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#9CA3AF] dark:text-[#6E6E76] truncate mt-1">{c.preview || t("dashboard.noMessages")}</p>
                  </div>
                  <span className="text-[11px] text-[#9CA3AF] dark:text-[#6E6E76] shrink-0 tabular-nums">{c.time}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Appointments, 3 cols */}
        <div className="lg:col-span-3 min-w-0 lg:border-l lg:border-black/[0.06] lg:dark:border-white/[0.08] lg:pl-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10.5px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] dark:text-[#6E6E76]">
              {t("dashboard.todayAppointments")}
            </h2>
            <a href={`${basePath}/appointments`} className="text-xs font-medium text-[#9CA3AF] dark:text-[#6E6E76] hover:text-[#FF6B35] dark:hover:text-[#FF6B35] transition-colors">
              {t("dashboard.viewAll")} →
            </a>
          </div>
          {loading ? (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3.5 animate-pulse">
                  <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-1/2" />
                    <div className="h-2 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : appts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-[#374151] dark:text-[#D1D5DB] mb-1">{t("dashboard.noAppointments")}</p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6E6E76]">{t("dashboard.appointmentsHint")}</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {appts.map((a) => {
                // Cancelled reads as dimmed, not colored -- the same
                // "typography/opacity carries meaning" treatment Linear
                // uses for a done/cancelled issue, instead of a red label.
                const cancelled = a.status === "cancelled";
                return (
                  <div key={a.id} className={`flex items-center gap-4 py-3.5 -mx-3 px-3 rounded-lg hover:bg-[#FAFAFA] dark:hover:bg-[#16161A] transition-colors cursor-pointer ${cancelled ? "opacity-45" : ""}`}>
                    <span className="text-[12px] font-medium text-[#9CA3AF] dark:text-[#6E6E76] w-11 shrink-0 tabular-nums">{a.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13.5px] font-semibold text-[#111111] dark:text-white truncate ${cancelled ? "line-through" : ""}`}>{a.name}</p>
                      <p className="text-[12px] text-[#9CA3AF] dark:text-[#6E6E76] truncate mt-0.5">{a.service}</p>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.02em] text-[#9CA3AF] dark:text-[#6E6E76] shrink-0">
                      {a.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
