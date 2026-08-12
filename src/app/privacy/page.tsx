import Link from "next/link";
import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Privacy Policy | Vela",
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

          <div className="max-w-none text-[#374151] space-y-8">
            <section>
              <p className="leading-relaxed">
                This Privacy Policy explains how Vela (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, shares, and protects information in connection with our website, dashboard, AI chat agents, AI voice phone agents, website builder, and related features (together, the &quot;Service&quot;). This Policy applies to businesses that create a Vela account (&quot;you&quot; or &quot;customer&quot;) and, where relevant, to the end customers who interact with a Vela powered chat, voice, or messaging agent on a customer&apos;s behalf.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">1. Information We Collect</h2>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">1.1 Account Data</h3>
              <p className="leading-relaxed">
                When you create a Vela account, we collect information such as your name, email address, password, business name, industry, city, and phone number.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">1.2 Business Data</h3>
              <p className="leading-relaxed">
                We collect the business information you provide to configure and train your AI agent, including your knowledge base content, services and pricing information, business hours, booking policies, uploaded documents and images, and any other content you submit to personalize your AI agent.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">1.3 Message Content</h3>
              <p className="leading-relaxed">
                We process the content of conversations between your AI agent and your customers across connected channels, including website chat, Instagram, and WhatsApp, in order to generate responses, maintain conversation history, and populate your leads and customer relationship management records.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">1.4 Voice and Call Data</h3>
              <p className="leading-relaxed">
                If you use the AI voice phone agent, we process call audio, call transcripts, call duration, and call metadata such as timestamps and phone numbers, in order to provide the voice agent feature, generate transcripts, and calculate voice minute usage against your plan allowance.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">1.5 Usage Data</h3>
              <p className="leading-relaxed">
                We automatically collect certain information when you use the Service, including browser type, device information, IP address, pages visited, features used, and timestamps of activity, using standard web server logging and application analytics.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">1.6 Cookies and Tracking Technologies</h3>
              <p className="leading-relaxed">
                We use cookies and similar technologies to keep you logged in, remember your preferences such as light or dark mode, and understand how the Service is used. See Section 9, Cookie Policy, for more detail.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">1.7 Payment Information</h3>
              <p className="leading-relaxed">
                If you subscribe to a paid plan, payment card details are collected and processed directly by our payment processor. We do not store full payment card numbers on our own systems.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">2. How We Use Your Information</h2>
              <p className="leading-relaxed">We use the information described above to:</p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mt-2">
                <li>Provide, operate, and maintain the Service, including your AI chat and voice agents, website builder, and CRM;</li>
                <li>Train and personalize your AI agent based on your business data and knowledge base;</li>
                <li>Process and respond to customer conversations and calls on your behalf;</li>
                <li>Calculate usage against your plan allowances and process billing;</li>
                <li>Send you product updates, service notifications, and support communications;</li>
                <li>Monitor, analyze, and improve the performance, security, and reliability of the Service;</li>
                <li>Detect, investigate, and prevent fraud, abuse, and security incidents;</li>
                <li>Comply with our legal obligations and enforce our Terms of Service.</li>
              </ul>
              <p className="leading-relaxed mt-3">We do not sell your personal data to third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">3. Legal Basis for Processing</h2>
              <p className="leading-relaxed">
                Where applicable data protection law, such as the General Data Protection Regulation, requires a legal basis for processing personal data, we rely on the following bases: performance of a contract with you, such as providing the Service you have signed up for; our legitimate interests, such as improving and securing the Service, provided those interests are not overridden by your rights; compliance with a legal obligation; and, where applicable, your consent, such as for certain cookies or marketing communications, which you may withdraw at any time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">4. Third Party Subprocessors</h2>
              <p className="leading-relaxed">
                We share information with the following categories of third party service providers, who act as our subprocessors and are contractually bound to use the data only to provide services to us:
              </p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mt-2">
                <li><span className="font-semibold text-[#111111]">OpenAI</span>, which processes conversation content, business data, and knowledge base content to generate AI chat responses, marketing content, and training interview text;</li>
                <li><span className="font-semibold text-[#111111]">Vapi</span>, which handles voice call routing and orchestration for the AI voice phone agent;</li>
                <li><span className="font-semibold text-[#111111]">ElevenLabs</span>, which provides text to speech voice synthesis and speech to text transcription for voice calls;</li>
                <li><span className="font-semibold text-[#111111]">Meta</span>, which provides the Instagram and WhatsApp messaging infrastructure used to send and receive messages when you connect those channels;</li>
                <li><span className="font-semibold text-[#111111]">Supabase</span>, which provides our primary database and authentication infrastructure and stores account, business, and conversation data;</li>
                <li><span className="font-semibold text-[#111111]">Vercel</span>, which hosts and serves the Vela application and website builder output.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                We may also share information with additional service providers who support functions such as email delivery, payment processing, and customer support, each bound by contractual confidentiality and data protection obligations. We do not permit our subprocessors to use your data for their own independent purposes.
              </p>
              <p className="leading-relaxed mt-3">
                We may also disclose information where required by law, to protect the rights, property, or safety of Vela, our customers, or others, or in connection with a merger, acquisition, or sale of assets, subject to appropriate confidentiality protections.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">5. International Data Transfers</h2>
              <p className="leading-relaxed">
                Vela is used by businesses worldwide, and our subprocessors may process and store data in countries other than your own, including the United States and countries within the European Union. Where we transfer personal data across borders, we use appropriate safeguards recognized under applicable data protection law, such as standard contractual clauses, to help ensure your data continues to receive an adequate level of protection.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">6. Data Retention</h2>
              <p className="leading-relaxed">
                We retain personal data for as long as your account is active and as needed to provide the Service. Following account closure or a data deletion request, we delete or anonymize your data within a reasonable period, except where we are required to retain it for legal, tax, accounting, dispute resolution, or legitimate business record keeping purposes, in which case we retain only what is necessary for those purposes and for as long as required.
              </p>
              <p className="leading-relaxed mt-3">
                Call recordings and transcripts, conversation logs, and similar operational data are retained for the period necessary to provide the voice and chat features, calculate usage, and support your access to historical records within the dashboard, after which they may be deleted or archived in accordance with our data retention practices.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">7. Security Measures</h2>
              <p className="leading-relaxed">
                We use industry standard technical and organizational measures designed to protect your data, including encryption of data in transit and at rest, access controls restricting data access to authorized personnel and systems on a need to know basis, row level security policies on our database that scope each customer&apos;s access to their own data, and ongoing monitoring for security vulnerabilities.
              </p>
              <p className="leading-relaxed mt-3">
                No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we become aware of a security incident affecting your personal data, we will notify you and any applicable regulator as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">8. Your Privacy Rights</h2>
              <p className="leading-relaxed">
                Depending on your location, you may have the following rights regarding your personal data. Where these rights apply, you may exercise them by contacting us using the details in Section 12 or, where available, through your account settings.
              </p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mt-2">
                <li><span className="font-semibold text-[#111111]">Access</span>, the right to request a copy of the personal data we hold about you;</li>
                <li><span className="font-semibold text-[#111111]">Correction</span>, the right to request that we correct inaccurate or incomplete data;</li>
                <li><span className="font-semibold text-[#111111]">Deletion</span>, the right to request deletion of your personal data, subject to certain legal exceptions;</li>
                <li><span className="font-semibold text-[#111111]">Export</span>, the right to receive your data in a portable, commonly used format;</li>
                <li><span className="font-semibold text-[#111111]">Objection</span>, the right to object to certain processing of your data based on our legitimate interests;</li>
                <li><span className="font-semibold text-[#111111]">Restriction</span>, the right to request that we limit how we use your data in certain circumstances.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                If you are located in the European Economic Area, the United Kingdom, or Switzerland, these rights are provided in accordance with the General Data Protection Regulation and equivalent local laws, and you also have the right to lodge a complaint with your local data protection authority.
              </p>
              <p className="leading-relaxed mt-3">
                If you are a California resident, you may have additional rights under the California Consumer Privacy Act and related California law, including the right to know what personal information we collect, use, and disclose, the right to request deletion, the right to correct inaccurate information, and the right to opt out of the sale or sharing of personal information. As noted in Section 2, we do not sell your personal data.
              </p>
              <p className="leading-relaxed mt-3">
                We will not discriminate against you for exercising any of these rights. We may need to verify your identity before fulfilling certain requests.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">9. Cookie Policy</h2>
              <p className="leading-relaxed">
                We use the following categories of cookies and similar technologies:
              </p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mt-2">
                <li><span className="font-semibold text-[#111111]">Essential cookies</span>, required for core functionality such as keeping you signed in and maintaining session security;</li>
                <li><span className="font-semibold text-[#111111]">Preference cookies</span>, which remember settings such as your light or dark mode selection and language preference;</li>
                <li><span className="font-semibold text-[#111111]">Analytics cookies</span>, which help us understand how the Service is used so we can improve it.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                Most browsers allow you to control cookies through their settings. Disabling essential cookies may affect the availability of certain features of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">10. Children&apos;s Privacy</h2>
              <p className="leading-relaxed">
                The Service is intended for use by businesses and is not directed at children. We do not knowingly collect personal data from individuals under the age of 16. If we become aware that we have collected personal data from a child without appropriate consent, we will take steps to delete that information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">11. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices, the Service, or applicable law. When we make material changes, we will update the &quot;Last updated&quot; date at the top of this page and, where appropriate, provide additional notice such as an email or an in product notification. We encourage you to review this Policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">12. Contact Information</h2>
              <p className="leading-relaxed">
                For privacy related questions or to exercise any of the rights described in this Policy, contact us at{" "}
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
