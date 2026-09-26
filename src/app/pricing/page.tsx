import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Pricing from "@/components/landing/Pricing";
import PlanComparisonDetailed from "@/components/landing/PlanComparisonDetailed";

const FAQ_ITEMS = [
  {
    q: "Do I need a credit card to sign up?",
    a: "No. Creating your Vela account doesn't require a credit card. Explore the product and get set up first.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no contracts or cancellation fees. You can cancel directly from your billing settings at any time.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Upgrade or downgrade anytime from your Settings page. Upgrades are prorated, downgrades take effect at the next billing cycle.",
  },
  {
    q: "Do I need any technical skills to set up Vela?",
    a: "No. Connect your channels, train the AI on your business info, and you're live. No code, no developer, no setup calls.",
  },
];

export const metadata = {
  title: "Compare Plans | Vela",
  description: "Full feature comparison across Vela's Starter, Pro, and Premium plans.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PublicPageHeader />

      {/* Plan-card selection, the default landing view for any "Upgrade Now" /
          "Upgrade to Pro" click across the app. Reuses the same component as
          the homepage's #pricing section (same cards, same copy, same links). */}
      <Pricing />

      <div id="compare" className="max-w-4xl mx-auto px-5 py-10 md:py-14 scroll-mt-6">
        {/* Rebuilt as a categorized, detailed comparison (bug-fix + polish
            round #2) -- grouped under real category headers (Channels &
            Messaging / Voice & AI Agent / Team & Training / Support &
            Onboarding) with a longer description per row instead of a bare
            number. Full EN/AR, see PlanComparisonDetailed.tsx. */}
        <PlanComparisonDetailed />

        {/* FAQ */}
        <div id="faq" className="mt-16 scroll-mt-6">
          <h2 className="font-display text-xl font-bold text-[#111111] mb-8">Frequently asked</h2>
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
