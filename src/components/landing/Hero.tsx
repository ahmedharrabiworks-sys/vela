"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/ui/Logo";
import LanguageToggle from "@/components/landing/LanguageToggle";
import CtaButton from "@/components/landing/CtaButton";
import OpenVelaButton from "@/components/landing/OpenVelaButton";
import { useLandingSession } from "@/lib/use-landing-session";

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
  const { t, locale } = useI18n();
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
    <section id="hero-section" className="relative flex flex-col bg-white">
      {/* Header round 2: reversed again, explicit ask -- desktop (lg+) is now
          NOT fixed, it lives in normal document flow at the top of the page
          and scrolls away with everything below it. Only `lg:flex` remains
          (visibility toggle); no `fixed`/`top`/`inset-x`/`z` at this
          breakpoint since it's no longer removed from flow. The mobile/
          tablet pill below is the one that's now fixed instead. */}
      <div className="hidden lg:flex w-full max-w-7xl mx-auto px-5 md:px-6 pt-6 items-center justify-between shrink-0">
        <div className="glass w-full flex items-center justify-between rounded-full px-6 py-3">
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
                  className="px-3.5 py-2 rounded-full text-sm font-semibold transition-colors duration-200"
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
          max(24px, env(safe-area-inset-top)) instead of a plain pt-6 so the
          pill clears a notch/Dynamic Island on real phones instead of
          sitting partly under it, while still getting the normal 24px
          breathing room on devices with no inset at all. Single rounded
          pill matching mobile-header-reference.jpg's soft-container style:
          logo, language toggle, hamburger, "Log in" pill. Centered as a
          compact island, one consistent gap-2 between every element. Login
          button reuses the sitewide .btn-primary gradient class. Plain flex
          row, no manual RTL classes -- source order stays logo-first, the
          browser mirrors the whole row automatically under dir="rtl". */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-40 w-full px-5 shrink-0 flex justify-center"
        style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}
      >
        <div className="glass inline-flex items-center gap-2 rounded-full py-1.5 ps-3.5 pe-2">
          <Link href="/" aria-label="Vela home" className="shrink-0 flex items-center">
            <Logo showText={false} size={24} />
          </Link>
          <LanguageToggle />
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#111111] hover:bg-[#F3F4F6] transition-colors shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="w-px h-5 bg-[#E5E7EB] shrink-0" />
          {loggedIn ? (
            <OpenVelaButton size="xs" initials={session.status === "in" ? session.initials : "V"} />
          ) : (
            <Link
              href="/auth/login"
              className="btn-primary gap-1.5 text-sm ps-4 pe-3.5 py-2 shrink-0"
            >
              {t("landing.nav.login")}
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none" className="rtl:-scale-x-100 shrink-0">
                <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
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

      {/* Content -- bottom padding matches the shared py-12/py-16 rhythm
          every other section uses, so the Hero -> "how it works" gap is
          consistent with every other inter-section gap.
          Top padding (header round 2, inverted from before): below lg, the
          pill above is now `fixed` and removed from flow, so this reserves
          real space for it (measured live: fixed mobile pill's rendered
          height is ~82px including its own top offset; 110px keeps a real
          gap below it, not a tight/overlapping one). At lg+, the header is
          now in normal document flow (not fixed) and already pushes this
          content down on its own, so only a small breathing-room gap is
          needed there. */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6 pt-[110px] pb-12 lg:pt-8 lg:pb-16">
        <div className="max-w-3xl md:mt-8">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5 md:gap-6 items-center text-center md:items-start md:text-start"
          >
            {/* Eyebrow + headline -- grouped as one staggered unit (hero-
                eyebrow round) so the tight gap between them holds regardless
                of the looser gap-5/6 the rest of this stack uses. Eyebrow is
                a plain line of text, not a badge: no border/background/dot/
                uppercase, elegant serif italic (Instrument Serif, loaded in
                the root layout and scoped to this one usage only via the
                --font-eyebrow CSS variable) -- English only. Instrument
                Serif has no Arabic glyphs (and CSS-synthesized italic reads
                poorly on Arabic script), so Arabic keeps the site's current
                default font, upright, same color/size treatment. */}
            <motion.div variants={item} className="flex flex-col gap-1">
              <p
                className={`leading-none text-[18px] md:text-[22px] ${locale === "ar" ? "" : "italic"}`}
                style={{ fontFamily: locale === "ar" ? undefined : "var(--font-eyebrow)", color: "#E8552B" }}
              >
                {t("landing.hero.badge")}
              </p>

              {/* Headline -- black by default, one accent phrase in brand orange */}
              <h1 className="font-display font-bold text-[32px] sm:text-[40px] md:text-[48px] leading-tight text-[#111111]">
                {t("landing.hero.headline1")}{" "}
                <span className="vela-gradient-text">{t("landing.hero.headlineAccent")}</span>{" "}
                {t("landing.hero.headline2")}
              </h1>
            </motion.div>

            {/* Subtext */}
            <motion.p
              variants={item}
              className="text-[#4B5563] text-base md:text-lg leading-relaxed max-w-[520px] mx-auto md:mx-0"
            >
              {t("landing.hero.subtext")}
            </motion.p>

            {/* CTA -- shared orange gradient button. Copy matches every
                other CTA sitewide ("Start for Free", landing.hero.cta) for
                a logged-out visitor -- the old "Start 14-Day Free Trial"
                wording promised a trial mechanism that doesn't exist yet
                (Hard Rule 17). A logged-in visitor gets "Go to your
                dashboard" pointing straight at /app instead (logged-in
                header round). */}
            <motion.div variants={item}>
              <CtaButton
                size="lg"
                href={loggedIn ? "/app" : "/auth/signup"}
                label={loggedIn ? t("landing.hero.ctaLoggedIn") : t("landing.hero.cta")}
              />
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
