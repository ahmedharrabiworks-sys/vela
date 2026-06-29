"use client";

import { useState } from "react";

const METRICS = [
  { label: "Total Leads", value: "248", change: "+18%", up: true, sub: "Last 30 days", accent: "#7C3AED" },
  { label: "Appointments Booked", value: "91", change: "+24%", up: true, sub: "Last 30 days", accent: "#059669" },
  { label: "Avg. Reply Time", value: "42s", change: "−8s", up: true, sub: "vs last month", accent: "#0EA5E9" },
  { label: "Conversion Rate", value: "67%", change: "+4%", up: true, sub: "Lead → booked", accent: "#FF6B35" },
];

const CHANNEL_STATS = [
  { channel: "Instagram", leads: 112, booked: 41, color: "#E1306C", pct: 45 },
  { channel: "WhatsApp", leads: 98, booked: 38, color: "#25D366", pct: 40 },
  { channel: "Website", leads: 38, booked: 12, color: "#FF6B35", pct: 15 },
];

const WEEKLY = [
  { day: "Mon", leads: 8, booked: 5 },
  { day: "Tue", leads: 14, booked: 9 },
  { day: "Wed", leads: 11, booked: 7 },
  { day: "Thu", leads: 19, booked: 13 },
  { day: "Fri", leads: 22, booked: 16 },
  { day: "Sat", leads: 9, booked: 6 },
  { day: "Sun", leads: 5, booked: 3 },
];

const MAX_LEADS = Math.max(...WEEKLY.map((d) => d.leads));

const PEAK_HOURS = [2,1,1,0,0,1,3,6,9,12,10,8,7,9,11,13,15,14,10,8,6,5,4,3];
const MAX_PEAK = 15;

function Ring({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0e8e0" strokeWidth={size * 0.09} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.09}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.19} fontWeight="800" fill="#1A0A00">
        {pct}%
      </text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1A0A00]">Analytics</h1>
          <p className="text-sm text-[#888888] mt-1">June 2026 · All channels</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-[#f0e8e0] shadow-sm">
          {["7d", "30d", "90d"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r ? "text-white shadow-sm" : "text-[#888888] hover:text-[#1A0A00]"
              }`}
              style={range === r ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-4 md:p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.accent}15`, color: m.accent }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 15V9M7.5 15V5M12 15V2M16.5 15V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={m.up ? "text-green-500" : "text-red-500"}>
                  <path d={m.up ? "M5 8V2M2 5l3-3 3 3" : "M5 2v6M2 5l3 3 3-3"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className={`text-[11px] font-bold ${m.up ? "text-green-500" : "text-red-500"}`}>{m.change}</span>
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-[#1A0A00] leading-none mb-1">{m.value}</p>
            <p className="text-[11px] text-[#888888]">{m.label}</p>
            <p className="text-[10px] text-[#bbb] mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Channel rings */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-[#1A0A00]">Leads vs Bookings</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#888888]">
                <span className="w-3 h-3 rounded-sm bg-[#f0e8e0]" />
                Leads
              </span>
              <span className="flex items-center gap-1.5 text-[#888888]">
                <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }} />
                Booked
              </span>
            </div>
          </div>
          <div className="flex items-end gap-2 md:gap-4 h-52 md:h-64">
            {WEEKLY.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end gap-0.5 h-44 md:h-56">
                  <div
                    className="flex-1 rounded-t-lg transition-all duration-700 hover:opacity-70"
                    style={{ height: `${(d.leads / MAX_LEADS) * 100}%`, background: "rgba(255,107,53,0.15)", minHeight: 4 }}
                  />
                  <div
                    className="flex-1 rounded-t-lg transition-all duration-700 hover:scale-y-105 origin-bottom"
                    style={{ height: `${(d.booked / MAX_LEADS) * 100}%`, background: "linear-gradient(180deg,#FF6B35,#FF3366)", minHeight: 4 }}
                  />
                </div>
                <span className="text-[10px] text-[#888888] font-medium">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channel rings */}
        <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5 md:p-6">
          <h2 className="font-bold text-[#1A0A00] mb-5">Channel Breakdown</h2>
          <div className="space-y-5">
            {CHANNEL_STATS.map((ch) => (
              <div key={ch.channel} className="flex items-center gap-4">
                <Ring pct={ch.pct} color={ch.color} size={76} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.color }} />
                    <p className="text-sm font-bold text-[#1A0A00]">{ch.channel}</p>
                  </div>
                  <p className="text-xs text-[#888888]">{ch.leads} leads</p>
                  <p className="text-xs text-[#888888]">{ch.booked} booked · {Math.round((ch.booked / ch.leads) * 100)}% rate</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-[#f0e8e0] space-y-2.5">
            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-2">AI Performance</p>
            {[
              { label: "Messages handled by AI", value: "94%", accent: true },
              { label: "Escalated to human", value: "6%" },
              { label: "Avg messages per lead", value: "4.2" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">{s.label}</span>
                <span className={`text-xs font-bold ${s.accent ? "text-[#FF6B35]" : "text-[#1A0A00]"}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peak hours */}
      <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1A0A00]">Peak Inquiry Hours</h2>
          <span className="text-xs text-[#888888] bg-[#FFF5F0] px-3 py-1 rounded-full">Today · All channels</span>
        </div>
        <div className="flex items-end gap-0.5 md:gap-1 h-24">
          {PEAK_HOURS.map((val, h) => (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t-sm transition-all hover:opacity-80 cursor-pointer"
                title={`${h}:00 — ${val} inquiries`}
                style={{
                  height: `${(val / MAX_PEAK) * 100}%`,
                  background: val > 10 ? "linear-gradient(180deg,#FF6B35,#FF3366)" : val > 5 ? "rgba(255,107,53,0.4)" : "rgba(255,107,53,0.15)",
                  minHeight: 3,
                }}
              />
              {h % 4 === 0 && <span className="text-[8px] text-[#888888]">{h}h</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-[#888888] mt-3">
          Peak hours: <span className="font-semibold text-[#FF6B35]">3 PM – 6 PM</span>
          <span className="mx-2 text-[#ddd]">·</span>
          Most leads arrive outside business hours — AI handles all of them automatically
        </p>
      </div>
    </div>
  );
}
