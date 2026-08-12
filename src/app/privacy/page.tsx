import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";
import LegalDoc from "@/components/legal/LegalDoc";
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from "./content";

export const metadata = {
  title: "Privacy Policy | Vela",
  description: "How Vela collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <>
      <PublicPageHeader />
      <main className="min-h-screen pt-6 pb-10">
        <LegalDoc
          title="Privacy Policy"
          lastUpdated="August 2026"
          intro={PRIVACY_INTRO}
          sections={PRIVACY_SECTIONS}
        />
      </main>
      <Footer />
    </>
  );
}
