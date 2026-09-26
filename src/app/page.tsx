import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import ProductTourDemo from "@/components/landing/ProductTourDemo";
import DashboardSection from "@/components/landing/DashboardSection";
import Pricing from "@/components/landing/Pricing";
import ComparisonTable from "@/components/landing/ComparisonTable";
import Footer from "@/components/landing/Footer";
import Reveal from "@/components/landing/Reveal";
export default function LandingPage() {
  return (
    <main className="overflow-x-clip">
      <Navbar />
      {/* Hero and ProductTourDemo are intentionally NOT wrapped in Reveal --
          both render fully visible immediately on load, no fade/slide-in.
          Hero already has its own on-load stagger animation; ProductTourDemo
          is the very next thing seen on load and should read as already
          there, not wait to be scrolled into view (bug-fix + polish round
          #3). Every other section below keeps its existing scroll-reveal. */}
      <Hero />
      <ProductTourDemo />
      <Reveal><ProblemSection /></Reveal>
      <Reveal><DashboardSection /></Reveal>
      <Reveal><Pricing /></Reveal>
      <Reveal><ComparisonTable /></Reveal>
      <Reveal><Footer /></Reveal>
    </main>
  );
}
