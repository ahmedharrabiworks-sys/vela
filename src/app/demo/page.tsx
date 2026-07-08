"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ── Types ── */
type View = "dashboard" | "conversations" | "leads" | "appointments" | "channels" | "website" | "analytics" | "marketing";

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
  { id: 1, time: "09:00", name: "Ahmed Al-Rashid",   phone: "+971 50 123 4567", svc: "Dental Cleaning",     ch: "WhatsApp",  status: "confirmed" },
  { id: 2, time: "10:30", name: "Sara Khalid",        phone: "+971 55 234 5678", svc: "Teeth Whitening",     ch: "Instagram", status: "confirmed" },
  { id: 3, time: "11:00", name: "Mohammed Al-Zaabi",  phone: "+971 52 345 6789", svc: "Root Canal Consult",  ch: "Website",   status: "pending" },
  { id: 4, time: "12:00", name: "Layla Hassan",       phone: "+971 56 456 7890", svc: "Consultation",        ch: "WhatsApp",  status: "confirmed" },
  { id: 5, time: "14:00", name: "Omar Sharif",        phone: "+971 54 567 8901", svc: "General Check-up",    ch: "Instagram", status: "confirmed" },
  { id: 6, time: "15:00", name: "Reem Al-Mazrouei",  phone: "+971 50 678 9012", svc: "Emergency Visit",     ch: "WhatsApp",  status: "confirmed" },
  { id: 7, time: "15:30", name: "Fatima Al-Nasser",  phone: "+971 55 789 0123", svc: "Braces Consultation", ch: "Website",   status: "pending" },
  { id: 8, time: "16:30", name: "Khalid Mansour",    phone: "+971 52 890 1234", svc: "Dental Cleaning",     ch: "WhatsApp",  status: "confirmed" },
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
    body: "Every Instagram DM, WhatsApp message, and website enquiry lands here. Vela AI replies instantly so you never miss a lead.",
    navIndex: 1,
  },
  {
    title: "Connect your channels",
    body: "Link Instagram, WhatsApp, and your website in under 5 minutes. Your AI goes live immediately — no coding required.",
    navIndex: 4,
  },
  {
    title: "Build your website with AI",
    body: "Describe your business and Vela generates a full, beautiful website in seconds. No designer, no code — just type and publish.",
    navIndex: 5,
  },
  {
    title: "Ready to go live?",
    body: "Get started and have your AI answering customers within minutes. No setup, no contracts.",
    target: null,
    isFinal: true,
  },
];

function TourDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="rounded-full transition-all duration-300"
          style={{ width: i === current - 1 ? 16 : 6, height: 6,
            background: i === current - 1 ? "#FF6B35" : "rgba(255,255,255,0.25)" }} />
      ))}
    </div>
  );
}

function TourCard({ step, total, current, onNext, onSkip }: {
  step: typeof TOOLTIP_STEPS[0]; total: number; current: number;
  onNext: () => void; onSkip: () => void;
}) {
  const isFinal = "isFinal" in step && step.isFinal;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200
      bg-[#1C1410] border border-white/10 rounded-2xl p-5 shadow-2xl"
      style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <TourDots total={total} current={current} />
        <button onClick={onSkip} className="text-white/30 hover:text-white/50 text-[11px] transition-colors">Skip</button>
      </div>
      <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
      <p className="text-xs text-white/55 leading-relaxed mb-4">{step.body}</p>
      {isFinal ? (
        <div className="flex gap-2">
          <button onClick={onSkip} className="flex-1 py-2 rounded-xl text-xs text-white/35 border border-white/10 hover:border-white/20 transition-colors">Later</button>
          <Link href="/auth/signup" onClick={onSkip}
            className="flex-[2] py-2 rounded-xl text-xs font-bold text-white text-center hover:opacity-90 transition-opacity"
            style={{ background: "var(--vela-gradient)" }}>
            Get Started →
          </Link>
        </div>
      ) : (
        <button onClick={onNext} className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: "var(--vela-gradient)" }}>
          Next →
        </button>
      )}
    </div>
  );
}

