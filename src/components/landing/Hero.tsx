"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <section
        className="relative min-h-[85vh] flex items-center py-32 overflow-hidden"
        style={{
          background: "#1A0800",
          backgroundImage: "url('/assets/hero-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay — keeps text readable while letting the real image show through */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ background: "linear-gradient(160deg, rgba(10,3,0,0.52) 0%, rgba(15,5,0,0.32) 50%, rgba(25,8,0,0.12) 100%)" }}
        />

        {/* ── Content ── */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6">
          <div className="max-w-3xl">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-5 md:gap-6 items-center text-center md:items-start md:text-left"
            >
              {/* Badge */}
              <motion.div variants={item}>
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border border-white/20 text-white/70"
                  style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                  {t("landing.hero.badge")}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={item}
                className="vela-heading text-[40px] sm:text-[52px] md:text-[60px] lg:text-[72px] leading-none text-white"
              >
                {t("landing.hero.headline1")}
                <br />
                <span className="vela-gradient-text">{t("landing.hero.headline2")}</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                variants={item}
                className="text-white/65 text-base md:text-lg leading-relaxed max-w-[500px] mx-auto md:mx-0"
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
                <button
                  onClick={() => setDemoOpen(true)}
                  className="inline-flex items-center gap-2 text-base px-8 py-3.5 rounded-xl font-semibold border border-white/20 text-white/80 hover:border-white/50 hover:text-white transition-all duration-200 justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6 5.2l4.5 2.3L6 9.8V5.2z" fill="currentColor" />
                  </svg>
                  {t("landing.nav.tryDemo")}
                </button>
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
