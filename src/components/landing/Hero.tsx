"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import DemoModal from "@/components/landing/DemoModal";
import { useI18n } from "@/lib/i18n";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function ProductPreview({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative w-full">
      {/* Browser chrome wrapper */}
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex gap-1.5">
            {["#FF6058","#FFC12E","#27CA41"].map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="flex-1 mx-3 h-5 rounded-md flex items-center px-3 gap-2" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5a4 4 0 108 0 4 4 0 00-8 0zM7.5 7.5L9 9" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <div className="w-20 h-1.5 rounded-full bg-white/10" />
          </div>
        </div>

        {/* App shell */}
        <div className="flex" style={{ height: 320 }}>
          {/* Sidebar */}
          <div className="w-14 flex flex-col items-center py-4 gap-3 shrink-0 border-r border-white/8" style={{ background: "rgba(0,0,0,0.35)" }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--vela-gradient)" }}>V</div>
            {[
              <path key="a" d="M2.5 9a1 1 0 011-1h7a1 1 0 011 1v4H2.5V9z" stroke="currentColor" strokeWidth="1.3"/>,
              <path key="b" d="M2 9.5A1.5 1.5 0 013.5 8h1a1 1 0 01.95.684l.6 1.8a1 1 0 01-.273 1.054l-.65.585a7 7 0 002.857 2.857l.585-.65a1 1 0 011.054-.273l1.8.6A1 1 0 0112 14.5v1A1.5 1.5 0 0110.5 17" stroke="currentColor" strokeWidth="1.3" fill="none"/>,
              <><circle key="c1" cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.3"/><path key="c2" d="M1 11c0-2 2-3 6-3s6 1 6 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>,
              <path key="d" d="M2 12V8M4.5 12V5.5M7 12V3M9.5 12V6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>,
            ].map((icon, i) => (
              <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${i === 0 ? "text-[#FF6B35]" : "text-white/25 hover:text-white/50"}`} style={i === 0 ? { background: "rgba(255,107,53,0.15)" } : {}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">{icon}</svg>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Topbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 shrink-0">
              <div>
                <p className="text-white text-[11px] font-semibold">Conversations</p>
                <p className="text-white/30 text-[9px]">3 active threads</p>
              </div>
              <div className="flex gap-1.5">
                {["IG","WA","Web"].map(l => (
                  <span key={l} className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Conversation list + chat */}
            <div className="flex flex-1 overflow-hidden">
              {/* Thread list */}
              <div className="w-32 flex flex-col border-r border-white/8 shrink-0">
                {[
                  { name: "Layla M.", ch: "#E1306C", msg: "Book appt...", active: true },
                  { name: "Omar K.", ch: "#25D366", msg: "What are yo...", active: false },
                  { name: "Site visitor", ch: "#FF6B35", msg: "Hi! I want...", active: false },
                ].map((c, i) => (
                  <div key={i} className={`px-3 py-2.5 border-b border-white/5 flex items-start gap-2 ${c.active ? "bg-white/6" : ""}`}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-[8px] font-bold mt-0.5" style={{ background: c.ch }}>
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-semibold text-white/80 truncate">{c.name}</p>
                      <p className="text-[8px] text-white/30 truncate mt-0.5">{c.msg}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat area */}
              <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden justify-end">
                {[
                  { role: "user", text: "Hi! I want to book an appointment 📅" },
                  { role: "ai",   text: "Hey! What service are you looking for?" },
                  { role: "user", text: "Dental cleaning please" },
                  { role: "ai",   text: "How does Tuesday at 3 PM sound?" },
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] px-2.5 py-1.5 rounded-xl text-[9px] leading-relaxed"
                      style={m.role === "user"
                        ? { background: "var(--vela-gradient)", color: "white" }
                        : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.08)" }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {/* Typing indicator */}
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {[0,1,2].map(i => (
                      <motion.span
                        key={i}
                        className="block w-1 h-1 rounded-full bg-white/40"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Play overlay badge */}
      <button
        onClick={onClick}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2.5 rounded-full font-semibold text-xs text-white transition-transform duration-200 hover:scale-105"
        style={{ background: "var(--vela-gradient)", boxShadow: "0 8px 32px var(--vp-40)" }}
        aria-label="Watch 60-second product demo"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" fill="rgba(255,255,255,0.2)"/>
          <path d="M5.5 4.8l4 2.2-4 2.2V4.8z" fill="white"/>
        </svg>
        Watch 60-second demo
      </button>

      {/* Ambient glow */}
      <div className="absolute inset-x-10 -bottom-6 h-10 rounded-full blur-2xl pointer-events-none" style={{ background: "linear-gradient(135deg,var(--vp-30),var(--va-color))", opacity: 0.35 }} />
    </div>
  );
}

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <section
        className="relative min-h-screen flex items-center pt-24 pb-20 md:pt-0 md:pb-0 md:h-screen overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1A0800 0%, #2C1005 40%, #FF6B35 100%)" }}
      >
        {/* Hero background image */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Image
            src="/assets/hero-bg.png"
            alt=""
            fill
            className="object-cover"
            priority
            unoptimized
          />
          {/* Dark overlay for text contrast */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(15,6,0,0.72) 0%, rgba(20,8,0,0.55) 50%, rgba(40,12,0,0.30) 100%)" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Left: copy ── */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-5 md:gap-6 items-center text-center lg:items-start lg:text-left"
            >
              {/* Badge */}
              <motion.div variants={item}>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border border-white/20 text-white/70" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                  {t("landing.hero.badge")}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={item}
                className="vela-heading text-[36px] sm:text-[48px] md:text-[56px] lg:text-[68px] leading-none text-white"
              >
                {t("landing.hero.headline1")}
                <br />
                <span className="vela-gradient-text">{t("landing.hero.headline2")}</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                variants={item}
                className="text-white/65 text-base md:text-lg leading-relaxed max-w-[440px] mx-auto lg:mx-0"
              >
                {t("landing.hero.subtext")}
              </motion.p>

              {/* Buttons */}
              <motion.div variants={item} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link href="/auth/signup" className="btn-primary text-base px-8 py-3.5 justify-center">
                  {t("landing.nav.getStarted")}
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 text-base px-8 py-3.5 rounded-xl font-semibold border border-white/20 text-white/80 hover:border-white/50 hover:text-white transition-all duration-200 justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6 5.2l4.5 2.3L6 9.8V5.2z" fill="currentColor" />
                  </svg>
                  {t("landing.nav.tryDemo")}
                </Link>
              </motion.div>

              {/* Trust row */}
              <motion.div variants={item} className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {[t("landing.hero.trust1"), t("landing.hero.trust2")].map((label) => (
                  <span key={label} className="flex items-center gap-2 text-sm text-white/50">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--vp-color)" }}>
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {label}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* ── Right: product preview — desktop only ── */}
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="hidden lg:flex items-center justify-center pb-4"
            >
              <ProductPreview onClick={() => setDemoOpen(true)} />
            </motion.div>

          </div>
        </div>
      </section>

      {/* Demo modal */}
      <AnimatePresence>
        {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
