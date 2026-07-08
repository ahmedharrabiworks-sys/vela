"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: number;
  role: "user" | "ai";
  text: string;
  time: string;
  isStatus?: boolean;
};

const CONVERSATION: Message[] = [
  { id: 1, role: "user",  text: "Hi! I want to book an appointment 📅", time: "10:41" },
  { id: 2, role: "ai",   text: "Hey! What service are you looking for?", time: "10:41" },
  { id: 3, role: "user",  text: "Dental cleaning please", time: "10:42" },
  { id: 4, role: "ai",   text: "How does Tuesday at 3:00 PM sound?", time: "10:42" },
  { id: 5, role: "user",  text: "That works for me!", time: "10:43" },
  { id: 6, role: "ai",   text: "Booked for Tuesday 3:00 PM ✓", time: "10:43", isStatus: true },
];

// ms after sequence start when each message becomes visible
const SHOW_AT  = [700, 1700, 3000, 4100, 5400, 6500];
// ms before an AI message when the typing indicator shows
const TYPING_BEFORE = 900;
const LOOP_AFTER = SHOW_AT[SHOW_AT.length - 1] + 3500;

function TypingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex self-start"
    >
      <div
        className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-white/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.65, delay: i * 0.14, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function PhoneMockup() {
  const [visible, setVisible] = useState<Message[]>([]);
  const [typing, setTyping]   = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    function run() {
      setVisible([]);
      setTyping(false);

      CONVERSATION.forEach((msg, i) => {
        if (msg.role === "ai") {
          timers.push(setTimeout(() => setTyping(true),  SHOW_AT[i] - TYPING_BEFORE));
        }
        timers.push(
          setTimeout(() => {
            setTyping(false);
            setVisible((prev) => [...prev, msg]);
          }, SHOW_AT[i])
        );
      });

      timers.push(setTimeout(run, LOOP_AFTER));
    }

    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  // Phone dimensions — compact enough for 1080p hero
  const W = 232;   // phone width  px
  const H = 472;   // phone height px

  return (
    // Outer wrapper: needs explicit size so absolute badges are predictably positioned
    <div className="relative select-none" style={{ width: W, height: H }}>

      {/* Ambient glow */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-25"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, #FF6B35 0%, #FF3366 45%, transparent 70%)",
          transform: "scale(1.4)",
        }}
      />

      {/* ── Phone shell ── */}
      <div
        className="relative flex flex-col overflow-hidden border border-white/10"
        style={{
          width: W,
          height: H,
          borderRadius: 36,
          background: "linear-gradient(160deg,#1c1c1e 0%,#111 100%)",
          boxShadow:
            "0 32px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Side buttons (decorative) */}
        <div className="absolute -right-px top-24 w-0.5 h-10 bg-white/10 rounded-l" />
        <div className="absolute -left-px top-20 w-0.5 h-7 bg-white/10 rounded-r" />
        <div className="absolute -left-px top-32 w-0.5 h-7 bg-white/10 rounded-r" />

        {/* Dynamic island */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-20 h-6 rounded-full bg-black flex items-center justify-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] border border-white/5" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#1c1c1e]" />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pb-1 shrink-0">
          <span className="text-[10px] font-semibold text-white/70">10:43</span>
          <div className="flex items-center gap-1.5">
            {/* Signal bars */}
            <svg width="14" height="10" viewBox="0 0 14 10" fill="rgba(255,255,255,0.7)">
              <rect x="0" y="4" width="2.5" height="6" rx="0.5" />
              <rect x="3.5" y="2.5" width="2.5" height="7.5" rx="0.5" />
              <rect x="7" y="1" width="2.5" height="9" rx="0.5" />
              <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" />
            </svg>
            {/* Battery */}
            <div className="flex items-center gap-0.5">
              <div className="w-5 h-2.5 rounded-sm border border-white/40 flex items-center px-0.5">
                <div className="h-full w-4/5 rounded-[1px] bg-white/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5 shrink-0">
          <div className="relative shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "var(--vela-gradient)" }}
            >
              V
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#111]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[12px] font-semibold leading-none">Vela AI</p>
            <p className="text-[9px] mt-0.5" style={{ color: typing ? "#FF6B35" : "rgba(255,255,255,0.4)" }}>
              {typing ? "typing..." : "Online · replies instantly"}
            </p>
          </div>
        </div>

        {/* ── Messages ── takes remaining height */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden px-3 py-2 gap-1.5">
          <AnimatePresence initial={false}>
            {visible.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.isStatus ? (
                  <div
                    className="flex items-center gap-2 px-3.5 py-2 rounded-2xl"
                    style={{ background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.28)" }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.1 }}
                      className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l1.8 1.8 3.2-3.2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                    <span className="text-green-400 text-[11px] font-semibold">{msg.text}</span>
                  </div>
                ) : (
                  <div
                    className="max-w-[80%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed"
                    style={
                      msg.role === "user"
                        ? { background: "var(--vela-gradient)", color: "white", borderBottomRightRadius: 4 }
                        : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.88)", borderBottomLeftRadius: 4 }
                    }
                  >
                    <p>{msg.text}</p>
                    <p className="text-[8px] mt-0.5 opacity-50 text-right">{msg.time}</p>
                  </div>
                )}
              </motion.div>
            ))}
            {typing && <TypingDots key="typing" />}
          </AnimatePresence>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-white/5 shrink-0">
          <div
            className="flex-1 h-8 rounded-full flex items-center px-3 text-[10px] text-white/25"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            Message...
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--vela-gradient)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 2.5l3.5 3.5L7 9.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Floating badge: top-right, overlaps phone edge ── */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.45, ease: "easeOut" }}
        className="absolute flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 border border-white/10"
        style={{
          top: 56,
          right: -148,          /* hangs off the right edge of the phone */
          background: "rgba(26,10,0,0.88)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--vp-15)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 11V6.5M4.5 11V4M7 11V2M9.5 11V5.5" stroke="#FF6B35" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-[9px] text-white/45 font-medium">Avg. reply time</p>
          <p className="text-[13px] font-extrabold text-white leading-tight">48 seconds</p>
        </div>
      </motion.div>

      {/* ── Floating badge: bottom-left, overlaps phone edge ── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.3, duration: 0.45, ease: "easeOut" }}
        className="absolute flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 border border-white/10"
        style={{
          bottom: 64,
          left: -148,           /* hangs off the left edge of the phone */
          background: "rgba(26,10,0,0.88)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.12)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3 3 6-6" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-[9px] text-white/45 font-medium">Booked today</p>
          <p className="text-[13px] font-extrabold text-white leading-tight">8 appointments</p>
        </div>
      </motion.div>
    </div>
  );
}
