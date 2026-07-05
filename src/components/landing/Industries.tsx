"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const INDUSTRIES = [
  { name: "Dental Clinics",     emoji: "🦷" },
  { name: "Hair Salons",        emoji: "💇" },
  { name: "Gyms & Fitness",     emoji: "🏋️" },
  { name: "Real Estate",        emoji: "🏠" },
  { name: "Restaurants",        emoji: "🍽️" },
  { name: "Law Firms",          emoji: "⚖️" },
  { name: "Auto Services",      emoji: "🚗" },
  { name: "Schools & Tutors",   emoji: "📚" },
  { name: "Spas & Wellness",    emoji: "🧖" },
  { name: "Hotels",             emoji: "🏨" },
  { name: "Physiotherapy",      emoji: "🦴" },
  { name: "Yoga Studios",       emoji: "🧘" },
  { name: "Photography",        emoji: "📸" },
  { name: "Veterinary Clinics", emoji: "🐾" },
  { name: "Home Services",      emoji: "🔧" },
  { name: "Insurance",          emoji: "🛡️" },
  { name: "Pet Grooming",       emoji: "🐩" },
  { name: "Pilates Studios",    emoji: "🏃" },
  { name: "Barbershops",        emoji: "✂️" },
  { name: "Nail Salons",        emoji: "💅" },
  { name: "Massage Centers",    emoji: "💆" },
  { name: "Personal Training",  emoji: "💪" },
  { name: "Event Planning",     emoji: "🎉" },
  { name: "Financial Advisors", emoji: "📊" },
  { name: "Tattoo Studios",     emoji: "🎨" },
  { name: "CrossFit Boxes",     emoji: "🏅" },
  { name: "Travel Agencies",    emoji: "✈️" },
  { name: "Beauty Bars",        emoji: "💄" },
  { name: "Optometrists",       emoji: "👁️" },
  { name: "Chiropractic",       emoji: "🦾" },
];

// Duplicate for seamless loop
const TRACK = [...INDUSTRIES, ...INDUSTRIES];

function IndustryChip({ name, emoji }: { name: string; emoji: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full shrink-0"
      style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.07)",
        whiteSpace: "nowrap",
      }}
    >
      <span className="text-base leading-none" role="img" aria-hidden>{emoji}</span>
      <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
        {name}
      </span>
    </div>
  );
}

export default function Industries() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-16 md:py-20"
      style={{ background: "#0A0908" }}
    >
      {/* Top edge fade */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)" }}
      />

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10 px-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "#FF6B35" }}>
          Works for every industry
        </p>
        <h2
          className="text-white leading-tight"
          style={{
            fontSize: "clamp(28px, 3.5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          30+ industries.{" "}
          <span style={{ fontWeight: 200, color: "rgba(255,255,255,0.35)" }}>
            One platform.
          </span>
        </h2>
        <p className="mt-3 text-sm md:text-base max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.38)" }}>
          From dental clinics to law firms, gyms to real estate — Vela speaks your industry.
        </p>
      </motion.div>

      {/* Marquee strip */}
      <div className="relative">
        {/* Left/right fade masks */}
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg,#0A0908,transparent)" }}
        />
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg,#0A0908,transparent)" }}
        />

        {/* Row 1 — left to right */}
        <div className="overflow-hidden mb-3">
          <div
            className="flex gap-3"
            style={{
              animation: "marquee 40s linear infinite",
              width: "max-content",
            }}
          >
            {TRACK.map((ind, i) => (
              <IndustryChip key={`a-${i}`} name={ind.name} emoji={ind.emoji} />
            ))}
          </div>
        </div>

        {/* Row 2 — right to left */}
        <div className="overflow-hidden">
          <div
            className="flex gap-3"
            style={{
              animation: "marquee 48s linear infinite reverse",
              width: "max-content",
            }}
          >
            {[...TRACK].reverse().map((ind, i) => (
              <IndustryChip key={`b-${i}`} name={ind.name} emoji={ind.emoji} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom edge fade */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)" }}
      />
    </section>
  );
}
