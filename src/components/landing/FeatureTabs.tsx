"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────
   Conversation script
───────────────────────────────────────── */

type ChatMsg = {
  role: "vela" | "user";
  text: string;
  at: number; // ms after loop start
};

const MSGS: ChatMsg[] = [
  { role: "vela", at:  900, text: "Hi! I'm Vela, your AI business assistant. How can I help you? 👋" },
  { role: "user", at: 2300, text: "I'd like to book a dental cleaning" },
  { role: "vela", at: 3600, text: "Happy to help! What's your name?" },
  { role: "user", at: 5000, text: "Sarah Johnson" },
  { role: "vela", at: 6200, text: "Got it, Sarah! Your phone number?" },
  { role: "user", at: 7600, text: "(555) 012-3456" },
  { role: "vela", at: 8700, text: "What date works best for you?" },
  { role: "user", at: 10100, text: "Tuesday afternoon please" },
  { role: "vela", at: 11200, text: "I have Tuesday at 3:00 PM — shall I confirm?" },
  { role: "user", at: 12600, text: "Yes, perfect!" },
];

const CONFIRM_AT = 13800;
const LOOP_AT    = 18500;

/* ─────────────────────────────────────────
   Animated chat showcase
───────────────────────────────────────── */

function VelaShowcase() {
  const [shown, setShown]     = useState<ChatMsg[]>([]);
  const [typing, setTyping]   = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setShown([]);
      setTyping(false);
      setConfirmed(false);

      MSGS.forEach((msg, i) => {
        if (msg.role === "vela") {
          timers.push(setTimeout(() => setTyping(true), msg.at - 900));
        }
        timers.push(setTimeout(() => {
          setTyping(false);
          setShown(prev => [...prev, msg]);
        }, msg.at));
      });

      timers.push(setTimeout(() => setConfirmed(true),  CONFIRM_AT));
      timers.push(setTimeout(run,                        LOOP_AT));
    }

    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "#fff",
        border: "1.5px solid #E5E7EB",
        boxShadow: "0 16px 56px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        height: 520,
      }}
    >
      {/* ── App header with real logo ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F1F5F9] shrink-0" style={{ background: "#FAFAFA" }}>
        <Image src="/logo.png" alt="Vela" height={22} width={66} className="object-contain" unoptimized priority />
        <div className="w-px h-4 bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-[#6B7280] font-medium">AI Assistant · Online</span>
        </div>
        <div className="ml-auto flex gap-1">
          {["IG","WA","Web"].map(l => (
            <span key={l} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#6B7280] font-semibold border border-[#E5E7EB]">{l}</span>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end px-4 py-3 gap-2" style={{ background: "#F8FAFC" }}>
        <AnimatePresence initial={false}>
          {shown.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "vela" && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5"
                  style={{ background: "var(--vela-gradient)" }}
                >
                  V
                </div>
              )}
              <div
                className="max-w-[72%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "var(--vela-gradient)", color: "white", borderBottomRightRadius: 4 }
                    : { background: "white", color: "#374151", border: "1px solid #E5E7EB", borderBottomLeftRadius: 4 }
                }
              >
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-end gap-2"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: "var(--vela-gradient)" }}>V</div>
              <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-[#E5E7EB]">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="block w-1.5 h-1.5 rounded-full bg-[#94A3B8]"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.65, delay: i * 0.14, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Confirmation card with mascot ── */}
          {confirmed && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.88, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mx-2 rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg,#052e16 0%,#14532d 100%)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5.5l2 2 5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-green-300 text-[11px] font-bold uppercase tracking-wide">Appointment Confirmed!</p>
                  </div>
                  <p className="text-white text-sm font-semibold">Sarah Johnson</p>
                  <p className="text-white/60 text-xs mt-0.5">Dental Cleaning · Tuesday, 3:00 PM</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <rect x="1" y="2" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M3.5 1v2M7.5 1v2M1 5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-white/40 text-[10px]">Booked via Vela AI · Reminder sent</span>
                  </div>
                </div>
                {/* Mascot appears on confirmation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Image
                    src="/assets/mascot.png"
                    alt="Vela"
                    width={56}
                    height={56}
                    className="object-contain drop-shadow-lg"
                    unoptimized
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input bar (decorative) ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#F1F5F9] bg-white shrink-0">
        <div className="flex-1 h-9 rounded-full flex items-center px-4 text-xs text-[#9CA3AF]" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
          Message...
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--vela-gradient)" }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 6.5h10M7.5 2.5l4 4-4 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Feature highlight cards
───────────────────────────────────────── */

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.5 15V4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0115 4v6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    title: "AI replies 24/7",
    desc: "Instagram, WhatsApp & website — all handled automatically.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 5.5A2.5 2.5 0 015.5 3h.5a1 1 0 01.95.684l.9 2.7a1 1 0 01-.273 1.054l-.9.9A9 9 0 009.66 11.32l.9-.9a1 1 0 011.054-.273l2.7.9A1 1 0 0115 12.01V12.5A2.5 2.5 0 0112.5 15C7.253 15 3 10.747 3 5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Voice phone agent",
    desc: "Answers inbound calls, qualifies leads, books appointments.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 9h15M9 2.5C7.2 4.7 7.2 13.3 9 15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    title: "AI website builder",
    desc: "Full branded site in minutes, with live chat built in.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M12 16v-1.5A3 3 0 009 11.5H5a3 3 0 00-3 3V16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M16 16v-1.5A3 3 0 0014 11.7M13 3.1a3 3 0 010 5.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    title: "Leads & CRM",
    desc: "Every customer captured, tracked and ready to follow up.",
  },
];

/* ─────────────────────────────────────────
   Main export
───────────────────────────────────────── */

export default function FeatureTabs() {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-6">

        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="section-label mb-4">
            How It Works
          </span>
          <h2
            className="vela-heading text-[28px] sm:text-[36px] md:text-[44px] text-[#111111] leading-tight mt-3"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Watch Vela handle a booking{" "}
            <span className="vela-gradient-text">from first message to confirmed</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-4 max-w-lg mx-auto leading-relaxed">
            A customer messages. Vela replies, collects their details, and confirms their appointment — no human needed.
          </p>
        </div>

        {/* Two-column: copy left, live demo right */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* Left: feature highlights */}
          <div className="flex flex-col gap-6 lg:pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col gap-3 p-5 rounded-2xl border border-[#F1F5F9]"
                  style={{ background: "#FAFAFA" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--vp-10)", color: "var(--vp-color)", border: "1px solid var(--vp-15)" }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#111111] leading-tight">{f.title}</p>
                    <p className="text-[13px] text-[#6B7280] mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Channel badges */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[#9CA3AF] font-medium mr-1">Works on:</span>
              {[
                { label: "Instagram DMs", color: "#E1306C" },
                { label: "WhatsApp",      color: "#25D366" },
                { label: "Website chat",  color: "#FF6B35" },
                { label: "Phone calls",   color: "#6B7280" },
              ].map((ch) => (
                <span key={ch.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-[#E5E7EB] text-[#374151]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ch.color }} />
                  {ch.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: live animated showcase */}
          <div>
            <VelaShowcase />
          </div>

        </div>
      </div>
    </section>
  );
}
