"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────
   Panel components (CSS-only UI illustrations)
───────────────────────────────────────── */

function ConversationsPanel() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-[#E5E7EB] flex flex-col" style={{ background: "#F8FAFC" }}>
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#F1F5F9] shrink-0">
        <span className="text-[#111111] text-sm font-semibold">Conversations</span>
        <div className="flex gap-1">
          {["IG", "WA", "Web"].map((l) => (
            <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#6B7280] font-medium">{l}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-[130px] border-r border-[#F1F5F9] bg-white flex flex-col shrink-0">
          {[
            { name: "Layla M.", ch: "#E1306C", active: true },
            { name: "Omar K.", ch: "#25D366", active: false },
            { name: "Website visitor", ch: "#FF6B35", active: false },
          ].map((c, i) => (
            <div key={i} className={`px-3 py-2.5 border-b border-[#F1F5F9] flex items-center gap-2 ${c.active ? "bg-[#FFF5F0]" : ""}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[9px] font-bold" style={{ background: c.ch }}>
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[#111111] truncate">{c.name}</p>
                <div className="w-full h-1 mt-1 rounded-full bg-[#F1F5F9]" />
              </div>
            </div>
          ))}
        </div>
        {/* Chat area */}
        <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
          <div className="self-start max-w-[82%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-[#E5E7EB] text-[10px] text-[#374151] leading-relaxed">
            Hi! I want to book an appointment 📅
          </div>
          <div className="self-end max-w-[82%] px-3 py-2 rounded-2xl rounded-tr-sm text-[10px] text-white leading-relaxed"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
            Hey! What service are you looking for?
          </div>
          <div className="self-start max-w-[82%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-[#E5E7EB] text-[10px] text-[#374151] leading-relaxed">
            Dental cleaning please
          </div>
          <div className="self-end max-w-[82%] px-3 py-2 rounded-2xl rounded-tr-sm text-[10px] text-white leading-relaxed"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
            How does Tuesday at 3 PM sound?
          </div>
        </div>
      </div>
    </div>
  );
}

function VoicePanel() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-5 border border-[#E5E7EB]"
      style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)" }}>
      <div className="w-52 rounded-2xl overflow-hidden border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="px-4 py-4 text-center border-b border-white/8">
          <div className="w-12 h-12 rounded-full mx-auto mb-2.5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", boxShadow: "0 0 32px rgba(255,107,53,0.4)" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 5.25A2.25 2.25 0 015.25 3h.375a1.125 1.125 0 011.069.768l.9 2.7a1.125 1.125 0 01-.309 1.185L5.906 8.81a10.5 10.5 0 004.285 4.285l1.157-1.38a1.125 1.125 0 011.185-.308l2.7.9A1.125 1.125 0 0116.5 13.5v.375A2.25 2.25 0 0114.25 16.125c-7.107 0-12.875-5.768-12.875-12.875V5.25z" fill="white"/>
            </svg>
          </div>
          <p className="text-white text-xs font-semibold tracking-wide">Inbound Call</p>
          <p className="text-white/40 text-[9px] mt-0.5">Vela AI answering · Live</p>
        </div>
        <div className="px-4 py-4 flex items-end justify-center gap-1" style={{ height: 52 }}>
          {[3, 7, 10, 6, 14, 9, 5, 12, 8, 4, 9, 6, 3].map((h, i) => (
            <div key={i} className="w-1 rounded-full"
              style={{ height: h * 2.5, background: i >= 4 && i <= 7 ? "linear-gradient(180deg,#FF6B35,#FF3366)" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>
        <div className="px-4 py-3 flex justify-center gap-3 border-t border-white/8">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white" opacity="0.5">
              <path d="M5 1v4l2.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#ef4444" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="2" y1="2" x2="8" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="8" y1="2" x2="2" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsitePanel() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-[#E5E7EB] flex flex-col">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F8FAFC] border-b border-[#E5E7EB] shrink-0">
        {["#FF6B35", "#FFB347", "#50E3C2"].map((c) => (
          <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
        ))}
        <div className="flex-1 mx-2 h-4 rounded-md bg-white border border-[#E5E7EB] flex items-center px-2">
          <div className="w-20 h-1.5 rounded-full bg-[#E5E7EB]" />
        </div>
      </div>
      {/* Page */}
      <div className="flex flex-col flex-1 bg-white overflow-hidden">
        {/* Nav */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#F1F5F9] shrink-0">
          <div className="w-14 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#FF6B35,#FF3366)" }} />
          <div className="flex items-center gap-2">
            <div className="w-8 h-1.5 rounded-full bg-[#E5E7EB]" />
            <div className="w-8 h-1.5 rounded-full bg-[#E5E7EB]" />
            <div className="w-16 h-5 rounded-full" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }} />
          </div>
        </div>
        {/* Hero */}
        <div className="flex items-center justify-center py-5 shrink-0" style={{ background: "linear-gradient(135deg,#fff 0%,#fff5f0 100%)" }}>
          <div className="text-center">
            <div className="w-36 h-3 rounded-full bg-[#111111]/70 mx-auto mb-2" />
            <div className="w-24 h-2 rounded-full bg-[#9CA3AF] mx-auto mb-3" />
            <div className="w-20 h-6 rounded-full mx-auto" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }} />
          </div>
        </div>
        {/* Services */}
        <div className="grid grid-cols-3 gap-2 p-3 flex-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] flex flex-col items-center justify-center gap-1.5 p-2">
              <div className="w-5 h-5 rounded-lg" style={{ background: "rgba(255,107,53,0.18)" }} />
              <div className="w-12 h-1.5 rounded-full bg-[#E5E7EB]" />
              <div className="w-8 h-1 rounded-full bg-[#F1F5F9]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadsPanel() {
  const cols = [
    { label: "New", color: "#6B7280", cards: [3, 2] },
    { label: "Qualified", color: "#FF6B35", cards: [2, 2.5] },
    { label: "Booked", color: "#22C55E", cards: [2, 1.5] },
  ];
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-[#E5E7EB] flex flex-col" style={{ background: "#F8FAFC" }}>
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#F1F5F9] shrink-0">
        <span className="text-[#111111] text-sm font-semibold">Leads & CRM</span>
        <div className="w-16 h-4 rounded-lg bg-[#F1F5F9]" />
      </div>
      <div className="flex gap-2 p-3 flex-1 overflow-hidden">
        {cols.map((col) => (
          <div key={col.label} className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.color }} />
              <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wide truncate">{col.label}</span>
            </div>
            {col.cards.map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-2.5 border border-[#E5E7EB] flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ background: col.color + "30", border: `1.5px solid ${col.color}50` }} />
                  <div className="w-10 h-1.5 rounded-full bg-[#F1F5F9]" />
                </div>
                <div className="w-full h-1 rounded-full bg-[#F1F5F9]" />
                <div className="w-3/4 h-1 rounded-full bg-[#F1F5F9]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  const bars = [38, 62, 52, 78, 68, 90, 72];
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-[#E5E7EB] flex flex-col" style={{ background: "#F8FAFC" }}>
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#F1F5F9] shrink-0">
        <span className="text-[#111111] text-sm font-semibold">Analytics</span>
        <span className="text-[9px] text-[#9CA3AF] font-medium bg-[#F1F5F9] px-2 py-1 rounded-full">Last 7 days</span>
      </div>
      <div className="flex flex-col gap-2.5 p-3 flex-1 overflow-hidden">
        <div className="grid grid-cols-2 gap-2">
          {["Conversations", "Leads", "Appointments", "Voice Calls"].map((label) => (
            <div key={label} className="bg-white rounded-xl p-2.5 border border-[#E5E7EB]">
              <p className="text-[8px] text-[#9CA3AF] font-semibold uppercase tracking-wide leading-none">{label}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-10 h-2 rounded-full bg-[#F1F5F9]" />
                <div className="w-6 h-2 rounded-full" style={{ background: "rgba(34,197,94,0.25)" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#E5E7EB] flex-1 flex flex-col">
          <p className="text-[8px] text-[#9CA3AF] font-semibold uppercase tracking-wide mb-2 shrink-0">Activity this week</p>
          <div className="flex items-end gap-1 flex-1">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: i === 5 ? "linear-gradient(180deg,#FF6B35,#FF3366)" : "#F1F5F9",
                }} />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 shrink-0">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <p key={i} className="flex-1 text-center text-[8px] text-[#9CA3AF]">{d}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Tab configuration
───────────────────────────────────────── */

const PANELS = [ConversationsPanel, VoicePanel, WebsitePanel, LeadsPanel, AnalyticsPanel];

const TABS = [
  {
    label: "Conversations",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M13.5 9.25a1.25 1.25 0 01-1.25 1.25H4.875L2.5 13V3.25a1.25 1.25 0 011.25-1.25h8.5a1.25 1.25 0 011.25 1.25v6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
    headline: "AI replies on every channel, 24/7",
    description: "One unified inbox. Vela handles Instagram DMs, WhatsApp messages, and website chat automatically — trained on your business, responding in your voice.",
    checklist: [
      "Instant replies on Instagram DMs",
      "WhatsApp messages handled automatically",
      "Website chat widget included",
      "Arabic + multilingual support",
      "Every lead captured from conversations",
    ],
  },
  {
    label: "Voice Agent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.5 4.5A1.5 1.5 0 014 3h.5a1 1 0 01.949.684l.8 2.4a1 1 0 01-.273 1.053L4.75 8.25a8.5 8.5 0 003 3l1.113-1.226a1 1 0 011.053-.274l2.4.8A1 1 0 0113 11.5V12a1.5 1.5 0 01-1.5 1.5C5.701 13.5 2.5 10.299 2.5 6.25V4.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    headline: "Your business answers every call",
    description: "A real AI voice agent that answers inbound calls, responds to questions, and books appointments — trained on your services, available around the clock.",
    checklist: [
      "Answers inbound calls in real time",
      "Trained on your business knowledge",
      "Books appointments directly over the phone",
      "Speaks multiple languages including Arabic",
      "Full call history and transcripts",
    ],
  },
  {
    label: "Website Builder",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M1 8h14M8 2.5C6.5 4.5 6.5 11.5 8 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    headline: "A real business website in minutes",
    description: "Describe your business. Vela builds a full, branded website — then publishes it with a live chat widget, your own domain, and automatic lead capture.",
    checklist: [
      "AI generates your site from a brief",
      "Supports 30+ business types and categories",
      "Custom domain connection",
      "Live chat widget built in",
      "Publish and update instantly",
    ],
  },
  {
    label: "Leads & CRM",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10.5 14v-1.5A2.5 2.5 0 008 10H4a2.5 2.5 0 00-2.5 2.5V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="6" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M14.5 14v-1.5A2.5 2.5 0 0012.5 10M11 3.1a2.5 2.5 0 010 4.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    headline: "Every lead, tracked automatically",
    description: "Every conversation that shows purchase intent becomes a lead — with source, channel, and contact info captured and ready to act on from one view.",
    checklist: [
      "Auto-captures leads from all channels",
      "Pipeline view with status tracking",
      "Lead source attribution by channel",
      "Appointment booking integration",
      "Filter, export, and follow up",
    ],
  },
  {
    label: "Analytics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.5 13V8.5M5.5 13V5.5M8.5 13V3M11.5 13V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    headline: "See exactly what's working",
    description: "A full-funnel view of your business: conversations handled, leads captured, appointments booked, and voice calls completed — across every channel.",
    checklist: [
      "Conversation and response metrics",
      "Lead volume and channel breakdown",
      "Appointment booking performance",
      "Voice call analytics",
      "Track trends across any time range",
    ],
  },
];

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */

export default function FeatureTabs() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];
  const Panel = PANELS[active];

  return (
    <section className="py-20 md:py-28 bg-[#FAFAFA] border-t border-[#F1F5F9]">
      <div className="max-w-7xl mx-auto px-5 md:px-6">

        {/* Section header */}
        <div className="text-center mb-10 md:mb-12">
          <span className="section-label inline-flex mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
            Platform
          </span>
          <h2 className="vela-heading text-[28px] sm:text-[36px] md:text-[42px] text-[#111111] leading-tight mt-3" style={{ textWrap: "balance" } as React.CSSProperties}>
            Everything your business needs,{" "}
            <span className="vela-gradient-text">in one AI system</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-4 max-w-xl mx-auto leading-relaxed">
            Replace disconnected tools with one platform trained on your business.
          </p>
        </div>

        {/* Tab pills */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 mb-10 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", justifyContent: "flex-start" }}
          role="tablist"
          aria-label="Feature tabs"
        >
          <div className="flex items-center gap-2 mx-auto">
            {TABS.map((t, i) => (
              <button
                key={t.label}
                role="tab"
                aria-selected={active === i}
                onClick={() => setActive(i)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  active === i
                    ? "text-white"
                    : "text-[#6B7280] bg-white border border-[#E5E7EB] hover:border-[#FF6B35]/40 hover:text-[#374151]"
                }`}
                style={
                  active === i
                    ? {
                        background: "linear-gradient(135deg,#FF6B35,#FF3366)",
                        boxShadow: "0 0 24px rgba(255,107,53,0.3)",
                      }
                    : {}
                }
              >
                <span className={active === i ? "text-white" : "text-[#9CA3AF]"}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: copy + checklist */}
          <div className="order-2 lg:order-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                {/* Icon badge */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[#FF6B35]"
                  style={{ background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.2)" }}
                >
                  {tab.icon}
                </div>

                <div>
                  <h3 className="text-[22px] md:text-[26px] font-bold text-[#111111] leading-tight" style={{ textWrap: "balance" } as React.CSSProperties}>
                    {tab.headline}
                  </h3>
                  <p className="text-[#6B7280] text-[15px] md:text-base mt-2.5 leading-relaxed">
                    {tab.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {tab.checklist.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(255,107,53,0.12)" }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5.5l2 2 5-4.5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span className="text-[#374151] text-[14px] md:text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: panel visual */}
          <div className="order-1 lg:order-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 16, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.99 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="aspect-[4/3] rounded-2xl overflow-hidden shadow-sm"
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}
              >
                <Panel />
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
