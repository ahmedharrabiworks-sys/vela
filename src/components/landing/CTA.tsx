"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative py-24 md:py-36 overflow-hidden"
      style={{ background: "#0A0908" }}
    >
      {/* Separator */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)" }}
      />

      {/* Massive gradient explosion — the cinematic engulf */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(255,107,53,0.18) 0%, rgba(255,51,102,0.12) 35%, transparent 70%)",
        }}
      />

      {/* Secondary glow pulse */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,107,53,0.10) 0%, transparent 70%)",
        }}
      />

      {/* Film grain on the CTA */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-5 md:px-8 text-center">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <span
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full mb-8 inline-block"
            style={{ background: "rgba(255,107,53,0.1)", color: "#FF6B35", border: "1px solid rgba(255,107,53,0.22)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
            Get started
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.18, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="text-white"
          style={{
            fontSize: "clamp(36px,6vw,86px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Your business{" "}
          <span style={{ fontWeight: 200, color: "rgba(255,255,255,0.32)" }}>never</span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#FF6B35,#FF3366)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            sleeps anymore.
          </span>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.32, duration: 0.6 }}
          className="mt-6 text-base md:text-xl max-w-lg mx-auto"
          style={{ color: "rgba(255,255,255,0.42)" }}
        >
          Start free. Be live in 7 days. No code. No contracts. No excuses.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.44, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mt-10"
        >
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl font-bold text-white text-base transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(135deg,#FF6B35,#FF3366)",
              boxShadow: "0 0 60px rgba(255,107,53,0.4), 0 8px 32px rgba(255,51,102,0.25)",
              minHeight: 56,
            }}
          >
            Start Free Trial
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.5 9h11M10 5l4.5 4-4.5 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl font-semibold text-sm transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.65)",
              minHeight: 56,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5.5 4.8l4 2.2-4 2.2V4.8z" fill="currentColor" />
            </svg>
            Try the demo
          </Link>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          {["No credit card required", "14-day free trial", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-2 text-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="rgba(255,107,53,0.4)" strokeWidth="1" />
                <path d="M4 7l2 2 4-4" stroke="#FF6B35" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              {t}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
