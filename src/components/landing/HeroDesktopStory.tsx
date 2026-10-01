"use client";

import { useI18n } from "@/lib/i18n";
import StoryDevice, { STORY_DURATIONS_MS } from "@/components/landing/StoryDevice";
import AutoplayProgressBar from "@/components/landing/AutoplayProgressBar";
import Crossfade from "@/components/landing/Crossfade";
import { useAutoplayStep } from "@/lib/useAutoplayStep";
import { bdiVela } from "@/lib/bdi";

const STEP_COUNT = 3;

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function easeOutCubic(p: number) {
  const t = clamp01(p);
  return 1 - Math.pow(1 - t, 3);
}
function cardReveal(elapsedMs: number, atMs: number) {
  const p = easeOutCubic((elapsedMs - atMs) / 420);
  return { opacity: p, transform: `translateY(${8 * (1 - p)}px)` } as React.CSSProperties;
}

function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>;
}
function LightningIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
}
function CrescentIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
}
function PhoneMissedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      <path d="M16 2l6 6M22 2l-6 6" />
    </svg>
  );
}
function StorefrontIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0" /><path d="M10 20v-5h4v5" />
    </svg>
  );
}
/* Per-step floating context cards -- exact copy/colors/positions from
   Main.dc.html, delays re-timed for FIX 2 (hero-v4 round). Desktop only
   (absent from Phone.dc.html). `at` values are the OLD delays scaled by
   each step's new/old total-duration ratio: old totals were
   [10500,8500,5800]ms, new are STORY_DURATIONS_MS ([16500,13400,10500])
   -- same relative moment in the story, just paced to the slower
   timeline. Pure function of elapsedMs (see cardReveal above), same
   pause-safe architecture as StoryDevice itself. */
function useCardData() {
  const { t } = useI18n();
  return [
    [
      { icon: <PhoneMissedIcon />, iconBg: "#FDECEC", iconColor: "#E5484D", title: t("landing.hero.story2.cardMissedCallTitle"), subtitle: t("landing.hero.story2.cardMissedCallSubtitle"), at: 4400 },
      { icon: <StorefrontIcon />, iconBg: "#F1ECE8", iconColor: "#6B625C", title: t("landing.hero.story2.cardBookedCompetitorTitle"), subtitle: t("landing.hero.story2.cardBookedCompetitorSubtitle"), at: 10800 },
    ],
    [
      { icon: <LightningIcon />, iconBg: "#FFF1EA", iconColor: "#E8552B", title: t("landing.hero.story2.cardRepliedTitle"), subtitle: t("landing.hero.story2.cardRepliedSubtitle"), at: 3500 },
      { icon: <CheckIcon />, iconBg: "#E7F6EE", iconColor: "#1F9D55", title: t("landing.hero.story2.appointmentBookedTitle"), subtitle: t("landing.hero.story2.appointmentBookedSubtitle"), at: 7700 },
    ],
    [
      { icon: <CrescentIcon />, iconBg: "#FFF1EA", iconColor: "#E8552B", title: t("landing.hero.story2.cardWhileSleptTitle"), subtitle: t("landing.hero.story2.cardWhileSleptSubtitle"), at: 1100 },
      { icon: <CheckIcon />, iconBg: "#E7F6EE", iconColor: "#1F9D55", title: t("landing.hero.story2.cardThreeCustomersTitle"), subtitle: t("landing.hero.story2.cardThreeCustomersSubtitle"), at: 4500 },
    ],
  ] as const;
}

