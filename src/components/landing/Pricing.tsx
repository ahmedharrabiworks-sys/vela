"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/pricing";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#FFF5F0]">
      <div className="max-w-7xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="section-label mb-6">Pricing</span>
          <h2 className="vela-heading text-4xl md:text-5xl text-[#1A0A00] mt-6">
            Simple, transparent{" "}
            <span className="vela-gradient-text">pricing.</span>
          </h2>
          <p className="mt-5 text-[#888888] text-lg max-w-lg mx-auto">
            Cancel anytime
          </p>

          <div className="mt-6">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-[#1A0A00]/15 text-[#1A0A00] hover:border-[#1A0A00]/40 hover:bg-white transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 4.8l4.2 2.2-4.2 2.2V4.8z" fill="currentColor" />
              </svg>
              Try Demo
            </Link>
          </div>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 mt-8 p-1.5 rounded-full bg-white border border-[#f0e8e0] shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                !annual ? "bg-[#1A0A00] text-white shadow-sm" : "text-[#888888]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                annual ? "bg-[#1A0A00] text-white shadow-sm" : "text-[#888888]"
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
                    ? "bg-[#1A0A00] shadow-vela-lg md:scale-[1.02] mt-4 md:mt-0"
                    : "bg-white border border-[#f0e8e0] shadow-card hover:shadow-card-hover hover:-translate-y-1"
                }`}
                style={
                  plan.popular
                    ? { boxShadow: "0 0 0 2px #FF6B35, 0 20px 60px rgba(255,107,53,0.25)" }
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
                  <p className={`text-sm font-semibold uppercase tracking-widest mb-4 ${plan.popular ? "text-[#FF6B35]" : "text-[#888888]"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className={`text-5xl font-extrabold ${plan.popular ? "text-white" : "text-[#1A0A00]"}`}>
                      ${price}
                    </span>
                    <span className={`text-sm mb-2 ${plan.popular ? "text-white/50" : "text-[#888888]"}`}>/mo</span>
                  </div>
                  {annual && (
                    <p className={`text-xs font-medium ${plan.popular ? "text-[#FF6B35]" : "text-[#FF6B35]"}`}>
                      Save ${(plan.monthly - plan.annual) * 12}/year
                    </p>
                  )}
                  <p className={`text-sm mt-3 leading-relaxed ${plan.popular ? "text-white/60" : "text-[#888888]"}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat.text} className="flex items-start gap-3">
                      {feat.included ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill={plan.popular ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.1)"} />
                          <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill="rgba(0,0,0,0.06)" />
                          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#aaaaaa" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                      <span className={`text-sm ${feat.included ? (plan.popular ? "text-white/80" : "text-[#1A0A00]") : "text-[#aaaaaa] line-through"}`}>
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
                      : "border border-[#f0e8e0] text-[#1A0A00] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-[#888888] mt-8">
          Cancel anytime, no questions asked.
        </p>
      </div>
    </section>
  );
}
