"use client";

import Link from "next/link";

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp: "#25D366",
  Website: "#FF6B35",
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-600",
  replied: "bg-[#FF6B35]/10 text-[#FF6B35]",
  qualified: "bg-purple-50 text-purple-600",
  booked: "bg-green-50 text-green-600",
  confirmed: "bg-green-50 text-green-600",
  pending: "bg-yellow-50 text-yellow-600",
};

function ChannelIcon({ channel, size = 10 }: { channel: string; size?: number }) {
  if (channel === "Instagram") return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="9.2" cy="2.8" r="0.7" fill="currentColor"/>
    </svg>
  );
  if (channel === "WhatsApp") return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 1a5 5 0 0 1 4.33 7.5L11 11l-2.62-.86A5 5 0 1 1 6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 6h10M6 1c-1.5 2-1.5 8 0 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

const KPI_CARDS = [
  {
    label: "Revenue This Month",
    value: "AED 48.2K",
    change: "+18%",
    sub: "vs last month",
    up: true,
    accent: "#FF6B35",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2v16M5.5 5.5h6a2.5 2.5 0 010 5H8a2.5 2.5 0 000 5H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "New Leads Today",
    value: "12",
    change: "+3",
    sub: "vs yesterday",
    up: true,
    accent: "#7C3AED",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M14 17v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="8" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M17 7v6M14 10h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Appointments Booked",
    value: "8",
    change: "+2",
    sub: "vs yesterday",
    up: true,
    accent: "#059669",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M13 2v4M7 2v4M3 10h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M7 14l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Avg. Response Time",
    value: "48s",
    change: "−12s",
    sub: "faster today",
    up: true,
    accent: "#0EA5E9",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M10 5.5v4.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Conversion Rate",
    value: "67%",
    change: "+4%",
    sub: "lead → booked",
    up: true,
    accent: "#F59E0B",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3.5 17V10M8 17V6.5M12.5 17V3M17 17V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const CONVERSATIONS = [
  { name: "Ahmed Al-Rashid", channel: "Instagram", message: "I'd like to book an appointment for next week", time: "2m ago", status: "new" },
  { name: "Sara Khalid", channel: "WhatsApp", message: "What are your prices for the premium package?", time: "8m ago", status: "replied" },
  { name: "Mohammed Ali", channel: "Website", message: "Can you tell me more about the dental cleaning service?", time: "15m ago", status: "qualified" },
  { name: "Layla Hassan", channel: "Instagram", message: "Is there availability tomorrow morning?", time: "32m ago", status: "booked" },
  { name: "Omar Bin Rashid", channel: "WhatsApp", message: "Thank you! See you on Tuesday at 3pm", time: "1h ago", status: "booked" },
];

const APPOINTMENTS = [
  { name: "Ahmed Al-Rashid", service: "Dental Cleaning", time: "3:00 PM", date: "Today", status: "confirmed", channel: "Instagram" },
  { name: "Sara Khalid", service: "Consultation", time: "4:30 PM", date: "Today", status: "confirmed", channel: "WhatsApp" },
  { name: "Mohammed Ali", service: "Teeth Whitening", time: "10:00 AM", date: "Tomorrow", status: "pending", channel: "Website" },
  { name: "Fatima Al-Zahra", service: "Check-up", time: "2:00 PM", date: "Tomorrow", status: "confirmed", channel: "Instagram" },
];

export default function DashboardHome() {
  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1A0A00]">Good morning, Ahmed 👋</h1>
          <p className="text-[#888888] text-sm mt-0.5">Sunday, June 29 · Ahmed Dental Clinic</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Vela AI Active
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label}
            className="bg-white rounded-2xl p-4 md:p-5 border border-[#f0e8e0] shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${kpi.accent}15`, color: kpi.accent }}>
                {kpi.icon}
              </div>
              <div className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={kpi.up ? "text-green-500" : "text-red-500"}>
                  <path d={kpi.up ? "M5 8V2M2 5l3-3 3 3" : "M5 2v6M2 5l3 3 3-3"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={`text-[11px] font-bold ${kpi.up ? "text-green-500" : "text-red-500"}`}>{kpi.change}</span>
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-[#1A0A00] leading-none mb-1">{kpi.value}</p>
            <p className="text-[11px] text-[#888888] leading-tight">{kpi.label}</p>
            <p className="text-[10px] text-[#bbb] mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent Conversations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e0]">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[#1A0A00]">Recent Conversations</h2>
              <span className="text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-0.5 rounded-full">3 new</span>
            </div>
            <Link href="/app/conversations" className="text-xs font-semibold text-[#FF6B35] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-[#f0e8e0]">
            {CONVERSATIONS.map((conv) => (
              <Link href="/app/conversations" key={conv.name}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FFF5F0] transition-colors cursor-pointer">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: CHANNEL_COLORS[conv.channel] }}>
                    {conv.name[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: CHANNEL_COLORS[conv.channel], color: "white" }}>
                    <ChannelIcon channel={conv.channel} size={8} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-[#1A0A00]">{conv.name}</span>
                    <span className="text-[10px] text-[#bbb] shrink-0 ml-2">{conv.time}</span>
                  </div>
                  <p className="text-xs text-[#888888] truncate">{conv.message}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${STATUS_STYLES[conv.status]}`}>
                  {conv.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e0]">
            <h2 className="font-bold text-[#1A0A00]">Upcoming</h2>
            <Link href="/app/appointments" className="text-xs font-semibold text-[#FF6B35] hover:underline">Calendar →</Link>
          </div>
          <div className="divide-y divide-[#f0e8e0]">
            {APPOINTMENTS.map((apt) => (
              <div key={apt.name} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FFF5F0] transition-colors cursor-pointer">
                <div className="shrink-0 text-center w-14">
                  <p className="text-[10px] font-medium text-[#bbb] uppercase">{apt.date}</p>
                  <p className="text-sm font-bold text-[#FF6B35]">{apt.time}</p>
                </div>
                <div className="w-0.5 h-10 rounded-full shrink-0" style={{ background: CHANNEL_COLORS[apt.channel] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A0A00] truncate">{apt.name}</p>
                  <p className="text-xs text-[#888]">{apt.service}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_STYLES[apt.status]}`}>
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Activity Banner */}
      <div className="bg-[#1A0A00] rounded-2xl p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#FF6B35]/20 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L2 7l9 5 9-5-9-5zM2 17l9 5 9-5M2 12l9 5 9-5" stroke="#FF6B35" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-sm md:text-base">Vela AI handled 94% of conversations today</p>
            <p className="text-xs text-white/50 mt-0.5">47 messages sent · 8 appointments booked · 0 missed leads</p>
          </div>
        </div>
        <Link href="/app/analytics"
          className="text-sm font-bold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity shrink-0"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
          View Full Report →
        </Link>
      </div>
    </div>
  );
}
