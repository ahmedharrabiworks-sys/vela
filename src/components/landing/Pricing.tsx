"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { PLANS } from "@/lib/pricing";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  return (
    <section
      id="pricing"
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ background: "#0A0908" }}
    >
      {/* Separator */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)" }}
      />

      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,107,53,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <motion.div
          ref={headRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: "#FF6B35" }}>
            Pricing
          </p>
          <h2
            className="text-white"
            style={{ fontSize: "clamp(32px,4.5vw,60px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 }}
          >
            Simple,{" "}
            <span style={{ fontWeight: 200, color: "rgba(255,255,255,0.32)" }}>transparent</span>
            {" "}pricing.
          </h2>
          <p className="mt-4 text-base max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.38)" }}>
            Cancel anytime. No contracts. No surprises.
          </p>

          {/* Demo link */}
          <div className="mt-5 mb-6">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 4.2l4 2.3L5 8.8V4.2z" fill="currentColor"/>
              </svg>
              Try it live first
            </Link>
          </div>

          {/* Toggle */}
          <div
            className="inline-flex items-center gap-1 p-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {[
              { label: "Monthly", value: false },
              { label: "Annual", value: true },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setAnnual(opt.value)}
                className="relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: annual === opt.value ? "rgba(255,255,255,0.1)" : "transparent",
                  color: annual === opt.value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                }}
              >
                {opt.label}
                {opt.value && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#FF6B35", color: "white" }}
                  >
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-6 items-stretch">
          {PLANS.map((plan, i) => {
            const price = annual ? plan.annual : plan.monthly;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col rounded-3xl p-6 md:p-8 overflow-hidden"
                style={
                  plan.popular
                    ? {
                        background: "rgba(255,107,53,0.07)",
                        border: "1px solid rgba(255,107,53,0.35)",
                        boxShadow: "0 0 0 1px rgba(255,107,53,0.2), 0 24px 64px rgba(255,107,53,0.15)",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                {/* Popular glow */}
                {plan.popular && (
                  <div
                    aria-hidden
                    className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse, rgba(255,107,53,0.3) 0%, transparent 70%)",
                      filter: "blur(24px)",
                    }}
                  />
                )}

                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className="px-4 py-1 rounded-full text-[11px] font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan info */}
                <div className="mb-6">
                  <p
                    className="text-xs font-bold uppercase tracking-[0.16em] mb-4"
                    style={{ color: plan.popular ? "#FF6B35" : "rgba(255,255,255,0.35)" }}
                  >
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-extrabold text-white">${price}</span>
                    <span className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>/mo</span>
                  </div>
                  {annual && (
                    <p className="text-xs font-semibold" style={{ color: "#FF6B35" }}>
                      Save ${(plan.monthly - plan.annual) * 12}/year
                    </p>
                  )}
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat.text} className="flex items-start gap-3">
                      {feat.included ? (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="7.5" cy="7.5" r="6.5" fill={plan.popular ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.12)"}/>
                          <path d="M4.5 7.5l2 2 4-4" stroke="#FF6B35" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="7.5" cy="7.5" r="6.5" fill="rgba(255,255,255,0.04)"/>
                          <path d="M5 5l5 5M10 5l-5 5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      )}
                      <span
                        className="text-sm"
                        style={{
                          color: feat.included ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)",
                          textDecoration: feat.included ? "none" : "line-through",
                        }}
                      >
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/auth/signup"
                  className="text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all"
                  style={
                    plan.popular
                      ? {
                          background: "linear-gradient(135deg,#FF6B35,#FF3366)",
                          color: "white",
                          boxShadow: "0 4px 20px rgba(255,107,53,0.35)",
                        }
                      : {
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.7)",
                        }
                  }
                >
                  {plan.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-sm mt-8" style={{ color: "rgba(255,255,255,0.25)" }}>
          Cancel anytime, no questions asked.
        </p>
      </div>
    </section>
  );
}
