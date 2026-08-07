import Link from "next/link";
import PublicPageHeader from "@/components/landing/PublicPageHeader";

const COL_HEADERS = ["Starter", "Pro", "Premium"];
const PRO_COL = 1;

const COMPARISON_ROWS: { label: string; values: (string | boolean)[] }[] = [
  { label: "Voice minutes",        values: ["150/mo",           "650/mo",               "1,300/mo"              ] },
  { label: "Text messages",        values: ["500/mo",           "Unlimited",            "Unlimited"             ] },
  { label: "Channels",             values: ["1",                "All 3",                "All 3 + priority"      ] },
  { label: "AI Voice Phone Agent", values: [false,              true,                   true                    ] },
  { label: "Languages",            values: ["1",                "Up to 5",              "Unlimited"             ] },
  { label: "Websites",             values: ["—",                "1 + custom domain",    "3 + custom domains"    ] },
  { label: "Multi-location",       values: ["—",                "2 locations",          "Unlimited"             ] },
  { label: "CRM",                  values: ["View-only",        "Full + automation",    "Full + custom pipelines"] },
  { label: "Team members",         values: ["1",                "3",                    "Unlimited"             ] },
  { label: "AI training",          values: ["Single interview", "Unlimited edits",      "Priority retraining"   ] },
  { label: "Analytics",            values: ["Basic",            "Full funnel",          "Full + exports"        ] },
  { label: "Support",              values: ["Email 48h",        "Priority 24h",         "Dedicated call + chat" ] },
  { label: "Onboarding",           values: ["Self-serve",       "Self-serve + checklist","Done-for-you"         ] },
];

const FAQ_ITEMS = [
  {
    q: "Is there a free trial?",
    a: "Yes — try Vela free for 7 days, no commitment required. Explore the full product before your first charge. Cancel anytime.",
  },
  {
    q: "When do payments launch?",
    a: "We're activating billing shortly. Everyone who signs up before launch locks in their plan at current prices.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes — upgrade or downgrade anytime from your Settings page. Upgrades are prorated, downgrades take effect at the next billing cycle.",
  },
  {
    q: "What channels are included?",
    a: "Starter gets 1 channel. Pro and Premium get all three: WhatsApp, Instagram, and Website chat.",
  },
];

export const metadata = {
  title: "Compare Plans — Vela",
  description: "Full feature comparison across Vela's Starter, Pro, and Premium plans.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PublicPageHeader />

      {/* Early access banner */}
      <div className="bg-[#FF6B35]/8 border-b border-[#FF6B35]/15 px-5 py-3 text-center">
        <p className="text-sm text-[#FF6B35] font-medium">
          <span className="font-bold">Payments launching soon</span>
          {" — "}you&apos;re on the early list. Lock in your price today.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10 md:py-14">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#111111] tracking-tight leading-tight">
            Compare Plans
          </h1>
          <p className="text-[#6B7280] mt-2">
            All three plans, every feature — side by side.{" "}
            <Link href="/#pricing" className="text-[#FF6B35] hover:underline font-medium">
              Back to pricing ↑
            </Link>
          </p>
        </div>

        {/* Comparison table — horizontally scrollable on mobile */}
        <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
          <table className="w-full min-w-[480px] text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-4 px-5 font-semibold text-[#9CA3AF] text-xs uppercase tracking-wider w-44" />
                {COL_HEADERS.map((h, i) => (
                  <th
                    key={h}
                    className={`py-4 px-4 text-center font-bold text-xs uppercase tracking-wider ${
                      i === PRO_COL ? "text-[#FF6B35] bg-[#FF6B35]/5" : "text-[#374151]"
                    }`}
                  >
                    {h}
                    {i === PRO_COL && (
                      <span className="block text-[9px] font-semibold normal-case tracking-normal text-[#FF6B35]/70 mt-0.5">
                        Most Popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, ri) => (
                <tr
                  key={row.label}
                  className={`border-b border-[#F3F4F6] last:border-0 ${ri % 2 === 1 ? "bg-[#FAFAFA]" : "bg-white"}`}
                >
                  <td className="py-3.5 px-5 font-medium text-[#374151] whitespace-nowrap">{row.label}</td>
                  {row.values.map((val, ci) => (
                    <td
                      key={ci}
                      className={`py-3.5 px-4 text-center ${ci === PRO_COL ? "bg-[#FF6B35]/5" : ""}`}
                    >
                      {typeof val === "boolean" ? (
                        val ? (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mx-auto">
                            <circle cx="9" cy="9" r="8" fill="rgba(255,107,53,0.12)" />
                            <path
                              d="M5.5 9l2.5 2.5 4.5-5"
                              stroke="#FF6B35"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="text-[#D1D5DB] font-medium">—</span>
                        )
                      ) : (
                        <span className={ci === PRO_COL ? "font-semibold text-[#111111]" : "text-[#6B7280]"}>
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

        {/* CTA note */}
        <p className="text-center text-sm text-[#9CA3AF] mt-8">
          Cancel anytime, no questions asked.{" · "}
          <Link href="/auth/signup" className="text-[#FF6B35] hover:underline font-medium">
            Start your 7-day trial →
          </Link>
        </p>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-[#111111] mb-8">Frequently asked</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <p className="font-semibold text-[#111111] text-sm mb-1.5">{item.q}</p>
                <p className="text-sm text-[#6B7280] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
