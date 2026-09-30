"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/ui/Logo";
import LanguageToggle from "@/components/landing/LanguageToggle";
import OpenVelaButton from "@/components/landing/OpenVelaButton";
import { useLandingSession } from "@/lib/use-landing-session";

// Hero v2 round: lazy, client-only story stages -- next/dynamic +
// ssr:false keeps both out of the initial server render so the hero's
// own text (header/eyebrow/headline/CTA) paints first regardless of
// device. Fixed-height placeholders match each real component's own
// footprint to avoid a layout jump once the real chunk arrives (CLS).
const HeroDesktopStory = dynamic(() => import("@/components/landing/HeroDesktopStory"), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ width: 580, height: 780 }} />,
});
const HeroPhoneStory = dynamic(() => import("@/components/landing/HeroPhoneStory"), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ height: 700 }} />,
});

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// Header redesign round: real in-page anchors, all 4 sections now actually
// mounted on the homepage (Pricing and ProductTourDemo/"how it works"
// already had stable ids; ProblemSection gained #problem and the new FAQ
// section ships with #faq -- see those files). Order matches the explicit
// spec: Pricing, How it works, The problem, FAQ. Shared by both the
// desktop nav and the mobile hamburger menu below.
const NAV_LINKS = [
  { key: "pricing", href: "#pricing" },
  { key: "howItWorks", href: "#how-it-works" },
  { key: "problem", href: "#problem" },
  { key: "faq", href: "#faq" },
] as const;

