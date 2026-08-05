import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import FeatureTabs from "@/components/landing/FeatureTabs";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <FeatureTabs />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
