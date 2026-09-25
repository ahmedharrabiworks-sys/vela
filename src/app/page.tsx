import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import ProductTourDemo from "@/components/landing/ProductTourDemo";
import DashboardSection from "@/components/landing/DashboardSection";
import Pricing from "@/components/landing/Pricing";
import ComparisonTable from "@/components/landing/ComparisonTable";
import Footer from "@/components/landing/Footer";
import CustomCursor from "@/components/landing/CustomCursor";
import Reveal from "@/components/landing/Reveal";
export default function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <CustomCursor />
      <Navbar />
      {/* Hero is intentionally NOT wrapped in Reveal -- it must be visible
          immediately on load (it already has its own on-load stagger
          animation), not wait to be scrolled into view. */}
      <Hero />
      {/* FIX 6 (consolidated fix round): ProblemSection and ProductTourDemo
          swapped places -- tour demo now comes right after Hero, Problem
          section moved after it. */}
      <Reveal><ProductTourDemo /></Reveal>
      <Reveal><ProblemSection /></Reveal>
      <Reveal><DashboardSection /></Reveal>
      <Reveal><Pricing /></Reveal>
      <Reveal><ComparisonTable /></Reveal>
      <Reveal><Footer /></Reveal>
    </main>
  );
}
