import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProductTourDemo from "@/components/landing/ProductTourDemo";
import ChannelsSection from "@/components/landing/ChannelsSection";
import DashboardSection from "@/components/landing/DashboardSection";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <ProductTourDemo />
      <ChannelsSection />
      <DashboardSection />
      <Pricing />
      <Footer />
    </main>
  );
}
