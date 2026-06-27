"use client";

const KPI_CARDS = [
  {
    label: "New Leads Today",
    value: "12",
    change: "+3 vs yesterday",
    up: true,
    color: "#FF6B35",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13 17v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M17 11v6M14 14h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Appointments Booked",
    value: "8",
    change: "+2 vs yesterday",
    up: true,
    color: "#FF3366",
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
    change: "−12s vs yesterday",
    up: true,
    color: "#FF6B35",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M10 5v5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Conversion Rate",
    value: "67%",
    change: "+4% vs last week",
    up: true,
    color: "#FF3366",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 17V9.5M7.5 17V6M12 17V3M16.5 17V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
  { name: "Ahmed Al-Rashid", service: "Dental Cleaning", time: "Today · 3:00 PM", status: "confirmed" },
  { name: "Sara Khalid", service: "Consultation", time: "Today · 4:30 PM", status: "confirmed" },
  { name: "Mohammed Ali", service: "Teeth Whitening", time: "Tomorrow · 10:00 AM", status: "pending" },
  { name: "Fatima Al-Zahra", service: "Check-up", time: "Tomorrow · 2:00 PM", status: "confirmed" },
];

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

export default function DashboardHome() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A0A00]">Good morning, Ahmed 👋</h1>
        <p className="text-[#888888] text-sm mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-[#f0e8e0] shadow-card hover:shadow-card-hover transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <p className="text-xs font-medium text-[#888888]">{kpi.label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                {kpi.icon}
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#1A0A00] mb-1">{kpi.value}</p>
            <p className={`text-xs font-medium flex items-center gap-1 ${kpi.up ? "text-green-500" : "text-red-500"}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d={kpi.up ? "M6 9V3M3 6l3-3 3 3" : "M6 3v6M3 6l3 3 3-3"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Conversations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#f0e8e0] shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e0]">
            <h2 className="font-bold text-[#1A0A00]">Recent Conversations</h2>
            <a href="/app/conversations" className="text-xs font-semibold text-[#FF6B35] hover:underline">View all</a>
          </div>
          <div className="divide-y divide-[#f0e8e0]">
            {CONVERSATIONS.map((conv) => (
              <div key={conv.name} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#FFF5F0] transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${CHANNEL_COLORS[conv.channel]}, ${CHANNEL_COLORS[conv.channel]}99)` }}>
                  {conv.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-[#1A0A00]">{conv.name}</span>
                    <span className="text-[10px] text-[#888888]">{conv.time}</span>
                  </div>
                  <p className="text-xs text-[#888888] truncate">{conv.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${CHANNEL_COLORS[conv.channel]}15`, color: CHANNEL_COLORS[conv.channel] }}>
                    {conv.channel}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[conv.status]}`}>
                    {conv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e0]">
            <h2 className="font-bold text-[#1A0A00]">Upcoming</h2>
            <a href="/app/appointments" className="text-xs font-semibold text-[#FF6B35] hover:underline">Calendar</a>
          </div>
          <div className="divide-y divide-[#f0e8e0]">
            {APPOINTMENTS.map((apt) => (
              <div key={apt.name} className="px-5 py-3.5 hover:bg-[#FFF5F0] transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold text-[#1A0A00]">{apt.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[apt.status]}`}>
                    {apt.status}
                  </span>
                </div>
                <p className="text-xs text-[#888888]">{apt.service}</p>
                <p className="text-xs font-medium text-[#FF6B35] mt-1">{apt.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Add Lead", icon: "+" },
          { label: "New Appointment", icon: "📅" },
          { label: "Send Broadcast", icon: "📣" },
          { label: "View Analytics", icon: "📊" },
        ].map((action) => (
          <button
            key={action.label}
            className="bg-white border border-[#f0e8e0] rounded-xl py-3 px-4 flex items-center gap-2.5 text-sm font-medium text-[#1A0A00] hover:border-[#FF6B35]/30 hover:shadow-sm transition-all duration-200"
          >
            <span className="text-base">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
