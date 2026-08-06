"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const PILLARS = [
  {
    title: "Always On",
    desc: "Handles every customer message 24/7 — on WhatsApp, Instagram, and your website. No breaks, no missed leads.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 7v4.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Every Language",
    desc: "Replies in your customer's language the moment they reach out — Arabic, English, French, and more, instantly.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 2c-2.5 3-4 5.5-4 9s1.5 6 4 9M11 2c2.5 3 4 5.5 4 9s-1.5 6-4 9M2 11h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Learns Fast",
    desc: "Train it with a single voice interview. It updates instantly and gets sharper every time you add new information.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 3l2.5 5.5 6 .8-4.4 4.2 1.1 6-5.2-2.8L5.8 19.5l1.1-6L2.5 9.3l6-.8L11 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function MascotSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#0F0804" }}
    >
      {/* Warm radial glow centred on mascot */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 42%, rgba(255,107,53,0.12) 0%, transparent 72%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-6 py-20 md:py-28 flex flex-col items-center text-center">

        {/* Eyebrow */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border border-white/15 text-white/55 mb-8"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" aria-hidden="true" />
          Meet Vela
        </motion.span>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="vela-heading text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] text-white leading-tight mb-4 max-w-2xl"
        >
          Your AI employee that{" "}
          <span className="vela-gradient-text">never clocks out.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="text-white/45 text-base md:text-lg max-w-md mb-14 leading-relaxed"
        >
          Built to handle every customer touchpoint so you can focus on running your business.
        </motion.p>

        {/* Mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-16"
        >
          {/* Ground glow disc */}
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
            aria-hidden="true"
            style={{
              width: "70%",
              height: "60px",
              background: "radial-gradient(ellipse at center, rgba(255,107,53,0.28) 0%, transparent 70%)",
              filter: "blur(12px)",
            }}
          />
          <Image
            src="/assets/mascot.png"
            alt="Vela AI assistant"
            width={460}
            height={460}
            className="object-contain relative z-10 w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px] lg:w-[460px] lg:h-[460px]"
            unoptimized
            priority={false}
          />
        </motion.div>

        {/* Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
              className="flex flex-col items-center gap-3 px-6 py-7 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="text-[#FF6B35]">{pillar.icon}</span>
              <span className="text-white font-semibold text-sm tracking-[0.06em] uppercase">
                {pillar.title}
              </span>
              <span className="text-white/40 text-sm leading-relaxed text-center">
                {pillar.desc}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom fade to white (FeatureTabs is bg-white) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent 0%, #ffffff 100%)" }}
      />
    </section>
  );
}
