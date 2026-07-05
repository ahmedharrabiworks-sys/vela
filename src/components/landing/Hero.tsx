"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import DemoModal from "./DemoModal";

// ── Film grain ────────────────────────────────────────────────────────────────
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)' opacity='1'/%3E%3C/svg%3E")`;

// ── Conversation sequence ─────────────────────────────────────────────────────
type Msg = { id: number; role: "user" | "ai"; text: string; time: string; isStatus?: boolean };
const CONV: Msg[] = [
  { id: 1, role: "user", text: "Hi! I want to book a dental cleaning 🦷", time: "10:41" },
  { id: 2, role: "ai",   text: "Hey! How does Tuesday 3:00 PM sound?", time: "10:41" },
  { id: 3, role: "user", text: "Perfect, that works!", time: "10:42" },
  { id: 4, role: "ai",   text: "✓ Booked — Tuesday 3:00 PM", time: "10:42", isStatus: true },
];
const SHOW_AT = [700, 1800, 3200, 4400];
const TYPING_BEFORE = 750;
const LOOP_AFTER = 4400 + 3200;

// ── Typing indicator ──────────────────────────────────────────────────────────
function Typing() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex self-start"
    >
      <div
        className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.4)" }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.65, delay: i * 0.14, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Phone chat UI ─────────────────────────────────────────────────────────────