/** Tracks which nav-linked section is currently in view, for the active-link
    highlight. Plain IntersectionObserver, not scroll-position math -- a thin
    horizontal band just above the viewport's vertical center is the
    "trigger zone"; whichever observed section is intersecting it is active.
    Purely visual state -- the actual scrolling is native browser anchor
    navigation (html { scroll-behavior: smooth } is already set globally),
    so this never needs to touch scroll position itself. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        );
        setActive(topmost.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const NAV_IDS = NAV_LINKS.map((l) => l.href.slice(1));

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "#E8552B" }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" />
    </svg>
  );
}
function ArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:-scale-x-100">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
function ChannelChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, background: "#FFF4EE", color: "#9A3412", fontSize: 13, fontWeight: 600 }}>
      {children}
    </span>
  );
}

export default function Hero() {
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeSection = useActiveSection(NAV_IDS);
  // Logged-in header round: "loading" renders identically to "out" (the
  // server-rendered default), so a logged-out visitor -- the common case --
  // never sees a flash of the wrong header. Only a genuinely logged-in
  // visitor sees a brief swap once the local session read resolves (no
  // network call), a few ms after hydration.
  const session = useLandingSession();
  const loggedIn = session.status === "in";
  const ctaHref = loggedIn ? "/app" : "/auth/signup";
  const ctaLabel = loggedIn ? t("landing.hero.ctaLoggedIn") : t("landing.hero.cta");
  const storyCtaLabel = loggedIn ? t("landing.hero.story2.openVela") : t("landing.hero.story2.start");

  return (
    <section id="hero-section" className="relative flex flex-col bg-white">
      {/* Hero v2 round: the old phone-only min-h-[100svh] full-screen rule
          is gone entirely (FIX 2, explicit ask) -- the phone hero is
          content-height now, same as desktop, exactly like the approved
          spec (reference/Phone.dc.html has no such constraint either). */}
      {/* Header round 2: reversed again, explicit ask -- desktop (lg+) is now
          NOT fixed, it lives in normal document flow at the top of the page
          and scrolls away with everything below it. Only `lg:flex` remains
          (visibility toggle); no `fixed`/`top`/`inset-x`/`z` at this
          breakpoint since it's no longer removed from flow. The mobile/
          tablet pill below is the one that's now fixed instead.
          Hero v2 round (FIX 1): "keep the current header component, only
          match its spacing to the spec" -- container narrowed from
          max-w-7xl (1280px) to the spec's exact 1180px, pill height set
          to the spec's exact 68px (was implicit via py-4), padding
          asymmetric 24px start / 12px end per the spec. Logo/nav/toggle/
          login/CTA content itself is untouched. */}
      <div className="hidden lg:flex w-full max-w-[1180px] mx-auto px-5 pt-6 items-center justify-between shrink-0">
        <div className="glass w-full h-[68px] flex items-center justify-between rounded-full ps-6 pe-3">
          {/* translateY correction (bug-fix + polish round #3): the logo PNG's
              visible content isn't vertically centered within its own file --
              measured via pixel analysis (opacity-weighted centroid), the
              "Vela" wordmark's visual center sits ~17.5% of the image height
              below the file's geometric center (the star mark above it pulls
              the empty space to the top instead). Flexbox `items-center`
              correctly centers the image's bounding BOX, but that leaves the
              visible wordmark sitting lower than sibling text/icons that don't
              have this asymmetry. */}
          <Link href="/" aria-label="Vela home" className="shrink-0" style={{ transform: "translateY(-17.5%)" }}>
            <Logo showText heightClass="!h-11" />
          </Link>

          {/* Nav links -- Pricing, How it works, The problem, FAQ. Plain
              anchors (native browser smooth-scroll, html{scroll-behavior:
              smooth} is already global) so scrolling and keyboard/Enter
              activation both work with zero extra JS; only the active-link
              highlight itself is IntersectionObserver-driven state. */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ key, href }) => {
              const isActive = activeSection === href.slice(1);
              return (
                <a
                  key={key}
                  href={href}
                  className="px-3.5 py-2 rounded-full text-[15px] font-medium transition-colors duration-200"
                  style={isActive ? { color: "#E8552B", background: "#FFF1EA" } : { color: "#17120E" }}
                  aria-current={isActive ? "true" : undefined}
                >
                  {t(`landing.nav.${key}`)}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <LanguageToggle />
            {loggedIn ? (
              <OpenVelaButton size="sm" initials={session.status === "in" ? session.initials : "V"} />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-[15px] font-semibold text-[#17120E] hover:text-[#C2410C] px-4 py-2.5 rounded-lg transition-colors duration-200"
                >
                  {t("landing.nav.login")}
                </Link>
                <a
                  href={ctaHref}
                  className="h-[46px] px-[22px] rounded-full flex items-center text-[15px] font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #C2410C, #FF6B35)" }}
                >
                  {ctaLabel}
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/tablet header -- round 2: now fixed instead (explicit ask,
          reversed from the previous round), always visible while scrolling,
          below lg. `fixed top-0 inset-x-0 z-40` pins it to the viewport;
          z-40 stays one level below the mobile menu overlay's z-50 so an
          open menu always layers above it. Top offset uses
          max(16px, env(safe-area-inset-top)) so the pill clears a notch/
          Dynamic Island on real phones instead of sitting partly under
          it, while still getting a real 16px breathing room on devices
          with no inset at all.
          Hero v2 round: height matched to the spec's exact 66px (was
          64px), logo bumped 30px->32px to match. Width stays the
          existing w-[92%] (not the spec's literal 362px, which was
          computed for exactly 390px) -- proportionally equivalent and
          robust across the whole 375-430px range this round is verified
          at, whereas a hardcoded 362px would sit at very different
          percentages on a 375px vs 430px screen. */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-40 w-full shrink-0 flex justify-center"
        style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}
      >
        <div className="glass glass-live flex items-center justify-between rounded-full h-[66px] w-[92%] px-4">
          <Link href="/" aria-label="Vela home" className="shrink-0 flex items-center">
            <Logo showText={false} size={32} />
          </Link>
          <div className="flex items-center gap-2.5">
            <LanguageToggle size="lg" />
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#17120E] hover:bg-[#F3F4F6] transition-colors shrink-0"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <span className="w-px h-6 bg-[#E5E7EB] shrink-0" />
            {loggedIn ? (
              <OpenVelaButton size="nav" initials={session.status === "in" ? session.initials : "V"} />
            ) : (
              <a
                href={ctaHref}
                className="h-12 px-[18px] rounded-full flex items-center text-base font-semibold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #C2410C, #FF6B35)" }}
              >
                {t("landing.nav.login")}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu overlay -- white panel, no dark background, per the
          site-wide "white everywhere" standing rule. Real nav links as
          full-width tappable rows, "Log in" restyled as a full gradient
          button matching the primary CTA (mobile menu only -- desktop
          nav's plain "Log in" text is untouched). Visible below lg, same
          range as the trigger pill above. */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 end-0 bottom-0 w-[80vw] max-w-xs bg-white border-s border-[#E5E7EB] shadow-2xl flex flex-col pt-8 pb-8">
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="self-end w-10 h-10 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#17120E] hover:bg-[#F3F4F6] transition-colors mb-4 me-4"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>

            <nav className="flex flex-col">
              {NAV_LINKS.map(({ key, href }) => (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-[#17120E] px-6 py-4 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors"
                >
                  {t(`landing.nav.${key}`)}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-3 px-6 pt-6 mt-auto">
              {loggedIn ? (
                <OpenVelaButton
                  size="md"
                  fullWidth
                  initials={session.status === "in" ? session.initials : "V"}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary inline-flex items-center justify-center w-full text-sm px-7 py-3"
                  >
                    {t("landing.nav.login")}
                  </Link>
                  <a
                    href={ctaHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center w-full text-sm px-7 py-3 rounded-full font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #C2410C, #FF6B35)" }}
                  >
                    {ctaLabel}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Desktop content (lg+): two columns, per Main.dc.html ═══ */}
      <div className="hidden lg:flex w-full max-w-[1180px] mx-auto px-5 items-center justify-between" style={{ height: 808 }}>
        <motion.div variants={container} initial="hidden" animate="show" style={{ width: 560, display: "flex", flexDirection: "column", paddingBottom: 40 }}>
          <motion.span variants={item} style={{ fontSize: 17, fontWeight: 600, color: "#E8552B" }}>
            {t("landing.hero.badge")}
          </motion.span>
          <motion.h1 variants={item} className="font-display" style={{ margin: "18px 0 0", fontSize: 92, fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.045em" }}>
            <span style={{ display: "block", color: "#E8552B" }}>{t("landing.hero.headlineAccent")}</span>
            <span style={{ display: "block", color: "#17120E" }}>{t("landing.hero.headline2")}</span>
          </motion.h1>
          <motion.p variants={item} style={{ margin: "28px 0 0", maxWidth: 460, fontSize: 19, lineHeight: 1.6, color: "#5B5550" }}>
            {t("landing.hero.subtext")}
          </motion.p>
          <motion.div variants={item} style={{ marginTop: 38, display: "flex", alignItems: "center", gap: 26 }}>
            <a
              href={ctaHref}
              style={{ height: 58, padding: "0 30px", borderRadius: 999, background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 600, textDecoration: "none", boxShadow: "0 18px 34px -14px rgba(232,85,43,0.65)" }}
            >
              {ctaLabel}
              <ArrowIcon />
            </a>
            <a href="#how-it-works" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#17120E", textDecoration: "none" }}>
              <PlayIcon />
              {t("landing.hero.story2.seeHowItWorks")}
            </a>
          </motion.div>
          <motion.div variants={item} style={{ marginTop: 44, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#8A807A", marginInlineEnd: 4 }}>{t("landing.hero.story2.answersOn")}</span>
            <ChannelChip><InstagramIcon />{t("landing.hero.story2.instagram")}</ChannelChip>
            <ChannelChip><WhatsAppIcon />{t("landing.hero.story2.whatsapp")}</ChannelChip>
            <ChannelChip><PhoneIcon />{t("landing.hero.story2.phoneCalls")}</ChannelChip>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}>
          <HeroDesktopStory ctaHref={ctaHref} ctaLabel={storyCtaLabel} />
        </motion.div>
      </div>

      {/* ═══ Phone content (below lg): centered, per Phone.dc.html ═══
          FIX 3 round (calmer phone hero, less text, more air): header to
          eyebrow 40px (pill bottom edge ~82px + 40 = 122 paddingTop),
          eyebrow to headline unchanged at 14px, the long paragraph is
          gone -- replaced with one short line (headline to line 18px,
          line to button 32px) -- and the channel chips are gone too
          (desktop keeps both; this round is phone-only per FIX 3's own
          explicit "nothing else on the phone page changes" outside these
          spacing/copy edits). */}
      <div className="lg:hidden w-full flex flex-col items-center" style={{ paddingTop: 122 }}>
        <motion.div variants={container} initial="hidden" animate="show" style={{ width: 342, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <motion.span variants={item} style={{ fontSize: 15, fontWeight: 600, color: "#E8552B" }}>
            {t("landing.hero.badge")}
          </motion.span>
          <motion.h1 variants={item} className="font-display" style={{ margin: "14px 0 0", fontSize: 50, fontWeight: 700, lineHeight: 0.98, letterSpacing: "-0.04em" }}>
            <span style={{ display: "block", color: "#E8552B" }}>{t("landing.hero.headlineAccent")}</span>
            <span style={{ display: "block", color: "#17120E" }}>{t("landing.hero.headline2")}</span>
          </motion.h1>
          <motion.p variants={item} style={{ margin: "18px 0 0", fontSize: 17, lineHeight: 1.6, color: "#5B5550" }}>
            {t("landing.hero.story2.phoneSubtext")}
          </motion.p>
          <motion.a
            variants={item}
            href={ctaHref}
            style={{ marginTop: 32, width: "100%", boxSizing: "border-box", height: 56, padding: "0 30px", borderRadius: 999, background: "linear-gradient(135deg, #C2410C, #FF6B35)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 17, fontWeight: 600, textDecoration: "none", boxShadow: "0 16px 30px -14px rgba(232,85,43,0.65)" }}
          >
            {ctaLabel}
            <ArrowIcon />
          </motion.a>
          {/* hero-v3 round (FIX 4): secondary "How it works" pill, same
              width as the primary CTA (both width:100% of the shared
              342px column) so the two read as a deliberate pair, not a
              button plus an afterthought link. Glass-style white/orange
              (not the primary's filled gradient) so it reads as
              secondary at a glance; smooth-scrolls via the plain anchor
              + the sitewide html{scroll-behavior:smooth}. */}
          <motion.a
            variants={item}
            href="#how-it-works"
            style={{ marginTop: 12, width: "100%", boxSizing: "border-box", height: 56, padding: "0 30px", borderRadius: 999, background: "rgba(255,255,255,0.7)", border: "1.5px solid #E8552B", color: "#C2410C", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 17, fontWeight: 600, textDecoration: "none" }}
          >
            <PlayIcon />
            {t("landing.hero.story2.howItWorks")}
          </motion.a>
        </motion.div>

        <HeroPhoneStory ctaHref={ctaHref} ctaLabel={storyCtaLabel} />
        <div className="pb-14" />
      </div>
    </section>
  );
}
