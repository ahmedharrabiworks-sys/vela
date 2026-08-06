import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import FeatureTabs from "@/components/landing/FeatureTabs";
import ComparisonSection from "@/components/landing/ComparisonSection";
import RobotSection from "@/components/landing/RobotSection";
import DashboardSection from "@/components/landing/DashboardSection";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import SignupTimerPopup from "@/components/landing/SignupTimerPopup";

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <FeatureTabs />
      <ComparisonSection />
      <RobotSection />
      <DashboardSection />
      <Pricing />
      <Footer />
      <SignupTimerPopup />
    </main>
  );
}
