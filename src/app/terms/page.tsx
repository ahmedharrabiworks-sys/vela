import Link from "next/link";
import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Terms of Service | Vela",
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

          <div className="max-w-none text-[#374151] space-y-8">
            <section>
              <p className="leading-relaxed">
                These Terms of Service (the &quot;Terms&quot;) govern your access to and use of Vela, including our website, dashboard, AI chat agents, AI voice phone agents, website builder, and all related features (together, the &quot;Service&quot;). Please read these Terms carefully before using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By creating an account, accessing, or using the Service in any way, you agree to be bound by these Terms and by our Privacy Policy, which is incorporated into these Terms by reference. If you are agreeing to these Terms on behalf of a business or other legal entity, you represent that you have the authority to bind that entity, in which case &quot;you&quot; refers to that entity. If you do not agree to these Terms, you must not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">2. Description of Service</h2>
              <p className="leading-relaxed">
                Vela is an AI powered business operating system that helps businesses of many types, including but not limited to clinics, gyms, salons, real estate agencies, restaurants, law firms, e commerce businesses, and professional service agencies, manage customer communications, bookings, leads, and analytics across multiple channels.
              </p>
              <p className="leading-relaxed mt-3">
                Depending on your subscription plan, the Service may include an AI chat assistant for your website and connected messaging channels, an AI voice phone agent that can answer inbound calls and book appointments, a website builder, a customer relationship management (CRM) system, marketing content generation tools, and analytics reporting. Not all features are available on every plan. Current plan features are described on our Pricing page.
              </p>
              <p className="leading-relaxed mt-3">
                Vela is continuously developed and improved. Features may be added, changed, or removed over time as described in Section 10 below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">3. Account Registration and Eligibility</h2>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">3.1 Eligibility</h3>
              <p className="leading-relaxed">
                You must be at least 18 years old and have the legal capacity to enter into a binding contract to create a Vela account. The Service is intended for business use and is not directed at individual consumers acting outside of a business, trade, or profession.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">3.2 Account Information</h3>
              <p className="leading-relaxed">
                When you register, you must provide accurate, current, and complete information about yourself and your business. You must keep this information up to date. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account, whether or not you authorized that activity.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">3.3 Notification of Unauthorized Use</h3>
              <p className="leading-relaxed">
                You must notify us immediately at the contact address in Section 17 if you become aware of any unauthorized access to or use of your account. We are not liable for any loss or damage arising from your failure to safeguard your account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">4. Subscription Plans and Billing</h2>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">4.1 Plans</h3>
              <p className="leading-relaxed">
                Vela offers multiple subscription tiers, each with its own feature set, usage allowances, and price, as described on our Pricing page. We reserve the right to introduce new plans, retire existing plans, or adjust plan features and pricing at any time. Material price changes to your active subscription will be communicated to you in advance of taking effect.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">4.2 Billing</h3>
              <p className="leading-relaxed">
                Subscriptions are billed in advance on a recurring monthly or annual basis, depending on the billing cycle you select at signup. By providing a payment method, you authorize us (or our third party payment processor) to charge that payment method on each billing date for the applicable subscription fee, plus any applicable taxes and usage overage charges described in Section 4.4.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">4.3 Cancellation</h3>
              <p className="leading-relaxed">
                You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period, and you will retain access to the Service until that date. You may continue using Vela up until the end of the period you have already paid for. Vela subscriptions can be cancelled anytime, with no long term contract or lock in commitment.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">4.4 Usage Allowances and Overages</h3>
              <p className="leading-relaxed">
                Each plan includes specific usage allowances, such as voice minutes and message volumes, as described on our Pricing page. Usage beyond your plan allowance may be billed at the applicable overage rate for your plan, or may result in a temporary limitation of the affected feature until the next billing cycle, as described in your plan details.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">4.5 Failed Payments</h3>
              <p className="leading-relaxed">
                If a payment cannot be processed, we may retry the charge, suspend your access to paid features, or downgrade your account until payment is successfully collected. Prices for the Service are exclusive of taxes unless stated otherwise, and you are responsible for any applicable sales, use, value added, or similar taxes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">5. Acceptable Use Policy</h2>
              <p className="leading-relaxed">You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 space-y-1 leading-relaxed mt-2">
                <li>Violate any applicable law, regulation, or third party right, including intellectual property, privacy, or consumer protection laws;</li>
                <li>Send unsolicited bulk messages, spam, or engage in phishing or deceptive communications through any connected channel;</li>
                <li>Harass, threaten, defame, or abuse any person, whether through your own conduct or through your AI agent&apos;s automated communications;</li>
                <li>Attempt to gain unauthorized access to the Service, other accounts, or any systems or networks connected to the Service;</li>
                <li>Interfere with or disrupt the integrity or performance of the Service, including through introducing malware or excessive automated requests;</li>
                <li>Reverse engineer, decompile, or attempt to extract the source code of the Service, except where such restriction is prohibited by applicable law;</li>
                <li>Use the Service to build or train a competing product, or to scrape or harvest data from the Service beyond your own account data;</li>
                <li>Misrepresent your identity, impersonate any person or business, or misrepresent your affiliation with any person or entity;</li>
                <li>Use the Service in any manner that could damage, disable, overburden, or impair Vela&apos;s infrastructure or that of our subprocessors.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                You are solely responsible for ensuring that your use of the Service, including the content and conduct of your AI agent&apos;s communications with your customers, complies with all laws applicable to your business and to the jurisdictions in which your customers are located.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">6. User Content and Data Ownership</h2>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">6.1 Your Content</h3>
              <p className="leading-relaxed">
                &quot;User Content&quot; means any information, business data, knowledge base material, files, images, and other content you or your customers submit to or generate through the Service, including data used to train your AI agent. As between you and Vela, you retain all ownership rights in your User Content.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">6.2 License to Vela</h3>
              <p className="leading-relaxed">
                You grant Vela a worldwide, non exclusive, royalty free license to host, store, process, transmit, and display your User Content solely for the purpose of providing, maintaining, and improving the Service to you. This license ends when your User Content is deleted from the Service, subject to Section 15.4 regarding post termination retention.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">6.3 Data Export and Deletion</h3>
              <p className="leading-relaxed">
                You may export or request deletion of your User Content at any time as described in our Privacy Policy. You are responsible for maintaining your own backup copies of any User Content you consider important.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">7. AI Generated Content and Automated Communications</h2>
              <p className="leading-relaxed">
                The Service uses artificial intelligence, including large language models and voice technology provided by third party subprocessors, to generate responses, draft marketing content, and conduct conversations with your customers on your behalf across chat, voice, and messaging channels. AI generated content is produced automatically based on your business data and configuration, and while we design the Service to produce accurate and appropriate output, AI generated content may occasionally be incomplete, inaccurate, or not perfectly suited to a given situation.
              </p>
              <p className="leading-relaxed mt-3">
                You are responsible for reviewing and configuring your AI agent&apos;s training data, tone, and behavior, and for monitoring the communications it sends on your behalf. You should not rely on AI generated content for medical, legal, financial, or other professional advice, and you should not present AI generated content to your customers as being free from the possibility of error. Vela does not guarantee the accuracy, completeness, or appropriateness of any AI generated output.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">8. Third Party Integrations</h2>
              <p className="leading-relaxed">
                The Service integrates with and relies on third party providers to deliver certain functionality, including AI language processing, voice call handling, text to speech and transcription, messaging channel connectivity, and infrastructure hosting. These integrations are described in more detail in our Privacy Policy.
              </p>
              <p className="leading-relaxed mt-3">
                Your use of any third party channel connected through the Service, such as Instagram or WhatsApp, is also subject to that third party&apos;s own terms of service and policies. Vela is not responsible for the availability, performance, security, or policies of third party services, and any outage, change, or restriction imposed by a third party provider may affect the availability of related features within Vela.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">9. Intellectual Property</h2>
              <p className="leading-relaxed">
                The Service, including its software, design, text, graphics, logos, and underlying technology, is owned by Vela or its licensors and is protected by intellectual property laws. Except for the limited rights expressly granted to you to use the Service under these Terms, no rights, title, or interest in the Service are transferred to you.
              </p>
              <p className="leading-relaxed mt-3">
                You may not copy, modify, distribute, sell, or lease any part of the Service, nor may you reverse engineer or attempt to extract the source code of the Service, except as expressly permitted by law. Any feedback or suggestions you provide about the Service may be used by Vela without any obligation to you.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">10. Service Availability and Modifications</h2>
              <p className="leading-relaxed">
                We aim to keep the Service available at all times, but we do not guarantee uninterrupted or error free operation. The Service may be temporarily unavailable due to maintenance, updates, third party outages, or circumstances beyond our reasonable control.
              </p>
              <p className="leading-relaxed mt-3">
                We reserve the right to modify, suspend, or discontinue any part of the Service, including specific features, at any time. Where reasonably possible, we will provide advance notice of material changes that significantly reduce the functionality available to you. Continued use of the Service after a change becomes effective constitutes your acceptance of that change.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">11. Limitation of Liability</h2>
              <p className="leading-relaxed">
                To the maximum extent permitted by applicable law, Vela is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express, implied, or statutory, including any implied warranties of merchantability, fitness for a particular purpose, and non infringement.
              </p>
              <p className="leading-relaxed mt-3">
                To the maximum extent permitted by applicable law, in no event will Vela, its officers, employees, or agents be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, data, or business opportunity, arising out of or in connection with your use of the Service, even if advised of the possibility of such damages.
              </p>
              <p className="leading-relaxed mt-3">
                To the maximum extent permitted by applicable law, our total aggregate liability arising out of or relating to these Terms or the Service will not exceed the total fees you paid to Vela in the three months immediately preceding the event giving rise to the claim. Nothing in these Terms limits any liability that cannot be limited or excluded under applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">12. Indemnification</h2>
              <p className="leading-relaxed">
                You agree to defend, indemnify, and hold harmless Vela and its officers, employees, and agents from and against any claims, damages, liabilities, losses, and expenses, including reasonable legal fees, arising out of or related to your use of the Service, your User Content, your violation of these Terms, or your violation of any applicable law or third party right, including any claim arising from communications sent by your AI agent on your behalf.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">13. Termination</h2>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">13.1 Termination by You</h3>
              <p className="leading-relaxed">
                You may stop using the Service and cancel your subscription at any time as described in Section 4.3.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">13.2 Termination by Vela</h3>
              <p className="leading-relaxed">
                We may suspend or terminate your access to the Service, with or without notice, if you materially breach these Terms, if we reasonably believe your use of the Service poses a security or legal risk, or if required to do so by law.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">13.3 Effect of Termination</h3>
              <p className="leading-relaxed">
                Upon termination, your right to access the Service ends immediately. Provisions of these Terms that by their nature should survive termination, including ownership, disclaimers, indemnification, and limitation of liability, will survive.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">13.4 Post Termination Data Retention</h3>
              <p className="leading-relaxed">
                Following termination, we retain your account and User Content for a limited period as described in our Privacy Policy, after which it is deleted from active systems, except where retention is required for legal, tax, or legitimate business record keeping purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">14. Dispute Resolution and Governing Law</h2>
              <p className="leading-relaxed">
                These Terms are governed by the laws of the jurisdiction in which Vela&apos;s operating entity is established, without regard to conflict of law principles, except where a different governing law is required by applicable mandatory consumer protection rules in your jurisdiction.
              </p>
              <p className="leading-relaxed mt-3">
                We encourage you to contact us first to resolve any dispute informally using the contact details in Section 17. If a dispute cannot be resolved informally, it will be subject to the exclusive jurisdiction of the competent courts of the governing jurisdiction described above, unless applicable law requires otherwise. This section does not limit any right you may have to bring a claim in your local courts under mandatory consumer protection law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">15. General Provisions</h2>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">15.1 Entire Agreement</h3>
              <p className="leading-relaxed">
                These Terms, together with our Privacy Policy and any plan specific terms referenced on our Pricing page, constitute the entire agreement between you and Vela regarding the Service, and supersede any prior agreements.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">15.2 Severability</h3>
              <p className="leading-relaxed">
                If any provision of these Terms is found to be unenforceable, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">15.3 No Waiver</h3>
              <p className="leading-relaxed">
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or provision.
              </p>
              <h3 className="text-base font-semibold text-[#111111] mt-3 mb-1">15.4 Assignment</h3>
              <p className="leading-relaxed">
                You may not assign or transfer these Terms without our prior written consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets, without restriction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">16. Changes to These Terms</h2>
              <p className="leading-relaxed">
                We may update these Terms from time to time to reflect changes in the Service, our business practices, or applicable law. When we make material changes, we will update the &quot;Last updated&quot; date at the top of this page and, where appropriate, provide additional notice, such as an email or an in product notification. Your continued use of the Service after a change takes effect constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#111111] mb-2">17. Contact Information</h2>
              <p className="leading-relaxed">
                If you have any questions about these Terms, please contact us at{" "}
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
