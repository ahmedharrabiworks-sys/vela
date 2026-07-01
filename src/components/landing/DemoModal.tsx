"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const SLIDE_DURATION = 6000;
const TOTAL = 4;

interface Props {
  onClose: () => void;
}

const slideVariants = {
  enter:  { opacity: 0, scale: 0.96, filter: "blur(10px)" },
  center: { opacity: 1, scale: 1,    filter: "blur(0px)"  },
  exit:   { opacity: 0, scale: 1.03, filter: "blur(6px)"  },
};

/* ─── Gradient text helper ─── */
const G = ({ children }: { children: React.ReactNode }) => (
  <span style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
    {children}
  </span>
);

/* ════════════════════════════════════════
   SLIDE 1 — "A customer messages at 2AM."
   ════════════════════════════════════════ */
function S1() {
  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.p
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-mono text-white/25 text-sm tracking-[0.2em] mb-8"
      >
        02:17 AM
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(40px, 7vw, 88px)", letterSpacing: "-0.04em" }}
      >
        A customer messages<br /><G>at 2AM.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        className="text-white/35 text-lg md:text-xl leading-relaxed mb-12 max-w-md"
      >
        While you sleep. While you&apos;re busy.<br />While you&apos;re living your life.
      </motion.p>

      {/* Phone lock-screen notification */}
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Green glow behind phone */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(37,211,102,0.18), transparent)", filter: "blur(24px)", transform: "scale(1.6)" }} />

        <div className="relative w-72 rounded-3xl overflow-hidden border border-white/10"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
          <div className="flex flex-col items-center py-5 border-b border-white/5">
            <p className="text-white/20 text-xs font-mono tracking-widest">WEDNESDAY</p>
            <p className="text-white/60 text-4xl font-thin mt-0.5">2:17</p>
          </div>

          <div className="p-3">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl p-4 border border-white/8"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#25D366" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M11.998 2C6.478 2 2 6.478 2 11.998c0 1.767.459 3.43 1.265 4.876L2 22l5.274-1.38A9.944 9.944 0 0011.998 22C17.52 22 22 17.522 22 11.998S17.52 2 11.998 2z" fillRule="evenodd" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">WhatsApp Business</p>
                  <p className="text-white/30 text-[10px]">now</p>
                </div>
                <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.8, delay: 1.2 }}
                  className="ml-auto w-2 h-2 rounded-full" style={{ background: "#25D366" }} />
              </div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25, duration: 0.4 }}
                className="text-white/70 text-sm leading-relaxed">
                <span className="text-white font-semibold">Sara Khalid:</span> Hi, how much is a dental cleaning? I want to book ASAP 🦷
              </motion.p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 2 — "Vela replies in 8 seconds."
   ════════════════════════════════════════ */
