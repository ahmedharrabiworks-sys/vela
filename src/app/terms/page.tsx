import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";
import LegalDoc from "@/components/legal/LegalDoc";
import { TERMS_INTRO, TERMS_SECTIONS } from "./content";

export const metadata = {
  title: "Terms of Service | Vela",
  description: "Terms and conditions for using the Vela platform.",
};

export default function TermsPage() {
  return (
    <>
      <PublicPageHeader />
      <main className="min-h-screen pt-6 pb-10">
        <LegalDoc
          title="Terms of Service"
          lastUpdated="August 2026"
          intro={TERMS_INTRO}
          sections={TERMS_SECTIONS}
        />
      </main>
      <Footer />
    </>
  );
}
