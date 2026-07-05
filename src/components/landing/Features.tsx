"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// ── Mini chat mockup for feature 1 ───────────────────────────────────────────
function ChatMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {["#FF5F57","#FFBD2E","#28C840"].map(c => (
          <div key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.6 }} />
        ))}
        <div className="flex-1 mx-2 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      {/* Messages */}
      <div className="p-3 space-y-2">
        {[
          { role: "user", text: "What's the price for a haircut?" },
          { role: "ai",   text: "Haircut is $45 — takes 30 min. Want to book?" },
          { role: "user", text: "Yes! Tomorrow at 2 PM?" },
          { role: "ai",   text: "✓ Booked — Tomorrow 2:00 PM", status: true },
        ].map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.status ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ADE80" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="4.5" fill="rgba(34,197,94,0.3)"/>
                  <path d="M2.5 5l1.5 1.5 3.5-3.5" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                {m.text}
              </div>
            ) : (
              <div className="px-2.5 py-1.5 rounded-xl text-xs max-w-[78%]"
                style={m.role === "user"
                  ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)", color: "white", borderBottomRightRadius: 3 }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", borderBottomLeftRadius: 3 }}>
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini lead pipeline for feature 2 ─────────────────────────────────────────
function PipelineMockup() {
  const stages = [
    { label: "New",       count: 14, pct: 100,  color: "rgba(255,107,53,0.7)" },
    { label: "Qualified", count: 9,  pct: 64,   color: "rgba(255,107,53,0.85)" },
    { label: "Booked",    count: 6,  pct: 43,   color: "#FF6B35" },
  ];
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          Lead Pipeline · This Week
        </p>
      </div>
      <div className="p-3 space-y-3">
        {stages.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
              <span className="text-xs font-bold text-white">{s.count}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: s.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${s.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini calendar for feature 3 ───────────────────────────────────────────────
function CalendarMockup() {
  const slots = [
    { time: "09:00", name: "Maria K.", done: true },
    { time: "11:00", name: "Ahmed R.", done: true },
    { time: "14:00", name: "Sara L.",  done: false, current: true },
    { time: "16:30", name: "James P.", done: false },
  ];
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          Today&apos;s Bookings
        </p>
        <span className="text-[10px] font-bold" style={{ color: "#FF6B35" }}>4 booked</span>
      </div>
      <div className="p-2 space-y-1.5">
        {slots.map((s) => (
          <div key={s.time}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
            style={{
              background: s.current ? "rgba(255,107,53,0.1)" : "rgba(255,255,255,0.03)",
              border: s.current ? "1px solid rgba(255,107,53,0.2)" : "1px solid transparent",
            }}
          >
            <span className="text-[10px] font-mono w-9 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{s.time}</span>
            <div className="flex-1 text-xs font-medium" style={{ color: s.done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.8)" }}>
              {s.name}
            </div>
            {s.done && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" fill="rgba(34,197,94,0.15)"/>
                <path d="M3.5 6l1.5 1.5 3.5-3.5" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            )}
            {s.current && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    tag: "Instant replies",
    title: "Never make a customer wait",
    body: "Vela replies in under 60 seconds — day or night. Trained on your exact prices, services, and policies.",
    Mockup: ChatMockup,
    stat: "< 60s",
    statLabel: "avg. reply time",
  },
  {
    tag: "Lead qualification",
    title: "Only serious buyers reach you",
    body: "The AI asks the right questions, filters spam, and surfaces high-intent leads — so you close more with less effort.",
    Mockup: PipelineMockup,
    stat: "3×",
    statLabel: "more qualified leads",
  },
  {
    tag: "Auto booking",
    title: "Appointments fill themselves",
    body: "Customers pick a time, Vela confirms, sends reminders, and syncs to your calendar. Zero back-and-forth.",
    Mockup: CalendarMockup,
    stat: "0",
    statLabel: "missed bookings",
  },
];

function FeatureCard({ feat, index }: { feat: (typeof FEATURES)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col rounded-3xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Mockup area — styled perspective tilt */}
      <div
        className="p-5 pb-0"
        style={{
          background: "linear-gradient(180deg,rgba(255,107,53,0.04) 0%,transparent 100%)",
        }}
      >
        <div
          style={{
            perspective: "800px",
            perspectiveOrigin: "50% 100%",
          }}
        >
          <motion.div
            initial={{ rotateX: 8 }}
            animate={inView ? { rotateX: 0 } : {}}
            transition={{ delay: index * 0.12 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <feat.Mockup />
          </motion.div>
        </div>
      </div>

      {/* Text content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <span
          className="inline-flex self-start text-[11px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,107,53,0.1)", color: "#FF6B35" }}
        >
          {feat.tag}
        </span>
        <h3
          className="text-white"
          style={{ fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          {feat.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          {feat.body}
        </p>
        <div className="mt-auto pt-3 border-t flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span
            className="text-2xl font-black"
            style={{
              background: "linear-gradient(135deg,#FF6B35,#FF3366)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {feat.stat}
          </span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{feat.statLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Features() {
  const headRef = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  return (
    <section
      id="features"
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ background: "#0A0908" }}
    >
      {/* Top separator */}
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
            What Vela does
          </p>
          <h2
            className="text-white"
            style={{ fontSize: "clamp(32px, 4.5vw, 60px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 }}
          >
            Your business,{" "}
            <span style={{ fontWeight: 200, color: "rgba(255,255,255,0.32)" }}>on autopilot.</span>
          </h2>
          <p className="mt-5 text-base md:text-lg max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
            Three problems. One system. Fully automated.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {FEATURES.map((feat, i) => (
            <FeatureCard key={feat.tag} feat={feat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