function Tooltip({ step, onNext, onSkip }: { step: number; onNext: () => void; onSkip: () => void }) {
  const current = TOOLTIP_STEPS[step - 1];
  if (!current) return null;
  const isCentered = !("navIndex" in current) || current.navIndex === undefined;
  const navIdx = "navIndex" in current ? (current.navIndex ?? 0) : 0;
  // Sidebar: demo banner (40) + sidebar header (56) + padding (4) + items before (navIdx * 44)
  const spotTop  = 40 + 56 + 4 + navIdx * 44;
  const spotH    = 44;

  return (
    <>
      {/* Dimming overlay with spotlight cutout */}
      {!isCentered ? (
        <>
          {/* Top dim */}
          <div className="fixed z-[60] left-0 right-0 top-0 bg-black/55 pointer-events-none" style={{ height: spotTop }} />
          {/* Spotlight row — transparent gap, but sidebar width only */}
          <div className="fixed z-[60] right-0 bg-black/55 pointer-events-none" style={{ left: 208, top: spotTop, height: spotH }} />
          {/* Bottom dim */}
          <div className="fixed z-[60] left-0 right-0 bg-black/55 pointer-events-none" style={{ top: spotTop + spotH, bottom: 0 }} />
          {/* Click-to-skip overlay */}
          <div className="fixed inset-0 z-[59]" onClick={onSkip} />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onSkip} />
      )}

      {isCentered ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm">
            <TourCard step={current} total={TOOLTIP_STEPS.length} current={step} onNext={onNext} onSkip={onSkip} />
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: right of sidebar */}
          <div className="hidden md:block fixed z-[70] pointer-events-none"
            style={{ left: 208 + 16, top: spotTop - 4, maxWidth: 276 }}>
            <div className="pointer-events-auto relative">
              <div className="absolute left-0 top-5 -translate-x-2 w-3.5 h-3.5 rotate-45 bg-[#1C1410] border-l border-b border-white/10" />
              <TourCard step={current} total={TOOLTIP_STEPS.length} current={step} onNext={onNext} onSkip={onSkip} />
            </div>
          </div>
          {/* Mobile: bottom sheet */}
          <div className="md:hidden fixed left-0 right-0 z-[70] px-4 pointer-events-none"
            style={{ bottom: "max(16px, env(safe-area-inset-bottom))" }}>
            <div className="pointer-events-auto">
              <TourCard step={current} total={TOOLTIP_STEPS.length} current={step} onNext={onNext} onSkip={onSkip} />
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Leads",        value: "184", change: 23 },
          { label: "New Leads",          value: "47",  change: 12 },
          { label: "Appointments Today", value: "8",   change: 5  },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-5">
            <p className="text-[11px] text-[#6B7280] mb-3">{k.label}</p>
            <p className="text-2xl font-bold text-[#111111] leading-none mb-2">{k.value}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
              ↑{k.change}% vs last week
            </span>
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
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vp-color)" }}>+ Book</button>
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
            <button className="px-4 py-3 rounded-xl text-white text-sm font-semibold min-h-[44px] hover:opacity-90" style={{ background: "var(--vp-color)" }}>Send</button>
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

const CH_COLOR: Record<string, string> = { WhatsApp: "#25D366", Instagram: "#E1306C", Website: "#3B82F6" };

function AppointmentsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-[#111111]">Appointments</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#374151] hover:border-[#FF6B35]/30 transition-colors">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3.5h10M3 6.5h7M4.5 9.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Export CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--vela-gradient)" }}>
            + New Appointment
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {["Patient", "Phone", "Service", "Date & Time", "Channel", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {APPOINTMENTS.map((a, i) => (
                <tr key={a.id} className={`hover:bg-[#FAFAFA] transition-colors ${i % 2 === 1 ? "bg-[#FEFEFE]" : ""}`}>
                  <td className="px-4 py-3.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-bold text-[#374151] shrink-0">{a.name[0]}</div>
                      <span className="font-semibold text-[#111111] text-[13px] whitespace-nowrap">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#6B7280] whitespace-nowrap font-mono">{a.phone}</td>
                  <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">{a.svc}</td>
                  <td className="px-4 py-3.5 text-[13px] text-[#374151] whitespace-nowrap">Sat 28 Jun · {a.time}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${CH_COLOR[a.ch]}18`, color: CH_COLOR[a.ch] }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CH_COLOR[a.ch] }} />
                      {a.ch}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      a.status === "confirmed" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.status === "confirmed" ? "bg-green-500" : "bg-orange-400"}`} />
                      {a.status === "confirmed" ? "Confirmed" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button className="px-2.5 py-1 text-[11px] font-semibold text-[#374151] border border-[#E5E7EB] rounded-lg hover:border-[#FF6B35]/40 transition-colors">Edit</button>
                      <button className="p-1 text-[#9CA3AF] hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2h3v1.5M3.5 3.5l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

/* ── Channels View ── */
function ChannelsView() {
  const channels = [
    {
      name: "WhatsApp",
      desc: "Auto-reply to WhatsApp enquiries around the clock",
      msgs: "847 messages handled this month",
      icon: (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <path d="M10 2C5.58 2 2 5.58 2 10c0 1.57.43 3.08 1.18 4.36L2 18l3.75-1.17A7.97 7.97 0 0010 18c4.42 0 8-3.58 8-8s-3.58-8-8-8z" stroke="#25D366" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M7.5 8.5s.5 1.5 2 3 3.5 2 3.5 2l1-1.5s-.5-.5-1-.5-1 .5-1.5 0S10.5 10 10 9.5 8.5 7.5 8.5 7.5L7.5 8.5z" fill="#25D366"/>
        </svg>
      ),
    },
    {
      name: "Instagram",
      desc: "Auto-reply to DMs while you focus on your business",
      msgs: "312 messages handled this month",
      icon: (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id="ig-ch" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FCAF45"/><stop offset="40%" stopColor="#E1306C"/><stop offset="100%" stopColor="#833AB4"/>
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="16" height="16" rx="4.5" stroke="url(#ig-ch)" strokeWidth="1.6"/>
          <circle cx="10" cy="10" r="3.5" stroke="url(#ig-ch)" strokeWidth="1.6"/>
          <circle cx="14.5" cy="5.5" r="1.1" fill="url(#ig-ch)"/>
        </svg>
      ),
    },
    {
      name: "Website Widget",
      desc: "Paste one line of code — a chat bubble appears on your site instantly",
      msgs: "189 messages handled this month",
      icon: (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="#3B82F6" strokeWidth="1.5"/>
          <path d="M2.5 10h15M10 2.5c-2 2.5-3 5-3 7.5s1 5 3 7.5M10 2.5c2 2.5 3 5 3 7.5s-1 5-3 7.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#111111]">Channels</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Your AI is active on 3 channels</p>
      </div>
      <div className="space-y-4">
        {channels.map((ch) => (
          <div key={ch.name} className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center shrink-0">
                {ch.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-[#111111]">{ch.name}</p>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Connected
                  </span>
                </div>
                <p className="text-sm text-[#6B7280] mb-2">{ch.desc}</p>
                <p className="text-xs text-[#9CA3AF]">{ch.msgs}</p>
              </div>
              <button className="hidden sm:block text-xs font-semibold px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35]/40 transition-colors shrink-0">
                Configure
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-[#F3F4F6] flex items-center gap-6">
              <div>
                <p className="text-[11px] text-[#9CA3AF]">Response time</p>
                <p className="text-sm font-bold text-[#111111]">{"< 3 sec"}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#9CA3AF]">Auto-reply rate</p>
                <p className="text-sm font-bold text-[#111111]">97%</p>
              </div>
              <div>
                <p className="text-[11px] text-[#9CA3AF]">AI active</p>
                <div className="mt-0.5 w-9 h-5 rounded-full bg-[#FF6B35] relative shrink-0">
                  <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Website Builder View ── */
const DEMO_SITE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ahmed Dental Clinic</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#0a0f1a;color:#f0f4f8}nav{background:#0a0f1a;border-bottom:1px solid rgba(255,255,255,0.06);padding:14px 20px;display:flex;align-items:center;justify-content:space-between}.nav-logo{font-weight:800;font-size:.95rem;color:#FF6B35;letter-spacing:1px}.nav-links{display:flex;gap:18px;font-size:.75rem;color:#94a3b8}.nav-btn{background:#FF6B35;color:#fff;padding:7px 16px;border-radius:8px;font-size:.72rem;font-weight:700;border:none;cursor:pointer}.hero{padding:72px 20px 52px;text-align:center;background:linear-gradient(180deg,#0a0f1a 0%,#111827 100%)}.hero-tag{display:inline-block;background:rgba(255,107,53,.12);color:#FF6B35;font-size:.65rem;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:18px}.hero h1{font-size:2.2rem;font-weight:900;line-height:1.15;margin-bottom:14px}.hero h1 span{background:var(--vela-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero p{font-size:.88rem;color:#94a3b8;max-width:380px;margin:0 auto 24px;line-height:1.6}.btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.btn-p{background:var(--vela-gradient);color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;font-size:.8rem;border:none;cursor:pointer}.btn-s{background:transparent;color:#f0f4f8;padding:12px 24px;border-radius:10px;font-weight:600;font-size:.8rem;border:1px solid rgba(255,255,255,.15);cursor:pointer}.badges{display:flex;gap:14px;justify-content:center;margin-top:20px;flex-wrap:wrap}.badge{display:flex;align-items:center;gap:5px;font-size:.7rem;color:#64748b}.dot{width:5px;height:5px;border-radius:50%;background:#22c55e}.services{padding:52px 20px;max-width:800px;margin:0 auto}.s-title{font-size:1.35rem;font-weight:800;text-align:center;margin-bottom:6px}.s-sub{text-align:center;color:#64748b;font-size:.8rem;margin-bottom:30px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card{background:#111827;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:20px}.card-icon{font-size:1.6rem;margin-bottom:10px}.card h3{font-size:.85rem;font-weight:700;margin-bottom:5px}.card p{font-size:.72rem;color:#64748b;line-height:1.5}.price{font-size:.88rem;font-weight:800;color:#FF6B35;margin-top:8px}.cta{background:linear-gradient(135deg,#FF6B35 0%,#FF3366 100%);padding:52px 20px;text-align:center}.cta h2{font-size:1.5rem;font-weight:800;margin-bottom:8px}.cta p{color:rgba(255,255,255,.8);margin-bottom:20px;font-size:.82rem}.btn-w{display:inline-flex;align-items:center;gap:7px;background:#fff;color:#FF6B35;padding:12px 24px;border-radius:10px;font-weight:700;font-size:.8rem;border:none;cursor:pointer}.footer{background:#060a12;padding:20px;text-align:center;color:#475569;font-size:.7rem;border-top:1px solid rgba(255,255,255,.04)}</style></head><body><nav><span class="nav-logo">AHMED DENTAL</span><div class="nav-links"><span>Services</span><span>About</span><span>Contact</span></div><button class="nav-btn">Book Now</button></nav><div class="hero"><div class="hero-tag">⭐ Dubai Marina&apos;s #1 Dental Clinic</div><h1>Your Perfect Smile<br>Starts <span>Here</span></h1><p>Expert dental care in the heart of Dubai Marina. From routine cleanings to stunning veneers — we have got you covered.</p><div class="btns"><button class="btn-p">📅 Book Appointment</button><button class="btn-s">💬 WhatsApp Us</button></div><div class="badges"><div class="badge"><span class="dot"></span>Open 7 Days a Week</div><div class="badge"><span class="dot"></span>Insurance Accepted</div><div class="badge"><span class="dot"></span>Same-Day Emergency</div></div></div><div class="services"><h2 class="s-title">Our Services</h2><p class="s-sub">Professional care with the latest technology</p><div class="grid"><div class="card"><div class="card-icon">🦷</div><h3>Dental Cleaning</h3><p>Deep cleaning and polishing for a healthy smile</p><div class="price">AED 350</div></div><div class="card"><div class="card-icon">✨</div><h3>Teeth Whitening</h3><p>Professional whitening — up to 8 shades brighter</p><div class="price">AED 800</div></div><div class="card"><div class="card-icon">💎</div><h3>Porcelain Veneers</h3><p>Hollywood smile with custom porcelain veneers</p><div class="price">From AED 1,800</div></div><div class="card"><div class="card-icon">🔬</div><h3>Root Canal</h3><p>Pain-free treatment with modern anesthesia</p><div class="price">AED 1,200</div></div></div></div><div class="cta"><h2>Ready to Book?</h2><p>Mon–Sat 9 AM–8 PM · Fri 9 AM–2 PM · Insurance accepted</p><button class="btn-w">💬 WhatsApp to Book</button></div><div class="footer">© 2025 Ahmed Dental Clinic · Dubai Marina Tower, UAE · +971 50 123 4567</div></body></html>`;

function WebsiteView() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"chat" | "preview">("preview");

  const chatMsgs = [
    { role: "user", text: "Build a dental clinic website for Ahmed Dental Clinic in Dubai Marina" },
    { role: "ai",   text: "Building your website…", faint: true },
    { role: "ai",   text: "✅ Your website is ready! It includes a hero, services with pricing, and a WhatsApp booking button. Refine it below." },
  ];

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-188px)] min-h-[440px]">
      <div className="flex sm:hidden gap-1 p-1 bg-[#F3F4F6] rounded-xl">
        {(["chat", "preview"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${activeTab === t ? "bg-white text-[#111111] shadow-sm" : "text-[#6B7280]"}`}>
            {t === "chat" ? "Chat" : "Preview"}
          </button>
        ))}
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className={`flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden
          ${activeTab === "preview" ? "hidden sm:flex sm:w-72 sm:flex-none" : "flex flex-1 sm:w-72 sm:flex-none"}`}>
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <p className="text-sm font-bold text-[#111111]">Website Builder</p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">AI-powered · Full HTML website</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F9FAFB]">
            {chatMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#FF6B35] text-white"
                    : `bg-white border border-[#E5E7EB] ${"faint" in m && m.faint ? "text-[#9CA3AF]" : "text-[#111111]"}`
                }`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[#F3F4F6] bg-white">
            <div className="flex gap-2">
              <input placeholder="Add a section, change colors…" readOnly
                className="flex-1 text-xs border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111111] placeholder:text-[#9CA3AF] bg-[#FAFAFA] cursor-default" />
              <button disabled className="px-3 py-2.5 rounded-xl bg-[#F3F4F6] text-[#9CA3AF]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className={`flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden flex-1
          ${activeTab === "chat" ? "hidden sm:flex" : "flex"}`}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F3F4F6]">
            <p className="text-sm font-bold text-[#111111]">Live Preview</p>
            <div className="flex items-center gap-1.5">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} onClick={() => setDevice(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${device === d ? "bg-[#111111] text-white" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}>
                  {d === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex items-start justify-center bg-[#F3F4F6] p-3">
            <div
              className="bg-white rounded-xl overflow-hidden shadow-xl h-full transition-all"
              style={{ width: device === "mobile" ? 375 : "100%", maxWidth: "100%" }}>
              <iframe
                srcDoc={DEMO_SITE_HTML}
                className="w-full h-full border-none"
                sandbox="allow-scripts"
                title="Website preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Marketing View ── */
function MarketingView() {
  const [tool, setTool] = useState<"social" | "video" | "broadcast">("social");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Professional");

  const EXAMPLE_POST = `🦷 Transform Your Smile at Ahmed Dental Clinic!

Your perfect smile is just one appointment away. Our expert team in Dubai Marina offers:
✅ Professional Teeth Whitening — AED 800
✅ Dental Cleaning — AED 350
✅ Porcelain Veneers — from AED 1,800

We accept Daman & ADNIC insurance.
Same-day emergency appointments available.

📍 Dubai Marina  |  📞 Book via WhatsApp

#DubaiDentist #SmileGoals #DentalCare #DubaiMarina`;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#111111]">Marketing AI</h1>
      <div className="flex gap-2">
        {(["social", "video", "broadcast"] as const).map((t) => (
          <button key={t} onClick={() => setTool(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${tool === t ? "text-white border-transparent" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35]/30 bg-white"}`}
            style={tool === t ? { background: "var(--vela-gradient)" } : {}}>
            {t === "social" ? "Social Post" : t === "video" ? "Video Script" : "Broadcast"}
          </button>
        ))}
      </div>

      {tool === "social" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
            <p className="text-sm font-bold text-[#111111]">Generate Social Post</p>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Platform</label>
              <div className="flex gap-2 flex-wrap">
                {["Instagram", "Facebook", "LinkedIn"].map((p) => (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${platform === p ? "bg-[#111111] text-white border-[#111111]" : "border-[#E5E7EB] text-[#6B7280] bg-white"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Tone</label>
              <div className="flex gap-2 flex-wrap">
                {["Professional", "Friendly", "Promotional"].map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${tone === t ? "bg-[#111111] text-white border-[#111111]" : "border-[#E5E7EB] text-[#6B7280] bg-white"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Topic</label>
              <textarea rows={3} defaultValue="Special offer on dental whitening this month"
                className="w-full text-sm border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 resize-none" />
            </div>
            <button disabled className="w-full py-3 rounded-xl text-sm font-bold text-white/80 cursor-not-allowed"
              style={{ background: "var(--vela-gradient)" }}>
              Sign up to generate →
            </button>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[#111111]">Example Output</p>
              <span className="text-[10px] font-bold text-[#E1306C] bg-[#E1306C]/10 px-2 py-0.5 rounded-full">Instagram · Professional</span>
            </div>
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">
              <pre className="text-xs text-[#374151] whitespace-pre-wrap leading-relaxed font-sans">{EXAMPLE_POST}</pre>
            </div>
          </div>
        </div>
      )}

      {tool === "video" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
            <p className="text-sm font-bold text-[#111111]">Video Script Generator</p>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Format</label>
              <div className="flex gap-2 flex-wrap">
                {["Reels / TikTok", "YouTube Shorts", "Story"].map((f) => (
                  <button key={f} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${f === "Reels / TikTok" ? "bg-[#111111] text-white border-[#111111]" : "border-[#E5E7EB] text-[#6B7280] bg-white"}`}>{f}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Goal</label>
              <div className="flex gap-2 flex-wrap">
                {["Book appointments", "Promote offer", "Build trust"].map((g) => (
                  <button key={g} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${g === "Book appointments" ? "bg-[#111111] text-white border-[#111111]" : "border-[#E5E7EB] text-[#6B7280] bg-white"}`}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Topic</label>
              <textarea rows={2} defaultValue="Why patients trust Ahmed Dental Clinic in Dubai Marina"
                className="w-full text-sm border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 resize-none" />
            </div>
            <button disabled className="w-full py-3 rounded-xl text-sm font-bold text-white/80 cursor-not-allowed"
              style={{ background: "var(--vela-gradient)" }}>
              Generate Script →
            </button>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[#111111]">Example Output</p>
              <span className="text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-0.5 rounded-full">30s · Reels</span>
            </div>
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              {[
                { tag: "HOOK", color: "#FF6B35", bg: "#FF6B35", text: `[0–5s] CLOSE-UP of teeth transformation\n\n"Your smile could look like this — in just one visit."\n\n📍 Text overlay: Ahmed Dental Clinic, Dubai Marina` },
                { tag: "BODY", color: "#3B82F6", bg: "#3B82F6", text: `[5–20s] B-roll: clinic interior, friendly staff, patient smiling\n\nVoiceover:\n"We offer professional teeth whitening, same-day emergency visits, and braces consultations — all in one place.\n\nDaman & ADNIC insurance accepted.\nResults that speak for themselves."` },
                { tag: "CTA",  color: "#16A34A", bg: "#16A34A", text: `[20–30s] Direct to camera\n\n"Book your free consultation via WhatsApp — link in bio. Slots filling up fast this week!"\n\n📲 On-screen: WhatsApp number + Book Now button` },
              ].map((s) => (
                <div key={s.tag}>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                    style={{ background: `${s.bg}18`, color: s.color }}>{s.tag}</span>
                  <pre className="text-[11px] text-[#374151] whitespace-pre-wrap leading-relaxed font-sans">{s.text}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tool === "broadcast" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
            <p className="text-sm font-bold text-[#111111]">WhatsApp Broadcast</p>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Audience</label>
              <div className="flex gap-2 flex-wrap">
                {["All Patients", "Booked — June", "Inactive 30d+"].map((a) => (
                  <button key={a} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${a === "All Patients" ? "bg-[#111111] text-white border-[#111111]" : "border-[#E5E7EB] text-[#6B7280] bg-white"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2 block">Message</label>
              <textarea rows={6} defaultValue={`Hi {{name}} 👋\n\nThis July, we're offering 20% off professional teeth whitening at Ahmed Dental Clinic — exclusively for our existing patients!\n\n✨ Was AED 800 → Now AED 640\n📅 Limited slots: July 5–20 only\n\nReply YES to book your slot, or tap the link below to choose your time:\n👉 Book Now: wa.me/97150xxxxxxx\n\nSee you soon!\n— Dr. Ahmed & Team`}
                className="w-full text-xs border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 resize-none leading-relaxed" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] px-1">
              <span>184 recipients · Est. delivery: &lt;2 min</span>
              <span className="text-[#FF6B35] font-semibold">Preview →</span>
            </div>
            <button disabled className="w-full py-3 rounded-xl text-sm font-bold text-white/80 cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
              Send Broadcast via WhatsApp →
            </button>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[#111111]">Message Preview</p>
              <span className="text-[10px] font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">WhatsApp</span>
            </div>
            <div className="bg-[#ECF5E8] rounded-2xl p-4 max-w-xs mx-auto"
              style={{ background: "linear-gradient(180deg,#E2F5E1 0%,#EDF7EC 100%)" }}>
              <div className="bg-white rounded-xl p-3.5 shadow-sm space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-[#F3F4F6]">
                  <div className="w-7 h-7 rounded-full bg-[#FF6B35]/15 flex items-center justify-center text-xs font-bold text-[#FF6B35]">A</div>
                  <div>
                    <p className="text-[11px] font-bold text-[#111111]">Ahmed Dental Clinic</p>
                    <p className="text-[9px] text-[#25D366]">Official Business</p>
                  </div>
                </div>
                <pre className="text-[11px] text-[#111111] whitespace-pre-wrap leading-relaxed font-sans">{`Hi Sara 👋\n\nThis July, we're offering 20% off professional teeth whitening — exclusively for our existing patients!\n\n✨ Was AED 800 → Now AED 640\n📅 Slots: July 5–20 only\n\nReply YES to book!`}</pre>
                <p className="text-[9px] text-[#9CA3AF] text-right">10:31 AM ✓✓</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#F3F4F6] grid grid-cols-3 gap-2 text-center">
              {[{ l: "Recipients", v: "184" }, { l: "Open rate", v: "91%" }, { l: "Replies", v: "—" }].map((s) => (
                <div key={s.l}>
                  <p className="text-sm font-bold text-[#111111]">{s.v}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sidebar nav items ── */
const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",     label: "Dashboard",     icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg> },
  { id: "conversations", label: "Conversations", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.25 15V4.5A1.5 1.5 0 013.75 3h9.75A1.5 1.5 0 0115 4.5v6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
  { id: "leads",         label: "Leads / CRM",   icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 16.5v-1.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="6.75" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/></svg> },
  { id: "appointments",  label: "Appointments",  icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.25" y="3" width="13.5" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M12 1.5v3M6 1.5v3M2.25 7.5h13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  { id: "channels",      label: "Channels",      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="4" cy="9" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="14" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="14" cy="14" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M6 8l6-3M6 10l6 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  { id: "website",       label: "Website",       icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M2 9h14M9 2c-2 2.5-3 4.5-3 7s1 4.5 3 7M9 2c2 2.5 3 4.5 3 7s-1 4.5-3 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  { id: "analytics",     label: "Analytics",     icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 15V9.75M7.5 15V6.75M12 15V3.75M16.5 15V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  { id: "marketing",     label: "Marketing",     icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 11V7l10-4v12L3 11z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M13 8.5c1 .5 1.5 1.5 0 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5 11.5l-1.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
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
          style={{ background: "var(--vp-color)" }}>
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
              <Link href="/" className="font-extrabold text-white text-lg tracking-tight hover:text-white/80 transition-colors">vela</Link>
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
              style={{ background: "var(--vp-color)" }}>
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
              <span className="font-bold text-[#111111] text-sm capitalize">
                {view === "leads" ? "Leads / CRM" : view === "website" ? "Website Builder" : view === "marketing" ? "Marketing AI" : view}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-sm text-[#6B7280]">Ahmed Dental Clinic</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "var(--vp-color)" }}>A</div>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-6">
            {view === "dashboard"     && <DashboardView setView={setView} />}
            {view === "conversations" && <ConversationsView />}
            {view === "leads"         && <LeadsView />}
            {view === "appointments"  && <AppointmentsView />}
            {view === "channels"      && <ChannelsView />}
            {view === "website"       && <WebsiteView />}
            {view === "analytics"     && <AnalyticsView />}
            {view === "marketing"     && <MarketingView />}
          </div>
        </main>
      </div>
    </div>
  );
}
