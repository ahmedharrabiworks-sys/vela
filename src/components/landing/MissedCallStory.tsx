"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RefObject, TouchEvent as ReactTouchEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

/* ═══════════════════════════════════════════════════════════════
   "The missed call story" -- mobile-hero-only round.
   A small, self-contained 3-step interactive illustration that shows,
   inside a tilted 3D phone mockup, why an unanswered lead costs a real
   booking (step 1), how Vela answers and books it instead (step 2), and
   what the owner wakes up to (step 3). Marketing illustration only --
   none of this is real app UI, real data, or a real conversation; the
   task itself frames step 3 explicitly as "a marketing illustration on
   the landing only, never the real app," and that framing applies to
   all three steps.

   Performance/a11y contract (all explicit asks):
   - Pure DOM/CSS/SVG, no WebGL, no new dependencies (framer-motion is
     already a site-wide dependency, same as ProductTourDemo.tsx).
   - No filter:blur(), no backdrop-filter anywhere in this file.
   - Every phase timer is gated by BOTH "in view" (IntersectionObserver,
     via useInView below) and "!prefersReducedMotion" -- scrolled off
     screen, or reduced motion, and nothing schedules.
   - Under prefers-reduced-motion: each active scene jumps straight to
     its own final settled state, no timers, no stagger.
   - Swipe is measured only on touchstart/touchend deltas -- no
     touchmove listener, no preventDefault, ever. It can never compete
     with the browser's native vertical scroll.
   - Buttons are real <button>s with aria-labels; the step dots carry
     aria-current on the active one.
   ═══════════════════════════════════════════════════════════════ */

const STEP_COUNT = 3;
const PHONE_W = 230; // spec: "about 220 to 240px wide"
const SCREEN_W = PHONE_W - 20; // 10px bezel each side
const SCREEN_H = Math.round(SCREEN_W * (19.5 / 9));

/** Fires once the element is intersecting the viewport (with a little
    lookahead margin so the phone's animations are already primed by the
    time it's fully scrolled into view), and again whenever it leaves --
    used to pause every phase timer below when scrolled off screen. */
function useInView<T extends HTMLElement>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "80px 0px", threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

/* ─── Shared tiny icons (inline SVG, no icon library) ──────────────── */

function SignalBars() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
      <rect x="0" y="6" width="2.4" height="4" rx="0.6" fill="currentColor" />
      <rect x="4.5" y="4" width="2.4" height="6" rx="0.6" fill="currentColor" />
      <rect x="9" y="2" width="2.4" height="8" rx="0.6" fill="currentColor" />
      <rect x="13.5" y="0" width="2.4" height="10" rx="0.6" fill="currentColor" />
    </svg>
  );
}
function WifiIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
      <path d="M7 9.2a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
      <path d="M4.2 5.6a4 4 0 015.6 0M2 3.3a7.2 7.2 0 0110 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg width="22" height="11" viewBox="0 0 22 11" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <rect x="2" y="2" width="15" height="7" rx="1.5" fill="currentColor" />
      <rect x="19.5" y="3.3" width="1.6" height="4.4" rx="0.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
