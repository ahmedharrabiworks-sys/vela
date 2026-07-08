"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { useI18n } from "@/lib/i18n";

const NAV_LINKS = [
  { key: "features", href: "#features" },
  { key: "howItWorks", href: "#how-it-works" },
  { key: "pricing", href: "#pricing" },
  { key: "faq", href: "#faq" },
];

const LANG_OPTIONS = [
  { code: "en", short: "EN", label: "English" },
  { code: "ar", short: "AR", label: "العربية" },
  { code: "fr", short: "FR", label: "Français" },
  { code: "de", short: "DE", label: "Deutsch" },
];

const NAME_MAP: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  fr: "Français",
  de: "Deutsch",
};

export default function Navbar() {
  const { locale, setLocale, t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const mobileLangRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    if (langOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mobileLangRef.current && !mobileLangRef.current.contains(e.target as Node)) setMobileLangOpen(false);
    };
    if (mobileLangOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileLangOpen]);

  const selectLang = (opt: typeof LANG_OPTIONS[0]) => {
    setLocale(NAME_MAP[opt.code]);
    setLangOpen(false);
    setMobileLangOpen(false);
  };

  const currentLang = LANG_OPTIONS.find((o) => o.code === locale) ?? LANG_OPTIONS[0];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E7EB] transition-all duration-300 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        <Logo showText />

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="text-sm font-medium text-[#374151] hover:text-[#111111] transition-colors duration-200 relative group"
            >
              {t(`landing.nav.${link.key}`)}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#FF6B35] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* Desktop right: lang switcher + CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language switcher */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#374151] hover:text-[#FF6B35] hover:bg-[#F9FAFB] border border-transparent hover:border-[#E5E7EB] transition-all duration-200"
              aria-label="Select language"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M1.5 7.5h12M7.5 1.5c-1.5 2-1.5 9 0 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span>{currentLang.short}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`}>
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {langOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 w-40 bg-white border border-[#E5E7EB] rounded-xl shadow-card-hover py-1 z-50">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => selectLang(opt)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-[#F9FAFB] ${
                      locale === opt.code ? "text-[#FF6B35] font-semibold" : "text-[#374151]"
                    }`}
                  >
                    {opt.label}
                    {locale === opt.code && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#FF6B35" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/auth/login"
            className="text-sm font-medium px-4 py-2 rounded-lg text-[#374151] hover:text-[#FF6B35] transition-colors duration-200"
          >
            {t("landing.nav.login")}
          </Link>
          <Link
            href="/demo"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200"
          >
            {t("landing.nav.tryDemo")}
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm px-5 py-2.5">
            {t("landing.nav.getStarted")}
          </Link>
        </div>

        {/* Mobile: globe + Try Demo + Get Started */}
        <div className="md:hidden flex items-center gap-2">
          <div ref={mobileLangRef} className="relative">
            <button
              onClick={() => setMobileLangOpen(!mobileLangOpen)}
              className="p-2.5 rounded-xl border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200 flex items-center gap-1"
              aria-label="Select language"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M1.5 7.5h12M7.5 1.5c-1.5 2-1.5 9 0 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span className="text-[11px] font-semibold">{currentLang.short}</span>
            </button>
            {mobileLangOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 w-40 bg-white border border-[#E5E7EB] rounded-xl shadow-card-hover py-1 z-50">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => selectLang(opt)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-[#F9FAFB] ${
                      locale === opt.code ? "text-[#FF6B35] font-semibold" : "text-[#374151]"
                    }`}
                  >
                    {opt.label}
                    {locale === opt.code && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#FF6B35" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/demo"
            className="text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151]"
          >
            {t("landing.nav.tryDemo")}
          </Link>
          <Link href="/auth/signup" className="btn-primary text-xs px-4 py-2.5">
            {t("landing.nav.getStarted")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
