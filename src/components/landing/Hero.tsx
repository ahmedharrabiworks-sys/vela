"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PhoneMockup from "@/components/landing/PhoneMockup";
import DemoModal from "@/components/landing/DemoModal";

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

  return (
    <>
      {/*
       * No overflow-hidden on the section — floating phone badges extend outside
       * the phone frame and must not be clipped. Background effects are clipped
       * in their own absolutely-positioned inner container.
       */}
      <section className="relative min-h-screen flex items-center bg-[#1A0A00] pt-24 pb-16 md:pt-0 md:pb-0 md:h-screen">

        {/* Background — clipped independently */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-5%,rgba(255,107,53,0.22),transparent)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(#FF6B35 1px,transparent 1px),linear-gradient(90deg,#FF6B35 1px,transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* ── Left: copy ── */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-5 md:gap-6"
            >
              {/* Badge */}
              <motion.div variants={item}>
                <span className="section-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                  AI Business Operating System
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={item}
                className="vela-heading text-[36px] sm:text-[48px] md:text-[56px] lg:text-[68px] leading-none text-white"
              >
                Never miss
                <br />
                <span className="vela-gradient-text">another lead.</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                variants={item}
                className="text-white/60 text-base md:text-lg leading-relaxed max-w-[440px]"
              >
                Vela runs your customer communications 24/7. AI replies,
                qualifies, and books appointments — on Instagram, WhatsApp,
                and your website.
              </motion.p>

              {/* Buttons */}
              <motion.div variants={item} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link href="/auth/signup" className="btn-primary text-base px-8 py-3.5 justify-center">
                  Get Started
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link href="/demo" className="btn-ghost text-base px-8 py-3.5 justify-center">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6 5.2l4.5 2.3L6 9.8V5.2z" fill="currentColor" />
                  </svg>
                  Try Demo
                </Link>
              </motion.div>
              <motion.div variants={item}>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="text-sm font-medium text-white/45 hover:text-white/75 transition-colors underline underline-offset-4"
                >
                  Or watch a 60s preview
                </button>
              </motion.div>

              {/* Trust row */}
              <motion.div variants={item} className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {["< 60s reply time", "Works 24/7"].map((label) => (
                  <span key={label} className="flex items-center gap-2 text-sm text-white/45">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="#FF6B35" strokeWidth="1.2" />
                      <path d="M4.5 7l2 2 3-3" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {label}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* ── Right: phone mockup — desktop only ── */}
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="hidden lg:flex items-center justify-end overflow-visible"
            >
              <PhoneMockup />
            </motion.div>

          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* Demo modal */}
      <AnimatePresence>
        {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
