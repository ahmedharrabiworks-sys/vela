"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import { ActivityChart, ChartCard, ChartSummary, RingCard, toDayPoints } from "@/components/dashboard/ActivityCharts";
import { callStatus, fmtDuration as fmtCallDuration, fmtTimeAgo, OutcomeBadge, callHeadline } from "@/components/dashboard/CallTranscript";
import { useRouter } from "next/navigation";

type UsageData = Record<"messages" | "voiceMinutes", { used: number; limit: number | null }>;

interface CallRecord {
  has_recording?: boolean;
  appointment_booked?: unknown;
  id: string;
  created_at: string;
  duration_seconds?: number;
  outcome?: string;
  call_type?: string;
  caller_number?: string;
  summary?: string;
  transcript?: Array<{ role: string; text: string }>;
  language?: string;
}

// Overview's stats (Answer Rate, Calls Handled, Avg Duration, Voice Minutes, Call
// Activity, Recent Calls) must reflect only real inbound customer calls to the
// business's phone number -- never internal test sessions. Real customer calls are tagged call_type:"live" by
// the Vapi end-of-call webhook (call-webhook/route.ts); Training tags its own
// call_type:"training" explicitly (training/page.tsx). Any call_type other than
// "live" is internal/testing and is excluded here.
function isCustomerCall(c: CallRecord): boolean {
  return c.call_type === "live";
}

