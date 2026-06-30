"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ── Types ── */
type View = "dashboard" | "conversations" | "leads" | "appointments" | "analytics";

/* ── Demo Data — Dental Clinic ── */
const CONVOS = [
  { id: 1,  name: "Ahmed Al-Rashid",   ch: "WhatsApp",  time: "1m",  msg: "I want to book a dental cleaning appointment", isNew: true,
    msgs: [
      { role: "user", text: "Hi! I want to book a dental cleaning.", time: "10:30" },
      { role: "ai",   text: "Hello Ahmed! Happy to help. We have Tuesday at 11 AM or Wednesday at 2 PM. Which works?", time: "10:30" },
      { role: "user", text: "Tuesday 11 AM please!", time: "10:31" },
      { role: "ai",   text: "Booked! Tuesday June 28 at 11:00 AM for a Dental Cleaning. You'll get a reminder 1 hour before.", time: "10:31" },
    ],
  },
  { id: 2,  name: "Sara Khalid",        ch: "Instagram", time: "5m",  msg: "What are your prices for teeth whitening?", isNew: true,
    msgs: [
      { role: "user", text: "Hey! What are your prices for whitening?", time: "10:22" },
      { role: "ai",   text: "Hi Sara! Professional whitening is AED 800 for a 60-minute session. Take-home kit is AED 400. Want to book?", time: "10:23" },
    ],
  },
  { id: 3,  name: "Mohammed Al-Zaabi",  ch: "Website",   time: "12m", msg: "Is Dr. Hassan available tomorrow morning?", isNew: false,
    msgs: [
      { role: "user", text: "Is Dr. Hassan available tomorrow morning?", time: "10:15" },
      { role: "ai",   text: "Yes! Dr. Hassan has slots at 9 AM, 10:30 AM, and 12 PM tomorrow. Which works best?", time: "10:15" },
      { role: "user", text: "10:30 works great", time: "10:16" },
    ],
  },
  { id: 4,  name: "Layla Hassan",       ch: "WhatsApp",  time: "28m", msg: "Can I reschedule my Friday appointment?", isNew: false,
    msgs: [
      { role: "user", text: "Can I move my Friday appointment to next Monday?", time: "09:45" },
      { role: "ai",   text: "Of course Layla! Monday has 2 PM or 4 PM open. Which do you prefer?", time: "09:46" },
    ],
  },
  { id: 5,  name: "Omar Sharif",        ch: "Instagram", time: "41m", msg: "Do you accept Daman insurance?", isNew: false,
    msgs: [
      { role: "user", text: "Do you accept Daman insurance?", time: "09:30" },
      { role: "ai",   text: "Yes, we accept Daman! Please bring your insurance card. Would you like to book a checkup?", time: "09:31" },
    ],
  },
  { id: 6,  name: "Fatima Al-Nasser",   ch: "WhatsApp",  time: "55m", msg: "How long does a root canal take?", isNew: false,
    msgs: [
      { role: "user", text: "How long does a root canal treatment take?", time: "09:12" },
      { role: "ai",   text: "A root canal typically takes 60-90 minutes for a single session. Some cases need 2 visits. Would you like to book a consultation?", time: "09:13" },
    ],
  },
  { id: 7,  name: "Khalid Mansour",     ch: "Website",   time: "1h",  msg: "Do you offer payment plans for veneers?", isNew: false,
    msgs: [
      { role: "user", text: "Do you offer payment plans for veneers?", time: "08:55" },
      { role: "ai",   text: "Yes! We offer 0% installment plans over 3, 6, or 12 months for treatments over AED 2,000. Want to book a veneer consultation?", time: "08:56" },
    ],
  },
  { id: 8,  name: "Nora Abdulla",       ch: "Instagram", time: "2h",  msg: "What is included in the premium cleaning package?", isNew: false,
    msgs: [
      { role: "user", text: "What's included in the premium cleaning package?", time: "08:30" },
      { role: "ai",   text: "Our Premium Cleaning (AED 550) includes scaling, polishing, fluoride treatment, and a free x-ray. It takes about 60 minutes.", time: "08:31" },
    ],
  },
  { id: 9,  name: "Youssef Al-Noor",    ch: "WhatsApp",  time: "3h",  msg: "My son needs braces consultation", isNew: false,
    msgs: [
      { role: "user", text: "My son needs braces. When can we come?", time: "07:45" },
      { role: "ai",   text: "We'd be happy to help! Our orthodontist is available Thursday and Saturday mornings. The initial consultation is AED 200 and takes 30 min.", time: "07:46" },
    ],
  },
  { id: 10, name: "Amira Bensalem",     ch: "Website",   time: "4h",  msg: "Thank you for the great service yesterday!", isNew: false,
    msgs: [
      { role: "user", text: "Just wanted to say the team was amazing yesterday! Very professional.", time: "07:10" },
      { role: "ai",   text: "Thank you so much Amira! We're so glad you had a great experience. We hope to see you again soon!", time: "07:11" },
    ],
  },
  { id: 11, name: "Hassan Al-Falasi",   ch: "Instagram", time: "5h",  msg: "Are you open on Fridays?", isNew: false,
    msgs: [
      { role: "user", text: "Are you open on Fridays?", time: "06:30" },
      { role: "ai",   text: "Yes! We're open Friday 9 AM - 2 PM. Saturday 9 AM - 6 PM. Would you like to book?", time: "06:31" },
    ],
  },
  { id: 12, name: "Reem Al-Mazrouei",   ch: "WhatsApp",  time: "6h",  msg: "I need an emergency appointment today", isNew: false,
    msgs: [
      { role: "user", text: "I have bad tooth pain. Can I come in today?", time: "06:00" },
      { role: "ai",   text: "Sorry to hear that Reem! We have an emergency slot at 3 PM today. Shall I book it?", time: "06:01" },
      { role: "user", text: "Yes please! Thank you!", time: "06:02" },
      { role: "ai",   text: "Booked! See you at 3 PM today. Please arrive 5 minutes early.", time: "06:02" },
    ],
  },
];

