"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/pricing";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="section-label mb-6">Pricing</span>
          <h2 className="vela-heading text-4xl md:text-5xl text-[#111111] mt-6">
            Simple, transparent{" "}
            <span className="vela-gradient-text">pricing.</span>
          </h2>
          <p className="mt-5 text-[#6B7280] text-lg max-w-lg mx-auto">
            Cancel anytime
          </p>

          <div className="mt-6">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 4.8l4.2 2.2-4.2 2.2V4.8z" fill="currentColor" />
              </svg>
              Try Demo
            </Link>
          </div>

          {/* Toggle */}
          <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-full bg-white border border-[#E5E7EB] shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                !annual ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                annual ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              Annual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF6B35] text-white">
                −20%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-6 items-stretch">
          {PLANS.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 md:p-8 flex flex-col transition-all duration-300 ${
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
                      style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`text-sm font-semibold uppercase tracking-widest mb-4 ${plan.popular ? "text-[#FF6B35]" : "text-[#9CA3AF]"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-extrabold text-[#111111]">
                      ${price}
                    </span>
                    <span className="text-sm mb-2 text-[#9CA3AF]">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-xs font-medium text-[#FF6B35]">
                      Save ${(plan.monthly - plan.annual) * 12}/year
                    </p>
                  )}
                  <p className="text-sm mt-3 leading-relaxed text-[#6B7280]">
                    {plan.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat.text} className="flex items-start gap-3">
                      {feat.included ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill="rgba(255,107,53,0.12)" />
                          <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill="rgba(0,0,0,0.04)" />
                          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                      <span className={`text-sm ${feat.included ? "text-[#374151]" : "text-[#D1D5DB] line-through"}`}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className={`text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.popular
                      ? "btn-primary"
                      : "border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-8">
          Cancel anytime, no questions asked.
        </p>
      </div>
    </section>
  );
}
