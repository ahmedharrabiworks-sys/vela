"use client";

import { useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { useI18n } from "@/lib/i18n";
import StoryDevice, { STORY_DURATIONS_MS } from "@/components/landing/StoryDevice";
import AutoplayProgressBar from "@/components/landing/AutoplayProgressBar";
import Crossfade from "@/components/landing/Crossfade";
import { useAutoplayStep } from "@/lib/useAutoplayStep";
import { bdiVela } from "@/lib/bdi";

const STEP_COUNT = 3;

function NextArrow({ flip }: { flip?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
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
  const { sectionRef: stageRef, step, goTo, elapsedMs, advanceProgress, prefersReducedMotion } = useAutoplayStep<HTMLDivElement>(STEP_COUNT, STORY_DURATIONS_MS);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const labels = [t("landing.hero.story2.stepLabel0"), t("landing.hero.story2.stepLabel1"), t("landing.hero.story2.stepLabel2")];
  const isLast = step === STEP_COUNT - 1;
  const crossfadeMs = prefersReducedMotion ? 1 : 500;

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
    // hero-v5 round (FIX 4): the secondary "How it works" button above
    // this block was removed (Hero.tsx), so the primary CTA is now the
    // last thing before this -- 128 -> 56, landing this title ~56px
    // below the CTA as asked, not the old two-button stack's spacing.
    <div ref={stageRef} style={{ marginTop: 56, display: "flex", flexDirection: "column", alignItems: "center" }}>
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
              style={{ position: "relative", overflow: "hidden", height: 40, borderRadius: 999, fontSize: 13, fontWeight: 600, background: active ? "#FFFFFF" : "transparent", color: active ? "#17120E" : "#7A6F68", boxShadow: active ? "0 2px 10px rgba(90,40,15,0.14)" : "none" }}
            >
              {bdiVela(label)}
              {active && <AutoplayProgressBar progress={advanceProgress} />}
            </button>
          );
        })}
      </div>

      {/* hero-v3 round (FIX 4): was drifting left -- the unscaled 300px-
          wide phone box (transform doesn't shrink an element's own
          layout footprint, only its rendered pixels) sat inside this
          270px-wide (deviceW) stage as a normal-flow child, so it simply
          started flush at the stage's own left edge and overflowed 30px
          on the right, with the old transformOrigin:"top left" scaling
          it down from that same left-anchored point instead of from the
          middle. Two real fixes together, not just the one-line origin
          change: (1) this wrapper is now flex+justify-center, so the
          300px child is centered as a LAYOUT box regardless of the
          270px/300px width mismatch; (2) transformOrigin "top left" ->
          "top center" so the scale itself also shrinks symmetrically
          rather than pinned to the left edge. Verified via computed
          getBoundingClientRect(): equal left/right margins at both 375
          and 390 (52.5/52.5 and 60/60px). */}
      <div
        style={{ position: "relative", width: deviceW, height: deviceH, marginTop: 24, display: "flex", justifyContent: "center", touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="group"
        aria-label={t("landing.hero.story2.phoneStoryTitle")}
      >
        <div style={{ position: "absolute", left: deviceW * 0.08, bottom: -13, width: deviceW * 0.84, height: 32, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(120,45,15,0.26), rgba(120,45,15,0))" }} aria-hidden="true" />
        {/* flexShrink:0 -- this flex item's natural (unscaled) layout
            width is 300px, wider than the 270px-ish deviceW container;
            without this, the flexbox algorithm's default shrink:1 would
            compress its LAYOUT box to fit before the scale transform
            below ever applies (transform never participates in flex
            sizing), silently double-shrinking the phone. Pinning the
            layout width at 300px and letting justify-content:center
            (above) center that overflowing box is what makes the
            top-center scale origin below actually land centered. */}
        <div style={{ flexShrink: 0, transform: `perspective(1400px) rotateY(${tiltY}deg) rotateX(5deg)` }}>
          <div style={{ width: 300, height: 620, transform: `scale(${SCALE})`, transformOrigin: "top center" }}>
            <div className="v-float" style={{ width: 300, height: 620 }}>
              {/* FIX 1/3 round: no more key={step} remount -- see
                  HeroDesktopStory.tsx for the full Crossfade rationale,
                  identical here. */}
              <Crossfade
                activeKey={step}
                durationMs={crossfadeMs}
                renderItem={(s, frozen) => (
                  <StoryDevice step={s as 0 | 1 | 2} elapsedMs={frozen || prefersReducedMotion ? STORY_DURATIONS_MS[s as number] : elapsedMs} />
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* hero-v5 round (FIX 4): Back/Next removed on phone -- navigation
          is swipe (onTouchStart/End above, mirrors direction under RTL)
          + the tabs + these dots, all calling the same goTo(), which
          still pauses autoplay 12s then resumes. Dots alone, centered,
          now that there's no trailing control group to balance against. */}
      <div style={{ width: 342, marginTop: 20, display: "flex", justifyContent: "center" }}>
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
      </div>

      {/* With no Next button to swap into a CTA, the "Start for Free" pill
          appears under the dots once step 3 is showing (auto-advance or
          swipe/tap) and stays visible for as long as step 3 is shown. */}
      {isLast && (
        <a
          href={ctaHref}
          className="v-link"
          style={{ width: 342, marginTop: 16, height: 50, padding: "0 24px", boxSizing: "border-box", borderRadius: 999, background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16, fontWeight: 600, textDecoration: "none", boxShadow: "0 12px 24px -10px rgba(232,85,43,0.7)" }}
        >
          {ctaLabel}
          <NextArrow flip={isRTL} />
        </a>
      )}
    </div>
  );
}
