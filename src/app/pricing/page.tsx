"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/pricing";

const TIER_PLANS = PLANS.filter((p) => !p.isCustom);
import { getSupabase } from "@/lib/supabase";

const COL_HEADERS = ["Starter", "Pro", "Premium", "Custom"];
const PRO_COL = 1;

const COMPARISON_ROWS: { label: string; values: (string | boolean)[] }[] = [
  { label: "Voice minutes",        values: ["150/mo",           "650/mo",               "1,300/mo",               "Negotiated"]           },
  { label: "Text messages",        values: ["500/mo",           "Unlimited",            "Unlimited",              "Unlimited"]            },
  { label: "Channels",             values: ["1",                "All 3",                "All 3 + priority",       "All + custom"]         },
  { label: "AI Voice Phone Agent", values: [false,              true,                   true,                     true]                   },
  { label: "Languages",            values: ["1",                "Up to 5",              "Unlimited",              "Unlimited"]            },
  { label: "Websites",             values: ["—",                "1 + custom domain",    "3 + custom domains",     "Unlimited"]            },
  { label: "Multi-location",       values: ["—",                "2 locations",          "Unlimited",              "Unlimited"]            },
  { label: "CRM",                  values: ["View-only",        "Full + automation",    "Full + custom pipelines","Full + white-label"]   },
  { label: "Team members",         values: ["1",                "3",                    "Unlimited",              "Unlimited"]            },
  { label: "AI training",          values: ["Single interview", "Unlimited edits",      "Priority retraining",    "Dedicated tuning"]     },
  { label: "Analytics",            values: ["Basic",            "Full funnel",          "Full + exports",         "Full + white-label"]   },
  { label: "Support",              values: ["Email 48h",        "Priority 24h",         "Dedicated call + chat",  "Account manager + SLA"]},
  { label: "Onboarding",           values: ["Self-serve",       "Self-serve + checklist","Done-for-you",          "White-glove + training"]},
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

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
              style={{ background: "var(--vela-gradient)" }}>
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
            style={{ background: "var(--vp-10)", color: "var(--vp-color)" }}>
            Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#111111] tracking-tight leading-none mt-4 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-[#6B7280] text-lg max-w-md mx-auto">
            Cancel anytime · No contracts
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
          {TIER_PLANS.map((plan) => {
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
                      style={{ background: "var(--vela-gradient)" }}>
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
                  {plan.highlightFeatures.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                        <circle cx="8" cy="8" r="7" fill={plan.popular ? "rgba(255,107,53,0.2)" : "var(--vp-10)"} />
                        <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={`text-sm ${plan.popular ? "text-white/80" : "text-[#374151]"}`}>
                        {feat}
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
                    style={plan.popular ? { background: "var(--vela-gradient)" } : {}}>
                    {plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom tier */}
        <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Custom — from $1,500/mo</p>
            <p className="text-lg font-bold text-[#111111]">Built around your business</p>
            <p className="text-sm text-[#6B7280] mt-1 max-w-xl">Negotiated voice volume, unlimited websites, white-label, dedicated account manager, and SLA. For multi-location franchises and enterprise teams.</p>
          </div>
          <a
            href="mailto:hello@tryvela.com"
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border border-[#E5E7EB] text-[#111111] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200 whitespace-nowrap"
          >
            Talk to us
          </a>
        </div>

        {/* Compare all features toggle */}
        <div className="mt-10 text-center">
          <button
            onClick={() => setShowComparison((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            {showComparison ? "Hide comparison ↑" : "Compare all features ↓"}
          </button>
        </div>

        {/* Comparison table — horizontally scrollable on mobile */}
        {showComparison && (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
            <table className="w-full min-w-[580px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-4 px-5 font-semibold text-[#9CA3AF] text-xs uppercase tracking-wider w-40"></th>
                  {COL_HEADERS.map((h, i) => (
                    <th key={h}
                      className={`py-4 px-4 text-center font-bold text-xs uppercase tracking-wider ${
                        i === PRO_COL
                          ? "text-[#FF6B35] bg-[#FF6B35]/5"
                          : "text-[#374151]"
                      }`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, ri) => (
                  <tr key={row.label}
                    className={`border-b border-[#F3F4F6] last:border-0 ${ri % 2 === 1 ? "bg-[#FAFAFA]" : "bg-white"}`}>
                    <td className="py-3.5 px-5 font-medium text-[#374151] whitespace-nowrap">{row.label}</td>
                    {row.values.map((val, ci) => (
                      <td key={ci}
                        className={`py-3.5 px-4 text-center ${ci === PRO_COL ? "bg-[#FF6B35]/5" : ""}`}>
                        {typeof val === "boolean" ? (
                          val ? (
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mx-auto">
                              <circle cx="9" cy="9" r="8" fill="rgba(255,107,53,0.12)"/>
                              <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#FF6B35" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span className="text-[#D1D5DB] font-medium">—</span>
                          )
                        ) : (
                          <span className={`${ci === PRO_COL ? "font-semibold text-[#111111]" : "text-[#6B7280]"}`}>
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-sm text-[#9CA3AF] mt-10">
          Cancel anytime, no questions asked.
        </p>

        {/* FAQ rows */}
        <div className="mt-16 max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl font-bold text-[#111111] text-center mb-8">Frequently asked</h2>
          {[
            { q: "Is there a free trial?", a: "No free trial — but try the full product free with our interactive demo at <a href='/demo' class='text-[#FF6B35] hover:underline'>/demo</a>. Cancel anytime, no questions asked." },
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