const LEADS = [
  { id: 1,  name: "Ahmed Al-Rashid",  ch: "WhatsApp",  stage: "Booked",     value: "AED 350",   svc: "Dental Cleaning" },
  { id: 2,  name: "Sara Khalid",      ch: "Instagram", stage: "Qualified",  value: "AED 800",   svc: "Teeth Whitening" },
  { id: 3,  name: "Mohammed Al-Zaabi",ch: "Website",   stage: "Qualified",  value: "AED 1,200", svc: "Root Canal" },
  { id: 4,  name: "Layla Hassan",     ch: "WhatsApp",  stage: "Contacted",  value: "AED 600",   svc: "Consultation" },
  { id: 5,  name: "Omar Sharif",      ch: "Instagram", stage: "New",        value: "AED 200",   svc: "Check-up" },
  { id: 6,  name: "Fatima Al-Nasser", ch: "WhatsApp",  stage: "New",        value: "AED 4,800", svc: "Veneers" },
  { id: 7,  name: "Khalid Mansour",   ch: "Website",   stage: "Contacted",  value: "AED 350",   svc: "Dental Cleaning" },
  { id: 8,  name: "Nora Abdulla",     ch: "Instagram", stage: "Qualified",  value: "AED 550",   svc: "Premium Cleaning" },
  { id: 9,  name: "Youssef Al-Noor",  ch: "WhatsApp",  stage: "New",        value: "AED 2,400", svc: "Braces" },
  { id: 10, name: "Amira Bensalem",   ch: "Website",   stage: "Client",     value: "AED 800",   svc: "Whitening" },
];

const APPOINTMENTS = [
  { id: 1, time: "09:00", name: "Ahmed Al-Rashid",   svc: "Dental Cleaning",     ch: "WhatsApp",  status: "confirmed" },
  { id: 2, time: "10:30", name: "Sara Khalid",        svc: "Teeth Whitening",     ch: "Instagram", status: "confirmed" },
  { id: 3, time: "11:00", name: "Mohammed Al-Zaabi",  svc: "Root Canal Consult",  ch: "Website",   status: "pending" },
  { id: 4, time: "12:00", name: "Layla Hassan",       svc: "Consultation",        ch: "WhatsApp",  status: "confirmed" },
  { id: 5, time: "14:00", name: "Omar Sharif",        svc: "General Check-up",    ch: "Instagram", status: "confirmed" },
  { id: 6, time: "15:00", name: "Reem Al-Mazrouei",  svc: "Emergency Visit",     ch: "WhatsApp",  status: "confirmed" },
  { id: 7, time: "15:30", name: "Fatima Al-Nasser",  svc: "Braces Consultation", ch: "Website",   status: "pending" },
  { id: 8, time: "16:30", name: "Khalid Mansour",    svc: "Dental Cleaning",     ch: "WhatsApp",  status: "confirmed" },
];

