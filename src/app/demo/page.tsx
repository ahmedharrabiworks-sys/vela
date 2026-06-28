"use client";

import { useState } from "react";
import Link from "next/link";

type View = "dashboard" | "conversations" | "leads" | "appointments";

/* ── Fake data ── */

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: "#25D366",
  Instagram: "#E1306C",
  Website: "#FF6B35",
};

const CONVOS = [
  {
    id: 1, name: "Ahmed Al-Rashid", channel: "WhatsApp", msg: "I want to book an appointment", time: "2m", status: "new",
    messages: [
      { role: "user", text: "Hi! I want to book a dental cleaning appointment.", time: "10:30" },
      { role: "ai", text: "Hello Ahmed! Happy to help. We have availability on Tuesday at 11 AM or Wednesday at 2 PM. Which works?", time: "10:30" },
      { role: "user", text: "Tuesday 11 AM please!", time: "10:31" },
      { role: "ai", text: "Booked! ✅ Tuesday June 28 at 11:00 AM for a Dental Cleaning. You'll get a reminder 1 hour before. See you then!", time: "10:31" },
    ],
  },
  {
    id: 2, name: "Sara Khalid", channel: "Instagram", msg: "What are your prices for whitening?", time: "8m", status: "replied",
    messages: [
      { role: "user", text: "Hey! What are your prices for teeth whitening?", time: "10:22" },
      { role: "ai", text: "Hi Sara! Professional whitening is AED 800 for a 60 min session. Take-home kit is AED 400. Want to book?", time: "10:23" },
    ],
  },
  {
    id: 3, name: "Mohammed Ali", channel: "Website", msg: "Is Dr. Hassan available tomorrow?", time: "15m", status: "qualified",
    messages: [
      { role: "user", text: "Is Dr. Hassan available tomorrow morning?", time: "10:15" },
      { role: "ai", text: "Yes! Dr. Hassan has slots tomorrow at 9 AM, 10:30 AM, and 12 PM. Which works best?", time: "10:15" },
      { role: "user", text: "10:30 works great", time: "10:16" },
      { role: "ai", text: "Perfect! Can I get your full name and mobile number to confirm the booking?", time: "10:16" },
    ],
  },
  {
    id: 4, name: "Layla Hassan", channel: "WhatsApp", msg: "Can I reschedule to Monday?", time: "1h", status: "replied",
    messages: [
      { role: "user", text: "Can I move my Friday appointment to next Monday?", time: "09:45" },
      { role: "ai", text: "Of course Layla! Monday has 2 PM or 4 PM open. Which do you prefer?", time: "09:46" },
    ],
  },
  {
    id: 5, name: "Omar Sharif", channel: "Instagram", msg: "Do you accept Daman insurance?", time: "2h", status: "new",
    messages: [
      { role: "user", text: "Do you accept Daman insurance?", time: "08:30" },
      { role: "ai", text: "Yes, we accept Daman! Please bring your insurance card. Would you like to book a checkup?", time: "08:31" },
    ],
  },
];

const LEADS = [
  { id: 1, name: "Ahmed Al-Rashid", service: "Dental Cleaning", channel: "WhatsApp", stage: "booked", value: "AED 350" },
  { id: 2, name: "Sara Khalid", service: "Teeth Whitening", channel: "Instagram", stage: "qualified", value: "AED 800" },
  { id: 3, name: "Mohammed Ali", service: "General Checkup", channel: "Website", stage: "qualified", value: "AED 200" },
  { id: 4, name: "Layla Hassan", service: "Root Canal", channel: "WhatsApp", stage: "contacted", value: "AED 1,200" },
  { id: 5, name: "Omar Sharif", service: "Checkup", channel: "Instagram", stage: "new", value: "AED 200" },
  { id: 6, name: "Fatima Al-Zahra", service: "Teeth Whitening", channel: "WhatsApp", stage: "new", value: "AED 800" },
  { id: 7, name: "Khalid Mansour", service: "Dental Cleaning", channel: "Website", stage: "contacted", value: "AED 350" },
  { id: 8, name: "Nora Abdulla", service: "Veneers", channel: "Instagram", stage: "new", value: "AED 2,400" },
];

