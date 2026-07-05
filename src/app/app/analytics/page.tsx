"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { useI18n } from "@/lib/i18n";

type Range = "7d" | "30d" | "90d";

type AnalyticsData = {
  totalLeads: number;
  totalConversations: number;
  totalAppointments: number;
  dailyCounts: Record<string, number>;
  dailyConvCounts: Record<string, number>;
  dailyApptCounts: Record<string, number>;
  channelBreakdown: { channel: string; conversations: number }[];
};

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

function TrendBadge({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">— New</span>;
  }
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
      {up ? "↑" : "↓"} {Math.abs(change)}% vs prior period
    </span>
  );
}

function buildLabels(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    if (days === 7) return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    if (days === 30) return i % 5 === 0 ? `${d.getDate()} ${d.toLocaleString("default",{month:"short"})}` : "";
    return i % 15 === 0 ? `${d.getDate()} ${d.toLocaleString("default",{month:"short"})}` : "";
  });
}

function LineChart({ data, labels }: { data: number[]; labels: string[] }) {
  const W = 800, H = 140, padX = 8, padTop = 12, padBottom = 24;
  const chartH = H - padTop - padBottom;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const n = data.length;

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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padTop + t * chartH;
        return <line key={t} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#F3F4F6" strokeWidth="1"/>;
      })}
      {hasData && (
        <>
          <path d={areaD} fill="url(#lineGrad)"/>
          <path d={d} fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {pts.filter((_, i) => i % labelStep === 0 || i === n - 1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#FF6B35" stroke="white" strokeWidth="1.5"/>
          ))}
        </>
      )}
      {!hasData && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="#9CA3AF">
          Connect a channel to start seeing data here
        </text>
      )}
      {labels.map((lbl, i) => lbl ? (
        <text key={i} x={padX + (i / Math.max(n - 1, 1)) * (W - padX * 2)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9CA3AF">{lbl}</text>
      ) : null)}
    </svg>
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
  const [range, setRange] = useState<Range>("30d");
  const { isPro } = usePlan();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d: AnalyticsData & { error?: string }) => {
        if (d && !d.error) {
          setAnalytics(d);
        } else {
          console.error("[analytics] API returned error:", d?.error);
          setFetchError(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[analytics] fetch failed:", err);
        setFetchError(true);
        setLoading(false);
      });
  }, [isPro]);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  // Never fake data: if analytics is null, use empty arrays that show "no data" state
  const chartData = analytics ? buildDayArray(analytics.dailyCounts, days) : Array(days).fill(0) as number[];
  const chartLabels = buildLabels(days);

  const totalConvs = analytics?.totalConversations ?? 0;
  const channelTable = analytics?.channelBreakdown ?? [];
  const totalLeads = analytics?.totalLeads ?? 0;
  const totalAppts = analytics?.totalAppointments ?? 0;
  const convRate = totalConvs > 0 ? Math.round((totalAppts / totalConvs) * 100) : 0;

  const leadsChange    = analytics ? computeChange(periodSum(analytics.dailyCounts,     days), periodSum(analytics.dailyCounts,     days, days)) : null;
  const apptsChange    = analytics ? computeChange(periodSum(analytics.dailyApptCounts, days), periodSum(analytics.dailyApptCounts, days, days)) : null;
  const convsChange    = analytics ? computeChange(periodSum(analytics.dailyConvCounts,  days), periodSum(analytics.dailyConvCounts,  days, days)) : null;
  const priorConvs     = analytics ? periodSum(analytics.dailyConvCounts, days, days) : 0;
  const priorAppts     = analytics ? periodSum(analytics.dailyApptCounts, days, days) : 0;
  const priorConvRate  = priorConvs > 0 ? Math.round((priorAppts / priorConvs) * 100) : 0;
  const convRateChange = analytics ? computeChange(convRate, priorConvRate) : null;

  // Values: always real (when analytics loaded) or "—" (no data). NEVER hardcoded fake numbers.
  const kpiItems = [
    { label: t("analytics.totalLeads"),     value: analytics ? String(totalLeads) : "—", change: leadsChange    },
    { label: t("analytics.appointments"),   value: analytics ? String(totalAppts) : "—", change: apptsChange    },
    { label: t("analytics.conversations"),  value: analytics ? String(totalConvs) : "—", change: convsChange    },
    { label: t("analytics.conversionRate"), value: analytics ? `${convRate}%`     : "—", change: convRateChange },
  ];

  const hasChannelData = channelTable.some((r) => r.conversations > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111111]">{t("analytics.title")}</h1>
        <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? "bg-[#FF6B35] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner — only shown to Pro users when the fetch actually failed */}
      {isPro && fetchError && !loading && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.3"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p className="text-sm text-red-700 flex-1">
            Analytics data failed to load — your connection may be interrupted or the session expired.
          </p>
          <button
            onClick={() => { setFetchError(false); setLoading(true); fetch("/api/analytics").then(r=>r.json()).then((d: AnalyticsData & { error?: string }) => { if (d && !d.error) setAnalytics(d); else setFetchError(true); setLoading(false); }).catch(() => { setFetchError(true); setLoading(false); }); }}
            className="text-xs font-bold text-red-700 hover:text-red-900 shrink-0 px-3 py-1.5 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Gated content — blur empty state for non-Pro, never fake numbers */}
      <div className="relative">
        <div className={`space-y-5 ${!isPro ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* KPI strip */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0,1,2,3].map((i) => <SkeletonKPI key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiItems.map((k) => (
                <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <p className="text-[11px] text-[#6B7280] mb-3">{k.label}</p>
                  <p className="text-3xl font-bold text-[#111111] leading-none mb-2">{k.value}</p>
                  {analytics ? (
                    <TrendBadge change={k.change ?? null} />
                  ) : (
                    <p className="text-xs text-[#9CA3AF]">vs prior period</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Line chart */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[#111111]">{t("analytics.newLeads")}</p>
              {analytics && (
                <p className="text-xs text-[#9CA3AF]">{chartData.reduce((a, b) => a + b, 0)} leads this period</p>
              )}
            </div>
            {loading ? (
              <div className="h-40 bg-[#F9FAFB] rounded-xl animate-pulse" />
            ) : (
              <LineChart data={chartData} labels={chartLabels} />
            )}
          </div>

          {/* Channel breakdown */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <p className="text-sm font-bold text-[#111111]">{t("analytics.leadSources")}</p>
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {[t("analytics.channel"), t("analytics.conversations"), t("analytics.leads")].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channelTable.map((row, i) => (
                    <tr key={row.channel} className={`border-b border-[#F9FAFB] last:border-none ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                      <td className="px-6 py-4"><span className="text-sm font-semibold text-[#111111]">{row.channel}</span></td>
                      <td className="px-6 py-4 text-sm text-[#374151]">{row.conversations}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#FF6B35]">{row.conversations > 0 ? row.conversations : "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* AI Performance — 2 real stats only; Avg Response removed (not measured) */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <p className="text-sm font-bold text-[#111111] mb-5">{t("analytics.aiPerformance")}</p>
            <div className="grid grid-cols-2 gap-0 divide-x divide-[#E5E7EB]">
              {[
                { label: t("analytics.messagesHandled"), value: analytics ? String(totalConvs) : "—" },
                { label: t("analytics.bookingsByAI"),    value: analytics ? String(totalAppts) : "—" },
              ].map((s) => (
                <div key={s.label} className="px-6 first:pl-0 last:pr-0">
                  <p className="text-2xl font-bold text-[#FF6B35] mb-1">{s.value}</p>
                  <p className="text-xs text-[#6B7280]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upgrade overlay — blurs the empty state above, not fake numbers */}
        {!isPro && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)" }}>
            <div className="max-w-sm text-center p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl mx-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg,rgba(255,107,53,0.12),rgba(255,51,102,0.08))" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#FF6B35" strokeWidth="1.8"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#111111] mb-2">{t("analytics.upgradeCta")}</h3>
              <p className="text-sm text-[#6B7280] mb-5">{t("analytics.upgradeDesc")}</p>
              <Link
                href="/pricing"
                onClick={() => track("upgrade_clicked", { source: "analytics" })}
                className="inline-block px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
              >
                Upgrade to Pro →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
