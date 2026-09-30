"use client";

import { useEffect, useRef, useState } from "react";
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
function NextArrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

/* Per-step floating context cards -- exact copy/colors/positions/delays
   from Main.dc.html. Desktop only (absent from Phone.dc.html). */
function useCardData() {
  const { t } = useI18n();
  return [
    [
      { icon: <PhoneMissedIcon />, iconBg: "#FDECEC", iconColor: "#E5484D", title: t("landing.hero.story2.cardMissedCallTitle"), subtitle: t("landing.hero.story2.cardMissedCallSubtitle"), delay: "2.8s" },
      { icon: <StorefrontIcon />, iconBg: "#F1ECE8", iconColor: "#6B625C", title: t("landing.hero.story2.cardBookedCompetitorTitle"), subtitle: t("landing.hero.story2.cardBookedCompetitorSubtitle"), delay: "6.9s" },
    ],
    [
      { icon: <LightningIcon />, iconBg: "#FFF1EA", iconColor: "#E8552B", title: t("landing.hero.story2.cardRepliedTitle"), subtitle: t("landing.hero.story2.cardRepliedSubtitle"), delay: "2.2s" },
      { icon: <CheckIcon />, iconBg: "#E7F6EE", iconColor: "#1F9D55", title: t("landing.hero.story2.appointmentBookedTitle"), subtitle: t("landing.hero.story2.appointmentBookedSubtitle"), delay: "4.9s" },
    ],
    [
      { icon: <CrescentIcon />, iconBg: "#FFF1EA", iconColor: "#E8552B", title: t("landing.hero.story2.cardWhileSleptTitle"), subtitle: t("landing.hero.story2.cardWhileSleptSubtitle"), delay: "0.6s" },
      { icon: <CheckIcon />, iconBg: "#E7F6EE", iconColor: "#1F9D55", title: t("landing.hero.story2.cardThreeCustomersTitle"), subtitle: t("landing.hero.story2.cardThreeCustomersSubtitle"), delay: "2.5s" },
    ],
  ] as const;
}

export default function HeroDesktopStory({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const { t, locale } = useI18n();
  const isRTL = locale === "ar";
  const [stageRef, inView] = useInView<HTMLDivElement>();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const cardSets = useCardData();
  const cards = cardSets[step];
  const labels = [t("landing.hero.story2.stepLabel0"), t("landing.hero.story2.stepLabel1"), t("landing.hero.story2.stepLabel2")];
  const isLast = step === STEP_COUNT - 1;

  // Mirrors under RTL (explicit ask: "the tilt mirrors"), unchanged on LTR.
  const tiltY = isRTL ? 16 : -16;
  const tiltZ = isRTL ? -1 : 1;

  return (
    <div ref={stageRef} style={{ position: "relative", width: 580, height: 780, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ position: "relative", width: 580, height: 660, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", left: 150, bottom: 6, width: 300, height: 40, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(120,45,15,0.28), rgba(120,45,15,0))" }} aria-hidden="true" />
        <div style={{ transform: `perspective(1600px) rotateY(${tiltY}deg) rotateX(6deg) rotateZ(${tiltZ}deg)` }}>
          <div className="v-float" style={{ width: 300, height: 620 }}>
            <StoryDevice key={step} step={step} paused={!inView} />
          </div>
        </div>

        {/* FIX 2 round: the phone's real screen occupies x:150-430 within
            this 580-wide stage (300px phone centered -> 140-440, minus the
            10px bezel each side). These cards used to be ~230-260px wide
            at left:0/right:0, which reached ~100px into that screen range
            and covered real content (the competitor header, the lead-lost
            card). Narrowed to a fixed 138px and kept at left:0/right:0 so
            they sit entirely within the 0-150 / 430-580 margins outside
            the screen -- at most grazing the phone's own bezel edge
            (140-150 / 430-440), never the screen content, at every
            verified width (1280/1440/1920 all give this stage the same
            580px -- the two-column row just gets more outer whitespace on
            wider viewports, never less room here). */}
        {cards.map((c, i) => (
          <div
            key={i}
            className="v-pop"
            style={{
              position: "absolute",
              width: 138, boxSizing: "border-box",
              ...(i === 0 ? { top: 96, left: 0 } : { bottom: 170, right: 0 }),
              display: "flex", alignItems: "center", gap: 9, padding: "10px 11px 10px 9px", borderRadius: 14,
              background: "#FFFFFF", border: "1px solid #F1E7E1", boxShadow: "0 22px 44px -22px rgba(120,50,20,0.38)",
              animationDelay: c.delay,
            }}
          >
            <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: c.iconBg, color: c.iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: "#17120E" }}>{c.title}</span>
              <span style={{ fontSize: 11, lineHeight: 1.3, color: "#7A6F68" }}>{c.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 999, background: "#F6EFEA" }}>
          {labels.map((label, i) => {
            const active = i === step;
            return (
              <button
                key={i}
                type="button"
                className="v-tab"
                aria-pressed={active}
                onClick={() => setStep(i as 0 | 1 | 2)}
                style={{ padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, background: active ? "#FFFFFF" : "transparent", color: active ? "#17120E" : "#7A6F68", boxShadow: active ? "0 2px 10px rgba(90,40,15,0.14)" : "none" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {!isLast ? (
          <button
            type="button"
            className="v-btn"
            aria-label={t("landing.hero.story2.nextAria")}
            onClick={() => setStep((s) => (Math.min(s + 1, 2) as 0 | 1 | 2))}
            style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px -10px rgba(232,85,43,0.7)" }}
          >
            <NextArrow />
          </button>
        ) : (
          <a
            href={ctaHref}
            className="v-link"
            style={{ height: 48, padding: "0 22px", borderRadius: 999, background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, textDecoration: "none", boxShadow: "0 12px 24px -10px rgba(232,85,43,0.7)" }}
          >
            {ctaLabel}
            <NextArrow />
          </a>
        )}
      </div>
    </div>
  );
}
