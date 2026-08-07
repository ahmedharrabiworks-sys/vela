import Link from "next/link";
import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Terms of Service — Vela",
  description: "Terms and conditions for using the Vela platform.",
};

export default function TermsPage() {
  return (
    <>
      <PublicPageHeader />
      <main className="min-h-screen pt-6 pb-20">
        <div className="max-w-2xl mx-auto px-5 md:px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">Legal</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#111111] mb-3" style={{ letterSpacing: "-0.03em" }}>
              Terms of Service
            </h1>
            <p className="text-sm text-[#9CA3AF]">Last updated: August 2026</p>
          </div>

          <div className="prose prose-sm max-w-none text-[#374151] space-y-6">
            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By creating an account or using Vela, you agree to these Terms of Service. If you do not agree, do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">2. Service Description</h2>
              <p className="leading-relaxed">
                Vela is an AI-powered business operating system that helps businesses manage customer communications, bookings, leads, and analytics across multiple channels. Features include AI chat agents, voice phone agents, website building, and CRM functionality.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">3. Account Responsibilities</h2>
              <p className="leading-relaxed">
                You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. You must provide accurate information and keep your business data current.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">4. Acceptable Use</h2>
              <p className="leading-relaxed">
                You may not use Vela for unlawful purposes, to send spam, to harass users, or to violate any third-party rights. You are responsible for ensuring your AI agent's responses comply with applicable laws in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">5. Subscription and Billing</h2>
              <p className="leading-relaxed">
                Subscriptions are billed monthly or annually as selected. You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period. No refunds are provided for partial periods.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">6. Limitation of Liability</h2>
              <p className="leading-relaxed">
                Vela is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the fees paid by you in the three months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">7. Contact</h2>
              <p className="leading-relaxed">
                For questions about these terms, contact{" "}
                <a href="mailto:legal@tryvela.com" className="font-medium" style={{ color: "var(--vp-color)" }}>
                  legal@tryvela.com
                </a>.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
            <Link href="/" className="text-sm font-medium" style={{ color: "var(--vp-color)" }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
