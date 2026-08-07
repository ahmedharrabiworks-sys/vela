"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/pricing";
import { useI18n } from "@/lib/i18n";

const TIER_PLANS = PLANS.filter((p) => !p.isCustom);

const TAGLINES: Record<string, string> = {
  starter: "For solo operators getting started.",
  pro:     "For businesses ready to go all-in.",
  premium: "For teams that need zero compromise.",
};

const INHERIT_LINE: Record<string, string> = {
  pro:     "Everything in Starter, plus:",
  premium: "Everything in Pro, plus:",
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
          <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-full bg-white border border-[#E5E7EB] shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                !annual ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              {t("landing.pricing.monthly")}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                annual ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              {t("landing.pricing.annual")}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF6B35] text-white">
                −20%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-5 items-stretch">
          {TIER_PLANS.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            const planKey = plan.name.toLowerCase();
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-5 md:p-6 flex flex-col transition-all duration-300 ${
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

                {/* Tier header — name, price, tagline */}
                <div className="mb-4">
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${plan.popular ? "text-[#FF6B35]" : "text-[#9CA3AF]"}`}>
                    {t(`landing.pricing.plans.${planKey}.name`)}
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-[#111111]">
                      ${price}
                    </span>
                    <span className="text-sm mb-1 text-[#9CA3AF]">/mo</span>
                  </div>
                  {/* FIX 3 — tagline now sits directly under price */}
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    {TAGLINES[planKey]}
                  </p>
                  {annual && (
                    <p className="text-xs font-medium text-[#FF6B35] mt-1">
                      {t("landing.pricing.save")} ${(plan.monthly - plan.annual) * 12}/year
                    </p>
                  )}
                </div>

                {/* FIX 1: description line removed entirely */}

                {/* Feature list */}
                <ul className="flex flex-col gap-2 flex-1 mb-5">
                  {/* FIX 2 — inherit line as normal checkmark bullet */}
                  {INHERIT_LINE[planKey] && (
                    <li className="flex items-start gap-3">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                        <circle cx="8" cy="8" r="7" fill="var(--vp-12)" />
                        <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-sm text-[#374151]">{INHERIT_LINE[planKey]}</span>
                    </li>
                  )}
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feat.included ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill="var(--vp-12)" />
                          <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill="rgba(0,0,0,0.04)" />
                          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                      <span className={`text-sm ${feat.included ? "text-[#374151]" : "text-[#D1D5DB] line-through"}`}>
                        {t(`landing.pricing.plans.${planKey}.features.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className={`text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.popular
                      ? "btn-primary"
                      : "border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                  }`}
                >
                  {t(`landing.pricing.plans.${planKey}.cta`)}
                </Link>
                {/* FIX 4 — trial reassurance line under button */}
                <p className="text-center text-[11px] text-[#9CA3AF] mt-2">
                  Experience it for 7 Days FREE
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
