import Link from "next/link";
import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Privacy Policy — Vela",
  description: "How Vela collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <PublicPageHeader />
      <main className="min-h-screen pt-6 pb-20">
        <div className="max-w-2xl mx-auto px-5 md:px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">Legal</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#111111] mb-3" style={{ letterSpacing: "-0.03em" }}>
              Privacy Policy
            </h1>
            <p className="text-sm text-[#9CA3AF]">Last updated: August 2026</p>
          </div>

          <div className="prose prose-sm max-w-none text-[#374151] space-y-6">
            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">1. Information We Collect</h2>
              <p className="leading-relaxed">
                We collect information you provide when creating an account (name, email, business details), information generated through using our service (conversations, call logs, appointments), and standard usage data (browser type, IP address, pages visited).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">2. How We Use Your Information</h2>
              <p className="leading-relaxed">
                We use your information to provide and improve the Vela platform, train your AI assistant on your business data, send product updates and support communications, and comply with legal obligations. We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">3. Data Storage and Security</h2>
              <p className="leading-relaxed">
                Your data is stored on secure infrastructure in the EU (Supabase, West Europe). We use industry-standard encryption in transit and at rest. Access to your data is restricted to you and our platform services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">4. Your Rights</h2>
              <p className="leading-relaxed">
                You have the right to access, correct, or delete your personal data at any time. You can export your data from your account settings, or contact us to request deletion of your account and associated data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">5. Third-Party Services</h2>
              <p className="leading-relaxed">
                Vela integrates with third-party services including OpenAI (AI processing), Vapi (voice calls), ElevenLabs (voice synthesis), and Meta (Instagram, WhatsApp). Each of these services has its own privacy policy governing their use of your data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">6. Contact</h2>
              <p className="leading-relaxed">
                For privacy-related questions, contact us at{" "}
                <a href="mailto:privacy@tryvela.com" className="font-medium" style={{ color: "var(--vp-color)" }}>
                  privacy@tryvela.com
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
