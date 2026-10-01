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
{/* hero-v5 round (FIX 6): the arrow glyphs are absolute SVG paths, not
    logical/direction-aware -- CSS dir="rtl" auto-mirrors the ROW layout
    (tabs move right, Back/Next move left) but never touches a fixed
    viewBox's own path data, so without this the arrows would keep
    pointing their LTR direction while sitting in mirrored positions.
    `flip` applies scaleX(-1) under RTL so "forward" still visually
    points the way the row actually reads. */}
function NextArrow({ flip }: { flip?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
function BackArrow({ flip }: { flip?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
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

export default function HeroDesktopStory({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const { t, locale } = useI18n();
  const isRTL = locale === "ar";
  const { sectionRef: stageRef, step, goTo, elapsedMs, advanceProgress, prefersReducedMotion } = useAutoplayStep<HTMLDivElement>(STEP_COUNT, STORY_DURATIONS_MS);
  const cardSets = useCardData();
  const cards = cardSets[step];
  const labels = [t("landing.hero.story2.stepLabel0"), t("landing.hero.story2.stepLabel1"), t("landing.hero.story2.stepLabel2")];
  const isLast = step === STEP_COUNT - 1;
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
          <div className="v-float" style={{ width: 300, height: 620 }}>
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

      {/* hero-v5 round (FIX 1): the last step's CTA pill ("Start for
          Free") is wider than the round Next button it replaces -- with
          no guard, this flex row's default flex-shrink:1 let the tabs
          segment get squeezed to make room, wrapping tab labels onto a
          second line only on step 3. Three real fixes, not patches: (1)
          every tab label and the CTA get white-space:nowrap -- text can
          never wrap internally regardless of available width; (2) the
          tabs segment gets flexShrink:0 -- it keeps its natural width no
          matter what else is in the row; (3) the trailing Next/CTA slot
          is a FIXED width (sized to the CTA pill, the widest of the two
          states) instead of the control each state naturally renders at,
          so the row's total width -- and the tabs' position within it --
          is byte-identical across all 3 steps, not just non-wrapping. */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, background: "#F6EFEA", flexShrink: 0 }}>
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
        {/* hero-v3 round: Back added alongside the existing round Next
            button (both call the shared goTo(), which jumps + pauses
            autoplay for 12s per FIX 2). Back always wraps step-1..-1
            (0 -> loops to the last step); the last step keeps its
            existing Next -> "Start for Free" swap, Back still works
            there to step back to step 1. */}
        <button
          type="button"
          className="v-btn"
          aria-label={t("landing.hero.story2.backAria")}
          onClick={() => goTo(step - 1)}
          style={{ width: 44, height: 44, borderRadius: "50%", background: "#F6EFEA", color: "#17120E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <BackArrow flip={isRTL} />
        </button>
        <div style={{ width: 210, flexShrink: 0, display: "flex", alignItems: "center" }}>
          {!isLast ? (
            <button
              type="button"
              className="v-btn"
              aria-label={t("landing.hero.story2.nextAria")}
              onClick={() => goTo(step + 1)}
              style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px -10px rgba(232,85,43,0.7)" }}
            >
              <NextArrow flip={isRTL} />
            </button>
          ) : (
            <a
              href={ctaHref}
              className="v-link"
              style={{ width: "100%", boxSizing: "border-box", height: 48, padding: "0 22px", borderRadius: 999, background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", textDecoration: "none", boxShadow: "0 12px 24px -10px rgba(232,85,43,0.7)" }}
            >
              {ctaLabel}
              <NextArrow flip={isRTL} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
