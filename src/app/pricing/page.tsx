"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/pricing";
import { getSupabase } from "@/lib/supabase";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: tenant } = await (supabase as any)
            .from("tenants").select("plan").eq("owner_id", user.id).single();
          if (tenant?.plan) setCurrentPlan((tenant.plan as string).toLowerCase());
        }
      } catch { /* no session */ }
    }
    loadPlan();
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Nav */}
      <nav className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="font-extrabold text-[#111111] text-lg tracking-tight">
            vela
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors">Sign in</Link>
            <Link href="/auth/signup" className="text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Early access banner */}
      <div className="bg-[#FF6B35]/8 border-b border-[#FF6B35]/15 px-5 py-3 text-center">
        <p className="text-sm text-[#FF6B35] font-medium">
          <span className="font-bold">Payments launching soon</span>
          {" "}— you&apos;re on the early list. Lock in your price today.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-14 md:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
            style={{ background: "rgba(255,107,53,0.1)", color: "#FF6B35" }}>
            Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#111111] tracking-tight leading-none mt-4 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-[#6B7280] text-lg max-w-md mx-auto">
            Cancel anytime · 7-day money-back guarantee · No contracts
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-full bg-white border border-[#E5E7EB] shadow-sm">
            <button onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? "bg-[#111111] text-white shadow-sm" : "text-[#6B7280] hover:text-[#111111]"}`}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${annual ? "bg-[#111111] text-white shadow-sm" : "text-[#6B7280] hover:text-[#111111]"}`}>
              Annual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF6B35] text-white">−20%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-6 items-stretch">
          {PLANS.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            const isCurrent = currentPlan === plan.id;
            return (
              <div key={plan.id}
                className={`relative rounded-2xl p-6 md:p-8 flex flex-col transition-all duration-200 ${
                  plan.popular
                    ? "bg-[#111111] shadow-2xl md:scale-[1.02]"
                    : "bg-white border border-[#E5E7EB] hover:border-[#FF6B35]/30 hover:shadow-lg"
                }`}
                style={plan.popular ? { boxShadow: "0 0 0 2px #FF6B35, 0 20px 60px rgba(255,107,53,0.25)" } : {}}>

                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3.5 right-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                      Your Plan
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${plan.popular ? "text-[#FF6B35]" : "text-[#9CA3AF]"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-5xl font-extrabold ${plan.popular ? "text-white" : "text-[#111111]"}`}>${price}</span>
                    <span className={`text-sm mb-2 ${plan.popular ? "text-white/50" : "text-[#9CA3AF]"}`}>/mo</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-[#FF6B35] font-medium">
                      Save ${(plan.monthly - plan.annual) * 12}/year
                    </p>
                  )}
                  <p className={`text-sm mt-3 leading-relaxed ${plan.popular ? "text-white/60" : "text-[#6B7280]"}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="flex flex-col gap-3 flex-1 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat.text} className="flex items-start gap-3">
                      {feat.included ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill={plan.popular ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.1)"} />
                          <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" fill="rgba(0,0,0,0.05)"/>
                          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#BBBBBB" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                      <span className={`text-sm ${feat.included ? (plan.popular ? "text-white/80" : "text-[#374151]") : "text-[#BBBBBB] line-through"}`}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="text-center py-3.5 px-6 rounded-xl text-sm font-semibold border-2 border-green-500/30 text-green-600 bg-green-50">
                    Current Plan
                  </div>
                ) : joined === plan.id ? (
                  <div className="text-center py-3.5 px-6 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                    ✓ You&apos;re on the early list!
                  </div>
                ) : (
                  <button
                    onClick={() => setJoined(plan.id)}
                    className={`text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all ${
                      plan.popular
                        ? "text-white hover:opacity-90"
                        : "border border-[#E5E7EB] text-[#111111] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                    }`}
                    style={plan.popular ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    {plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-[#9CA3AF] mt-10">
          Cancel anytime, no questions asked. · 7-day money-back guarantee
        </p>

        {/* FAQ rows */}
        <div className="mt-16 max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl font-bold text-[#111111] text-center mb-8">Frequently asked</h2>
          {[
            { q: "Is there a free trial?", a: "No free trial, but we offer a 7-day money-back guarantee on all plans. Sign up, try everything, and get a full refund if it&apos;s not for you." },
            { q: "When do payments launch?", a: "We&apos;re activating billing shortly. Everyone who signs up before launch locks in their plan at current prices." },
            { q: "Can I switch plans?", a: "Yes — upgrade or downgrade anytime from your Settings page. Upgrades are prorated, downgrades take effect at the next billing cycle." },
            { q: "What channels are included?", a: "Starter gets 1 channel. Pro and Premium get all three: WhatsApp, Instagram, and Website chat." },
          ].map((item) => (
            <div key={item.q} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <p className="font-semibold text-[#111111] text-sm mb-1.5">{item.q}</p>
              <p className="text-sm text-[#6B7280] leading-relaxed" dangerouslySetInnerHTML={{ __html: item.a }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
