import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import FeatureTabs from "@/components/landing/FeatureTabs";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import SignupTimerPopup from "@/components/landing/SignupTimerPopup";

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <FeatureTabs />
      {/* SECTION: MISSION — pending new asset */}
      <Pricing />
      <Footer />
      <SignupTimerPopup />
    </main>
  );
}