function S2() {
  const [phase, setPhase] = useState<"typing" | "done">("typing");
  useEffect(() => {
    const t = setTimeout(() => setPhase("done"), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 border border-[#FF6B35]/30"
        style={{ background: "rgba(255,107,53,0.1)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FF6B35" }} />
        <span className="font-mono text-sm font-semibold" style={{ color: "#FF6B35" }}>8 seconds later</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(40px, 7vw, 88px)", letterSpacing: "-0.04em" }}
      >
        Vela replies<br /><G>in 8 seconds.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.6 }}
        className="text-white/35 text-lg md:text-xl leading-relaxed mb-12 max-w-md"
      >
        Trained on your business. Speaks your language.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-72"
      >
        {/* Orange pulse glow */}
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 70%, rgba(255,107,53,0.35), transparent)", filter: "blur(20px)", transform: "scale(1.5)" }}
        />
        <div className="relative rounded-3xl p-4 flex flex-col gap-3 border border-white/8"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="self-start rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] border border-white/8"
            style={{ background: "rgba(255,255,255,0.07)" }}>
            <p className="text-white/70 text-sm">How much is a dental cleaning? 🦷</p>
            <p className="text-white/20 text-[10px] mt-0.5">02:17</p>
          </div>

          <AnimatePresence mode="wait">
            {phase === "typing" ? (
              <motion.div key="dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="self-end rounded-2xl rounded-tr-sm px-4 py-3 border border-[#FF6B35]/30"
                style={{ background: "rgba(255,107,53,0.15)" }}>
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="reply" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="self-end rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[90%]"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                <p className="text-white text-sm leading-relaxed">⚡ Hi Sara! Dental cleaning is AED 350 — 45 min session. We have tomorrow at 11 AM or 3 PM. Which works?</p>
                <p className="text-white/50 text-[10px] mt-0.5 text-right">02:17 ✓✓</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 3 — "Appointment booked."
   ════════════════════════════════════════ */
function S3() {
  const [booked, setBooked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBooked(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const slots = [
    { time: "09:00", label: "Mohammed A.", sub: "Checkup" },
    { time: "10:30", label: "Khalid M.", sub: "Cleaning" },
    { time: "11:00", label: "Sara Khalid", sub: "Dental Cleaning", target: true },
    { time: "14:00", label: "Omar S.", sub: "Whitening" },
  ];

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(40px, 7vw, 88px)", letterSpacing: "-0.04em" }}
      >
        Appointment<br /><G>booked.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.6 }}
        className="text-white/35 text-lg md:text-xl leading-relaxed mb-12 max-w-md"
      >
        No calls. No back and forth.<br />Just a confirmed booking.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-72 rounded-3xl overflow-hidden border border-white/8"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <div className="px-4 py-3.5 border-b border-white/5">
          <p className="text-white/50 text-xs font-semibold tracking-wide">WEDNESDAY · JUN 28</p>
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          {slots.map((s, i) => (
            <div key={s.time}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-500"
              style={s.target && booked
                ? { background: "linear-gradient(135deg,rgba(255,107,53,0.18),rgba(255,51,102,0.18))", border: "1px solid rgba(255,107,53,0.35)" }
                : { background: i % 2 === 0 ? "rgba(255,255,255,0.04)" : "transparent" }}>
              <span className="text-[11px] font-mono text-white/25 w-10 shrink-0">{s.time}</span>
              {s.target ? (
                <AnimatePresence mode="wait">
                  {!booked ? (
                    <motion.span key="free" exit={{ opacity: 0 }} className="text-xs text-white/20">Available</motion.span>
                  ) : (
                    <motion.div key="booked" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="flex-1 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-white text-xs font-semibold">{s.label}</p>
                        <p className="text-white/35 text-[10px]">{s.sub}</p>
                      </div>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ delay: 0.18, type: "spring", stiffness: 320, damping: 18 }}
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <div className="flex-1 text-left">
                  <p className="text-white/50 text-xs font-medium">{s.label}</p>
                  <p className="text-white/20 text-[10px]">{s.sub}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════
   SLIDE 4 — "You wake up to this."
   ════════════════════════════════════════ */
function S4({ onCTA }: { onCTA: () => void }) {
  const bookings = [
    { name: "Sara Khalid",   service: "Dental Cleaning",  time: "11:00 AM", ch: "#25D366" },
    { name: "Omar Sharif",   service: "Teeth Whitening",  time: "2:00 PM",  ch: "#E1306C" },
    { name: "Nora Abdulla",  service: "Consultation",     time: "4:30 PM",  ch: "#FF6B35" },
  ];

  return (
    <div className="flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-extrabold leading-none tracking-tight text-white mb-6"
        style={{ fontSize: "clamp(40px, 7vw, 88px)", letterSpacing: "-0.04em" }}
      >
        You wake up<br /><G>to this.</G>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.6 }}
        className="text-white/35 text-lg md:text-xl leading-relaxed mb-10 max-w-md"
      >
        This is what Vela does. Every single day.
      </motion.p>

      {/* Notification card */}
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-80 rounded-3xl overflow-hidden border border-white/8 mb-8"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <div className="px-5 py-4 border-b border-white/5"
          style={{ background: "linear-gradient(135deg,rgba(255,107,53,0.12),rgba(255,51,102,0.12))" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>🔔</div>
            <div className="text-left">
              <p className="text-white font-bold text-base leading-tight">3 new bookings</p>
              <p className="text-white/35 text-xs">while you were away · Vela AI</p>
            </div>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          {bookings.map((b, i) => (
            <motion.div key={b.name}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.75 + i * 0.14, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ background: b.ch }}>{b.name[0]}</div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-white text-xs font-semibold truncate">{b.name}</p>
                <p className="text-white/30 text-[10px]">{b.service} · {b.time}</p>
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.95 + i * 0.14, type: "spring", stiffness: 280 }}
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,107,53,0.2)", border: "1px solid rgba(255,107,53,0.4)" }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4l1.5 1.5 3.5-3" stroke="#FF6B35" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.35, duration: 0.5 }}
        onClick={e => { e.stopPropagation(); onCTA(); }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white text-lg"
        style={{
          background: "linear-gradient(135deg,#FF6B35,#FF3366)",
          boxShadow: "0 0 60px rgba(255,107,53,0.45), 0 8px 32px rgba(255,51,102,0.3)",
        }}
      >
        Try it yourself
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN MODAL
   ════════════════════════════════════════ */
export default function DemoModal({ onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const router = useRouter();

  const goNext = useCallback(() => setSlide(s => Math.min(s + 1, TOTAL - 1)), []);
  const goPrev = useCallback(() => setSlide(s => Math.max(s - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft")                   { e.preventDefault(); goPrev(); }
      if (e.key === "Escape")                       onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [goNext, goPrev, onClose]);

  // Auto-advance (stops on last slide)
  useEffect(() => {
    if (slide === TOTAL - 1) return;
    const t = setTimeout(goNext, SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [slide, goNext]);

  const handleCTA = () => {
    onClose();
    router.push("/demo");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] overflow-hidden cursor-pointer"
      style={{ background: "#07070A" }}
      onClick={goNext}
    >
      {/* Centre glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 52%, rgba(255,107,53,0.07), transparent)" }} />

      {/* Progress bar — 1px at very top */}
      <div className="absolute top-0 left-0 right-0 z-30 flex h-[2px]">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} className="flex-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            {i < slide && <div className="h-full w-full" style={{ background: "#FF6B35" }} />}
            {i === slide && (
              <motion.div
                key={`p-${slide}`}
                className="h-full"
                style={{ background: "#FF6B35" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: slide < TOTAL - 1 ? SLIDE_DURATION / 1000 : 0.3, ease: "linear" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FF6B35" }} />
          <span className="font-mono text-white/20 text-xs tracking-widest">VELA</span>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          className="text-white/25 hover:text-white/70 text-sm font-medium px-3 py-1.5 rounded-xl transition-all hover:bg-white/8 cursor-pointer"
          style={{ backdropFilter: "blur(8px)" }}
        >
          Skip ✕
        </button>
      </div>

      {/* Slide — full screen, pointer-events pass-through so outer onClick fires */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center overflow-y-auto pt-20 pb-24"
          style={{ cursor: "default" }}
        >
          {slide === 0 && <S1 />}
          {slide === 1 && <S2 />}
          {slide === 2 && <S3 />}
          {slide === 3 && <S4 onCTA={handleCTA} />}
        </motion.div>
      </AnimatePresence>

      {/* Bottom — counter + arrows */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-6 pb-8">
        <button
          onClick={e => { e.stopPropagation(); goPrev(); }}
          disabled={slide === 0}
          className="text-white/20 hover:text-white/60 text-2xl transition-colors disabled:opacity-0 cursor-pointer"
        >‹</button>
        <span className="text-white/25 text-xs font-mono tracking-widest">
          {slide + 1} <span className="text-white/10">of</span> {TOTAL}
        </span>
        <button
          onClick={e => { e.stopPropagation(); goNext(); }}
          disabled={slide === TOTAL - 1}
          className="text-white/20 hover:text-white/60 text-2xl transition-colors disabled:opacity-0 cursor-pointer"
        >›</button>
      </div>
    </motion.div>
  );
}