export default function HeroDesktopStory() {
  const { t, locale } = useI18n();
  const isRTL = locale === "ar";
  const { sectionRef: stageRef, step, goTo, elapsedMs, advanceProgress, prefersReducedMotion, isVisible } = useAutoplayStep<HTMLDivElement>(STEP_COUNT, STORY_DURATIONS_MS);
  const cardSets = useCardData();
  const cards = cardSets[step];
  const labels = [t("landing.hero.story2.stepLabel0"), t("landing.hero.story2.stepLabel1"), t("landing.hero.story2.stepLabel2")];
  // FIX 3 round: near-instant under reduced motion instead of skipping
  // the crossfade outright -- keeps the code path identical, just
  // imperceptible, matching "final states only."
  const crossfadeMs = prefersReducedMotion ? 1 : 500;

  // Mirrors under RTL (explicit ask: "the tilt mirrors"), unchanged on LTR.
  const tiltY = isRTL ? 16 : -16;
  const tiltZ = isRTL ? -1 : 1;

  return (
    <div ref={stageRef} style={{ position: "relative", width: 580, height: 780, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ position: "relative", width: 580, height: 660, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", left: 150, bottom: 6, width: 300, height: 40, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(120,45,15,0.28), rgba(120,45,15,0))" }} aria-hidden="true" />
        <div style={{ transform: `perspective(1600px) rotateY(${tiltY}deg) rotateX(6deg) rotateZ(${tiltZ}deg)` }}>
          {/* faq-fix-2 round (FIX 1.2): .v-float (a 7s infinite CSS bob)
              had no visibility gating at all -- it ran forever once
              mounted, including while scrolled all the way down to the
              FAQ, continuously costing a composited layer's worth of
              per-frame work on top of whatever the FAQ toggle itself
              needed. `v-story-paused` (already used by the tour for the
              same purpose) freezes it via animation-play-state the
              moment this section leaves view. */}
          <div className={`v-float${isVisible ? "" : " v-story-paused"}`} style={{ width: 300, height: 620 }}>
            {/* FIX 1/3 round: no more key={step} remount -- Crossfade keeps
                the outgoing step mounted (frozen at its final elapsedMs)
                while it fades out, simultaneously with the incoming step
                fading in fresh from elapsedMs=0 (or, under reduced
                motion, every step just shows its own final state
                immediately, "final states only"). */}
            <Crossfade
              activeKey={step}
              durationMs={crossfadeMs}
              renderItem={(s, frozen) => (
                <StoryDevice step={s as 0 | 1 | 2} elapsedMs={frozen || prefersReducedMotion ? STORY_DURATIONS_MS[s as number] : elapsedMs} />
              )}
            />
          </div>
        </div>

        {/* hero-v5 round (FIX 2): 138px (previous round) made the title
            wrap in translations longer than English. Back to a real
            width -- 210px base, 230px from ~1320px up (comfortably
            covers 1440/1920; 1280 stays at the narrower 210 since the
            two-column row only has ~50px of outer margin to spare there,
            and a 230px card pushed further out would run off the
            viewport edge). Title is nowrap+ellipsis (never wraps, even
            if a translation is unexpectedly long), subtitle clamped to 2
            lines. Still positioned at the stage's own left:0/right:0 --
            same as before, so these only reach into the phone's bezel
            margin, never deep into the screen's own content area. */}
        {cards.map((c, i) => (
          <div
            key={i}
            className="w-[210px] min-[1320px]:w-[230px]"
            style={{
              position: "absolute",
              boxSizing: "border-box",
              ...(i === 0 ? { top: 96, left: 0 } : { bottom: 170, right: 0 }),
              display: "flex", alignItems: "center", gap: 9, padding: "10px 11px 10px 9px", borderRadius: 14,
              background: "#FFFFFF", border: "1px solid #F1E7E1", boxShadow: "0 22px 44px -22px rgba(120,50,20,0.38)",
              ...(prefersReducedMotion ? { opacity: 1 } : cardReveal(elapsedMs, c.at)),
            }}
          >
            <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: c.iconBg, color: c.iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: "#17120E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
              <span style={{ fontSize: 11, lineHeight: 1.3, color: "#7A6F68", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* hero-v6 round (FIX 3): Back/Next and the last-step CTA pill are
          gone on desktop -- autoplay + clicking a tab are the only ways
          to move between steps now (same as the control row's old
          fallback behavior, just without the manual stepper buttons).
          "Centered under the phone, not the stage" -- measured via the
          dynamic island's real getBoundingClientRect(): the phone's true
          rendered center sits ~12.8px off the stage's own geometric
          center (the rotateY/rotateZ perspective transform skews its
          projected bounding box; this offset is identical at 1440 and
          1920, and mirrors sign exactly under RTL, confirming it's a
          fixed transform artifact, not a viewport-dependent one). This
          row is still centered via stageRef's own alignItems:center
          (unchanged), with that measured offset applied as a corrective
          translateX on top of it. white-space:nowrap kept on each label
          regardless, since a translation can still be long. */}
      <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, background: "#F6EFEA", transform: `translateX(${isRTL ? -12.8 : 12.8}px)` }}>
        {labels.map((label, i) => {
          const active = i === step;
          return (
            <button
              key={i}
              type="button"
              className="v-tab"
              aria-pressed={active}
              onClick={() => goTo(i)}
              style={{ position: "relative", overflow: "hidden", padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", background: active ? "#FFFFFF" : "transparent", color: active ? "#17120E" : "#7A6F68", boxShadow: active ? "0 2px 10px rgba(90,40,15,0.14)" : "none" }}
            >
              {bdiVela(label)}
              {active && <AutoplayProgressBar progress={advanceProgress} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