/* ── Overview page ── */
export default function OverviewPage() {
  const { isDark } = useAgentTheme();

  /* Call stats from agent_calls */
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  // A call opens where the whole conversation lives, in Conversations.
  const router = useRouter();
  const [loadingCalls, setLoadingCalls] = useState(true);

  /* Appointments from Supabase */

  const [usage, setUsage] = useState<UsageData | null>(null);
  const { t, locale } = useI18n();

  /* Theme */
  const bg          = "transparent";
  const textPrimary = isDark ? "var(--dm-text)" : "#0F172A";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const textSub     = isDark ? "var(--dm-text2)" : "#475569";
  const accentBg    = isDark ? "rgba(255,107,53,0.07)" : "rgba(255,107,53,0.05)";
  const accentBorder = isDark ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.15)";

  /* Load calls */
  useEffect(() => {
    async function loadCalls() {
      try {
        const res = await fetch("/api/ai-agent/calls");
        if (res.ok) {
          const data = await res.json() as { calls: CallRecord[] };
          setCallRecords((data.calls ?? []).filter(isCustomerCall));
        }
      } catch { /* table may not exist yet */ }
      setLoadingCalls(false);
    }
    loadCalls();
  }, []);

  /* Plan usage for the ring card */
  useEffect(() => {
    fetch("/api/dashboard?range=7d")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { usage?: UsageData } | null) => { if (d?.usage) setUsage(d.usage); })
      .catch(() => {});
  }, []);

  /* Derive call stats */
  const totalCalls = callRecords.length;
  const totalSecs  = callRecords.reduce((s, c) => s + (c.duration_seconds ?? 0), 0);
  const avgSecs    = totalCalls > 0 ? Math.round(totalSecs / totalCalls) : 0;
  const voiceMins  = Math.round(totalSecs / 60);

  function fmtDuration(s: number) {
    if (!s) return "0s";
    return s < 60 ? `${s}s` : `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  }

  /* Last 7 days, oldest first */
  const weeklyPoints = (() => {
    const DAY = 86400000, now = Date.now();
    const rows = Array.from({ length: 7 }, (_, i) => ({ date: new Date(now - (6 - i) * DAY).toISOString().slice(0, 10), value: 0 }));
    callRecords.forEach((c) => {
      const diff = Math.floor((now - new Date(c.created_at).getTime()) / DAY);
      if (diff >= 0 && diff <= 6) rows[6 - diff].value++;
    });
    return toDayPoints(rows, locale, true);
  })();
  const answeredCalls = callRecords.filter((c) => !["noAnswer", "voicemail", "failed"].includes(callStatus(c.outcome, c.duration_seconds) ?? "")).length;
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : null;
  const bookedCalls = callRecords.filter((c) => !!c.appointment_booked).length;


  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <style>{`
        @keyframes pulse2 { 0%,100%{opacity:.4;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
        @media(min-width:768px) { .ov-pad { padding: 20px 24px 32px; margin: -20px -24px -32px; } }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: textPrimary }}>{t("aiAgent.overview.pageTitle")}</h1>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>{t("aiAgent.overview.subtitle")}</p>
          </div>
          <div
            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border mt-0.5"
            style={{
              background: accentBg,
              borderColor: accentBorder,
              color: "#FF6B35",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#FF6B35", boxShadow: "0 0 6px #FF6B35", animation: "pulse2 2s ease-in-out infinite" }}
            />
            {t("aiAgent.overview.statusOnline")}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Booked from calls */}
          <div className="glass rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{t("agentUi.overview.booked")}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,107,53,0.12)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="#FF6B35" strokeWidth="1.3"/>
                  <path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="#FF6B35" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {loadingCalls
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: "#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{bookedCalls}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>{t("agentUi.overview.bookedSub")}</p>
          </div>

          {/* Calls Handled */}
          <div className="glass rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{t("aiAgent.overview.callsHandled")}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,107,53,0.12)", color: "#FF6B35" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.33c0 .4-.27.67-.67.67C4.4 12 2 6.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" fill="#FF6B35"/>
                </svg>
              </div>
            </div>
            {loadingCalls
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"var(--dm-card2)":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{totalCalls}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>{t("agentUi.overview.callsSub")}</p>
          </div>

          {/* Avg Duration */}
          <div className="glass rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{t("aiAgent.overview.avgDuration")}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,51,102,0.12)", color: "#FF3366" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="#FF3366" strokeWidth="1.3"/>
                  <path d="M7 4v3l2 2" stroke="#FF3366" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {loadingCalls
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"var(--dm-card2)":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{fmtDuration(avgSecs)}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>{t("agentUi.overview.avgSub")}</p>
          </div>

          {/* Voice Minutes */}
          <div className="glass rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{t("aiAgent.overview.voiceMinutes")}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,107,53,0.12)", color: "#FF6B35" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="4.5" y="1" width="5" height="7" rx="2.5" stroke="#FF6B35" strokeWidth="1.3"/>
                  <path d="M2 6.5c0 2.76 2.24 5 5 5s5-2.24 5-5M7 11.5v1.5" stroke="#FF6B35" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {loadingCalls
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"var(--dm-card2)":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{voiceMins > 0 ? `${voiceMins}` : "0"}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>{t("agentUi.overview.minutesSub")}</p>
          </div>
        </div>

        {/* Main row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {loadingCalls
              ? <div className="glass rounded-2xl animate-pulse h-full min-h-[210px]" />
              : (
                <ChartCard fill title={t("aiAgent.overview.callActivity")} subtitle={t("aiAgent.overview.callActivitySub")}>
                  <ActivityChart points={weeklyPoints} unit={t("agentUi.overview.calls")} emptyText={t("agentUi.overview.noCalls")} />
                  <ChartSummary points={weeklyPoints} labels={{ total: t("agentUi.charts.total"), peak: t("agentUi.charts.peak"), average: t("agentUi.charts.average") }} />
                </ChartCard>
              )}
          </div>

          <RingCard
            fill
            title={t("agentUi.overview.answerRate")}
            value={loadingCalls ? null : answerRate}
            ringLabel={t("agentUi.overview.ofCalls")}
            emptyText={loadingCalls ? "" : t("agentUi.overview.noCalls")}
            usageTitle={t("dashboardV2.planUsage")}
            unlimitedLabel={t("dashboardV2.unlimited")}
            notIncludedLabel={t("agentUi.charts.notIncluded")}
            rows={usage ? (["messages", "voiceMinutes"] as const).map((key) => ({ label: t(`dashboardV2.usage.${key}`), used: usage[key].used, limit: usage[key].limit })) : []}
          />

          <div className="lg:col-span-3">
            {/* Recent calls, larger, richer list; each row opens the full transcript */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,51,102,0.12)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.33c0 .4-.27.67-.67.67C4.4 12 2 6.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" fill="#FF3366"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: textPrimary }}>{t("aiAgent.overview.recentCalls")}</p>
                  <p className="text-[10px]" style={{ color: textMuted }}>{t("aiAgent.overview.recentCallsSub")}</p>
                </div>
              </div>
              {totalCalls === 0
                ? <p className="text-xs py-2" style={{ color: textMuted }}>{t("agentUi.overview.noCalls")}</p>
                : <div className="space-y-1.5">
                    {callRecords.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        data-testid="recent-call"
                        onClick={() => router.push(`/app/conversations?open=call:${encodeURIComponent(c.id)}`)}
                        className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-colors"
                        style={{ background: "transparent" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: "#FF3366" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.33c0 .4-.27.67-.67.67C4.4 12 2 6.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" fill="currentColor"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold truncate" style={{ color: textPrimary }}>
                                <span dir="ltr">{c.caller_number || t("agentUi.conv.hiddenNumber")}</span>
                              </span>
                              <OutcomeBadge outcome={c.outcome} durationSeconds={c.duration_seconds} isDark={isDark} />
                            </div>
                            <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: textPrimary }}>
                              {fmtCallDuration(c.duration_seconds)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-[11px] truncate flex-1" style={{ color: textMuted }}>{callHeadline(c, locale)}</p>
                            <span className="text-[10px] shrink-0" style={{ color: textMuted }}>{fmtTimeAgo(c.created_at, locale)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
              }
            </div>
          </div>
        </div>

        {/* Zero-state onboarding (phone focused) */}
        {!loadingCalls && totalCalls === 0 && (
          <div className="rounded-2xl border p-5 flex items-start gap-4" style={{ background: accentBg, borderColor: accentBorder }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>{t("aiAgent.overview.onboardingTitle")}</p>
              <div className="space-y-1.5">
                {[
                  { n:"1", text: t("aiAgent.overview.step1Pre"), link: t("aiAgent.overview.step1Link"), href:"/app/ai-agent/knowledge-base" },
                  { n:"2", text: t("aiAgent.overview.step2Pre"), link: t("aiAgent.overview.step2Link"), href:"/app/ai-agent/phone" },
                  { n:"3", text: t("aiAgent.overview.step3"),    link: null,                            href: null },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ background:"linear-gradient(135deg,#FF6B35,#FF3366)", color:"white" }}>
                      {step.n}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: textSub }}>
                      {step.text}{step.link&&step.href&&<> <Link href={step.href} className="font-semibold underline" style={{ color:"#FF6B35" }}>{step.link}</Link></>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
