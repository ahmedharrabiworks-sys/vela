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

function VideoPlaceholder({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative w-full max-w-[500px]">
      <button
        onClick={onClick}
        className="group relative w-full rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-2"
        style={{ aspectRatio: "16/9" }}
        aria-label="Watch 60-second product demo"
      >
        {/* Background */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg,#0c0f1a 0%,#141929 65%,#0f1520 100%)" }} />

        {/* Abstract dashboard shapes */}
        <div className="absolute inset-0 p-5 flex flex-col gap-3" style={{ opacity: 0.18 }}>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 h-2 rounded-full bg-white" />
            <div className="ml-auto flex gap-1.5">
              <div className="w-8 h-2 rounded-full bg-white" />
              <div className="w-8 h-2 rounded-full bg-white" />
              <div className="w-16 h-2 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex gap-3 flex-1 min-h-0">
            <div className="w-1/4 flex flex-col gap-2">
              {[80, 100, 65, 90, 55].map((w, i) => (
                <div key={i} className="h-1.5 rounded-full bg-white" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="grid grid-cols-3 gap-2 shrink-0">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-xl border border-white/20" style={{ background: "rgba(255,255,255,0.12)" }} />
                ))}
              </div>
              <div className="flex-1 rounded-xl border border-white/10" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          </div>
        </div>

        {/* Vignette overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 65% at 50% 50%,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.72) 100%)" }} />
        {/* Brand glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 45% at 50% 50%,var(--vp-10),transparent)" }} />

        {/* Play button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            style={{ background: "var(--vela-gradient)", boxShadow: "0 0 48px var(--vp-50),0 0 96px var(--vp-20)" }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 4.5l10 5.5-10 5.5V4.5z" fill="white" />
            </svg>
          </div>
          <span className="text-white/50 text-sm font-medium tracking-wide">60-second product demo</span>
        </div>

        {/* Border */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
      </button>

      {/* Glow shadow below */}
      <div
        className="absolute inset-x-10 -bottom-4 h-8 rounded-full blur-xl pointer-events-none"
        style={{ background: "linear-gradient(135deg,var(--vp-30),var(--va-color))", opacity: 0.4 }}
      />
    </div>
  );
}

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <section className="relative min-h-screen flex items-center pt-24 pb-16 md:pt-0 md:pb-0 md:h-screen overflow-hidden">

        {/* Subtle grid texture over the global body::before gradient */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="landing-grid" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* ── Left: copy ── */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-5 md:gap-6 items-center text-center lg:items-start lg:text-left"
            >
              {/* Badge */}
              <motion.div variants={item}>
                <span className="section-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                  {t("landing.hero.badge")}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={item}
                className="vela-heading text-[36px] sm:text-[48px] md:text-[56px] lg:text-[68px] leading-none text-[#111111]"
              >
                {t("landing.hero.headline1")}
                <br />
                <span className="vela-gradient-text">{t("landing.hero.headline2")}</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                variants={item}
                className="text-[#6B7280] text-base md:text-lg leading-relaxed max-w-[440px] mx-auto lg:mx-0"
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
                  className="inline-flex items-center gap-2 text-base px-8 py-3.5 rounded-xl font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200 justify-center"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6 5.2l4.5 2.3L6 9.8V5.2z" fill="currentColor" />
                  </svg>
                  {t("landing.nav.tryDemo")}
                </Link>
              </motion.div>
              <motion.div variants={item}>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="text-sm font-medium text-[#6B7280] hover:text-[#374151] transition-colors underline underline-offset-4"
                >
                  {t("landing.hero.watchPreview")}
                </button>
              </motion.div>

              {/* Trust row */}
              <motion.div variants={item} className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {[t("landing.hero.trust1"), t("landing.hero.trust2")].map((label) => (
                  <span key={label} className="flex items-center gap-2 text-sm text-[#6B7280]">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--vp-color)" }}>
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {label}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* ── Right: video placeholder — desktop only ── */}
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="hidden lg:flex items-center justify-center"
            >
              <VideoPlaceholder onClick={() => setDemoOpen(true)} />
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
