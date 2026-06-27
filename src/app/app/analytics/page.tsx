"use client";

const METRICS = [
  { label: "Total Leads", value: "248", change: "+18%", up: true, sub: "Last 30 days" },
  { label: "Appointments Booked", value: "91", change: "+24%", up: true, sub: "Last 30 days" },
  { label: "Avg. Reply Time", value: "42s", change: "−8s", up: true, sub: "vs last month" },
  { label: "Conversion Rate", value: "67%", change: "+4%", up: true, sub: "Lead → booked" },
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

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A0A00]">Analytics</h1>
          <p className="text-sm text-[#888888] mt-1">June 2026 · All channels</p>
        </div>
        <div className="flex items-center gap-2">
          {["7d", "30d", "90d"].map((r, i) => (
            <button
              key={r}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                i === 1 ? "text-white" : "bg-white border border-[#f0e8e0] text-[#888888]"
              }`}
              style={i === 1 ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <p className="text-xs font-medium text-[#888888] mb-3">{m.label}</p>
            <p className="text-3xl font-extrabold text-[#1A0A00] mb-1">{m.value}</p>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold flex items-center gap-1 ${m.up ? "text-green-500" : "text-red-500"}`}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d={m.up ? "M5 8V2M2 5l3-3 3 3" : "M5 2v6M2 5l3 3 3-3"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {m.change}
              </span>
              <span className="text-[10px] text-[#888888]">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-[#1A0A00]">Leads vs Bookings</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#888888]">
                <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,107,53,0.25)" }} />
                Leads
              </span>
              <span className="flex items-center gap-1.5 text-[#888888]">
                <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }} />
                Booked
              </span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-48">
            {WEEKLY.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-40">
                  {/* Leads bar */}
                  <div
                    className="flex-1 rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${(d.leads / MAX_LEADS) * 100}%`,
                      background: "rgba(255,107,53,0.18)",
                    }}
                  />
                  {/* Booked bar */}
                  <div
                    className="flex-1 rounded-t-lg"
                    style={{
                      height: `${(d.booked / MAX_LEADS) * 100}%`,
                      background: "linear-gradient(180deg,#FF6B35,#FF3366)",
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#888888] font-medium">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channel breakdown */}
        <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
          <h2 className="font-bold text-[#1A0A00] mb-5">Channel Breakdown</h2>
          <div className="space-y-5">
            {CHANNEL_STATS.map((ch) => (
              <div key={ch.channel}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
                    <span className="text-sm font-medium text-[#1A0A00]">{ch.channel}</span>
                  </div>
                  <span className="text-xs font-bold text-[#1A0A00]">{ch.leads} leads</span>
                </div>
                <div className="h-2 rounded-full bg-[#f0e8e0] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${ch.pct}%`, background: ch.color }}
                  />
                </div>
                <p className="text-[10px] text-[#888888] mt-1">{ch.booked} booked · {Math.round((ch.booked / ch.leads) * 100)}% rate</p>
              </div>
            ))}
          </div>

          {/* Donut placeholder */}
          <div className="mt-6 pt-5 border-t border-[#f0e8e0]">
            <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">AI Performance</p>
            <div className="space-y-2">
              {[
                { label: "Messages handled by AI", value: "94%" },
                { label: "Escalated to human", value: "6%" },
                { label: "Avg. messages per lead", value: "4.2" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#888888]">{s.label}</span>
                  <span className="text-xs font-bold text-[#1A0A00]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top performing times */}
      <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
        <h2 className="font-bold text-[#1A0A00] mb-5">Peak Inquiry Hours</h2>
        <div className="flex items-end gap-1 h-20">
          {Array.from({ length: 24 }, (_, h) => {
            const val = [2,1,1,0,0,1,3,6,9,12,10,8,7,9,11,13,15,14,10,8,6,5,4,3][h];
            return (
              <div key={h} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(val / 15) * 100}%`,
                    background: val > 10 ? "linear-gradient(180deg,#FF6B35,#FF3366)" : "rgba(255,107,53,0.2)",
                    minHeight: 2,
                  }}
                />
                {h % 4 === 0 && (
                  <span className="text-[8px] text-[#888888]">{h}h</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-[#888888] mt-3">Peak hours: <span className="font-semibold text-[#FF6B35]">3 PM – 6 PM</span> · Most leads arrive outside business hours</p>
      </div>
    </div>
  );
}
