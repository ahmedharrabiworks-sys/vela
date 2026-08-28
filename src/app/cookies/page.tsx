import PublicPageHeader from "@/components/landing/PublicPageHeader";
import Footer from "@/components/landing/Footer";
import LegalDoc from "@/components/legal/LegalDoc";
import { COOKIES_INTRO, COOKIES_SECTIONS } from "./content";

export const metadata = {
  title: "Cookie Policy | Vela",
  description: "How Vela uses cookies and browser storage.",
};

export default function CookiesPage() {
  return (
    <>
      <PublicPageHeader />
      <main className="min-h-screen pt-6 pb-10">
        <LegalDoc
          title="Cookie Policy"
          lastUpdated="August 2026"
          intro={COOKIES_INTRO}
          sections={COOKIES_SECTIONS}
        />
      </main>
      <Footer />
    </>
  );
}
