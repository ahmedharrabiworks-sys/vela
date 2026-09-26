"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";
import { formatPrice, type CurrencyCode } from "@/lib/currency";
import { CurrencyToggle } from "@/components/landing/CurrencyToggle";
import AmbientGlow from "@/components/landing/AmbientGlow";
import CtaButton from "@/components/landing/CtaButton";

const TIER_PLANS = PLANS.filter((p) => !p.isCustom);

export const TAGLINES: Record<string, string> = {
  starter: "For freelancers & solo businesses",
  pro:     "For growing teams",
  premium: "For pro companies & businesses",
};

export const INHERIT_LINE: Record<string, string> = {
  pro:     "Everything in Starter, plus:",
  premium: "Everything in Pro, plus:",
};

// Indices into the already-filtered (included-only) features array to show on the card.
// Recomputed for the real pricing numbers set in Phase 4 (src/lib/pricing.ts) --
// these must stay in sync with that file's included-feature order.
// Card-enrichment round: Starter now shows all 6 of its real included
// features (was 4, leaving visible empty space below the card's bottom
// bullet) -- 2 real facts added from plan-config.ts that weren't
// surfaced anywhere before (bookingsPerMonth, the single-interview AI
// training flow already named in /pricing#compare's aiTraining row).
// Pro and Premium also expanded (6 and 7 bullets respectively) so all
// three cards read as complete and substantial on their own.
export const CARD_INDICES: Record<string, number[]> = {
  starter: [0, 1, 2, 3, 4, 5],
  pro:     [0, 2, 3, 4, 5, 7],
  premium: [0, 1, 2, 3, 4, 5, 6],
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("QAR");
  const { t } = useI18n();

  return (
    <section id="pricing" className="relative py-12 md:py-16 bg-white overflow-hidden">
      <AmbientGlow pos="end" />
      <div className="relative max-w-7xl mx-auto px-5 md:px-6" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="relative text-center mb-8">
          <h2 className="vela-heading text-[22px] sm:text-[28px] md:text-[34px] text-[#111111] leading-tight">
            {t("landing.pricing.headline1")}{" "}
            <span className="vela-gradient-text">{t("landing.pricing.headline2")}</span>
          </h2>
          {/* Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] mt-6">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                !annual ? "bg-white shadow-sm text-[#111111]" : "text-[#9CA3AF] hover:text-[#6B7280]"
              }`}
            >
              {t("landing.pricing.monthly")}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                annual ? "bg-white shadow-sm text-[#111111]" : "text-[#9CA3AF] hover:text-[#6B7280]"
              }`}
            >
              {t("landing.pricing.annual")}
              <span className={`ms-1.5 text-xs ${annual ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>
                · {t("landing.pricing.save20")}
              </span>
            </button>
          </div>
        </div>

        {/* See full comparison link -- restyled as a real outline pill
            button (FIX 7, bug-fix + polish round) instead of plain text, so
            it reads as intentionally clickable. */}
        <div className="text-center mb-5">
          <Link
            href="/pricing#compare"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#374151] bg-white border border-[#E5E7EB] hover:border-[#FF6B35] hover:text-[#FF6B35] rounded-full px-5 py-2.5 transition-colors duration-200"
          >
            {t("landing.pricing.seeFullFeature")}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="rtl:-scale-x-100">
              <path d="M2.5 6.5h8M7 4l3 2.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Cards -- currency toggle now sits in normal flow, tucked to the
            end edge of this same 900px-wide block the cards live in (FIX
            3), right above the Premium card, instead of floating near the
            far edge of the much wider header container above. Real layout
            space (not absolute-positioned), so it can't overlap the "See
            full feature" line above it. `justify-end` auto-mirrors to the
            start edge in RTL. */}
        <div className="relative max-w-[900px] mx-auto">
          <div className="flex justify-center sm:justify-end mb-3">
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </div>
          <div className="grid md:grid-cols-3 gap-3.5 md:gap-4 items-stretch" style={{ position: "relative", zIndex: 1 }}>
            {TIER_PLANS.map((plan) => {
              const price = annual ? plan.annual : plan.monthly;
              const planKey = plan.name.toLowerCase();
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-5 md:p-7 flex flex-col transition-all duration-300 ${
                    plan.popular
                      ? "bg-[#FFF8F5] md:scale-[1.02]"
                      : "bg-white border border-[#E5E7EB] shadow-card hover:shadow-card-hover hover:-translate-y-1"
                  }`}
                  style={
                    plan.popular
                      ? { border: "2px solid #FF6B35", boxShadow: "0 8px 32px rgba(255,107,53,0.12)" }
                      : {}
                  }
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: "var(--vela-gradient)" }}>
                        {t("landing.pricing.mostPopular")}
                      </span>
                    </div>
                  )}

                  {/* Tier header. Icon badge removed (bug-fix + polish
                      round #2) -- Oussama's call, cleaner without it. */}
                  <div className="mb-5 pb-5 border-b border-[#F3F4F6]">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${plan.popular ? "text-[#FF6B35]" : "text-[#9CA3AF]"}`}>
                      {t(`landing.pricing.plans.${planKey}.name`)}
                    </p>
                    <div className="flex items-end gap-1.5 mb-1.5 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-black text-[#111111] leading-none">
                        {formatPrice(price, currency)}
                      </span>
                      <span className="text-sm mb-0.5 text-[#9CA3AF]">/mo</span>
                    </div>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                      {t(`landing.pricing.plans.${planKey}.tagline`)}
                    </p>
                    {annual && (
                      <p className="text-sm font-medium text-[#FF6B35] mt-1">
                        {t("landing.pricing.save")} {formatPrice((plan.monthly - plan.annual) * 12, currency)}/year
                      </p>
                    )}
                  </div>

                  {/* Feature list -- the inherit line is a real structural
                      boundary in the data (everything below it is new vs.
                      the tier below), so it's now rendered as its own
                      labeled group header instead of a bullet, giving the
                      list a clearer two-tier hierarchy. Checkmarks are now
                      solid filled circles for more visual weight. */}
                  <div className="flex-1 mb-5">
                    {INHERIT_LINE[planKey] && (
                      <p className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF] mb-2.5">
                        {t(`landing.pricing.inheritLine.${planKey}`)}
                      </p>
                    )}
                    <ul className="flex flex-col gap-2.5">
                      {plan.features.filter(f => f.included)
                        .map((feat, originalIdx) => ({ feat, originalIdx }))
                        .filter(({ originalIdx }) => {
                          const show = CARD_INDICES[planKey];
                          return !show || show.includes(originalIdx);
                        })
                        .map(({ originalIdx }) => (
                          <li key={originalIdx} className="flex items-center gap-2.5">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                              <circle cx="8" cy="8" r="8" fill="#FF6B35" />
                              <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-sm font-medium text-[#374151]">
                              {t(`landing.pricing.plans.${planKey}.features.${originalIdx}`)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  {/* FIX 1: every tier gets the same shared gradient button
                      now (popularity is signaled by the badge + border
                      instead of a different button style). FIX 2: the
                      "Cancel anytime" line below it is removed entirely. */}
                  <CtaButton size="md" fullWidth />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
