"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";
import TrialCTAButton from "@/components/landing/TrialCTAButton";

const TIER_PLANS = PLANS.filter((p) => !p.isCustom);

const TAGLINES: Record<string, string> = {
  starter: "For freelancers & solo businesses",
  pro:     "For growing teams",
  premium: "For pro companies & businesses",
};

const INHERIT_LINE: Record<string, string> = {
  pro:     "Everything in Starter, plus:",
  premium: "Everything in Pro, plus:",
};

// Indices into the already-filtered (included-only) features array to show on the card
// Pro: 4 bullets + inherit line = 5 rows. Premium: 5 bullets + inherit line = 6 rows (richer tier).
const CARD_INDICES: Record<string, number[]> = {
  starter: [0, 2, 3, 5],
  pro:     [0, 1, 2, 6],
  premium: [0, 2, 3, 7, 8],
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const { t } = useI18n();

  return (
    <section id="pricing" className="py-10 md:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="text-center mb-8">
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
              <span className={`ml-1.5 text-xs ${annual ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>
                · Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Cards — glow hugs the card row bounding box */}
        <div className="relative max-w-[900px] mx-auto">
          <div className="absolute top-1/2 left-1/2 pointer-events-none" aria-hidden="true"
            style={{ width: "calc(100% + 80px)", height: "calc(100% + 80px)", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "rgba(255,107,53,0.22)", filter: "blur(60px)", zIndex: 0 }} />
          <div className="grid md:grid-cols-3 gap-4 md:gap-5 items-stretch" style={{ position: "relative", zIndex: 1 }}>
            {TIER_PLANS.map((plan) => {
              const price = annual ? plan.annual : plan.monthly;
              const planKey = plan.name.toLowerCase();
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-8 md:p-11 flex flex-col transition-all duration-300 ${
                    plan.popular
                      ? "bg-[#FFF8F5] md:scale-[1.02] mt-4 md:mt-0"
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

                  {/* Tier header */}
                  <div className="mb-7">
                    <p className={`text-sm font-bold uppercase tracking-widest mb-3 ${plan.popular ? "text-[#FF6B35]" : "text-[#9CA3AF]"}`}>
                      {t(`landing.pricing.plans.${planKey}.name`)}
                    </p>
                    <div className="flex items-end gap-1.5 mb-1.5">
                      <span className="text-5xl font-black text-[#111111] leading-none">
                        ${price}
                      </span>
                      <span className="text-base mb-1 text-[#9CA3AF]">/mo</span>
                    </div>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                      {TAGLINES[planKey]}
                    </p>
                    {annual && (
                      <p className="text-sm font-medium text-[#FF6B35] mt-1">
                        {t("landing.pricing.save")} ${(plan.monthly - plan.annual) * 12}/year
                      </p>
                    )}
                  </div>

                  {/* Feature list with hairline dividers */}
                  <ul className="flex-1 mb-7 divide-y divide-[#F3F4F6]">
                    {INHERIT_LINE[planKey] && (
                      <li className="flex items-start gap-3 py-3.5">
                        <svg width="17" height="17" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill="var(--vp-12)" />
                          <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-base text-[#374151]">{INHERIT_LINE[planKey]}</span>
                      </li>
                    )}
                    {plan.features.filter(f => f.included)
                      .map((feat, originalIdx) => ({ feat, originalIdx }))
                      .filter(({ originalIdx }) => {
                        const show = CARD_INDICES[planKey];
                        return !show || show.includes(originalIdx);
                      })
                      .map(({ originalIdx }) => (
                        <li key={originalIdx} className="flex items-start gap-3 py-3.5">
                          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                            <circle cx="8" cy="8" r="7" fill="var(--vp-12)" />
                            <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-base text-[#374151]">
                            {t(`landing.pricing.plans.${planKey}.features.${originalIdx}`)}
                          </span>
                        </li>
                      ))}
                  </ul>

                  <div className="flex flex-col items-center gap-2">
                    <TrialCTAButton
                      className={`w-full py-3 px-7 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        plan.popular
                          ? "btn-primary"
                          : "border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      }`}
                    >
                      {t(`landing.pricing.plans.${planKey}.cta`)}
                    </TrialCTAButton>
                    <p className="text-[11px] text-[#9CA3AF]">
                      Experience it for 7 Days FREE
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* See full comparison link */}
        <div className="text-center mt-6">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9CA3AF] hover:text-[#FF6B35] transition-colors"
          >
            See full feature comparison
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.5h8M7 4l3 2.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