function PhoneUI() {
  const [visible, setVisible] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    function run() {
      setVisible([]);
      setTyping(false);
      CONV.forEach((msg, i) => {
        if (msg.role === "ai")
          timers.push(setTimeout(() => setTyping(true), SHOW_AT[i] - TYPING_BEFORE));
        timers.push(
          setTimeout(() => {
            setTyping(false);
            setVisible((p) => [...p, msg]);
          }, SHOW_AT[i])
        );
      });
      timers.push(setTimeout(run, LOOP_AFTER));
    }
    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="relative flex flex-col overflow-hidden select-none"
      style={{
        width: 224,
        height: 440,
        borderRadius: 34,
        background: "linear-gradient(170deg,#1a1a1e 0%,#0e0e12 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 40px 90px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      {/* Dynamic island */}
      <div className="flex justify-center pt-2.5 shrink-0">
        <div className="w-16 h-5 rounded-full bg-black flex items-center justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#1a1a1e] border border-white/5" />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pb-1 shrink-0">
        <span className="text-[9px] font-semibold text-white/60">10:43</span>
        <div className="flex items-center gap-1">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="rgba(255,255,255,0.6)">
            <rect x="0" y="3" width="2" height="5" rx="0.4" />
            <rect x="3" y="2" width="2" height="6" rx="0.4" />
            <rect x="6" y="1" width="2" height="7" rx="0.4" />
            <rect x="9" y="0" width="2" height="8" rx="0.4" />
          </svg>
          <div className="w-4 h-2 rounded-sm border border-white/30 flex items-center px-0.5">
            <div className="h-full w-4/5 rounded-[1px] bg-white/55" />
          </div>
        </div>
      </div>

      {/* Chat header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="relative shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            V
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 border border-[#0e0e12]" />
        </div>
        <div>
          <p className="text-white text-[11px] font-semibold leading-none">Vela AI</p>
          <p
            className="text-[8px] mt-0.5 transition-colors"
            style={{ color: typing ? "#FF6B35" : "rgba(255,255,255,0.35)" }}
          >
            {typing ? "typing..." : "Online · replies instantly"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden px-2.5 py-2 gap-1.5">
        <AnimatePresence initial={false}>
          {visible.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.isStatus ? (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
                  style={{
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.28)",
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.1 }}
                    className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                  >
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1 3.5l1.6 1.6 2.9-2.9" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </motion.div>
                  <span className="text-green-400 text-[10px] font-semibold">{msg.text}</span>
                </div>
              ) : (
                <div
                  className="max-w-[80%] px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg,#FF6B35,#FF3366)",
                          color: "white",
                          borderBottomRightRadius: 3,
                        }
                      : {
                          background: "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.85)",
                          borderBottomLeftRadius: 3,
                        }
                  }
                >
                  <p>{msg.text}</p>
                  <p className="text-[7px] mt-0.5 opacity-40 text-right">{msg.time}</p>
                </div>
              )}
            </motion.div>
          ))}
          {typing && <Typing key="typing" />}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 border-t shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="flex-1 h-7 rounded-full flex items-center px-2.5 text-[9px]"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          Message…
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5h6M5.5 2l3 3-3 3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Glass micro-card ──────────────────────────────────────────────────────────
function GlassCard({
  x,
  y,
  icon,
  label,
  value,
  delay = 0,
  className = "",
}: {
  x: ReturnType<typeof useSpring>;
  y: ReturnType<typeof useSpring>;
  icon: React.ReactNode;
  label: string;
  value: string;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute flex items-center gap-2 rounded-2xl px-3 py-2 ${className}`}
      aria-hidden
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(255,107,53,0.12)" }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
        <p className="text-[12px] font-extrabold text-white leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 22 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 22 });

  // Phone tilt
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-9, 9]);

  // Card parallax at different depths
  const c1x = useSpring(useTransform(smoothX, [-0.5, 0.5], [-20, 20]), { stiffness: 40, damping: 14 });
  const c1y = useSpring(useTransform(smoothY, [-0.5, 0.5], [-14, 14]), { stiffness: 40, damping: 14 });
  const c2x = useSpring(useTransform(smoothX, [-0.5, 0.5], [16, -16]), { stiffness: 32, damping: 12 });
  const c2y = useSpring(useTransform(smoothY, [-0.5, 0.5], [12, -12]), { stiffness: 32, damping: 12 });
  const c3x = useSpring(useTransform(smoothX, [-0.5, 0.5], [-26, 26]), { stiffness: 50, damping: 18 });
  const c3y = useSpring(useTransform(smoothY, [-0.5, 0.5], [-18, 18]), { stiffness: 50, damping: 18 });

  useEffect(() => {
    setPrefersReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setIsTouchDevice(window.matchMedia("(hover: none)").matches);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchDevice || prefersReduced) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [isTouchDevice, prefersReduced, mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const cardGlassStyle: React.CSSProperties = {
    background: "rgba(10,9,8,0.82)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.09)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <section
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden"
        style={{ background: "#0A0908", minHeight: "100svh" }}
      >
        {/* Film grain */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.038]"
          style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px" }}
        />

        {/* Radial vignette */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 35%, #0A0908 100%)",
          }}
        />

        {/* Drifting orange glow — top-left */}
        {!prefersReduced && (
          <motion.div
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 700,
              height: 700,
              top: "-30%",
              left: "-15%",
              background:
                "radial-gradient(ellipse, rgba(255,107,53,0.13) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, 90, 0], y: [0, 60, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Drifting rose glow — bottom-right */}
        {!prefersReduced && (
          <motion.div
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 560,
              height: 560,
              bottom: "-15%",
              right: "-8%",
              background:
                "radial-gradient(ellipse, rgba(255,51,102,0.10) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, -70, 0], y: [0, -50, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* ── Content grid ───────────────────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-0 items-center min-h-[100svh] py-28 lg:py-24">

            {/* LEFT: copy */}
            <div className="flex flex-col gap-6 items-center text-center lg:items-start lg:text-left order-2 lg:order-1">

              {/* Label badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                <span
                  className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-full"
                  style={{
                    background: "rgba(255,107,53,0.1)",
                    color: "#FF6B35",
                    border: "1px solid rgba(255,107,53,0.22)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                  AI Business Operating System
                </span>
              </motion.div>

              {/* Headline — mixed weight typography */}
              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ letterSpacing: "-0.04em", lineHeight: 1 }}
                className="text-white"
              >
                <span
                  className="block"
                  style={{ fontSize: "clamp(44px, 5.8vw, 82px)", fontWeight: 900 }}
                >
                  Every message
                </span>
                <span
                  className="block"
                  style={{ fontSize: "clamp(44px, 5.8vw, 82px)", fontWeight: 200, color: "rgba(255,255,255,0.28)" }}
                >
                  answered.
                </span>
                <span
                  className="block"
                  style={{
                    fontSize: "clamp(44px, 5.8vw, 82px)",
                    fontWeight: 900,
                    background: "linear-gradient(135deg,#FF6B35,#FF3366)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Every lead booked.
                </span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, duration: 0.6 }}
                className="text-base md:text-[17px] leading-relaxed max-w-[420px]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                AI replies on Instagram, WhatsApp, and your website — 24/7.
                Qualifies leads and books appointments automatically.
              </motion.p>

              {/* CTA row */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
              >
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg,#FF6B35,#FF3366)",
                    boxShadow: "0 4px 28px rgba(255,107,53,0.42)",
                    minHeight: 48,
                  }}
                >
                  Start Free — No Credit Card
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7h9M8 3.5l4 3.5-4 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all hover:border-white/25 hover:text-white/90"
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    minHeight: 48,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5.5 4.8l4 2.2-4 2.2V4.8z" fill="currentColor" />
                  </svg>
                  See it live
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.62, duration: 0.7 }}
                className="flex flex-wrap items-center gap-x-5 gap-y-2"
              >
                {["< 60s reply time", "Works 24/7", "30+ industries"].map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-2 text-xs"
                    style={{ color: "rgba(255,255,255,0.32)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke="#FF6B35" strokeWidth="1" />
                      <path d="M3.5 6l1.8 1.8 3.2-3.2" stroke="#FF6B35" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    {label}
                  </span>
                ))}
              </motion.div>

              {/* Demo link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75, duration: 0.5 }}
              >
                <button
                  onClick={() => setDemoOpen(true)}
                  className="text-xs font-medium underline underline-offset-4 transition-colors hover:text-white/70"
                  style={{ color: "rgba(255,255,255,0.28)", minHeight: 44 }}
                >
                  Or watch a 60-second preview →
                </button>
              </motion.div>
            </div>

            {/* RIGHT: 3D phone centerpiece */}
            <div className="flex items-center justify-center lg:justify-end order-1 lg:order-2">
              {/* Perspective wrapper */}
              <div
                className="relative"
                style={{ perspective: "1200px", perspectiveOrigin: "50% 50%" }}
              >
                {/* Backdrop text — behind phone via z-index */}
                <div
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                  style={{ zIndex: 0 }}
                >
                  <span
                    style={{
                      fontSize: "clamp(72px, 13vw, 170px)",
                      fontWeight: 200,
                      letterSpacing: "-0.06em",
                      color: "rgba(255,255,255,0.025)",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    VELA
                  </span>
                </div>

                {/* Phone — tilts on mouse move */}
                <motion.div
                  style={{ rotateX, rotateY, transformStyle: "preserve-3d", zIndex: 1, position: "relative" }}
                  initial={{ opacity: 0, y: 32, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.28, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Ambient glow behind phone */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse 70% 60% at 50% 55%,rgba(255,107,53,0.32),rgba(255,51,102,0.16) 45%,transparent 70%)",
                      filter: "blur(40px)",
                      transform: "scale(1.8)",
                      zIndex: 0,
                    }}
                  />

                  <div style={{ position: "relative", zIndex: 1 }}>
                    <PhoneUI />
                  </div>

                  {/* ── Micro-card 1: < 60s, top-left ── */}
                  <div className="hidden lg:block" style={{ position: "absolute", top: 32, left: -158, ...cardGlassStyle, borderRadius: 16 }}>
                    <GlassCard
                      x={c1x} y={c1y}
                      label="Avg. reply time"
                      value="< 60s"
                      delay={0.9}
                      icon={
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="#FF6B35" strokeWidth="1.1" />
                          <path d="M6 3.5V6l1.5 1.5" stroke="#FF6B35" strokeWidth="1.1" strokeLinecap="round" />
                        </svg>
                      }
                      className=""
                    />
                  </div>

                  {/* ── Micro-card 2: 24/7, top-right ── */}
                  <div className="hidden lg:block" style={{ position: "absolute", top: -18, right: -148, ...cardGlassStyle, borderRadius: 16 }}>
                    <GlassCard
                      x={c2x} y={c2y}
                      label="Availability"
                      value="24 / 7"
                      delay={1.05}
                      icon={
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6.5l2.5 2.5 5.5-5" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      }
                      className=""
                    />
                  </div>

                  {/* ── Micro-card 3: booked today, bottom-left ── */}
                  <div className="hidden lg:block" style={{ position: "absolute", bottom: 72, left: -138, ...cardGlassStyle, borderRadius: 16 }}>
                    <GlassCard
                      x={c3x} y={c3y}
                      label="Booked today"
                      value="8 appts"
                      delay={1.2}
                      icon={
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="1.5" y="3" width="9" height="7.5" rx="1.2" stroke="#7C3AED" strokeWidth="1" />
                          <path d="M4 3V1.5M8 3V1.5M1.5 5.5h9" stroke="#7C3AED" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      }
                      className=""
                    />
                  </div>
                </motion.div>
              </div>
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <motion.div
            animate={prefersReduced ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="20" height="30" viewBox="0 0 20 30" fill="none">
              <rect x="1" y="1" width="18" height="28" rx="9" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
              <motion.circle
                cx="10"
                cy="9"
                r="2.5"
                fill="rgba(255,107,53,0.6)"
                animate={prefersReduced ? {} : { cy: [9, 18, 9] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
          </motion.div>
          <span
            className="text-[9px] font-medium tracking-[0.15em]"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            SCROLL
          </span>
        </div>
      </section>

      <AnimatePresence>
        {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