const STAGE_ORDER = ["New", "Contacted", "Qualified", "Booked", "Client"] as const;
const STATUS_DOT: Record<string, string> = { confirmed: "#16A34A", pending: "#FF6B35", cancelled: "#DC2626" };

function StatusDot({ status }: { status: string }) {
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[status] || "#9CA3AF" }} />;
}

/* ── Onboarding Tooltip ── */
const TOOLTIP_STEPS = [
  {
    title: "Welcome to Vela",
    body: "This is your AI Business Operating System. Your AI replies to messages, books appointments, and grows your leads — automatically, 24/7.",
    target: null,
  },
  {
    title: "All your messages, one place",
    body: "This is where all your client messages land — Instagram, WhatsApp, everything in one inbox. Your AI replies instantly so you never miss a lead.",
    navIndex: 1,
  },
  {
    title: "Your sales pipeline",
    body: "Every inquiry becomes a tracked lead. Watch them move from New → Qualified → Booked automatically as your AI qualifies them.",
    navIndex: 2,
  },
  {
    title: "Your calendar, filled for you",
    body: "Customers book directly in chat. The AI confirms, adds it here, and sends reminders — no back-and-forth, no manual entry.",
    navIndex: 3,
  },
  {
    title: "Ready to go live?",
    body: "Get started and have your AI answering customers within minutes. No setup, no contracts.",
    target: null,
    isFinal: true,
  },
];