function CheckIcon({ size = 12, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.3l3 3 6-6.6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PhoneGlyph({ size = 13, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M3 1.5h3l1.2 3-1.6 1.2a8 8 0 004.7 4.7l1.2-1.6 3 1.2v3a1.5 1.5 0 01-1.6 1.5A11.5 11.5 0 011.5 3.1 1.5 1.5 0 013 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function ChatGlyph({ size = 13, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M13 8.75a1.5 1.5 0 01-1.5 1.5H5.25L2.25 13V3.5A1.5 1.5 0 013.75 2h7.75a1.5 1.5 0 011.5 1.5v5.25z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function CameraGlyph({ size = 13, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="12" height="9" rx="2" stroke={color} strokeWidth="1.3" />
      <circle cx="7.5" cy="8" r="2.5" stroke={color} strokeWidth="1.3" />
      <circle cx="10.75" cy="5.75" r="0.6" fill={color} />
    </svg>
  );
}
function StorefrontGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 6.5V13.5H14V6.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M1.5 4L2.8 1.5H13.2L14.5 4C14.5 5.4 13.4 6.5 12 6.5C10.9 6.5 10 5.9 9.6 5C9.2 5.9 8.3 6.5 7.3 6.5C6.3 6.5 5.4 5.9 5 5C4.6 5.9 3.7 6.5 2.6 6.5C1.7 6.5 1.5 5.4 1.5 4Z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="6" y="9.5" width="4" height="4" stroke="#9CA3AF" strokeWidth="1.2" />
    </svg>
  );
}

/* Neutral grey default-profile silhouette -- explicitly NOT a real app's
   asset, just the generic head-and-shoulders glyph used everywhere as a
   placeholder avatar. */
function CustomerSilhouette({ size = 26 }: { size?: number }) {
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center" style={{ width: size, height: size, background: "#E5E7EB" }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4.2" fill="#9CA3AF" />
        <path d="M3.5 21c0-4.7 3.8-7.5 8.5-7.5s8.5 2.8 8.5 7.5" fill="#9CA3AF" />
      </svg>
    </div>
  );
}

/* Real Vela mark (same path as Logo.tsx's own SVG fallback), forced
   white, on the brand gradient -- "our real logo mark in white inside
   it," not a raster asset (guaranteed crisp at avatar scale, no image
   load dependency). */
function VelaAvatar({ size = 26 }: { size?: number }) {
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center" style={{ width: size, height: size, background: "var(--vela-gradient)" }}>
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M5 7L18 28L31 7" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="18" cy="30" r="2.5" fill="white" />
      </svg>
    </div>
  );
}

function CompetitorAvatar({ size = 26 }: { size?: number }) {
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center" style={{ width: size, height: size, background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
      <StorefrontGlyph size={size * 0.5} />
    </div>
  );
}

/* "Your business" initials avatar -- same visual convention as the real
   app's own account-pill avatar (bold initials on a circle). `bg`
   defaults to the Vela gradient (the "with Vela" business identity) but
   scene 0 (before Vela) passes a neutral grey -- same business, same
   initials-avatar style, but not yet Vela-branded. */
function OwnerAvatar({ size = 30, initials = "V", bg = "var(--vela-gradient)" }: { size?: number; initials?: string; bg?: string }) {
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

/* ─── iOS-style status bar, inside the phone screen ─────────────────── */
function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  const color = dark ? "white" : "#111111";
  return (
    <div className="flex items-center justify-between px-5 pt-2.5 pb-1 shrink-0" style={{ color }}>
      <span className="text-[11px] font-semibold tabular-nums">9:41</span>
      <div className="flex items-center gap-1">
        <SignalBars />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

/* ═══ Scene 1: "Without Vela" ═══════════════════════════════════════
   ringing -> missed -> chatCustomer -> chatCompetitor -> leadLost */
const WITHOUT_PHASES = ["ringing", "missed", "chatCustomer", "chatCompetitor", "leadLost"] as const;
type WithoutPhase = (typeof WITHOUT_PHASES)[number];
const WITHOUT_AT: Record<WithoutPhase, number> = {
  ringing: 0,
  missed: 2600,
  chatCustomer: 4200,
  chatCompetitor: 5100,
  leadLost: 6200,
};

function SceneWithoutVela({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<WithoutPhase>(reducedMotion ? "leadLost" : "ringing");

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) { setPhase("leadLost"); return; }
    setPhase("ringing");
    const timers = WITHOUT_PHASES.map((p) => setTimeout(() => setPhase(p), WITHOUT_AT[p]));
    return () => timers.forEach(clearTimeout);
  }, [active, reducedMotion]);

  const showCall = phase === "ringing" || phase === "missed";
  const missed = phase === "missed";

  return (
    <div className="flex flex-col h-full">
      {showCall ? (
        <div className="flex-1 flex flex-col items-center justify-between py-8" style={{ background: "linear-gradient(180deg,#1c1c1e,#000)" }}>
          <div className="text-center">
            <p className="text-white text-[17px] font-semibold">{t("landing.hero.story.yourBusiness")}</p>
            {!missed && <p className="text-white/50 text-[11px] mt-1">{t("landing.hero.story.callingStatus")}</p>}
          </div>

          <div className="relative flex items-center justify-center" style={{ width: 84, height: 84 }}>
            {!missed && !reducedMotion && [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{ width: 84, height: 84, border: "1.5px solid rgba(255,107,53,0.55)" }}
                animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.55, ease: "easeOut" }}
              />
            ))}
            <OwnerAvatar size={60} initials="YB" bg={missed ? "#3A1212" : "#4B5563"} />
          </div>

          {missed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "#EF4444" }}>
                <PhoneGlyph size={16} />
              </div>
              <p className="text-[#F87171] text-[12px] font-semibold">{t("landing.hero.story.noAnswer")}</p>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "#EF4444" }}>
              <PhoneGlyph size={16} />
            </div>
          )}
        </div>
      ) : (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
          style={{ background: "#F8FAFC" }}
        >
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#F1F5F9] bg-white shrink-0">
            <CompetitorAvatar size={24} />
            <span className="text-[11px] font-semibold text-[#374151]">{t("landing.hero.story.competitorName")}</span>
          </div>
          <div className="flex-1 flex flex-col justify-end gap-1.5 px-3.5 py-3">
            {/* Customer: light grey, own avatar on the outgoing side --
                spec: "customer light grey ... competitor neutral grey." */}
            <div className="flex items-end justify-end gap-1.5">
              <div className="max-w-[70%] px-3 py-2 rounded-2xl text-[11.5px] leading-snug text-[#374151]" style={{ background: "#F3F4F6", borderBottomRightRadius: 4 }}>
                {t("landing.hero.story.customerMsg")}
              </div>
              <div className="shrink-0"><CustomerSilhouette size={22} /></div>
            </div>
            {(phase === "chatCompetitor" || phase === "leadLost") && (
              <motion.div initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-end justify-start gap-1.5">
                <div className="shrink-0"><CompetitorAvatar size={22} /></div>
                <div className="max-w-[70%] px-3 py-2 rounded-2xl text-[11.5px] leading-snug text-[#374151]" style={{ background: "#E5E7EB", borderBottomLeftRadius: 4 }}>
                  {t("landing.hero.story.competitorReply")}
                </div>
              </motion.div>
            )}
            {phase === "leadLost" && (
              <motion.div initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex justify-center mt-1.5">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                  {t("landing.hero.story.leadLost")}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ═══ Scene 2: "With Vela" ═══════════════════════════════════════════
   customerMsg -> typing -> reply -> tap -> confirmed */
const WITH_PHASES = ["customerMsg", "typing", "reply", "tap", "confirmed"] as const;
type WithPhase = (typeof WITH_PHASES)[number];
const WITH_AT: Record<WithPhase, number> = {
  customerMsg: 300,
  typing: 1000,
  reply: 1800,
  tap: 3000,
  confirmed: 3600,
};

function SceneWithVela({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<WithPhase | "idle">(reducedMotion ? "confirmed" : "idle");

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) { setPhase("confirmed"); return; }
    setPhase("idle");
    const timers = WITH_PHASES.map((p) => setTimeout(() => setPhase(p), WITH_AT[p]));
    return () => timers.forEach(clearTimeout);
  }, [active, reducedMotion]);

  const atLeast = (p: WithPhase) => phase !== "idle" && WITH_PHASES.indexOf(phase) >= WITH_PHASES.indexOf(p);

  return (
    <div className="flex-1 flex flex-col" style={{ background: "#F8FAFC" }}>
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#F1F5F9] bg-white shrink-0">
        <OwnerAvatar size={24} initials="YB" />
        <span className="text-[11px] font-semibold text-[#374151]">{t("landing.hero.story.yourBusiness")}</span>
        <span className="ms-auto text-[9px] text-[#9CA3AF]">11:48 PM</span>
      </div>

      <div className="flex-1 flex flex-col justify-end gap-1.5 px-3.5 py-3">
        {atLeast("customerMsg") && (
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-end justify-end gap-1.5">
            <div className="max-w-[70%] px-3 py-2 rounded-2xl text-[11.5px] leading-snug text-[#374151]" style={{ background: "#F3F4F6", borderBottomRightRadius: 4 }}>
              {t("landing.hero.story.customerMsg")}
            </div>
            <div className="shrink-0"><CustomerSilhouette size={22} /></div>
          </motion.div>
        )}

        {phase === "typing" && !reducedMotion && (
          <div className="flex items-end gap-1.5">
            <div className="shrink-0"><VelaAvatar size={22} /></div>
            <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white border border-[#E5E7EB] w-fit" style={{ borderBottomLeftRadius: 4 }}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#9CA3AF" }} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          </div>
        )}

        {atLeast("reply") && (
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col items-start gap-1.5">
            {/* Vela replying: orange gradient + white text, per spec. */}
            <div className="flex items-end gap-1.5">
              <div className="shrink-0"><VelaAvatar size={22} /></div>
              <div className="max-w-[70%] px-3 py-2 rounded-2xl text-[11.5px] leading-snug text-white" style={{ background: "var(--vela-gradient)", borderBottomLeftRadius: 4 }}>
                {t("landing.hero.story.slot1")} {t("landing.hero.story.slot2")}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap ps-[28px]">
              {[t("landing.hero.story.slot1"), t("landing.hero.story.slot2")].map((slot, i) => {
                const tapped = atLeast("tap") && i === 0;
                return (
                  <span
                    key={slot}
                    className="text-[10.5px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                    style={tapped
                      ? { background: "var(--vela-gradient)", color: "white", borderColor: "transparent" }
                      : { background: "white", color: "#374151", borderColor: "#E5E7EB" }}
                  >
                    {slot}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        {atLeast("confirmed") && (
          <motion.div initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="mt-1 px-3 py-2.5 rounded-xl flex items-center gap-2" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#22C55E" }}>
              <CheckIcon size={10} />
            </span>
            <span className="text-[11px] font-semibold text-[#15803D]">{t("landing.hero.story.appointmentBooked")}</span>
          </motion.div>
        )}
      </div>

      {atLeast("confirmed") && (
        <motion.p initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }} className="text-center text-[10px] font-semibold pb-2.5 shrink-0" style={{ color: "#E8552B" }}>
          {t("landing.hero.story.answeredCaption")}
        </motion.p>
      )}
    </div>
  );
}

/* ═══ Scene 3: "Your morning" ═══════════════════════════════════════ */
const MORNING_PHASES = ["notif1", "notif2", "notif3", "summary"] as const;
type MorningPhase = (typeof MORNING_PHASES)[number];
const MORNING_AT: Record<MorningPhase, number> = { notif1: 700, notif2: 1500, notif3: 2300, summary: 3200 };

function SceneMorning({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<MorningPhase | "idle">(reducedMotion ? "summary" : "idle");

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) { setPhase("summary"); return; }
    setPhase("idle");
    const timers = MORNING_PHASES.map((p) => setTimeout(() => setPhase(p), MORNING_AT[p]));
    return () => timers.forEach(clearTimeout);
  }, [active, reducedMotion]);

  const atLeast = (p: MorningPhase) => phase !== "idle" && MORNING_PHASES.indexOf(phase) >= MORNING_PHASES.indexOf(p);

  const notifs = [
    { icon: <CameraGlyph size={13} color="white" />, bg: "linear-gradient(135deg,#F58529,#DD2A7B)", title: t("landing.hero.story.notif1Title"), app: t("landing.hero.story.notif1App"), show: atLeast("notif1") },
    { icon: <ChatGlyph size={13} color="white" />, bg: "#25D366", title: t("landing.hero.story.notif2Title"), app: t("landing.hero.story.notif2App"), show: atLeast("notif2") },
    { icon: <PhoneGlyph size={12} color="white" />, bg: "var(--vela-gradient)", title: t("landing.hero.story.notif3Title"), app: t("landing.hero.story.notif3App"), show: atLeast("notif3") },
  ];

  return (
    <div className="flex-1 flex flex-col items-center pt-3 px-3 gap-2" style={{ background: "linear-gradient(180deg,#0f1420,#1a2338)" }}>
      <p className="text-white text-[26px] font-semibold tabular-nums leading-none mt-2">6:42</p>
      <p className="text-white/60 text-[10px] font-medium mb-2">{t("landing.hero.story.lockDate")}</p>

      <div className="w-full flex flex-col gap-1.5">
        {notifs.map((n, i) => n.show && (
          <motion.div
            key={i}
            initial={reducedMotion ? false : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-xl px-2.5 py-2 flex items-start gap-2"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: n.bg }}>{n.icon}</span>
            <div className="min-w-0">
              <p className="text-white text-[10px] font-semibold leading-tight truncate">{n.app}</p>
              <p className="text-white/80 text-[10px] leading-tight">{n.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {atLeast("summary") && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full mt-auto mb-4 rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{ background: "var(--vela-gradient)" }}
        >
          <OwnerAvatar size={24} initials="V" />
          <span className="text-white text-[11px] font-semibold leading-snug">{t("landing.hero.story.summaryCard")}</span>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Step -> label key + scene renderer ────────────────────────────── */
const STEP_LABEL_KEYS = ["landing.hero.story.stepLabel0", "landing.hero.story.stepLabel1", "landing.hero.story.stepLabel2"];

/* ═══════════════════════════════════════════════════════════════
   Top-level orchestrator: the phone stage, step label, dots + Next,
   swipe. Mobile only (hidden lg:up -- see MissedCallStory wrapper and
   Hero.tsx's lg:hidden usage), lazy-loaded via next/dynamic from Hero. */
export default function MissedCallStory({
  loggedIn,
  ctaHref,
  ctaLabel,
}: {
  loggedIn: boolean;
  ctaHref: string;
  ctaLabel: string;
}) {
  const { t, locale } = useI18n();
  const isRTL = locale === "ar";
  const prefersReducedMotionRaw = useReducedMotion();
  const reducedMotion = !!prefersReducedMotionRaw;
  const [stageRef, inView] = useInView<HTMLDivElement>();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback((next: number) => {
    setStep((prev) => {
      const clamped = Math.max(0, Math.min(STEP_COUNT - 1, next));
      setDirection(clamped >= prev ? 1 : -1);
      return clamped;
    });
  }, []);

  function onTouchStart(e: ReactTouchEvent) {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }
  function onTouchEnd(e: ReactTouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Horizontal-dominant only, real threshold -- never fired on a
    // vertical scroll gesture, and never calls preventDefault (no
    // touchmove listener at all), so page scroll is never blocked.
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const swipedTowardStart = isRTL ? dx > 0 : dx < 0;
    goTo(step + (swipedTowardStart ? 1 : -1));
  }

  const isLast = step === STEP_COUNT - 1;
  const nextLabel = isLast ? ctaLabel : t("landing.hero.story.next");

  return (
    <div className="lg:hidden w-full flex flex-col items-center" ref={stageRef}>
      {/* Step label */}
      <p className="text-[13px] font-semibold mb-3" style={{ color: "#E8552B" }}>
        {t(STEP_LABEL_KEYS[step])}
      </p>

      {/* 3D stage */}
      <div
        className="relative"
        style={{ perspective: "1000px", width: PHONE_W, touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="group"
        aria-label={t("landing.hero.story.swipeAria")}
      >
        {/* ground shadow -- pre-softened radial-gradient, no filter:blur() */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ bottom: -14, width: PHONE_W * 0.72, height: 28, background: "radial-gradient(ellipse, rgba(255,107,53,0.30) 0%, rgba(255,107,53,0) 72%)" }}
          aria-hidden="true"
        />

        <div className={reducedMotion ? "" : "animate-float"} style={{ transformStyle: "preserve-3d" }}>
          <div style={{ transform: "rotateY(-10deg) rotateX(6deg)", transformStyle: "preserve-3d" }}>
            {/* Bezel */}
            <div
              className="relative rounded-[38px]"
              style={{ width: PHONE_W, padding: 10, background: "linear-gradient(160deg,#2b2b2d,#0b0b0c)", boxShadow: "0 26px 46px -14px rgba(0,0,0,0.38), inset 0 1px 1px rgba(255,255,255,0.18)" }}
            >
              {/* Screen */}
              <div className="relative rounded-[28px] overflow-hidden bg-white" style={{ width: SCREEN_W, height: SCREEN_H }}>
                {/* Dynamic island */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black z-20" style={{ width: SCREEN_W * 0.32, height: 18 }} aria-hidden="true" />

                <div className="absolute inset-0 flex flex-col">
                  <PhoneStatusBar dark={step === 0 || step === 2} />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={reducedMotion ? false : { opacity: 0, x: direction * 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      {step === 0 && <SceneWithoutVela active={inView} reducedMotion={reducedMotion} />}
                      {step === 1 && <SceneWithVela active={inView} reducedMotion={reducedMotion} />}
                      {step === 2 && <SceneMorning active={inView} reducedMotion={reducedMotion} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Gloss highlight -- static, pure gradient, no blur */}
              <div
                className="absolute rounded-[28px] pointer-events-none"
                style={{ top: 10, left: 10, width: SCREEN_W, height: SCREEN_H, background: "linear-gradient(135deg, rgba(255,255,255,0.22), transparent 42%)" }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dots + Next */}
      <div className="flex items-center gap-5 mt-6">
        <div className="flex items-center gap-1">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${t("landing.hero.story.dotAria")} ${i + 1}`}
              aria-current={step === i ? "step" : undefined}
              className="w-11 h-11 flex items-center justify-center -m-2.5"
            >
              <span
                className="block rounded-full transition-all duration-200"
                style={step === i ? { width: 18, height: 7, background: "var(--vela-gradient)" } : { width: 7, height: 7, background: "#E5E7EB" }}
              />
            </button>
          ))}
        </div>

        {isLast ? (
          <a
            href={ctaHref}
            className="btn-primary text-sm px-6 py-3 min-h-[44px]"
            aria-label={nextLabel}
          >
            {nextLabel}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            aria-label={t("landing.hero.story.nextAria")}
            className="btn-primary gap-1.5 text-sm px-6 py-3 min-h-[44px]"
          >
            {nextLabel}
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" className="rtl:-scale-x-100 shrink-0" aria-hidden="true">
              <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
