"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const SLIDE_DURATION = 3000;

interface Props {
  onClose: () => void;
}

/* ── Slide components ── */

function SlideMessage() {
  return (
    <div className="flex justify-center py-4">
      <div className="w-64 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">A</div>
          <div>
            <p className="text-white text-xs font-semibold">Ahmed Al-Rashid</p>
            <p className="text-white/50 text-[10px]">WhatsApp Business</p>
          </div>
        </div>
        <div className="bg-[#ECE5DD] p-4 min-h-[110px] flex items-end">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm max-w-[90%]"
          >
            <p className="text-[#1A0A00] text-sm">How much is a dental cleaning? 🦷</p>
            <p className="text-[10px] text-right text-[#999] mt-0.5">10:32</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SlideReply() {
  const [phase, setPhase] = useState<"typing" | "done">("typing");
  useEffect(() => {
    const t = setTimeout(() => setPhase("done"), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="w-64 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">A</div>
          <div>
            <p className="text-white text-xs font-semibold">Ahmed Al-Rashid</p>
            <p className="text-white/50 text-[10px]">WhatsApp Business</p>
          </div>
        </div>
        <div className="bg-[#ECE5DD] p-4 flex flex-col gap-2 min-h-[110px]">
          <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm max-w-[85%]">
            <p className="text-[#1A0A00] text-xs">How much is a dental cleaning? 🦷</p>
            <p className="text-[10px] text-right text-[#999] mt-0.5">10:32</p>
          </div>
          <AnimatePresence mode="wait">
            {phase === "typing" ? (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="self-end bg-[#DCF8C6] rounded-xl rounded-tr-none px-3 py-2.5 shadow-sm flex items-center gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#888] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="self-end bg-[#DCF8C6] rounded-xl rounded-tr-none px-3 py-2 max-w-[90%] shadow-sm">
                <p className="text-[#1A0A00] text-xs leading-relaxed">⚡ Dental cleaning is AED 350, 45 min session. Want to book? 📅</p>
                <p className="text-[10px] text-right text-[#999] mt-0.5">10:32 ✓✓</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
        className="flex items-center gap-2 bg-[#FF6B35]/15 border border-[#FF6B35]/25 rounded-full px-3 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
        <span className="text-[#FF6B35] text-[11px] font-semibold">Vela AI replied in 8 seconds</span>
      </motion.div>
    </div>
  );
}

function SlideCalendar() {
  const slots = [
    { time: "09:00", name: "Sara Khalid", service: "Whitening", isNew: false },
    { time: "10:00", empty: true },
    { time: "11:00", name: "Ahmed Al-Rashid", service: "Dental Cleaning", isNew: true },
    { time: "14:00", name: "Mohammed Ali", service: "Checkup", isNew: false },
  ];

  return (
    <div className="flex justify-center py-4">
      <div className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
          <p className="text-white font-bold text-sm">📅 Tuesday, June 28</p>
          <p className="text-white/70 text-xs">Your clinic calendar</p>
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          {slots.map((slot, i) => (
            <motion.div
              key={slot.time}
              initial={slot.isNew ? { opacity: 0, x: -12 } : {}}
              animate={slot.isNew ? { opacity: 1, x: 0 } : {}}
              transition={slot.isNew ? { delay: 0.55, type: "spring", stiffness: 220 } : {}}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                slot.isNew
                  ? "bg-[#FF6B35]/10 border border-[#FF6B35]/30"
                  : "bg-[#f9f9f9]"
              }`}
            >
              <span className="text-xs font-mono text-[#bbb] w-10 shrink-0">{slot.time}</span>
              {slot.empty ? (
                <span className="text-xs text-[#ddd]">Available</span>
              ) : (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1A0A00] truncate">{slot.name}</p>
                    <p className="text-[10px] text-[#888]">{slot.service}</p>
                  </div>
                  {slot.isNew && (
                    <span className="text-[9px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-1.5 py-0.5 rounded-full shrink-0 ml-2">NEW</span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideNotification({ onCTA }: { onCTA: () => void }) {
  return (
    <div className="flex justify-center py-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-4 py-3" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">🔔</span>
            <p className="text-white font-bold text-sm">New Booking Confirmed</p>
          </div>
          <p className="text-white/70 text-xs">via Vela AI · just now</p>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#f0e8e0]">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>A</div>
            <div>
              <p className="font-semibold text-[#1A0A00] text-sm">Ahmed Al-Rashid</p>
              <p className="text-xs text-[#888]">Dental Cleaning · Tue 11:00 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#888] mb-4">
            <span className="text-[#25D366] text-base">●</span>
            Booked via WhatsApp · AI handled it
          </div>
          <button
            onClick={onCTA}
            className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            Try the dashboard
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const CAPTIONS = [
  "Customer sends a message — any time, any channel",
  "Vela AI replies instantly — trained on your business",
  "Appointment booked automatically — no human needed",
  "You get notified instantly — sit back and relax",
];

/* ── Main modal ── */

export default function DemoModal({ onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const router = useRouter();

  const next = useCallback(() => setSlide(s => Math.min(s + 1, 3)), []);
  const prev = () => setSlide(s => Math.max(s - 1, 0));

  useEffect(() => {
    if (slide === 3) return;
    const t = setTimeout(next, SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [slide, next]);

  const handleCTA = () => {
    onClose();
    router.push("/demo");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-[#1A0A00] rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="flex gap-1.5 px-5 pt-5 pb-0">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-0.5 bg-white/15 rounded-full overflow-hidden">
              {i < slide && (
                <div className="h-full w-full bg-[#FF6B35]" />
              )}
              {i === slide && (
                <motion.div
                  key={`bar-${slide}`}
                  className="h-full bg-[#FF6B35]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: slide < 3 ? SLIDE_DURATION / 1000 : 0.4, ease: "linear" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Top row */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
            <span className="text-white/40 text-xs">{slide + 1} / 4</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/35 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-white/10 transition-all"
          >
            Skip ✕
          </button>
        </div>

        {/* Slide area */}
        <div className="px-5 min-h-[280px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {slide === 0 && <SlideMessage />}
              {slide === 1 && <SlideReply />}
              {slide === 2 && <SlideCalendar />}
              {slide === 3 && <SlideNotification onCTA={handleCTA} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption + nav */}
        <div className="px-5 pb-6 pt-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={`cap-${slide}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-white/55 text-sm text-center mb-4 leading-relaxed"
            >
              {CAPTIONS[slide]}
            </motion.p>
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={slide === 0}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-lg disabled:opacity-20 hover:bg-white/20 transition-all"
            >
              ‹
            </button>

            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map(i => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === slide ? "w-5 h-1.5 bg-[#FF6B35]" : "w-1.5 h-1.5 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              disabled={slide === 3}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-lg disabled:opacity-20 hover:bg-white/20 transition-all"
            >
              ›
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
