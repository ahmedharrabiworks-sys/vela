"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/ui/Logo";
import AmbientGlow from "@/components/landing/AmbientGlow";
import LanguageToggle from "@/components/landing/LanguageToggle";
import CtaButton from "@/components/landing/CtaButton";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// Real destinations only (no "#" dead links) -- reuses the same
// landing.nav.* keys the rest of the site already uses, so there's no new
// copy to keep in sync.
// Bug fix (bug-fix + polish round #2): these previously pointed at anchor
// ids (#features, #how-it-works, #faq) that don't exist anywhere in the
// current page composition -- Features/HowItWorks/FAQ components from an
// earlier site version aren't mounted on the homepage at all (confirmed via
// DOM inspection, not a click-handler bug). "Features" and "How It Works"
// now point at the two homepage sections that actually cover that content
// (DashboardSection's capability checklist, ProductTourDemo's step-by-step
// walkthrough), each given a real id. "FAQ" has no homepage section to
// anchor to, so it navigates to the real FAQ section that already exists
// (unlinked) on the /pricing page.
const MOBILE_NAV_LINKS = [
  { key: "features", href: "/#features" },
  { key: "howItWorks", href: "/#how-it-works" },
  { key: "pricing", href: "/pricing" },
  { key: "faq", href: "/pricing#faq" },
] as const;

export default function Hero() {
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <section id="hero-section" className="relative flex flex-col overflow-hidden bg-white">
      {/* Ambient glow (design pass) -- replaces the old mouse-tracked
          CursorSpotlight with one consistent, CSS-only, auto-animated glow. */}
      <AmbientGlow />

      {/* In-hero nav, scrolls away with the Hero naturally */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6 pt-10 flex items-center justify-between shrink-0">
        {/* translateY correction (bug-fix + polish round #3): the logo PNG's
            visible content isn't vertically centered within its own file --
            measured via pixel analysis (opacity-weighted centroid), the
            "Vela" wordmark's visual center sits ~17.5% of the image height
            below the file's geometric center (the star mark above it pulls
            the empty space to the top instead). Flexbox `items-center`
            correctly centers the image's bounding BOX, but that leaves the
            visible wordmark sitting lower than sibling text/icons that don't
            have this asymmetry. Self-relative % transform stays correct at
            any responsive height (36px mobile / 56px desktop) with no
            breakpoint-specific values needed. */}
        <Link href="/" aria-label="Vela home" className="shrink-0" style={{ transform: "translateY(-17.5%)" }}>
          <Logo showText heightClass="!h-9 sm:!h-14" />
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageToggle />
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-base font-semibold text-[#374151] hover:text-[#111111] px-5 py-2.5 rounded-lg transition-colors duration-200"
          >
            {t("landing.nav.login")}
          </Link>
          <CtaButton size="sm" className="hidden sm:inline-flex" />

          {/* FIX: on mobile, both Log in and Get Started were "hidden" with
              no alternative at all -- a mobile visitor had no way to log in
              or sign up from the header. Hamburger opens both options. */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-lg text-[#111111] hover:bg-[#F3F4F6] transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay -- white panel, no dark background, per the
          site-wide "white everywhere" standing rule. Redesigned (FIX 4,
          bug-fix + polish round): real nav links as full-width tappable
          rows (no dead empty space between items), "Log in" restyled as a
          full gradient button matching the primary CTA (mobile menu only --
          desktop nav's plain "Log in" text is untouched). */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
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
              {MOBILE_NAV_LINKS.map(({ key, href }) => (
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
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary inline-flex items-center justify-center w-full text-sm px-7 py-3"
              >
                {t("landing.nav.login")}
              </Link>
              <CtaButton size="md" fullWidth onClick={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Content -- FIX 10 (consolidated fix round): the reserved empty
          space below the CTA from a prior session is gone. The section no
          longer forces min-h-screen, so it now sizes to its own content
          and flows directly into the next section with normal padding,
          on both mobile and desktop. Bottom padding matches the shared
          py-12/py-16 rhythm every other section now uses (section-continuity
          round), so the Hero -> ProductTourDemo gap is consistent with every
          other inter-section gap instead of its own larger one-off value. */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-6 pt-6 pb-12 md:pt-16 md:pb-16">
        <div className="max-w-3xl md:mt-8">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5 md:gap-6 items-center text-center md:items-start md:text-start"
          >
            {/* Badge */}
            <motion.div variants={item}>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border"
                style={{ background: "#FFF3EE", borderColor: "rgba(255,107,53,0.25)", color: "#C2410C" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                {t("landing.hero.badge")}
              </span>
            </motion.div>

            {/* Headline -- black by default, one accent phrase in brand orange */}
            <motion.h1
              variants={item}
              className="font-display font-bold text-[32px] sm:text-[40px] md:text-[48px] leading-tight text-[#111111]"
            >
              {t("landing.hero.headline1")}{" "}
              <span className="vela-gradient-text">{t("landing.hero.headlineAccent")}</span>{" "}
              {t("landing.hero.headline2")}
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={item}
              className="text-[#4B5563] text-base md:text-lg leading-relaxed max-w-[520px] mx-auto md:mx-0"
            >
              {t("landing.hero.subtext")}
            </motion.p>

            {/* CTA -- shared orange gradient button. Copy now matches every
                other CTA sitewide ("Start for Free", landing.hero.cta) --
                the old "Start 14-Day Free Trial" wording promised a trial
                mechanism that doesn't exist yet (Hard Rule 17). */}
            <motion.div variants={item}>
              <CtaButton size="lg" label={t("landing.hero.cta")} />
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