const APPOINTMENTS = [
  { id: 1, time: "09:00", name: "Sara Khalid", service: "Teeth Whitening", channel: "WhatsApp", status: "confirmed" },
  { id: 2, time: "10:30", name: "Mohammed Ali", service: "General Checkup", channel: "Website", status: "confirmed" },
  { id: 3, time: "11:00", name: "Ahmed Al-Rashid", service: "Dental Cleaning", channel: "WhatsApp", status: "new" },
  { id: 4, time: "14:00", name: "Khalid Mansour", service: "Dental Cleaning", channel: "Website", status: "confirmed" },
  { id: 5, time: "16:30", name: "Layla Hassan", service: "Consultation", channel: "Instagram", status: "confirmed" },
];

const STAGES = ["new", "contacted", "qualified", "booked"] as const;
type Stage = typeof STAGES[number];

const STAGE_CONFIG: Record<Stage, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-50 text-blue-600 border-blue-100" },
  contacted: { label: "Contacted", color: "bg-purple-50 text-purple-600 border-purple-100" },
  qualified: { label: "Qualified", color: "bg-[#FF6B35]/8 text-[#FF6B35] border-[#FF6B35]/20" },
  booked: { label: "Booked", color: "bg-green-50 text-green-600 border-green-100" },
};

/* ── Views ── */

