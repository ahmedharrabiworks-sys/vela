"use client";

import { useState } from "react";
import { DEMO_ANALYTICS_DAYS, DEMO_ANALYTICS_CHANNELS, type DemoAnalyticsDay } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

type Range = "7d" | "30d" | "90d";
type Metric = "leads" | "convs" | "appts";

function LineChart({ data, metric }: { data: DemoAnalyticsDay[]; metric: Metric }) {
  const values = data.map((d) => d[metric]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const W = 600; const H = 120; const PAD = 4;

  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const area = `${PAD},${H} ${polyline} ${W - PAD},${H}`;

  const labels = data
    .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
    .map((d) => {
      const [, month, day] = d.date.split("-");
      return `${parseInt(month)}/${parseInt(day)}`;
    });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-[300px]">
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD} y1={H - PAD - f * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - f * (H - PAD * 2)}
            stroke="#F3F4F6" strokeWidth="1"/>
        ))}
        <polygon points={area} fill="url(#area-fill)"/>
        <polyline points={polyline} fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Labels */}
        {labels.map((label, i) => {
          const idx = data.findIndex((_, j) => j % Math.ceil(data.length / 6) === 0 || j === data.length - 1);
          const actualIdx = data.filter((_, j) => j % Math.ceil(data.length / 6) === 0 || j === data.length - 1)[i] ? i : 0;
          const x = PAD + (actualIdx / (values.length - 1)) * (W - PAD * 2);
          return (
            <text key={i} x={x} y={H + 16} textAnchor="middle" fontSize="9" fill="#9CA3AF">{label}</text>
          );
        })}
        {/* Latest value dot */}
        {values.length > 0 && (
          <circle
            cx={PAD + ((values.length - 1) / (values.length - 1)) * (W - PAD * 2)}
            cy={H - PAD - ((values[values.length - 1] - min) / (max - min || 1)) * (H - PAD * 2)}
            r="4" fill="#FF6B35" stroke="white" strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}

function TrendBadge({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${up ? "bg-[#ECFDF5] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
      {up ? "↑" : "↓"} {Math.abs(change)}%
    </span>
  );
}

export default function DemoAnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [metric, setMetric] = useState<Metric>("leads");
  const [showModal, setShowModal] = useState(false);

  const days = range === "7d" ? DEMO_ANALYTICS_DAYS.slice(-7)
    : range === "30d" ? DEMO_ANALYTICS_DAYS
    : DEMO_ANALYTICS_DAYS; // 90d would be 30d for demo

  const totals = {
    leads: days.reduce((s, d) => s + d.leads, 0),
    convs:  days.reduce((s, d) => s + d.convs,  0),
    appts:  days.reduce((s, d) => s + d.appts,  0),
  };

  const kpis = [
    { label: "Total Leads",         value: String(totals.leads), change: 23, metric: "leads" as Metric },
    { label: "Conversations",        value: String(totals.convs),  change: 18, metric: "convs"  as Metric },
    { label: "Appointments Booked",  value: String(totals.appts),  change: 31, metric: "appts"  as Metric },
    { label: "AI Resolution Rate",   value: "94%",                 change: 2,  metric: null               },
  ];

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">Analytics</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Performance overview for Ahmed Dental Clinic</p>
          </div>
          <div className="flex items-center gap-1 bg-[#F3F4F6] dark:bg-[#1E1E24] rounded-xl p-1">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r
                    ? "bg-white dark:bg-[#2A2A32] text-[#111827] dark:text-white shadow-sm"
                    : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <button
              key={kpi.label}
              onClick={() => kpi.metric && setMetric(kpi.metric)}
              className={`bg-white dark:bg-[#1E1E24] border rounded-xl p-4 text-left transition-all hover:shadow-sm ${
                metric === kpi.metric
                  ? "border-[#FF6B35] ring-1 ring-[#FF6B35]/20"
                  : "border-[#E5E7EB] dark:border-[#2A2A32]"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-medium leading-snug">{kpi.label}</p>
                <TrendBadge change={kpi.change} />
              </div>
              <p className="text-2xl font-bold text-[#111827] dark:text-white">{kpi.value}</p>
              <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">vs last {range}</p>
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">
              {metric === "leads" ? "New Leads" : metric === "convs" ? "Conversations" : "Appointments"}
              {" "}over time
            </p>
            <div className="flex gap-1">
              {(["leads", "convs", "appts"] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    metric === m ? "text-white" : "text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#2A2A32]"
                  }`}
                  style={metric === m ? { background: "var(--vp-color)" } : undefined}
                >
                  {m === "leads" ? "Leads" : m === "convs" ? "Convs" : "Appts"}
                </button>
              ))}
            </div>
          </div>
          <LineChart data={days} metric={metric} />
        </div>

        {/* Channel breakdown */}
        <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2A2A32]">
            <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">Channel Breakdown</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F3F4F6] dark:border-[#2A2A32]">
                {["Channel", "Leads", "Conversations", "Share"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#2A2A32]">
              {DEMO_ANALYTICS_CHANNELS.map((ch) => {
                const colors: Record<string, string> = { WhatsApp: "#25D366", Instagram: "#E1306C", Website: "#6B7280" };
                const color = colors[ch.channel] ?? "#9CA3AF";
                return (
                  <tr key={ch.channel} className="hover:bg-[#FAFAFA] dark:hover:bg-[#17171C]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-sm font-medium text-[#111827] dark:text-white">{ch.channel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">{ch.leads}</td>
                    <td className="px-5 py-3.5 text-sm text-[#374151] dark:text-[#D1D5DB]">{ch.convs}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#F3F4F6] dark:bg-[#2A2A32] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, background: color }} />
                        </div>
                        <span className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] w-8 text-right">{ch.pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Export CTA */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v7M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Report
          </button>
        </div>
      </div>
    </>
  );
}
