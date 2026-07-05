"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const STEPS = [
  {
    num: "01",
    title: "Connect your channels",
    body: "Link Instagram, WhatsApp Business, and your website chat in minutes. No code. No developers. Just copy-paste.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4a10 10 0 0 1 8.66 5M14 4a10 10 0 0 0-8.66 5M14 4v5M14 24a10 10 0 0 1-8.66-5M14 24a10 10 0 0 0 8.66-5M14 24v-5M4 14h5M24 14h-5"
          stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    detail: ["Instagram DMs & comments", "WhatsApp Business API", "Website live chat widget"],
  },
  {
    num: "02",
    title: "Train your AI",
    body: "Paste your website URL. Upload a price list. Vela extracts your services, prices, hours, and booking rules automatically.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 6a5 5 0 0 1 5 5c0 2-.8 3.8-2 5l2.5 7h-11l2.5-7A5 5 0 0 1 9 11a5 5 0 0 1 5-5z"
          stroke="#FF6B35" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M11 20h6M12.5 14c.5.3 1 .5 1.5.5s1-.2 1.5-.5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    detail: ["Paste a URL — we extract everything", "Upload PDF price lists", "Or answer 5 quick questions"],
  },
  {
    num: "03",
    title: "Watch it grow",
    body: "Your AI replies, qualifies leads, and books appointments — while you focus on delivering great service.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M5 21l5-6 4 4 5-8 4 5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    detail: ["Zero missed messages", "Instant lead qualification", "Automatic appointment booking"],
  },
];

function Step({
  step,
  index,
  isLast,
}: {
  step: (typeof STEPS)[number];
  index: number;
  isLast: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="relative flex gap-6 md:gap-10">
      {/* Connector line */}
      {!isLast && (
        <div
          aria-hidden
          className="absolute top-14 bottom-0 hidden md:block"
          style={{ left: 27, width: 1, background: "rgba(255,255,255,0.05)" }}
        >
          <motion.div
            className="w-full"
            style={{ background: "linear-gradient(180deg,#FF6B35,#FF3366)", originY: 0 }}
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}

      {/* Circle icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: index * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="shrink-0"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(255,107,53,0.08)",
            border: "1px solid rgba(255,107,53,0.18)",
          }}
        >
          {step.icon}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: index * 0.15 + 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pb-12 md:pb-16 flex-1"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#FF6B35" }}>
          Step {step.num}
        </p>
        <h3
          className="text-white mb-3"
          style={{ fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          {step.title}
        </h3>
        <p className="text-sm md:text-base leading-relaxed mb-4 max-w-md" style={{ color: "rgba(255,255,255,0.45)" }}>
          {step.body}
        </p>
        <ul className="flex flex-col gap-2">
          {step.detail.map((d) => (
            <li key={d} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.48)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="rgba(255,107,53,0.4)" strokeWidth="1" />
                <path d="M3.5 6l1.8 1.8 3.2-3.2" stroke="#FF6B35" strokeWidth="1" strokeLinecap="round" />
              </svg>
              {d}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

export default function HowItWorks() {
  const headRef = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  return (
    <section
      id="how-it-works"
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ background: "#0A0908" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,107,53,0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
        {/* Header */}
        <motion.div
          ref={headRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 md:mb-20"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: "#FF6B35" }}>
            How it works
          </p>
          <h2
            className="text-white"
            style={{ fontSize: "clamp(32px, 4.5vw, 60px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 }}
          >
            Live in{" "}
            <span style={{ fontWeight: 200, color: "rgba(255,255,255,0.32)" }}>7 days.</span>
            <br />3 steps.
          </h2>
          <p className="mt-5 text-base md:text-lg max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
            No developers. No agencies. No complexity. Just plug in and let Vela handle the rest.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-2xl mx-auto">
          {STEPS.map((step, i) => (
            <Step key={step.num} step={step} index={i} isLast={i === STEPS.length - 1} />
          ))}
        </div>

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center mt-4"
        >
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-semibold text-green-400">
              You&apos;re live — AI handles every message from here
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
