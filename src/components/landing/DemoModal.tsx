"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const SLIDE_DURATION = 8000;
const TOTAL = 6;

interface Props {
  onClose: () => void;
}

const slideVariants = {
  enter:  { opacity: 0, scale: 0.96, filter: "blur(10px)" },
  center: { opacity: 1, scale: 1,    filter: "blur(0px)"  },
  exit:   { opacity: 0, scale: 1.03, filter: "blur(6px)"  },
};

const G = ({ children }: { children: React.ReactNode }) => (
  <span style={{ background: "var(--vela-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
    {children}
  </span>
);

/* ════════════════════════════════════════
   SLIDE 1 — The Problem
   ════════════════════════════════════════ */
function S1() {
  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.p
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-mono text-white/25 text-sm tracking-[0.2em] mb-8"
      >
        02:17 AM
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(36px, 6vw, 80px)", letterSpacing: "-0.04em" }}
      >
        A customer messages<br /><G>at 2AM.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        className="text-white/35 text-lg md:text-xl leading-relaxed mb-12 max-w-md"
      >
        While you sleep. While you&apos;re busy.<br />While you&apos;re living your life.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(37,211,102,0.18), transparent)", filter: "blur(24px)", transform: "scale(1.6)" }} />

        <div className="relative w-72 rounded-3xl overflow-hidden border border-white/10"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
          <div className="flex flex-col items-center py-5 border-b border-white/5">
            <p className="text-white/20 text-xs font-mono tracking-widest">WEDNESDAY</p>
            <p className="text-white/60 text-4xl font-thin mt-0.5">2:17</p>
          </div>

          <div className="p-3">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl p-4 border border-white/8"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#25D366" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.998 2C6.478 2 2 6.478 2 11.998c0 1.767.459 3.43 1.265 4.876L2 22l5.274-1.38A9.944 9.944 0 0011.998 22C17.52 22 22 17.522 22 11.998S17.52 2 11.998 2z" fillRule="evenodd" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">WhatsApp Business</p>
                  <p className="text-white/30 text-[10px]">now</p>
                </div>
                <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.8, delay: 1.2 }}
                  className="ml-auto w-2 h-2 rounded-full" style={{ background: "#25D366" }} />
              </div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25, duration: 0.4 }}
                className="text-white/70 text-sm leading-relaxed">
                <span className="text-white font-semibold">Sara Khalid:</span> Hi, how much is a dental cleaning? I want to book ASAP 🦷
              </motion.p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 2 — The Old Way
   ════════════════════════════════════════ */
