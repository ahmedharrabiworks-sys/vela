"use client";

const KPI_CARDS = [
  { label: "Revenue (AED)", value: "48,200", sub: "+12% vs last month", up: true },
  { label: "New Leads", value: "184", sub: "+23 this week", up: true },
  { label: "Appointments", value: "67", sub: "12 today", up: true },
  { label: "Avg Response", value: "1m 24s", sub: "-18s vs last week", up: true },
  { label: "Conversion Rate", value: "34%", sub: "+2.1pp this month", up: true },
];

const RECENT_CONVS = [
  { name: "Ahmed Al-Rashid", channel: "Instagram", preview: "I'd like to book for next week", time: "2m", isNew: true },
  { name: "Sara Khalid", channel: "WhatsApp", preview: "What are your prices?", time: "8m", isNew: false },
  { name: "Mohammed Ali", channel: "Website", preview: "More info on dental cleaning?", time: "15m", isNew: true },
  { name: "Layla Hassan", channel: "Instagram", preview: "Available tomorrow morning?", time: "32m", isNew: false },
];

const APPOINTMENTS = [
  { time: "09:00", name: "Ahmed Al-Rashid", service: "Dental Cleaning", status: "confirmed" },
  { time: "10:30", name: "Layla Hassan", service: "Whitening Treatment", status: "confirmed" },
  { time: "12:00", name: "Omar Bin Rashid", service: "Root Canal Consult", status: "pending" },
  { time: "14:00", name: "Sara Khalid", service: "Check-up & X-Ray", status: "confirmed" },
  { time: "16:30", name: "Fatima Al-Nasser", service: "Braces Adjustment", status: "pending" },
];

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp: "#25D366",
  Website: "#FF6B35",
};

function ChannelDot({ channel }: { channel: string }) {
  const color = CHANNEL_COLORS[channel] || "#aaa";
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-[#ECFDF5] text-[#059669]",
  pending: "bg-[#FFFBEB] text-[#D97706]",
  cancelled: "bg-[#FEF2F2] text-[#DC2626]",
};

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Monday, 29 June 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#6B7280] px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg">This month</span>
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>
            + Add Appointment
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide font-semibold mb-2">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#111827] leading-none mb-1.5">{kpi.value}</p>
            <p className={`text-[11px] font-medium flex items-center gap-1 ${kpi.up ? "text-[#059669]" : "text-[#DC2626]"}`}>
              <span>{kpi.up ? "↑" : "↓"}</span>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Conversations */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-bold text-[#111827]">Recent Conversations</h2>
            <a href="/app/conversations" className="text-xs text-[#FF6B35] font-semibold hover:underline">View all</a>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {RECENT_CONVS.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors cursor-pointer">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151]">
                    {c.name[0]}
                  </div>
                  {c.isNew && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF6B35] border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111827] truncate">{c.name}</span>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0 ml-2">{c.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ChannelDot channel={c.channel} />
                    <p className="text-[11px] text-[#6B7280] truncate">{c.preview}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-bold text-[#111827]">Today&apos;s Appointments</h2>
            <a href="/app/appointments" className="text-xs text-[#FF6B35] font-semibold hover:underline">View all</a>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {APPOINTMENTS.map((a, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors cursor-pointer">
                <span className="text-xs font-mono text-[#6B7280] w-12 shrink-0">{a.time}</span>
                <div className="w-px h-8 bg-[#FF6B35] rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">{a.name}</p>
                  <p className="text-[11px] text-[#6B7280] truncate">{a.service}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_STYLE[a.status]}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Performance strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Messages Handled by AI", value: "1,284", note: "this month" },
          { label: "Bookings from AI", value: "67", note: "67% conversion" },
          { label: "Avg Handling Time", value: "43s", note: "-8s vs last month" },
          { label: "Customer Satisfaction", value: "4.8 / 5", note: "from 94 ratings" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[11px] text-[#9CA3AF] font-semibold mb-2 leading-tight">{s.label}</p>
            <p className="text-xl font-bold text-[#111827] leading-none mb-1">{s.value}</p>
            <p className="text-[11px] text-[#6B7280]">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
