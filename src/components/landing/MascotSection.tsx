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
    <section className="py-20 md:py-28 section-tint relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-5 md:px-6 flex flex-col items-center text-center">

        {/* Eyebrow */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="section-label mb-8"
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
          className="vela-heading text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] text-[#111111] leading-tight mb-4 max-w-2xl"
        >
          Your AI employee that{" "}
          <span className="vela-gradient-text">never clocks out.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="text-[#6B7280] text-base md:text-lg max-w-md mb-12 leading-relaxed"
        >
          Built to handle every customer touchpoint so you can focus on running your business.
        </motion.p>

        {/* Mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-12"
        >
          {/* Warm glow disc — sits behind the image in the light section */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse at 50% 55%, rgba(255,107,53,0.18) 0%, rgba(255,107,53,0.06) 52%, transparent 76%)",
              filter: "blur(22px)",
              transform: "scale(1.3)",
            }}
          />
          {/*
            Radial mask: fades the baked JPEG dark background into the section
            colour at the edges, so no hard rectangular border is visible.
          */}
          <div
            className="relative z-10"
            style={{
              maskImage:
                "radial-gradient(ellipse at 50% 50%, black 52%, transparent 84%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 50% 50%, black 52%, transparent 84%)",
            }}
          >
            <Image
              src="/assets/mascot.png"
              alt="Vela AI assistant"
              width={560}
              height={560}
              className="object-contain w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[480px] md:h-[480px] lg:w-[560px] lg:h-[560px]"
              unoptimized
              priority={false}
            />
          </div>
        </motion.div>

        {/* Pillars — card-feature matches the site's existing light card style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
              className="card-feature flex flex-col items-center gap-3 text-center"
            >
              <span style={{ color: "var(--vp-color)" }}>{pillar.icon}</span>
              <span className="text-[#111111] font-semibold text-sm tracking-[0.06em] uppercase">
                {pillar.title}
              </span>
              <span className="text-[#6B7280] text-sm leading-relaxed">
                {pillar.desc}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      {/* No bottom fade — section-tint flows cleanly into adjacent light sections */}
    </section>
  );
}