function Tooltip({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
  const current = TOOLTIP_STEPS[step - 1];
  if (!current) return null;
  const isCentered = !("navIndex" in current) || current.navIndex === undefined;
  const navIdx = "navIndex" in current ? current.navIndex ?? 0 : 0;
  const topPos = 40 + 56 + 4 + navIdx * 48 + 12;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onSkip} />
      {isCentered ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[#FF6B35] uppercase tracking-wider">{step} / {TOOLTIP_STEPS.length}</span>
              <button onClick={onSkip} className="text-white/30 hover:text-white/60 text-xs transition-colors">Skip tour</button>
            </div>
            <h3 className="text-base font-bold text-white mb-2">{current.title}</h3>
            <p className="text-sm text-white/55 leading-relaxed mb-5">{current.body}</p>
            {"isFinal" in current && current.isFinal ? (
              <div className="flex gap-2">
                <button onClick={onSkip} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">Maybe later</button>
                <Link href="/auth/signup" onClick={onSkip}
                  className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white text-center hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  Get Started →
                </Link>
              </div>
            ) : (
              <button onClick={onNext} className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Next →
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: right of sidebar */}
          <div className="hidden md:block fixed z-[70] animate-in fade-in slide-in-from-left-2 duration-200"
            style={{ left: 208 + 16, top: topPos, maxWidth: 280 }}>
            <div className="relative bg-[#111111] border border-white/10 rounded-2xl p-5 shadow-2xl">
              <div className="absolute left-0 top-6 -translate-x-1.5 w-3 h-3 rotate-45 bg-[#111111] border-l border-b border-white/10" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#FF6B35] uppercase tracking-wider">{step} / {TOOLTIP_STEPS.length}</span>
                <button onClick={onSkip} className="text-white/30 hover:text-white/60 text-xs transition-colors">Skip</button>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{current.title}</h3>
              <p className="text-xs text-white/55 leading-relaxed mb-4">{current.body}</p>
              <button onClick={onNext} className="w-full py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Next →
              </button>
            </div>
          </div>
          {/* Mobile: bottom sheet */}
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-[70] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#FF6B35] uppercase tracking-wider">{step} / {TOOLTIP_STEPS.length}</span>
                <button onClick={onSkip} className="text-white/30 hover:text-white/60 text-xs transition-colors">Skip</button>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{current.title}</h3>
              <p className="text-xs text-white/55 leading-relaxed mb-4">{current.body}</p>
              <button onClick={onNext} className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
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

/* ── Views ── */
function DashboardView({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-bold text-[#111111]">Good morning, Ahmed</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Ahmed Dental Clinic · Monday, 29 June 2026</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Revenue (AED)",   value: "48,200", trend: "+12%", up: true  },
          { label: "New Patients",    value: "184",    trend: "+23",  up: true  },
          { label: "Appointments",    value: "67",     trend: "12 today", up: true },
          { label: "Avg Response",    value: "43s",    trend: "-8s",  up: true  },
          { label: "Conversion",      value: "34%",    trend: "+2pp", up: true  },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-5">
            <p className="text-[11px] text-[#6B7280] mb-3">{k.label}</p>
            <p className="text-2xl font-bold text-[#111111] leading-none mb-2">{k.value}</p>
            <p className={`text-[11px] font-medium ${k.up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{k.up ? "↑" : "↓"} {k.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
            <p className="text-sm font-bold text-[#111111]">Recent Messages</p>
            <button onClick={() => setView("conversations")} className="text-xs text-[#FF6B35] font-semibold hover:underline">View all</button>
          </div>
          {CONVOS.slice(0, 5).map((c) => (
            <button key={c.id} onClick={() => setView("conversations")}
              className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#FAFAFA] transition-colors text-left border-b border-[#F9FAFB] last:border-none">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151]">{c.name[0]}</div>
                {c.isNew && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF6B35] border-2 border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111111] truncate">{c.name}</span>
                  <span className="text-[10px] text-[#9CA3AF] shrink-0 ml-2">{c.time}</span>
                </div>
                <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{c.msg}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
            <p className="text-sm font-bold text-[#111111]">Today&apos;s Appointments</p>
            <button onClick={() => setView("appointments")} className="text-xs text-[#FF6B35] font-semibold hover:underline">View all</button>
          </div>
          {APPOINTMENTS.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors border-b border-[#F9FAFB] last:border-none">
              <span className="text-xs font-mono text-[#6B7280] w-12 shrink-0">{a.time}</span>
              <div className="w-px h-8 bg-[#FF6B35] rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111111] truncate">{a.name}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{a.svc}</p>
              </div>
              <StatusDot status={a.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConversationsView() {
  const [sel, setSel] = useState(CONVOS[0]);
  const [showThread, setShowThread] = useState(false);
  const [aiOn, setAiOn] = useState(true);
  const [reply, setReply] = useState("");

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)] min-h-[420px]">
      <div className={`flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shrink-0
        ${showThread ? "hidden md:flex md:w-64" : "flex w-full md:w-64"}`}>
        <div className="px-5 py-4 border-b border-[#F3F4F6]">
          <p className="text-sm font-bold text-[#111111]">All Messages</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{CONVOS.filter((c) => c.isNew).length} unread</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#F9FAFB]">
          {CONVOS.map((c) => (
            <button key={c.id} onClick={() => { setSel(c); setShowThread(true); }}
              className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-all ${
                sel.id === c.id ? "bg-[#FFF8F5] border-l-2 border-[#FF6B35]" : "hover:bg-[#FAFAFA] border-l-2 border-transparent"
              }`}>
              <div className="relative shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151]">{c.name[0]}</div>
                {c.isNew && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF6B35] border border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111111] truncate">{c.name}</span>
                  <span className="text-[10px] text-[#9CA3AF] shrink-0 ml-1">{c.time}</span>
                </div>
                <p className="text-[10px] text-[#6B7280] truncate mt-0.5">{c.msg}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden
        ${showThread ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F3F4F6]">
          <button onClick={() => setShowThread(false)} className="md:hidden p-2 -ml-1 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] shrink-0">{sel.name[0]}</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#111111]">{sel.name}</p>
            <p className="text-[10px] text-[#6B7280]">via {sel.ch}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-[#6B7280]">AI</span>
              <button onClick={() => setAiOn(!aiOn)} className={`w-9 h-5 rounded-full relative transition-all ${aiOn ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${aiOn ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>+ Book</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-[#F9FAFB]">
          {sel.msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-white text-[#111111] rounded-tl-sm border border-[#E5E7EB]"
                  : "bg-[#FFF3EE] text-[#111111] rounded-tr-sm border border-[#FFD5C2]"
              }`}>
                <p>{m.text}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-1.5">{m.role === "ai" ? "Vela AI · " : ""}{m.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-[#F3F4F6] bg-white">
          <div className="flex gap-2 items-end">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply…"
              className="flex-1 text-sm rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors min-h-[44px]" />
            <button className="px-4 py-3 rounded-xl text-white text-sm font-semibold min-h-[44px] hover:opacity-90" style={{ background: "#FF6B35" }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsView() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#111111]">Leads</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {STAGE_ORDER.map((stage) => {
          const leads = LEADS.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
                <span className="text-xs font-bold text-[#374151]">{stage}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{leads.length}</span>
              </div>
              <div className="p-3 space-y-2">
                {leads.map((l) => (
                  <div key={l.id} className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-3 hover:border-[#E5E7EB] transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[10px] font-bold text-[#374151] shrink-0">{l.name[0]}</div>
                      <p className="text-[10px] font-semibold text-[#111111] truncate">{l.name}</p>
                    </div>
                    <p className="text-[9px] text-[#6B7280]">{l.svc}</p>
                    <p className="text-[10px] font-bold text-[#FF6B35] mt-1">{l.value}</p>
                  </div>
                ))}
                {leads.length === 0 && (
                  <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-3 text-center text-[10px] text-[#9CA3AF]">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentsView() {
  const days = ["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27", "Sat 28", "Sun 29"];
  const [activeDay, setActiveDay] = useState(5);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#111111]">Appointments</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button key={d} onClick={() => setActiveDay(i)}
            className={`flex flex-col items-center px-4 py-3 rounded-xl shrink-0 border transition-all min-h-[64px] min-w-[60px] ${
              activeDay === i ? "text-white border-transparent" : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#FF6B35]/30"
            }`}
            style={activeDay === i ? { background: "#FF6B35" } : {}}>
            <span className="text-[10px] font-medium">{d.split(" ")[0]}</span>
            <span className="text-lg font-extrabold leading-tight">{d.split(" ")[1]}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F3F4F6]">
          <p className="font-bold text-[#111111] text-sm">{days[activeDay]}</p>
          <p className="text-xs text-[#6B7280]">{activeDay === 5 ? "8 appointments scheduled" : "No appointments scheduled"}</p>
        </div>
        {activeDay === 5 ? (
          APPOINTMENTS.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#F9FAFB] last:border-none hover:bg-[#FAFAFA] transition-colors">
              <span className="text-xs font-mono text-[#6B7280] w-12 shrink-0">{a.time}</span>
              <div className="w-px h-8 rounded-full shrink-0 bg-[#FF6B35]" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#111111] text-sm">{a.name}</p>
                <p className="text-xs text-[#6B7280]">{a.svc}</p>
              </div>
              <StatusDot status={a.status} />
            </div>
          ))
        ) : (
          <div className="px-6 py-16 text-center text-[#9CA3AF] text-sm">No appointments for this day</div>
        )}
      </div>
    </div>
  );
}

function AnalyticsView() {
  const data = [4,7,5,9,11,8,6,12,14,10,9,15,18,13,11,16,20,17,14,19,22,18,16,21,24,20,18,23,26,22];
  const W = 800, H = 140, padX = 8, padTop = 12, padBottom = 24;
  const chartH = H - padTop - padBottom;
  const max = Math.max(...data), min = Math.min(...data), range = max - min;
  const pts = data.map((v, i) => ({ x: padX + (i / (data.length - 1)) * (W - padX * 2), y: padTop + ((max - v) / range) * chartH }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) { const p0 = pts[i-1], p1 = pts[i], cx = (p0.x + p1.x) / 2; d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`; }
  const areaD = d + ` L ${pts[pts.length-1].x} ${H - padBottom} L ${pts[0].x} ${H - padBottom} Z`;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#111111]">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ l: "Patients",    v: "184",    t: "+23 this month" }, { l: "Appointments", v: "67", t: "36% from leads" }, { l: "Revenue (AED)", v: "48,200", t: "+12% growth" }, { l: "Conversion", v: "34%", t: "+2pp this period" }].map((k) => (
          <div key={k.l} className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-5">
            <p className="text-[11px] text-[#6B7280] mb-2">{k.l}</p>
            <p className="text-2xl font-bold text-[#111111] leading-none mb-1">{k.v}</p>
            <p className="text-[11px] text-[#16A34A] font-medium">↑ {k.t}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <p className="text-sm font-bold text-[#111111] mb-4">New Patients — Last 30 Days</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }} preserveAspectRatio="none">
          <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15"/><stop offset="100%" stopColor="#FF6B35" stopOpacity="0"/></linearGradient></defs>
          {[0,.25,.5,.75,1].map((t) => <line key={t} x1={padX} x2={W-padX} y1={padTop + t * chartH} y2={padTop + t * chartH} stroke="#F3F4F6" strokeWidth="1"/>)}
          <path d={areaD} fill="url(#dg)"/>
          <path d={d} fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#F3F4F6]">{["Channel","Leads","Bookings","Rate"].map((h) => <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {[{ ch: "WhatsApp", l: 87, b: 41, r: 47 }, { ch: "Instagram", l: 65, b: 22, r: 34 }, { ch: "Website", l: 32, b: 11, r: 34 }].map((row, i) => (
              <tr key={row.ch} className={`border-b border-[#F9FAFB] last:border-none ${i%2===1?"bg-[#FAFAFA]":""}`}>
                <td className="px-6 py-3.5 text-sm font-semibold text-[#111111]">{row.ch}</td>
                <td className="px-6 py-3.5 text-sm text-[#374151]">{row.l}</td>
                <td className="px-6 py-3.5 text-sm text-[#374151]">{row.b}</td>
                <td className="px-6 py-3.5 text-sm font-bold text-[#FF6B35]">{row.r}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Sidebar nav items ── */
const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",     label: "Dashboard",     icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg> },
  { id: "conversations", label: "Conversations", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.25 15V4.5A1.5 1.5 0 013.75 3h9.75A1.5 1.5 0 0115 4.5v6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
  { id: "leads",         label: "Leads / CRM",   icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 16.5v-1.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="6.75" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/></svg> },
  { id: "appointments",  label: "Appointments",  icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.25" y="3" width="13.5" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M12 1.5v3M6 1.5v3M2.25 7.5h13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  { id: "analytics",     label: "Analytics",     icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 15V9.75M7.5 15V6.75M12 15V3.75M16.5 15V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
];

export default function DemoPage() {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    const done = typeof window !== "undefined" && localStorage.getItem("vela_tour_done");
    if (!done) { const t = setTimeout(() => setTourStep(1), 800); return () => clearTimeout(t); }
  }, []);

  const nextTour = () => { tourStep >= TOOLTIP_STEPS.length ? skipTour() : setTourStep((s) => s + 1); };
  const skipTour = () => { setTourStep(0); if (typeof window !== "undefined") localStorage.setItem("vela_tour_done", "1"); };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F9FAFB]">
      {tourStep > 0 && <Tooltip step={tourStep} onNext={nextTour} onSkip={skipTour} />}

      {/* Demo banner */}
      <div className="shrink-0 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4" style={{ background: "#111111" }}>
        <p className="text-white/70 text-sm">
          <span className="text-[#FF6B35] mr-2">●</span>
          <span className="text-white font-semibold">Demo mode</span>
          <span className="hidden sm:inline text-white/40"> — explore all features, no sign-up required</span>
        </p>
        <Link href="/auth/signup"
          className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-lg text-white whitespace-nowrap hover:opacity-90 transition-opacity"
          style={{ background: "#FF6B35" }}>
          Get Started →
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`flex flex-col shrink-0 bg-[#111111] border-r border-white/5
          fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-auto
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          w-64 md:w-52`}>

          <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-lg tracking-tight">vela</span>
              <span className="text-[9px] font-bold text-[#FF6B35] bg-[#FF6B35]/15 px-1.5 py-0.5 rounded-full">DEMO</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

          <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
            {NAV.map((item) => (
              <button key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full min-h-[44px] ${
                  view === item.id ? "bg-[#FF6B35]/15 text-[#FF6B35]" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}>
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-white/5">
            <Link href="/auth/signup" onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity min-h-[44px]"
              style={{ background: "#FF6B35" }}>
              Unlock Full Access
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-1 rounded-lg text-[#374151] hover:bg-[#F3F4F6] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
              <span className="font-bold text-[#111111] text-sm capitalize">{view === "leads" ? "Leads / CRM" : view}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-sm text-[#6B7280]">Ahmed Dental Clinic</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "#FF6B35" }}>A</div>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-6">
            {view === "dashboard"     && <DashboardView setView={setView} />}
            {view === "conversations" && <ConversationsView />}
            {view === "leads"         && <LeadsView />}
            {view === "appointments"  && <AppointmentsView />}
            {view === "analytics"     && <AnalyticsView />}
          </div>
        </main>
      </div>
    </div>
  );
}
