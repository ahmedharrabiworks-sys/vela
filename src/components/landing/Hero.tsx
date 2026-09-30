"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/ui/Logo";
import LanguageToggle from "@/components/landing/LanguageToggle";
import CtaButton from "@/components/landing/CtaButton";
import OpenVelaButton from "@/components/landing/OpenVelaButton";
import { useLandingSession } from "@/lib/use-landing-session";

// Missed-call-story round: lazy, client-only, mobile-only illustration --
// next/dynamic + ssr:false keeps it out of the initial server render and
// out of the hero's first-paint JS entirely (a real, separate chunk
// fetched only once this component mounts), so the hero's own first
// paint (header/eyebrow/headline/CTA) is never slowed down by it. A
// fixed-height placeholder (matches the real component's phone-stage
// footprint) reserves layout space while it loads, so there's no content
// jump once the real chunk arrives (CLS).
const MissedCallStory = dynamic(() => import("@/components/landing/MissedCallStory"), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ height: 560 }} />,
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

  return (
    <section id="hero-section" className="relative flex flex-col bg-white min-h-[100svh] lg:min-h-0">
      {/* Phone-only-full-screen-hero round: min-h-[100svh] (full first
          screen, header included, "how it works" below the fold) is
          explicitly a phone/tablet thing (Oussama review) -- lg:min-h-0
          cancels it at lg+, where the section goes back to sizing to its
          natural content height like every other section. See the content
          wrapper below for the matching lg:block/lg:pt-8/lg:pb-28 revert. */}
      {/* Header round 2: reversed again, explicit ask -- desktop (lg+) is now
          NOT fixed, it lives in normal document flow at the top of the page
          and scrolls away with everything below it. Only `lg:flex` remains
          (visibility toggle); no `fixed`/`top`/`inset-x`/`z` at this
          breakpoint since it's no longer removed from flow. The mobile/
          tablet pill below is the one that's now fixed instead.
          Full-screen-hero round: py-3->py-4 is a +10% pill height bump
          (24px->32px vertical padding on top of the unchanged !h-14 logo),
          per the explicit "desktop navbar height +10%" ask. */}
      <div className="hidden lg:flex w-full max-w-7xl mx-auto px-5 md:px-6 pt-6 items-center justify-between shrink-0">
        <div className="glass w-full flex items-center justify-between rounded-full px-6 py-4">
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
            <Logo showText heightClass="!h-14" />
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
                  className="px-3.5 py-2 rounded-full text-base font-semibold transition-colors duration-200"
                  style={isActive ? { color: "#FF6B35", background: "#FFF3EE" } : { color: "#374151" }}
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
                  className="text-base font-semibold text-[#374151] hover:text-[#111111] px-5 py-2.5 rounded-lg transition-colors duration-200"
                >
                  {t("landing.nav.login")}
                </Link>
                <CtaButton size="sm" />
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
          max(16px, env(safe-area-inset-top)) (bigger-navbar round: was
          24px) so the pill clears a notch/Dynamic Island on real phones
          instead of sitting partly under it, while still getting a real
          16px breathing room on devices with no inset at all.
          Bigger-navbar round: pill height bumped 52px->64px (h-16),
          width bumped to ~92% of the viewport (w-[92%] against the
          wrapper's own w-full/no horizontal padding, so 92% resolves
          against the true viewport width, not an already-padded
          container), restructured justify-between (logo alone on the
          start side, the toggle/hamburger/login cluster on the end side)
          so the extra width doesn't just sit as dead space -- matches the
          desktop pill's own logo-vs-actions justify-between pattern.
          Logo/toggle/hamburger/login all scaled up ~1.2x to match. Login
          button reuses the sitewide .btn-primary gradient class. Plain
          flex row, no manual RTL classes -- source order stays logo-first,
          the browser mirrors the whole row automatically under
          dir="rtl". */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-40 w-full shrink-0 flex justify-center"
        style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}
      >
        <div className="glass glass-live flex items-center justify-between rounded-full h-16 w-[92%] px-4">
          <Link href="/" aria-label="Vela home" className="shrink-0 flex items-center">
            <Logo showText={false} size={30} />
          </Link>
          <div className="flex items-center gap-2.5">
            <LanguageToggle size="lg" />
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#111111] hover:bg-[#F3F4F6] transition-colors shrink-0"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="w-px h-6 bg-[#E5E7EB] shrink-0" />
            {loggedIn ? (
              <OpenVelaButton size="nav" initials={session.status === "in" ? session.initials : "V"} />
            ) : (
              <Link
                href="/auth/login"
                className="btn-primary gap-1.5 text-base ps-5 pe-4 py-3 min-h-[48px] shrink-0"
              >
                {t("landing.nav.login")}
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="rtl:-scale-x-100 shrink-0">
                  <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
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
              className="self-end w-10 h-10 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] transition-colors mb-4 me-4"
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
                  className="text-base font-semibold text-[#111111] px-6 py-4 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors"
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
                  <CtaButton size="md" fullWidth onClick={() => setMobileMenuOpen(false)} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content -- missed-call-story round: mobile now carries a whole
          extra illustration below the CTA, so the hero is no longer
          short content that should be vertically centered within exactly
          one screen (that was the prior full-screen-hero round's
          flex-1 + 55/45-flexGrow-spacer mechanism -- removed, since
          content now naturally exceeds 100svh by design and centering it
          would just push the headline off the TOP of the first view).
          Simple fixed top padding instead, tuned so the header clears
          the fixed mobile pill (~64px pill + 16px top offset = ~80px
          bottom edge) with a real ~32px breathing gap below it, and
          headline + CTA + the top of the phone mockup are visible on
          first load at 390x844 without scrolling -- the section's own
          min-h-[100svh] (above) still guarantees at least one full
          screen even before the lazy story chunk has loaded in.
          lg:pt-8/lg:pb-28 (desktop) are unchanged from the breathing-room
          round -- see the section's lg:min-h-0 above for why desktop
          never used this mobile-only mechanism to begin with. */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6 pt-[112px] pb-12 lg:pt-8 lg:pb-28">
        <div className="max-w-3xl">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center text-center md:items-start md:text-start"
          >
            {/* Eyebrow + headline -- grouped as one staggered unit so the
                20px gap between them holds independently of the explicit
                mt- spacing the rest of this stack now uses (hero-eyebrow
                round 3: the orange line is removed, text-only label kept
                at the same font/color/size -- see PR round 2's comment
                history above for the prior line+text treatment this
                replaces). Uses the exact same font-display family as the
                headline right below it (not a special one-off font) -- in
                Arabic mode the headline already relies on that family's
                automatic per-glyph fallback for Arabic script (it has no
                Arabic glyphs of its own), so the eyebrow inherits the
                identical, already-proven-correct behavior with no locale
                branching needed. justify-center on mobile (the hero is
                centered on mobile, and with the line gone this text is no
                longer implicitly centered by its wrapper's shrink-to-fit
                width -- see round 3 fix notes), justify-start on desktop;
                justify-start mirrors automatically to the end/right side
                under dir="rtl", same as every other automatically-
                mirrored row elsewhere on this page. */}
            <motion.div variants={item} className="flex flex-col gap-[20px]">
              <div className="flex items-center justify-center md:justify-start">
                <p
                  className="font-display font-semibold leading-none text-[15px] md:text-[17px] tracking-[-0.01em]"
                  style={{ color: "#E8552B" }}
                >
                  {t("landing.hero.badge")}
                </p>
              </div>

              {/* Headline -- black by default, one accent phrase in brand
                  orange. Same words/colors/font as before, just bigger and
                  tighter (Aira-reference scale): 46px mobile up to
                  70px desktop, leading 1.05, tracking -0.03em, text-balance
                  for even line breaks so it doesn't wrap to one lonely word
                  on its own line at narrow widths. */}
              <h1 className="font-display font-bold text-[46px] sm:text-[50px] md:text-[58px] lg:text-[70px] leading-[1.05] tracking-[-0.03em] text-balance text-[#111111]">
                {t("landing.hero.headline1")}{" "}
                <span className="vela-gradient-text">{t("landing.hero.headlineAccent")}</span>{" "}
                {t("landing.hero.headline2")}
              </h1>
            </motion.div>

            {/* Subtext -- same copy/color, calmer size/line-height/width
                (18px, 1.6 leading, ~34ch measure) per the Aira-reference
                rhythm. mt- replaces the old uniform parent `gap` now that
                headline->paragraph and paragraph->CTA need different
                values (20/28/40 mobile, 20/32/44 desktop). */}
            <motion.p
              variants={item}
              className="text-[#4B5563] text-[18px] leading-[1.6] max-w-[34ch] mx-auto md:mx-0 mt-[28px] md:mt-[30px] lg:mt-[32px]"
            >
              {t("landing.hero.subtext")}
            </motion.p>

            {/* CTA -- shared orange gradient button. Copy matches every
                other CTA sitewide ("Start for Free", landing.hero.cta) for
                a logged-out visitor -- the old "Start 14-Day Free Trial"
                wording promised a trial mechanism that doesn't exist yet
                (Hard Rule 17). A logged-in visitor gets "Go to your
                dashboard" pointing straight at /app instead (logged-in
                header round). min-h-[56px] on the button itself (not
                CtaButton's shared size classes -- this is a Hero-only tap
                target bump, every other CtaButton sitewide is unaffected).
                mt- is +12px over the breathing-room round's 40/42/44
                (explicit ask: push the CTA a bit further from the
                paragraph than last round). */}
            <motion.div variants={item} className="mt-[52px] md:mt-[54px] lg:mt-[56px]">
              <CtaButton
                size="lg"
                className="min-h-[56px]"
                href={loggedIn ? "/app" : "/auth/signup"}
                label={loggedIn ? t("landing.hero.ctaLoggedIn") : t("landing.hero.cta")}
              />
            </motion.div>

            {/* "The missed call story" -- mobile-only (MissedCallStory.tsx
                is itself lg:hidden internally), 32px under the CTA per
                spec. motion.div/variants={item} so it stays part of the
                same on-load stagger as everything above it, rather than
                popping in separately. */}
            <motion.div variants={item} className="mt-8 w-full lg:hidden">
              <MissedCallStory
                loggedIn={loggedIn}
                ctaHref={loggedIn ? "/app" : "/auth/signup"}
                ctaLabel={loggedIn ? t("landing.hero.story.openVela") : t("landing.hero.story.start")}
              />
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
