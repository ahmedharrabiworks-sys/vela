"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
  const { t } = useI18n();

  return (
    <section
      id="hero-section"
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        background: "#1A0800",
        backgroundImage: "url('/assets/hero-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Darkening overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, rgba(10,3,0,0.55) 0%, rgba(10,3,0,0.22) 65%, transparent 94%)" }}
      />
      {/* White fade at the bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        aria-hidden="true"
        style={{ height: "80px", background: "linear-gradient(to bottom, transparent 0%, #ffffff 100%)" }}
      />

      {/* ── In-hero nav — scrolls away with the Hero naturally ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6 pt-10 flex items-center justify-between shrink-0">
        {/* Plain <img> — no Next.js Image layout constraints.
            !important on height/width overrides Tailwind preflight's img{height:auto}.
            48px mobile / 72px desktop makes logo visually dominant over the nav buttons. */}
        <Link href="/" aria-label="Vela home" className="group shrink-0">
          <img
            src="/logo-light.png"
            alt="Vela"
            className="block !h-12 sm:!h-[72px] !w-auto transition-opacity duration-200 group-hover:opacity-85"
            style={{ flexShrink: 0 }}
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-base font-semibold text-white hover:text-white/80 px-5 py-3 rounded-lg transition-colors duration-200"
          >
            Log in
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm px-6 py-2.5 justify-center">
            {t("landing.nav.getStarted")}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6 py-16 flex-1 flex items-center">
        <div className="max-w-3xl md:mt-8">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5 md:gap-6 items-center text-center md:items-start md:text-left"
          >
            {/* Badge */}
            <motion.div variants={item}>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border border-white/20 text-white"
                style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                {t("landing.hero.badge")}
              </span>
            </motion.div>

            {/* Headline — plain white, no gradient, no decorative treatment */}
            <motion.h1
              variants={item}
              className="font-inter font-bold text-[32px] sm:text-[40px] md:text-[48px] leading-tight text-white"
            >
              {t("landing.hero.headline1")}
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={item}
              className="text-white text-base md:text-lg leading-relaxed max-w-[500px] mx-auto md:mx-0"
            >
              {t("landing.hero.subtext")}
            </motion.p>

            {/* CTA */}
            <motion.div variants={item}>
              <Link href="/auth/signup" className="btn-primary text-base px-8 py-3.5 justify-center inline-flex items-center gap-2">
                {t("landing.nav.getStarted")}
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