function DashboardView({ setView }: { setView: (v: View) => void }) {
  const kpis = [
    { label: "Active Conversations", value: "12", delta: "+3 today", icon: "💬", up: true },
    { label: "Leads This Week", value: "8", delta: "+2 new", icon: "🎯", up: true },
    { label: "Appointments Today", value: "5", delta: "2 remaining", icon: "📅", up: false },
    { label: "AI Reply Rate", value: "94%", delta: "↑ from 91%", icon: "⚡", up: true },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#f0e8e0] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{k.icon}</span>
              <span className={`text-[11px] font-semibold ${k.up ? "text-green-500" : "text-[#FF6B35]"}`}>{k.delta}</span>
            </div>
            <p className="text-2xl font-extrabold text-[#1A0A00]">{k.value}</p>
            <p className="text-xs text-[#888] mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#f0e8e0] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0e8e0]">
            <p className="font-bold text-[#1A0A00] text-sm">Recent Conversations</p>
            <button onClick={() => setView("conversations")} className="text-xs text-[#FF6B35] font-semibold hover:underline">View all →</button>
          </div>
          {CONVOS.slice(0, 4).map(c => (
            <button key={c.id} onClick={() => setView("conversations")}
              className="w-full flex items-center gap-3 px-5 py-3 border-b border-[#f0e8e0] last:border-none hover:bg-[#FFF5F0]/60 transition-colors text-left">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: CHANNEL_COLORS[c.channel] }}>{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#1A0A00] truncate">{c.name}</p>
                  <span className="text-[10px] text-[#bbb] shrink-0 ml-2">{c.time}</span>
                </div>
                <p className="text-[11px] text-[#888] truncate">{c.msg}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#f0e8e0] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0e8e0]">
            <p className="font-bold text-[#1A0A00] text-sm">Today</p>
            <button onClick={() => setView("appointments")} className="text-xs text-[#FF6B35] font-semibold hover:underline">Calendar →</button>
          </div>
          {APPOINTMENTS.map(a => (
            <div key={a.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-[#f0e8e0] last:border-none ${a.status === "new" ? "bg-[#FFF5F0]" : ""}`}>
              <span className="text-xs font-mono text-[#bbb] w-12 shrink-0">{a.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1A0A00] truncate">{a.name}</p>
                <p className="text-[10px] text-[#888] truncate">{a.service}</p>
              </div>
              {a.status === "new" && (
                <span className="text-[9px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConversationsView() {
  const [selected, setSelected] = useState(CONVOS[0]);
  const [aiOn, setAiOn] = useState(true);

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 180px)" }}>
      <div className="w-64 bg-white rounded-2xl border border-[#f0e8e0] shadow-sm flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-3.5 border-b border-[#f0e8e0]">
          <p className="font-bold text-[#1A0A00] text-sm">All Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0e8e0]">
          {CONVOS.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors ${selected.id === c.id ? "bg-[#FFF5F0]" : "hover:bg-[#FFF5F0]/50"}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: CHANNEL_COLORS[c.channel] }}>{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-[#1A0A00] truncate">{c.name}</span>
                  <span className="text-[9px] text-[#bbb] shrink-0">{c.time}</span>
                </div>
                <p className="text-[10px] text-[#888] truncate">{c.msg}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-[#f0e8e0] shadow-sm flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#f0e8e0]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: CHANNEL_COLORS[selected.channel] }}>{selected.name[0]}</div>
          <div>
            <p className="font-bold text-[#1A0A00] text-sm">{selected.name}</p>
            <p className="text-[10px]" style={{ color: CHANNEL_COLORS[selected.channel] }}>{selected.channel}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#888]">AI</span>
              <button onClick={() => setAiOn(!aiOn)}
                className={`w-9 h-5 rounded-full transition-all relative ${aiOn ? "bg-[#FF6B35]" : "bg-[#e0e0e0]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${aiOn ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#f0e8e0] text-[#888] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
              Human Takeover
            </button>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              + Book Appointment
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {selected.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-[#f0e8e0] text-[#1A0A00] rounded-tl-sm" : "text-white rounded-tr-sm"
              }`} style={m.role === "ai" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                <p>{m.text}</p>
                <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-[#888]" : "text-white/60"}`}>
                  {m.role === "ai" && "⚡ Vela AI · "}{m.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-[#f0e8e0]">
          {!aiOn && (
            <p className="text-xs text-[#FF6B35] font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35]" /> You&apos;re replying manually
            </p>
          )}
          <div className="flex gap-2">
            <input placeholder="Type a reply..." className="flex-1 text-sm rounded-xl border border-[#f0e8e0] px-3 py-2.5 text-[#1A0A00] placeholder:text-[#bbb] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
            <button className="px-4 py-2 rounded-xl text-white text-sm font-semibold self-end" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsView() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STAGES.map(stage => {
        const leads = LEADS.filter(l => l.stage === stage);
        return (
          <div key={stage} className="bg-white rounded-2xl border border-[#f0e8e0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f0e8e0] flex items-center justify-between">
              <p className="font-bold text-[#1A0A00] text-xs">{STAGE_CONFIG[stage].label}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f0e8e0] text-[#888]">{leads.length}</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {leads.map(lead => (
                <div key={lead.id} className="bg-[#FFF5F0] rounded-xl p-3 border border-[#f5ece4] cursor-pointer hover:border-[#FF6B35]/30 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: CHANNEL_COLORS[lead.channel] }}>{lead.name[0]}</div>
                    <p className="text-xs font-semibold text-[#1A0A00] truncate flex-1">{lead.name}</p>
                  </div>
                  <p className="text-[10px] text-[#888]">{lead.service}</p>
                  <p className="text-[10px] font-bold text-[#FF6B35] mt-1">{lead.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppointmentsView() {
  const days = ["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27", "Sat 28", "Sun 29"];
  const [activeDay, setActiveDay] = useState(5);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button key={d} onClick={() => setActiveDay(i)}
            className={`flex flex-col items-center px-4 py-3 rounded-xl shrink-0 border transition-all ${
              activeDay === i
                ? "text-white border-transparent"
                : "border-[#f0e8e0] bg-white text-[#888] hover:border-[#FF6B35]/30"
            }`}
            style={activeDay === i ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
            <span className="text-[10px] font-medium">{d.split(" ")[0]}</span>
            <span className="text-lg font-extrabold leading-tight">{d.split(" ")[1]}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0e8e0]">
          <p className="font-bold text-[#1A0A00] text-sm">{days[activeDay]}</p>
          <p className="text-xs text-[#888]">{activeDay === 5 ? "5 appointments" : "No appointments scheduled"}</p>
        </div>
        {activeDay === 5 ? (
          APPOINTMENTS.map(a => (
            <div key={a.id} className={`flex items-center gap-4 px-5 py-4 border-b border-[#f0e8e0] last:border-none ${a.status === "new" ? "bg-[#FFF5F0]" : ""}`}>
              <span className="text-sm font-mono text-[#bbb] w-12 shrink-0">{a.time}</span>
              <div className="w-1 h-10 rounded-full shrink-0" style={{ background: CHANNEL_COLORS[a.channel] }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1A0A00] text-sm">{a.name}</p>
                <p className="text-xs text-[#888]">{a.service}</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 hidden md:block"
                style={{ background: `${CHANNEL_COLORS[a.channel]}18`, color: CHANNEL_COLORS[a.channel] }}>{a.channel}</span>
              {a.status === "new" && (
                <span className="text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-0.5 rounded-full shrink-0">NEW</span>
              )}
            </div>
          ))
        ) : (
          <div className="px-5 py-12 text-center text-[#bbb] text-sm">No appointments for this day</div>
        )}
      </div>
    </div>
  );
}

/* ── Sidebar nav ── */

const NAV: { id: View; label: string; emoji: string }[] = [
  { id: "dashboard", label: "Dashboard", emoji: "▦" },
  { id: "conversations", label: "Conversations", emoji: "💬" },
  { id: "leads", label: "Leads", emoji: "🎯" },
  { id: "appointments", label: "Appointments", emoji: "📅" },
];

/* ── Page ── */

export default function DemoPage() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FFF5F0]">

      {/* Demo banner */}
      <div className="shrink-0 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4" style={{ background: "#1A0A00" }}>
        <p className="text-white/70 text-sm">
          <span className="text-yellow-400 mr-2">●</span>
          You are in <span className="text-white font-semibold">demo mode</span>
          <span className="hidden sm:inline"> — data resets on every visit</span>
        </p>
        <Link
          href="/auth/signup"
          className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-lg text-white whitespace-nowrap hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
        >
          Start Free Trial →
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-14 md:w-52 bg-white border-r border-[#f0e8e0] flex flex-col shrink-0">
          <div className="px-3 md:px-5 py-4 border-b border-[#f0e8e0] flex items-center gap-2">
            <span className="font-extrabold text-[#1A0A00] text-lg tracking-tight hidden md:block">vela</span>
            <span className="text-[9px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-1.5 py-0.5 rounded-full hidden md:block">DEMO</span>
            <span className="font-extrabold text-[#1A0A00] text-lg tracking-tight md:hidden">V</span>
          </div>

          <nav className="flex-1 p-2 md:p-3 flex flex-col gap-1">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex items-center gap-3 px-2 md:px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full ${
                  view === item.id ? "text-white shadow-sm" : "text-[#888] hover:text-[#1A0A00] hover:bg-[#FFF5F0]"
                }`}
                style={view === item.id ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
                title={item.label}
              >
                <span className="text-base shrink-0">{item.emoji}</span>
                <span className="hidden md:block">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-2 md:p-3 border-t border-[#f0e8e0]">
            <Link
              href="/auth/signup"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs md:text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
              title="Start Free Trial"
            >
              <span className="hidden md:block">Unlock Full Access</span>
              <span className="md:hidden">↑</span>
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="bg-white border-b border-[#f0e8e0] px-5 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
            <h1 className="font-bold text-[#1A0A00] text-sm md:text-base capitalize">{view}</h1>
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-sm text-[#888]">Demo Clinic</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>D</div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {view === "dashboard" && <DashboardView setView={setView} />}
            {view === "conversations" && <ConversationsView />}
            {view === "leads" && <LeadsView />}
            {view === "appointments" && <AppointmentsView />}
          </div>
        </main>
      </div>
    </div>
  );
}
