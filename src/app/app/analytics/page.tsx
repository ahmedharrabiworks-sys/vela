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
  channelBreakdown: { channel: string; conversations: number }[];
};

function buildDayArray(dailyCounts: Record<string, number>, days: number): number[] {
  const arr: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    arr.push(dailyCounts[key] ?? 0);
  }
  return arr;
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

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = d + ` L ${pts[pts.length - 1].x} ${H - padBottom} L ${pts[0].x} ${H - padBottom} Z`;
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
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="#9CA3AF">No data yet — leads will appear here</text>
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

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setAnalytics(d as AnalyticsData); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isPro]);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const chartData = analytics ? buildDayArray(analytics.dailyCounts, days) : [];
  const chartLabels = buildLabels(days);

  const totalConvs = analytics?.totalConversations ?? 0;
  const channelTable = analytics?.channelBreakdown ?? [];
  const totalLeads = analytics?.totalLeads ?? 0;
  const totalAppts = analytics?.totalAppointments ?? 0;
  const convRate = totalConvs > 0 ? Math.round((totalAppts / totalConvs) * 100) : 0;

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

      {/* Gated content */}
      <div className="relative">
        <div className={`space-y-5 ${!isPro ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* KPI strip */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0,1,2,3].map((i) => <SkeletonKPI key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t("analytics.totalLeads"),     value: isPro ? String(totalLeads)  : "184",  trend: "+23",  up: true },
                { label: t("analytics.appointments"),   value: isPro ? String(totalAppts)  : "67",   trend: "+8",   up: true },
                { label: t("analytics.conversations"),  value: isPro ? String(totalConvs)  : "1,284",trend: "+12%", up: true },
                { label: t("analytics.conversionRate"), value: isPro ? `${convRate}%`      : "34%",  trend: "+2pp", up: true },
              ].map((k) => (
                <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <p className="text-[11px] text-[#6B7280] mb-3">{k.label}</p>
                  <p className="text-3xl font-bold text-[#111111] leading-none mb-2">{k.value}</p>
                  <p className={`text-xs font-medium ${k.up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>↑ {k.trend} this period</p>
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
              <LineChart data={isPro && analytics ? chartData : [4,7,5,9,11,8,6,12,14,10,9,15,18,13,11,16,20,17,14,19,22,18,16,21,24,20,18,23,26,22]} labels={chartLabels} />
            )}
          </div>

          {/* Channel table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <p className="text-sm font-bold text-[#111111]">{t("analytics.leadSources")}</p>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[0,1,2].map((i) => <div key={i} className="h-8 bg-[#F3F4F6] rounded animate-pulse" />)}
              </div>
            ) : isPro && analytics && totalConvs === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-[#9CA3AF]">
                No conversations yet — connect a channel to start receiving messages.
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
                  {(isPro && analytics ? channelTable : [
                    { channel: "WhatsApp",  conversations: 87,  leads: 41 },
                    { channel: "Instagram", conversations: 65,  leads: 22 },
                    { channel: "Website",   conversations: 32,  leads: 11 },
                  ]).map((row, i) => (
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

          {/* AI Performance */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <p className="text-sm font-bold text-[#111111] mb-5">{t("analytics.aiPerformance")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#E5E7EB]">
              {[
                { label: t("analytics.messagesHandled"), value: isPro && analytics ? String(totalConvs) : "1,284" },
                { label: t("analytics.bookingsByAI"),    value: isPro && analytics ? String(totalAppts) : "67"    },
                { label: t("analytics.avgResponse"),     value: "< 1 min" },
                { label: t("analytics.satisfaction"),    value: "4.8/5"   },
              ].map((s) => (
                <div key={s.label} className="px-6 first:pl-0 last:pr-0">
                  <p className="text-2xl font-bold text-[#FF6B35] mb-1">{s.value}</p>
                  <p className="text-xs text-[#6B7280]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upgrade overlay for Starter */}
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
                href="/auth/signup"
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
