import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProductTourDemo from "@/components/landing/ProductTourDemo";
import ConversationShowcase from "@/components/landing/ConversationShowcase";
import DashboardSection from "@/components/landing/DashboardSection";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <ProductTourDemo />
      <ConversationShowcase />
      <DashboardSection />
      <Pricing />
      <Footer />
    </main>
  );
}
