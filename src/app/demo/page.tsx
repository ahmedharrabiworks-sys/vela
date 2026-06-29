"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const TOUR_STEPS = [
  {
    title: "Welcome to Vela",
    body: "This is your AI Business Operating System. Your AI handles messages, books appointments, and grows your leads — automatically, 24/7.",
    target: null,
  },
  {
    title: "AI Conversations",
    body: "Your AI replies to WhatsApp, Instagram, and website messages instantly. No manual responses needed — ever.",
    target: "conversations",
    navIndex: 1,
  },
  {
    title: "Leads & CRM",
    body: "Every inquiry becomes a tracked lead. Your AI qualifies them and moves them through your pipeline automatically.",
    target: "leads",
    navIndex: 2,
  },
  {
    title: "Appointments",
    body: "Customers can book directly in chat. The AI confirms, adds to your calendar, and sends automated reminders.",
    target: "appointments",
    navIndex: 3,
  },
  {
    title: "Ready to go live?",
    body: "Start your 7-day free trial and have your AI answering customers within minutes — no setup fees.",
    target: null,
    isFinal: true,
  },
];

function TooltipTour({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
  const current = TOUR_STEPS[step - 1];
  if (!current) return null;

  const isCentered = !current.target;
  const navItemHeight = 48;
  const bannerHeight = 40;
  const sidebarHeaderHeight = 56;
  const navTopOffset = bannerHeight + sidebarHeaderHeight + 4;
  const itemTop = current.navIndex !== undefined
    ? navTopOffset + current.navIndex * navItemHeight + navItemHeight / 2
    : 0;

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onSkip} />

      {isCentered ? (
        /* Centered card */
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-bold text-[#FF6B35] uppercase tracking-wider">
                {step} / {TOUR_STEPS.length}
              </span>
              <button onClick={onSkip} className="text-white/30 hover:text-white/60 transition-colors text-xs">
                Skip tour
              </button>
            </div>
            <h3 className="text-base font-bold text-white mb-2">{current.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed mb-5">{current.body}</p>
            <div className="flex gap-2">
              {current.isFinal ? (
                <>
                  <button onClick={onSkip}
                    className="flex-1 py-2.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">
                    Maybe later
                  </button>
                  <Link href="/auth/signup" onClick={onSkip}
                    className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white text-center hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                    Start Free Trial →
                  </Link>
                </>
              ) : (
                <button onClick={onNext}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Sidebar-anchored tooltip — desktop: right of sidebar, mobile: bottom sheet */
        <>
          {/* Desktop: positioned right of sidebar */}
          <div className="hidden md:block fixed z-[70]"
            style={{ left: 208 + 20, top: itemTop - 60, maxWidth: 280 }}>
            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl p-5 shadow-2xl">
              {/* Arrow pointing left */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-3 h-3 rotate-45 bg-[#1A1A1A] border-l border-b border-white/10" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#FF6B35] uppercase tracking-wider">
                  {step} / {TOUR_STEPS.length}
                </span>
                <button onClick={onSkip} className="text-white/30 hover:text-white/60 transition-colors text-xs">
                  Skip
                </button>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{current.title}</h3>
              <p className="text-xs text-white/55 leading-relaxed mb-4">{current.body}</p>
              <button onClick={onNext}
                className="w-full py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Next →
              </button>
            </div>
          </div>

          {/* Mobile: bottom sheet */}
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-[70]">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#FF6B35] uppercase tracking-wider">
                  {step} / {TOUR_STEPS.length}
                </span>
                <button onClick={onSkip} className="text-white/30 hover:text-white/60 transition-colors text-xs">Skip</button>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{current.title}</h3>
              <p className="text-xs text-white/55 leading-relaxed mb-4">{current.body}</p>
              <button onClick={onNext}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

type View = "dashboard" | "conversations" | "leads" | "appointments";

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: "#25D366",
  Instagram: "#E1306C",
  Website: "#FF6B35",
};

const CONVOS = [
  { id: 1, name: "Ahmed Al-Rashid", channel: "WhatsApp", msg: "I want to book an appointment", time: "2m", status: "new",
    messages: [
      { role: "user", text: "Hi! I want to book a dental cleaning appointment.", time: "10:30" },
      { role: "ai", text: "Hello Ahmed! Happy to help. We have availability on Tuesday at 11 AM or Wednesday at 2 PM. Which works?", time: "10:30" },
      { role: "user", text: "Tuesday 11 AM please!", time: "10:31" },
      { role: "ai", text: "Booked! ✅ Tuesday June 28 at 11:00 AM for a Dental Cleaning. You'll get a reminder 1 hour before. See you then!", time: "10:31" },
    ],
  },
  { id: 2, name: "Sara Khalid", channel: "Instagram", msg: "What are your prices for whitening?", time: "8m", status: "replied",
    messages: [
      { role: "user", text: "Hey! What are your prices for teeth whitening?", time: "10:22" },
      { role: "ai", text: "Hi Sara! Professional whitening is AED 800 for a 60 min session. Take-home kit is AED 400. Want to book?", time: "10:23" },
    ],
  },
  { id: 3, name: "Mohammed Ali", channel: "Website", msg: "Is Dr. Hassan available tomorrow?", time: "15m", status: "qualified",
    messages: [
      { role: "user", text: "Is Dr. Hassan available tomorrow morning?", time: "10:15" },
      { role: "ai", text: "Yes! Dr. Hassan has slots tomorrow at 9 AM, 10:30 AM, and 12 PM. Which works best?", time: "10:15" },
      { role: "user", text: "10:30 works great", time: "10:16" },
      { role: "ai", text: "Perfect! Can I get your full name and mobile number to confirm?", time: "10:16" },
    ],
  },
  { id: 4, name: "Layla Hassan", channel: "WhatsApp", msg: "Can I reschedule to Monday?", time: "1h", status: "replied",
    messages: [
      { role: "user", text: "Can I move my Friday appointment to next Monday?", time: "09:45" },
      { role: "ai", text: "Of course Layla! Monday has 2 PM or 4 PM open. Which do you prefer?", time: "09:46" },
    ],
  },
  { id: 5, name: "Omar Sharif", channel: "Instagram", msg: "Do you accept Daman insurance?", time: "2h", status: "new",
    messages: [
      { role: "user", text: "Do you accept Daman insurance?", time: "08:30" },
      { role: "ai", text: "Yes, we accept Daman! Please bring your insurance card. Would you like to book a checkup?", time: "08:31" },
    ],
  },
];

const LEADS = [
  { id: 1, name: "Ahmed Al-Rashid", service: "Dental Cleaning", channel: "WhatsApp", stage: "booked" as const, value: "AED 350" },
  { id: 2, name: "Sara Khalid", service: "Teeth Whitening", channel: "Instagram", stage: "qualified" as const, value: "AED 800" },
  { id: 3, name: "Mohammed Ali", service: "General Checkup", channel: "Website", stage: "qualified" as const, value: "AED 200" },
  { id: 4, name: "Layla Hassan", service: "Root Canal", channel: "WhatsApp", stage: "contacted" as const, value: "AED 1,200" },
  { id: 5, name: "Omar Sharif", service: "Checkup", channel: "Instagram", stage: "new" as const, value: "AED 200" },
  { id: 6, name: "Fatima Al-Zahra", service: "Teeth Whitening", channel: "WhatsApp", stage: "new" as const, value: "AED 800" },
  { id: 7, name: "Khalid Mansour", service: "Dental Cleaning", channel: "Website", stage: "contacted" as const, value: "AED 350" },
  { id: 8, name: "Nora Abdulla", service: "Veneers", channel: "Instagram", stage: "new" as const, value: "AED 2,400" },
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

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "Instagram") return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="9.2" cy="2.8" r="0.7" fill="currentColor"/>
    </svg>
  );
  if (channel === "WhatsApp") return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M6 1a5 5 0 0 1 4.33 7.5L11 11l-2.62-.86A5 5 0 1 1 6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 6h10M6 1c-1.5 2-1.5 8 0 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function DashboardView({ setView }: { setView: (v: View) => void }) {
  const kpis = [
    { label: "Active Conversations", value: "12", delta: "+3 today", up: true, accent: "#7C3AED" },
    { label: "Leads This Week", value: "8", delta: "+2 new", up: true, accent: "#059669" },
    { label: "Appointments Today", value: "5", delta: "2 remaining", up: false, accent: "#FF6B35" },
    { label: "AI Reply Rate", value: "94%", delta: "↑ from 91%", up: true, accent: "#0EA5E9" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#f0e8e0] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.accent}15`, color: k.accent }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 13V8M5.5 13V5M9 13V2M12.5 13V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-2xl font-extrabold text-[#1A0A00]">{k.value}</p>
            <p className="text-xs text-[#888] mt-0.5 leading-tight">{k.label}</p>
            <p className={`text-[10px] font-semibold mt-1 ${k.up ? "text-green-500" : "text-[#FF6B35]"}`}>{k.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#f0e8e0] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e0]">
            <p className="font-bold text-[#1A0A00] text-sm">Recent Conversations</p>
            <button onClick={() => setView("conversations")} className="text-xs text-[#FF6B35] font-semibold hover:underline">View all →</button>
          </div>
          {CONVOS.slice(0, 4).map((c) => (
            <button key={c.id} onClick={() => setView("conversations")}
              className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-[#f0e8e0] last:border-none hover:bg-[#FFF5F0]/60 transition-colors text-left min-h-[60px]">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: CHANNEL_COLORS[c.channel] }}>{c.name[0]}</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                  style={{ background: CHANNEL_COLORS[c.channel], color: "white" }}>
                  <ChannelIcon channel={c.channel} />
                </div>
              </div>
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
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e0]">
            <p className="font-bold text-[#1A0A00] text-sm">Today&apos;s Schedule</p>
            <button onClick={() => setView("appointments")} className="text-xs text-[#FF6B35] font-semibold hover:underline">Calendar →</button>
          </div>
          {APPOINTMENTS.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 px-4 py-3 border-b border-[#f0e8e0] last:border-none min-h-[56px] ${a.status === "new" ? "bg-[#FFF5F0]" : ""}`}>
              <span className="text-xs font-mono text-[#FF6B35] w-12 shrink-0 font-bold">{a.time}</span>
              <div className="w-0.5 h-8 rounded-full shrink-0" style={{ background: CHANNEL_COLORS[a.channel] }} />
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
  const [showThread, setShowThread] = useState(false);
  const [aiOn, setAiOn] = useState(true);

  const handleSelect = (c: typeof CONVOS[0]) => { setSelected(c); setShowThread(true); };

  return (
    <div className="flex gap-4" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
      {/* Conversation list */}
      <div className={`bg-white rounded-2xl border border-[#f0e8e0] shadow-sm flex flex-col overflow-hidden shrink-0
        ${showThread ? "hidden md:flex md:w-64" : "flex w-full md:w-64"}`}>
        <div className="px-4 py-3.5 border-b border-[#f0e8e0]">
          <p className="font-bold text-[#1A0A00] text-sm">All Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0e8e0]">
          {CONVOS.map((c) => (
            <button key={c.id} onClick={() => handleSelect(c)}
              className={`w-full flex items-start gap-2.5 px-4 py-3.5 text-left transition-all min-h-[64px] ${
                selected.id === c.id ? "bg-[#FFF5F0] border-l-[3px] border-[#FF6B35]" : "hover:bg-[#FFF5F0]/50 border-l-[3px] border-transparent"
              }`}>
              <div className="relative shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: CHANNEL_COLORS[c.channel] }}>{c.name[0]}</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                  style={{ background: CHANNEL_COLORS[c.channel], color: "white" }}>
                  <ChannelIcon channel={c.channel} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-[#1A0A00] truncate">{c.name}</span>
                  <span className="text-[9px] text-[#bbb] shrink-0 ml-1">{c.time}</span>
                </div>
                <p className="text-[10px] text-[#888] truncate">{c.msg}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`bg-white rounded-2xl border border-[#f0e8e0] shadow-sm flex flex-col overflow-hidden
        ${showThread ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#f0e8e0]">
          <button onClick={() => setShowThread(false)}
            className="md:hidden p-2 -ml-1 rounded-xl text-[#888] hover:text-[#1A0A00] hover:bg-[#FFF5F0] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: CHANNEL_COLORS[selected.channel] }}>{selected.name[0]}</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
              style={{ background: CHANNEL_COLORS[selected.channel], color: "white" }}>
              <ChannelIcon channel={selected.channel} />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-bold text-[#1A0A00] text-sm">{selected.name}</p>
            <p className="text-[10px] font-medium" style={{ color: CHANNEL_COLORS[selected.channel] }}>{selected.channel}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-[#888]">AI</span>
              <button onClick={() => setAiOn(!aiOn)}
                className={`w-9 h-5 rounded-full transition-all relative ${aiOn ? "bg-[#FF6B35]" : "bg-[#e0e0e0]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${aiOn ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <button className="text-xs font-semibold px-3 py-2 rounded-xl text-white min-h-[36px]"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              + Book
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          {selected.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-[#f0e8e0] text-[#1A0A00] rounded-tl-sm" : "text-white rounded-tr-sm"
              }`} style={m.role === "ai" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                <p>{m.text}</p>
                <p className={`text-[10px] mt-1.5 ${m.role === "user" ? "text-[#888]" : "text-white/60"}`}>
                  {m.role === "ai" && "⚡ Vela AI · "}{m.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3.5 border-t border-[#f0e8e0]">
          <div className="flex gap-2 items-end">
            <input placeholder="Type a reply…" className="flex-1 text-sm rounded-xl border border-[#f0e8e0] px-4 py-3 text-[#1A0A00] placeholder:text-[#bbb] focus:outline-none focus:border-[#FF6B35]/40 transition-colors min-h-[44px]" />
            <button className="px-4 py-3 rounded-xl text-white text-sm font-semibold min-h-[44px]" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsView() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STAGES.map((stage) => {
        const leads = LEADS.filter((l) => l.stage === stage);
        return (
          <div key={stage} className="bg-white rounded-2xl border border-[#f0e8e0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f0e8e0] flex items-center justify-between">
              <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_CONFIG[stage].color}`}>{STAGE_CONFIG[stage].label}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f0e8e0] text-[#888]">{leads.length}</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-[#FFF5F0] rounded-xl p-3 border border-[#f5ece4] cursor-pointer hover:border-[#FF6B35]/30 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: CHANNEL_COLORS[lead.channel] }}>{lead.name[0]}</div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white"
                        style={{ background: CHANNEL_COLORS[lead.channel], color: "white" }}>
                        <ChannelIcon channel={lead.channel} />
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-[#1A0A00] truncate flex-1">{lead.name}</p>
                  </div>
                  <p className="text-[9px] text-[#888]">{lead.service}</p>
                  <p className="text-[10px] font-bold text-[#FF6B35] mt-1">{lead.value}</p>
                </div>
              ))}
              {leads.length === 0 && (
                <div className="border-2 border-dashed border-[#f0e8e0] rounded-xl p-3 text-center text-[#ddd] text-xs">Empty</div>
              )}
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
            className={`flex flex-col items-center px-4 py-3 rounded-xl shrink-0 border transition-all min-h-[64px] min-w-[60px] ${
              activeDay === i ? "text-white border-transparent" : "border-[#f0e8e0] bg-white text-[#888] hover:border-[#FF6B35]/30"
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
          <p className="text-xs text-[#888]">{activeDay === 5 ? "5 appointments scheduled" : "No appointments scheduled"}</p>
        </div>
        {activeDay === 5 ? (
          APPOINTMENTS.map((a) => (
            <div key={a.id} className={`flex items-center gap-4 px-5 py-4 border-b border-[#f0e8e0] last:border-none min-h-[64px] ${a.status === "new" ? "bg-[#FFF5F0]" : ""}`}>
              <span className="text-sm font-mono text-[#FF6B35] w-12 shrink-0 font-bold">{a.time}</span>
              <div className="w-1 h-10 rounded-full shrink-0" style={{ background: CHANNEL_COLORS[a.channel] }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1A0A00] text-sm">{a.name}</p>
                <p className="text-xs text-[#888]">{a.service}</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 hidden sm:block"
                style={{ background: `${CHANNEL_COLORS[a.channel]}18`, color: CHANNEL_COLORS[a.channel] }}>{a.channel}</span>
              {a.status === "new" && (
                <span className="text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-0.5 rounded-full shrink-0">NEW</span>
              )}
            </div>
          ))
        ) : (
          <div className="px-5 py-16 text-center text-[#bbb] text-sm">No appointments for this day</div>
        )}
      </div>
    </div>
  );
}

const NAV: { id: View; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "conversations", label: "Conversations" },
  { id: "leads", label: "Leads" },
  { id: "appointments", label: "Appointments" },
];

const NAV_ICONS: Record<View, JSX.Element> = {
  dashboard: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  conversations: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.25 15V4.5A1.5 1.5 0 013.75 3h9.75A1.5 1.5 0 0115 4.5v6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  leads: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 16.5v-1.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="6.75" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/></svg>,
  appointments: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.25" y="3" width="13.5" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M12 1.5v3M6 1.5v3M2.25 7.5h13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

export default function DemoPage() {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    const done = typeof window !== "undefined" && localStorage.getItem("vela_tour_done");
    if (!done) {
      const t = setTimeout(() => setTourStep(1), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleTourNext = () => {
    if (tourStep >= TOUR_STEPS.length) {
      handleTourSkip();
    } else {
      setTourStep((s) => s + 1);
    }
  };

  const handleTourSkip = () => {
    setTourStep(0);
    if (typeof window !== "undefined") localStorage.setItem("vela_tour_done", "1");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FFF5F0]">
      {tourStep > 0 && (
        <TooltipTour step={tourStep} onNext={handleTourNext} onSkip={handleTourSkip} />
      )}
      {/* Demo banner */}
      <div className="shrink-0 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4" style={{ background: "#1A0A00" }}>
        <p className="text-white/70 text-sm">
          <span className="text-yellow-400 mr-2">●</span>
          <span className="text-white font-semibold">Demo mode</span>
          <span className="hidden sm:inline text-white/50"> — data resets on every visit</span>
        </p>
        <Link href="/auth/signup"
          className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-lg text-white whitespace-nowrap hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
          Start Free Trial →
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          flex flex-col shrink-0 bg-[#1A0A00] border-r border-white/5
          fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          w-64 md:w-52
        `}>
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-lg tracking-tight">vela</span>
              <span className="text-[9px] font-bold text-[#FF6B35] bg-[#FF6B35]/15 px-1.5 py-0.5 rounded-full">DEMO</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
            {NAV.map((item) => (
              <button key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full min-h-[44px] ${
                  view === item.id ? "text-white shadow-sm" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
                style={view === item.id ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                <span className="shrink-0">{NAV_ICONS[item.id]}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-white/5">
            <Link href="/auth/signup" onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity min-h-[44px]"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Unlock Full Access
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Top bar */}
          <div className="bg-white border-b border-[#f0e8e0] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              {/* Hamburger — mobile only */}
              <button onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-1 rounded-lg text-[#1A0A00] hover:bg-[#FFF5F0] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <h1 className="font-bold text-[#1A0A00] text-sm md:text-base capitalize">{view}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-sm text-[#888]">Demo Clinic</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>D</div>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-6">
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
