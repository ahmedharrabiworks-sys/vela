import PromoBanner from "@/components/landing/PromoBanner";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProductTourDemo from "@/components/landing/ProductTourDemo";
import ComparisonSection from "@/components/landing/ComparisonSection";
import DashboardSection from "@/components/landing/DashboardSection";
import Pricing from "@/components/landing/Pricing";
import RobotSection from "@/components/landing/RobotSection";
import Footer from "@/components/landing/Footer";
import { LastRouteRedirect } from "@/lib/last-route";
export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <LastRouteRedirect />
      <PromoBanner />
      <Navbar />
      <Hero />
      <ProductTourDemo />
      <ComparisonSection />
      <DashboardSection />
      <Pricing />
      <RobotSection />
      <Footer />
    </main>
  );
}
