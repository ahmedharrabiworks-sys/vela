"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function CTA() {
  const { t } = useI18n();

  return (
    <section className="py-20 md:py-28 section-tint">
      <div className="max-w-4xl mx-auto px-5 md:px-6 text-center">
        <span className="section-label mb-8">{t("landing.cta.badge")}</span>

        <h2 className="vela-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#111111] mt-8 mb-6">
          {t("landing.cta.headline1")}
          <br />
          <span className="vela-gradient-text">{t("landing.cta.headline2")}</span>
        </h2>

        <p className="text-[#6B7280] text-base md:text-xl mb-10 max-w-lg mx-auto">
          {t("landing.cta.subtext")}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
          <Link href="/auth/signup" className="btn-primary text-base px-10 py-4 text-lg justify-center">
            {t("landing.nav.getStarted")}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.5 9h11M10 5l4.5 4-4.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-base px-10 py-4 rounded-xl font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200 justify-center"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6 5.2l4.5 2.3L6 9.8V5.2z" fill="currentColor" />
            </svg>
            {t("landing.nav.tryDemo")}
          </Link>
        </div>
      </div>
    </section>
  );
}
