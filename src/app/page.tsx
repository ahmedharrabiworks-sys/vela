import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Industries from "@/components/landing/Industries";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Channels from "@/components/landing/Channels";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden" style={{ background: "#0A0908" }}>
      <Navbar />
      <Hero />
      <Industries />
      <HowItWorks />
      <Features />
      <Channels />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
