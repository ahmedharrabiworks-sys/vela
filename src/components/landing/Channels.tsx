"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const CHANNELS = [
  {
    name: "Instagram",
    handle: "DMs · Story replies · Comment replies",
    color: "#E1306C",
    glow: "rgba(225,48,108,0.22)",
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <rect x="3" y="3" width="24" height="24" rx="7" stroke="white" strokeWidth="2"/>
        <circle cx="15" cy="15" r="5.5" stroke="white" strokeWidth="2"/>
        <circle cx="21.5" cy="8.5" r="1.5" fill="white"/>
      </svg>
    ),
    stat: "2.4B",
    statLabel: "monthly users",
    features: ["DMs answered 24/7", "Story reply automation", "Comment-to-DM flows"],
  },
  {
    name: "WhatsApp",
    handle: "WhatsApp Business API",
    color: "#25D366",
    glow: "rgba(37,211,102,0.20)",
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <path d="M15 3a12 12 0 0 1 10.39 6.67L27 27l-7.43-1.95A12 12 0 1 1 15 3z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M11 12.5c.4 1.5 2.2 4.5 3.7 6s4 3.2 5.4 3.4c.9.1 1.5-.2 1.9-.7l.5-1c.2-.3 0-.7-.2-1l-1.9-1c-.3-.2-.7 0-.9.2l-.5.7c-.9-.3-2.6-1.7-3.5-3.5l.5-.5c.2-.2.4-.5.2-1l-.9-1.9c-.2-.3-.5-.3-.9-.2l-.9.5c-.9.5-.9 1.3-.5 2.5z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    stat: "100B",
    statLabel: "messages / day",
    features: ["Instant DM replies", "Booking confirmation", "Reminder sequences"],
  },
  {
    name: "Website Chat",
    handle: "Live chat widget · Lead capture",
    color: "#FF6B35",
    glow: "rgba(255,107,53,0.20)",
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <path d="M5 7h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-6 4V9a2 2 0 0 1 2-2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M10 14h10M10 18h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    stat: "< 8s",
    statLabel: "avg. response",
    features: ["Embed in any website", "Lead qualification", "Hand-off to human"],
  },
];

function ChannelCard({ ch, index }: { ch: (typeof CHANNELS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl p-6 flex flex-col gap-5 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Glow */}
      <div
        aria-hidden
        className="absolute top-0 left-0 w-52 h-52 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, ${ch.glow} 0%, transparent 70%)`,
          filter: "blur(20px)",
          transform: "translate(-30%,-30%)",
        }}
      />

      {/* Icon */}
      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: ch.color, boxShadow: `0 0 32px ${ch.glow}` }}
      >
        {ch.icon}
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="text-white font-bold text-lg mb-1">{ch.name}</h3>
        <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>{ch.handle}</p>
        <ul className="flex flex-col gap-2">
          {ch.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6.5l2.5 2.5 5.5-5" stroke={ch.color} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Stat */}
      <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-2xl font-black" style={{ color: ch.color }}>{ch.stat}</span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{ch.statLabel}</span>
      </div>
    </motion.div>
  );
}

export default function Channels() {
  const headRef = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ background: "#0A0908" }}
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <motion.div
          ref={headRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14 md:mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: "#FF6B35" }}>
            Every channel
          </p>
          <h2
            className="text-white"
            style={{ fontSize: "clamp(32px,4.5vw,60px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 }}
          >
            Works where your{" "}
            <span style={{ fontWeight: 200, color: "rgba(255,255,255,0.32)" }}>customers are.</span>
          </h2>
          <p className="mt-5 text-base md:text-lg max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
            One AI. Three channels. Every conversation handled — wherever it starts.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {CHANNELS.map((ch, i) => (
            <ChannelCard key={ch.name} ch={ch} index={i} />
          ))}
        </div>

        {/* Unification note */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mt-10 text-center"
        >
          <p
            className="inline-flex items-center gap-3 text-sm font-medium px-5 py-3 rounded-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <span className="flex items-center gap-1.5">
              {["#E1306C", "#25D366", "#FF6B35"].map((c) => (
                <span key={c} className="w-2 h-2 rounded-full" style={{ background: c, display: "inline-block" }} />
              ))}
            </span>
            All conversations land in one unified inbox — always.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
