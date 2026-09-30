"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { useI18n } from "@/lib/i18n";
import StoryDevice from "@/components/landing/StoryDevice";

const STEP_COUNT = 3;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px 0px", threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

function NextArrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

/* Phone.dc.html spec: centered eyebrow/headline/CTA above this (handled
   by Hero.tsx), then this block -- title, 3-tab segmented control (the
   step label LIVES in the tabs here, never a separate label that could
   hide under the sticky header -- scroll-margin-top on the tabs row
   guards the same thing on anchor-jump/keyboard-focus scroll), the
   scaled+tilted phone, dots + Next/Start for Free. Content-height, not
   100svh -- the old full-screen mobile hero rule is gone. */
export default function HeroPhoneStory({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const { t, locale } = useI18n();
  const isRTL = locale === "ar";
  const [stageRef, inView] = useInView<HTMLDivElement>();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const labels = [t("landing.hero.story2.stepLabel0"), t("landing.hero.story2.stepLabel1"), t("landing.hero.story2.stepLabel2")];
  const isLast = step === STEP_COUNT - 1;

  function goTo(next: number) {
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, next)) as 0 | 1 | 2);
  }
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
    // Horizontal-dominant only, no touchmove listener, no preventDefault
    // ever -- can never compete with vertical page scroll.
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const towardNext = isRTL ? dx > 0 : dx < 0;
    goTo(step + (towardNext ? 1 : -1));
  }

  // FIX 3 round: bigger + calmer phone (scale 0.833->0.9, less tilt
  // -9deg->-6deg, mirrored under RTL as before).
  const tiltY = isRTL ? 6 : -6;
  const SCALE = 0.9;
  const deviceW = Math.round(300 * SCALE);
  const deviceH = Math.round(620 * SCALE);

  return (
    <div ref={stageRef} style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-display), 'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", textAlign: "center" }}>
        {t("landing.hero.story2.phoneStoryTitle")}
      </span>

      {/* scroll-margin-top clears the fixed mobile header pill (64px +
          16px top offset) so the tabs -- which carry the step label --
          are never hidden under it on an anchor jump or keyboard-focus
          scroll. */}
      <div style={{ marginTop: 16, scrollMarginTop: 96, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, width: 342, padding: 4, boxSizing: "border-box", borderRadius: 999, background: "#F6EFEA" }}>
        {labels.map((label, i) => {
          const active = i === step;
          return (
            <button
              key={i}
              type="button"
              className="v-tab"
              aria-pressed={active}
              onClick={() => goTo(i)}
              style={{ height: 40, borderRadius: 999, fontSize: 13, fontWeight: 600, background: active ? "#FFFFFF" : "transparent", color: active ? "#17120E" : "#7A6F68", boxShadow: active ? "0 2px 10px rgba(90,40,15,0.14)" : "none" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        style={{ position: "relative", width: deviceW, height: deviceH, marginTop: 24, touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="group"
        aria-label={t("landing.hero.story2.phoneStoryTitle")}
      >
        <div style={{ position: "absolute", left: deviceW * 0.08, bottom: -13, width: deviceW * 0.84, height: 32, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(120,45,15,0.26), rgba(120,45,15,0))" }} aria-hidden="true" />
        <div style={{ transform: `perspective(1400px) rotateY(${tiltY}deg) rotateX(5deg)` }}>
          <div style={{ width: 300, height: 620, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
            <div className="v-float" style={{ width: 300, height: 620 }}>
              <StoryDevice key={step} step={step} paused={!inView} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: 342, marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${t("landing.hero.story2.dotAria")} ${i + 1}`}
              aria-pressed={i === step}
              style={{ padding: 8, margin: -8 }}
            >
              <span style={{ display: "block", height: 8, width: i === step ? 26 : 8, borderRadius: 4, background: i === step ? "#E8552B" : "#E6DDD7", transition: "width .2s,background .2s" }} />
            </button>
          ))}
        </div>
        {!isLast ? (
          <button
            type="button"
            className="v-btn"
            onClick={() => goTo(step + 1)}
            style={{ height: 50, padding: "0 24px", borderRadius: 999, background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, boxShadow: "0 12px 24px -10px rgba(232,85,43,0.7)" }}
          >
            {t("landing.hero.story2.next")}
            <NextArrow />
          </button>
        ) : (
          <a
            href={ctaHref}
            className="v-link"
            style={{ height: 50, padding: "0 24px", borderRadius: 999, background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 12px 24px -10px rgba(232,85,43,0.7)" }}
          >
            {ctaLabel}
            <NextArrow />
          </a>
        )}
      </div>
    </div>
  );
}
