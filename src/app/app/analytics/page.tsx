"use client";

import { useState } from "react";

type Range = "7d" | "30d" | "90d";

const BAR_DATA: Record<Range, { label: string; leads: number; bookings: number }[]> = {
  "7d": [
    { label: "Mon", leads: 18, bookings: 7 },
    { label: "Tue", leads: 24, bookings: 11 },
    { label: "Wed", leads: 21, bookings: 9 },
    { label: "Thu", leads: 31, bookings: 14 },
    { label: "Fri", leads: 28, bookings: 12 },
    { label: "Sat", leads: 14, bookings: 5 },
    { label: "Sun", leads: 8, bookings: 3 },
  ],
  "30d": [
    { label: "W1", leads: 72, bookings: 28 },
    { label: "W2", leads: 88, bookings: 34 },
    { label: "W3", leads: 95, bookings: 41 },
    { label: "W4", leads: 110, bookings: 47 },
  ],
  "90d": [
    { label: "Jan", leads: 210, bookings: 84 },
    { label: "Feb", leads: 275, bookings: 105 },
    { label: "Mar", leads: 340, bookings: 142 },
  ],
};

const CHANNELS = [
  { name: "WhatsApp", pct: 47, count: 87 },
  { name: "Instagram", pct: 35, count: 65 },
  { name: "Website", pct: 18, count: 32 },
];

const AI_STATS = [
  { label: "Messages handled by AI", value: "1,284", sub: "94% auto-resolved" },
  { label: "Bookings created by AI", value: "67", sub: "34% conversion rate" },
  { label: "Avg response time", value: "43s", sub: "Human avg: 4m 12s" },
  { label: "Customer satisfaction", value: "4.8", sub: "out of 5 — 94 ratings" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");

  const data = BAR_DATA[range];
  const maxLeads = Math.max(...data.map((d) => d.leads));

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">Analytics</h1>
        <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r ? "bg-[#FF6B35] text-white" : "text-[#6B7280] hover:text-[#111827]"
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: "184", sub: "+23 vs prev period" },
          { label: "Appointments", value: "67", sub: "36% from leads" },
          { label: "Revenue (AED)", value: "48,200", sub: "+12% growth" },
          { label: "Conversion Rate", value: "34%", sub: "+2pp this period" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wide mb-2">{k.label}</p>
            <p className="text-2xl font-bold text-[#111827] leading-none mb-1">{k.value}</p>
            <p className="text-[11px] text-[#059669] font-medium">↑ {k.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-[#111827]">Leads vs Bookings</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#FF6B35]" />
              <span className="text-xs text-[#6B7280]">Leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#FFD5C2]" />
              <span className="text-xs text-[#6B7280]">Bookings</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 h-44">
          {data.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5 h-36">
                <div className="flex-1 rounded-t-md transition-all duration-500 bg-[#FF6B35]"
                  style={{ height: `${(d.leads / maxLeads) * 100}%` }} />
                <div className="flex-1 rounded-t-md transition-all duration-500 bg-[#FFD5C2]"
                  style={{ height: `${(d.bookings / maxLeads) * 100}%` }} />
              </div>
              <span className="text-[10px] text-[#9CA3AF] font-medium">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Channel breakdown — horizontal bars */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#111827] mb-4">Lead Sources</h2>
          <div className="space-y-4">
            {CHANNELS.map((ch) => (
              <div key={ch.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#374151]">{ch.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6B7280]">{ch.count} leads</span>
                    <span className="text-xs font-bold text-[#111827]">{ch.pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#FF6B35] transition-all duration-700"
                    style={{ width: `${ch.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Performance */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#111827] mb-4">AI Performance</h2>
          <div className="space-y-3.5">
            {AI_STATS.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-[#374151]">{s.label}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{s.sub}</p>
                </div>
                <span className="text-lg font-bold text-[#FF6B35] shrink-0 ml-4">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
