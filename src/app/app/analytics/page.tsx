"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { useI18n } from "@/lib/i18n";

type Range = "7d" | "30d" | "90d";

// 30 days of sample data
const DATA_30D = [
  4, 7, 5, 9, 11, 8, 6, 12, 14, 10, 9, 15, 18, 13, 11, 16, 20, 17, 14, 19, 22, 18, 16, 21, 24, 20, 18, 23, 26, 22,
];

const LABELS_30D = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 4, 31 + i);
  return i % 5 === 0 ? `${d.getDate()} Jun` : "";
});

const DATA_7D  = [18, 24, 21, 31, 28, 14, 8];
const LABELS_7D = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DATA_90D = [72, 88, 95, 110, 105, 120, 118, 132, 145, 140, 155, 168];
const LABELS_90D = Array.from({ length: 12 }, (_, i) => i % 3 === 0 ? `W${i + 1}` : "");

const RANGE_DATA: Record<Range, { data: number[]; labels: string[] }> = {
  "7d":  { data: DATA_7D,  labels: LABELS_7D  },
  "30d": { data: DATA_30D, labels: LABELS_30D },
  "90d": { data: DATA_90D, labels: LABELS_90D },
};

const CHANNEL_TABLE = [
  { channel: "WhatsApp",  leads: 87,  bookings: 41, rate: 47 },
  { channel: "Instagram", leads: 65,  bookings: 22, rate: 34 },
  { channel: "Website",   leads: 32,  bookings: 11, rate: 34 },
];

function LineChart({ data, labels }: { data: number[]; labels: string[] }) {
  const W = 800, H = 140, padX = 8, padTop = 12, padBottom = 24;
  const chartH = H - padTop - padBottom;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const n = data.length;

  const pts = data.map((v, i) => {
    const x = padX + (i / (n - 1)) * (W - padX * 2);
    const y = padTop + ((max - v) / range) * chartH;
    return { x, y };
  });

  // Build smooth path using cubic bezier
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Area fill path
  const areaD = d + ` L ${pts[pts.length - 1].x} ${H - padBottom} L ${pts[0].x} ${H - padBottom} Z`;

  const labelStep = Math.max(1, Math.floor(n / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Horizontal gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padTop + t * chartH;
        return <line key={t} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#F3F4F6" strokeWidth="1"/>;
      })}
      {/* Area */}
      <path d={areaD} fill="url(#lineGrad)"/>
      {/* Line */}
      <path d={d} fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dots on data points (every few points) */}
      {pts.filter((_, i) => i % labelStep === 0 || i === n - 1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#FF6B35" stroke="white" strokeWidth="1.5"/>
      ))}
      {/* Labels */}
      {labels.map((lbl, i) => lbl ? (
        <text key={i} x={padX + (i / (n - 1)) * (W - padX * 2)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9CA3AF">{lbl}</text>
      ) : null)}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const { data, labels } = RANGE_DATA[range];
  const { isPro } = usePlan();
  const { t } = useI18n();

  const totalLeads = CHANNEL_TABLE.reduce((s, c) => s + c.leads, 0);
  const totalBookings = CHANNEL_TABLE.reduce((s, c) => s + c.bookings, 0);

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
        {/* Blurred preview for Starter */}
        <div className={`space-y-5 ${!isPro ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t("analytics.totalLeads"),    value: "184",     trend: "+23",  up: true },
              { label: t("analytics.appointments"),  value: "67",      trend: "+8",   up: true },
              { label: t("analytics.revenue"),       value: "48,200",  trend: "+12%", up: true },
              { label: t("analytics.conversionRate"),value: "34%",     trend: "+2pp", up: true },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <p className="text-[11px] text-[#6B7280] mb-3">{k.label}</p>
                <p className="text-3xl font-bold text-[#111111] leading-none mb-2">{k.value}</p>
                <p className={`text-xs font-medium ${k.up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{k.up ? "↑" : "↓"} {k.trend} this period</p>
              </div>
            ))}
          </div>

          {/* Line chart */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[#111111]">{t("analytics.newLeads")}</p>
              <p className="text-xs text-[#9CA3AF]">{data.reduce((a, b) => a + b, 0)} total this period</p>
            </div>
            <LineChart data={data} labels={labels} />
          </div>

          {/* Channel table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <p className="text-sm font-bold text-[#111111]">{t("analytics.leadSources")}</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F3F4F6]">
                  {[t("analytics.channel"), t("analytics.leads"), t("analytics.bookings"), t("analytics.convRate")].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHANNEL_TABLE.map((row, i) => (
                  <tr key={row.channel} className={`border-b border-[#F9FAFB] last:border-none ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                    <td className="px-6 py-4"><span className="text-sm font-semibold text-[#111111]">{row.channel}</span></td>
                    <td className="px-6 py-4 text-sm text-[#374151]">{row.leads}</td>
                    <td className="px-6 py-4 text-sm text-[#374151]">{row.bookings}</td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-[#FF6B35]">{row.rate}%</span></td>
                  </tr>
                ))}
                <tr className="bg-[#F9FAFB] border-t border-[#E5E7EB]">
                  <td className="px-6 py-3 text-xs font-bold text-[#6B7280]">{t("analytics.total")}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#111111]">{totalLeads}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#111111]">{totalBookings}</td>
                  <td className="px-6 py-3 text-sm font-bold text-[#FF6B35]">{Math.round(totalBookings / totalLeads * 100)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI Performance */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <p className="text-sm font-bold text-[#111111] mb-5">{t("analytics.aiPerformance")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#E5E7EB]">
              {[
                { label: t("analytics.messagesHandled"), value: "1,284" },
                { label: t("analytics.bookingsByAI"),    value: "67"    },
                { label: t("analytics.avgResponse"),     value: "43s"   },
                { label: t("analytics.satisfaction"),    value: "4.8/5" },
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