function S2() {
  const channels = [
    { icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.5"/><circle cx="10" cy="10" r="3.5" stroke="white" strokeWidth="1.5"/><circle cx="14.5" cy="5.5" r="1" fill="white"/></svg>
    ), name: "Instagram", msgs: 7,  bg: "#E1306C" },
    { icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.998 2C6.478 2 2 6.478 2 11.998c0 1.767.459 3.43 1.265 4.876L2 22l5.274-1.38A9.944 9.944 0 0011.998 22C17.52 22 22 17.522 22 11.998S17.52 2 11.998 2z" fillRule="evenodd" clipRule="evenodd"/></svg>
    ), name: "WhatsApp", msgs: 12, bg: "#25D366" },
    { icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="11" rx="2" stroke="white" strokeWidth="1.5"/><path d="M7 17h6M10 13v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
    ), name: "Website",  msgs: 4,  bg: "#FF6B35" },
  ];

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.p
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-mono text-white/25 text-sm tracking-[0.2em] mb-8"
      >
        THE OLD WAY
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(36px, 6vw, 80px)", letterSpacing: "-0.04em" }}
      >
        3 apps.<br /><G>0 sleep.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        className="text-white/35 text-lg leading-relaxed mb-12 max-w-md"
      >
        Checking Instagram. Checking WhatsApp. Checking your website chat.<br />Repeating. Forever.
      </motion.p>

      <div className="flex items-end justify-center gap-4">
        {channels.map((ch, i) => (
          <motion.div
            key={ch.name}
            initial={{ opacity: 0, y: 40, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.65 + i * 0.14, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: ch.bg, boxShadow: `0 0 32px ${ch.bg}55` }}>
              {ch.icon}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.0 + i * 0.14, type: "spring", stiffness: 360, damping: 18 }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold border-2 border-[#07070A]"
                style={{ background: "#FF3366" }}>
                {ch.msgs}
              </motion.div>
            </div>
            <p className="text-white/30 text-xs font-medium">{ch.name}</p>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="mt-10 text-white/20 text-sm max-w-xs"
      >
        23 unanswered messages. 3 leads lost overnight.
      </motion.p>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 3 — Meet Vela
   ════════════════════════════════════════ */
function S3() {
  const features = ["Replies in seconds", "Books appointments", "Qualifies leads", "Never misses a message"];

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 relative"
      >
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute inset-0 rounded-3xl"
          style={{ background: "var(--vela-gradient)", filter: "blur(24px)", transform: "scale(1.4)" }}
        />
        <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center text-white font-black text-3xl tracking-tight"
          style={{ background: "var(--vela-gradient)", boxShadow: "0 0 48px rgba(255,107,53,0.5)" }}>
          V
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-4"
        style={{ fontSize: "clamp(36px, 6vw, 80px)", letterSpacing: "-0.04em" }}
      >
        Meet <G>Vela.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-white/50 text-xl md:text-2xl font-semibold mb-10"
      >
        One AI. Every channel. 24/7.
      </motion.p>

      <div className="flex flex-wrap justify-center gap-3">
        {features.map((f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full border"
            style={{ border: "1px solid rgba(255,107,53,0.25)", background: "var(--vp-08)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l2.5 2.5 5.5-5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-white/70 text-sm font-medium">{f}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.6 }}
        className="mt-10 flex items-center gap-3"
      >
        {[
          { icon: (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.5"/><circle cx="10" cy="10" r="3.5" stroke="white" strokeWidth="1.5"/><circle cx="14.5" cy="5.5" r="1" fill="white"/></svg>
          ), bg: "#E1306C" },
          { icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.998 2C6.478 2 2 6.478 2 11.998c0 1.767.459 3.43 1.265 4.876L2 22l5.274-1.38A9.944 9.944 0 0011.998 22C17.52 22 22 17.522 22 11.998S17.52 2 11.998 2z" fillRule="evenodd" clipRule="evenodd"/></svg>
          ), bg: "#25D366" },
          { icon: (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="11" rx="2" stroke="white" strokeWidth="1.5"/><path d="M7 17h6M10 13v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
          ), bg: "#FF6B35" },
        ].map((ch, i) => (
          <div key={i} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: ch.bg, boxShadow: `0 0 16px ${ch.bg}55` }}>
            {ch.icon}
          </div>
        ))}
        <span className="text-white/20 text-sm ml-1">All in one place</span>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 4 — Watch It Work (animated chat)
   ════════════════════════════════════════ */
function S4() {
  const [phase, setPhase] = useState<"typing" | "replied" | "booking">("typing");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("replied"),  2000);
    const t2 = setTimeout(() => setPhase("booking"),  4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 border border-[#FF6B35]/30"
        style={{ background: "var(--vp-10)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--vp-color)" }} />
        <span className="font-mono text-sm font-semibold" style={{ color: "#FF6B35" }}>Watch it work</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(36px, 6vw, 80px)", letterSpacing: "-0.04em" }}
      >
        Vela replies<br /><G>in 8 seconds.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        className="text-white/35 text-lg leading-relaxed mb-10 max-w-md"
      >
        Trained on your business. Speaks your language.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-72"
      >
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 70%, rgba(255,107,53,0.35), transparent)", filter: "blur(20px)", transform: "scale(1.5)" }}
        />
        <div className="relative rounded-3xl p-4 flex flex-col gap-3 border border-white/8"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="self-start rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] border border-white/8"
            style={{ background: "rgba(255,255,255,0.07)" }}>
            <p className="text-white/70 text-sm">How much is a dental cleaning? 🦷</p>
            <p className="text-white/20 text-[10px] mt-0.5">02:17</p>
          </div>

          <AnimatePresence mode="wait">
            {phase === "typing" && (
              <motion.div key="dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="self-end rounded-2xl rounded-tr-sm px-4 py-3 border border-[#FF6B35]/30"
                style={{ background: "var(--vp-15)" }}>
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </motion.div>
            )}
            {(phase === "replied" || phase === "booking") && (
              <motion.div key="reply" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="self-end rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[90%]"
                style={{ background: "var(--vela-gradient)" }}>
                <p className="text-white text-sm leading-relaxed">⚡ Hi Sara! Dental cleaning is AED 350 — 45 min. We have tomorrow at 11 AM or 3 PM. Which works?</p>
                <p className="text-white/50 text-[10px] mt-0.5 text-right">02:17 ✓✓</p>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "booking" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="self-start rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] border border-white/8"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <p className="text-white/70 text-sm">11 AM please! 🎉</p>
              <p className="text-white/20 text-[10px] mt-0.5">02:18</p>
            </motion.div>
          )}
          {phase === "booking" && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="self-end rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[90%]"
              style={{ background: "var(--vela-gradient)" }}>
              <p className="text-white text-sm leading-relaxed">✅ Booked! Sara Khalid · Thu 11:00 AM · Dental Cleaning. See you then!</p>
              <p className="text-white/50 text-[10px] mt-0.5 text-right">02:18 ✓✓</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 5 — The Dashboard
   ════════════════════════════════════════ */
function S5() {
  const stats = [
    { label: "Messages handled",  value: "1,284", trend: "+23%" },
    { label: "Appointments booked", value: "87",  trend: "+31%" },
    { label: "Leads captured",    value: "214",   trend: "+18%" },
    { label: "Response time",     value: "8s",    trend: "-64%" },
  ];

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.p
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-mono text-white/25 text-sm tracking-[0.2em] mb-8"
      >
        THE DASHBOARD
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(36px, 6vw, 80px)", letterSpacing: "-0.04em" }}
      >
        Your business.<br /><G>On autopilot.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        className="text-white/35 text-lg leading-relaxed mb-10 max-w-md"
      >
        Every message, every lead, every booking — tracked in one dashboard.
      </motion.p>

      {/* Mini dashboard mockup */}
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: "rgba(255,255,255,0.04)" }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
            {["#FF6B35", "#FFB347", "#50E3C2"].map((c) => (
              <div key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.5 }} />
            ))}
            <div className="flex-1 mx-3 h-3.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>

          <div className="p-3 grid grid-cols-2 gap-2">
            {stats.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.85 + i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl p-3 border border-white/6"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-white/25 text-[9px] font-semibold uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-white text-xl font-bold leading-none mb-0.5">{s.value}</p>
                <p className="text-[10px] font-semibold" style={{ color: "#34D399" }}>{s.trend} this month</p>
              </motion.div>
            ))}
          </div>

          {/* Mini bar chart */}
          <div className="px-3 pb-3">
            <div className="rounded-xl p-3 border border-white/6" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-white/25 text-[9px] font-semibold uppercase tracking-wide mb-2">Messages this week</p>
              <div className="flex items-end justify-between gap-1 h-12">
                {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
                  <motion.div key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 1.1 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 rounded-t-sm origin-bottom"
                    style={{ height: `${h}%`, background: i === 5 ? "linear-gradient(180deg,#FF6B35,#FF3366)" : "rgba(255,255,255,0.12)" }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <p key={i} className="flex-1 text-center text-[8px] text-white/15">{d}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 6 — Your Turn (CTA)
   ════════════════════════════════════════ */
function S6({ onCTA, onClose }: { onCTA: () => void; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 text-5xl"
      >
        🚀
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(36px, 6vw, 80px)", letterSpacing: "-0.04em" }}
      >
        It&apos;s your turn<br />to <G>grow faster.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        className="text-white/50 text-xl leading-relaxed mb-12 max-w-md"
      >
        Setup takes 5 minutes. No code. No contracts.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="flex flex-col sm:flex-row items-center gap-4"
      >
        <motion.button
          onClick={(e) => { e.stopPropagation(); onCTA(); }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white text-lg"
          style={{
            background: "var(--vela-gradient)",
            boxShadow: "0 0 60px rgba(255,107,53,0.45), 0 8px 32px rgba(255,51,102,0.3)",
          }}
        >
          Start Free Trial
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <motion.button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold text-white/60 text-base hover:text-white/90 transition-colors border border-white/10 hover:border-white/20"
        >
          Try the demo
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="mt-10 flex items-center gap-6 text-white/20 text-sm"
      >
        <span>✓ No credit card</span>
        <span>✓ 14-day free trial</span>
        <span>✓ Cancel anytime</span>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN MODAL
   ════════════════════════════════════════ */
export default function DemoModal({ onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const router = useRouter();

  const goNext = useCallback(() => setSlide(s => Math.min(s + 1, TOTAL - 1)), []);
  const goPrev = useCallback(() => setSlide(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft")                   { e.preventDefault(); goPrev(); }
      if (e.key === "Escape")                       onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    if (slide === TOTAL - 1) return;
    const t = setTimeout(goNext, SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [slide, goNext]);

  const handleCTA = () => {
    onClose();
    router.push("/auth/signup");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] overflow-hidden cursor-pointer"
      style={{ background: "#07070A" }}
      onClick={goNext}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 52%, rgba(255,107,53,0.07), transparent)" }} />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex h-[2px]">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} className="flex-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            {i < slide && <div className="h-full w-full" style={{ background: "var(--vp-color)" }} />}
            {i === slide && (
              <motion.div
                key={`p-${slide}`}
                className="h-full"
                style={{ background: "var(--vp-color)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: slide < TOTAL - 1 ? SLIDE_DURATION / 1000 : 0.3, ease: "linear" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--vp-color)" }} />
          <span className="font-mono text-white/20 text-xs tracking-widest">VELA</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          className="text-white/25 hover:text-white/70 text-sm font-medium px-3 py-1.5 rounded-xl transition-all hover:bg-white/8 cursor-pointer"
          style={{ backdropFilter: "blur(8px)" }}
        >
          Skip ✕
        </button>
      </div>

      {/* Slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center overflow-y-auto pt-20 pb-24"
          style={{ cursor: "default" }}
        >
          {slide === 0 && <S1 />}
          {slide === 1 && <S2 />}
          {slide === 2 && <S3 />}
          {slide === 3 && <S4 />}
          {slide === 4 && <S5 />}
          {slide === 5 && <S6 onCTA={handleCTA} onClose={onClose} />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-6 pb-8">
        <button
          onClick={e => { e.stopPropagation(); goPrev(); }}
          disabled={slide === 0}
          className="text-white/20 hover:text-white/60 text-2xl transition-colors disabled:opacity-0 cursor-pointer"
        >‹</button>
        <span className="text-white/25 text-xs font-mono tracking-widest">
          {slide + 1} <span className="text-white/10">of</span> {TOTAL}
        </span>
        <button
          onClick={e => { e.stopPropagation(); goNext(); }}
          disabled={slide === TOTAL - 1}
          className="text-white/20 hover:text-white/60 text-2xl transition-colors disabled:opacity-0 cursor-pointer"
        >›</button>
      </div>
    </motion.div>
  );
}
