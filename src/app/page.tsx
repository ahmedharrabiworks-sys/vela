import Navbar from "@/components/landing/Navbar";
import CursorGlow from "@/components/ui/CursorGlow";
import LandingGlow from "@/components/landing/LandingGlow";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import ProductTourDemo from "@/components/landing/ProductTourDemo";
import DashboardSection from "@/components/landing/DashboardSection";
import Pricing from "@/components/landing/Pricing";
import ComparisonTable from "@/components/landing/ComparisonTable";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import Reveal from "@/components/landing/Reveal";
export default function LandingPage() {
  return (
    <main className="relative overflow-x-clip">
      {/* hero-v6 round (FIX 1): was `landing-glow-bg`, a single
          background-image on this element with 7 percent-positioned
          radial-gradient() stops -- percent-of-this-element's-own-height
          meant the FAQ accordion expanding (a height change lower on the
          page) forced a full repaint of this background on every frame.
          LandingGlow.tsx replaces it with 7 fixed-size, contain:paint
          divs -- see that file for the full root-cause writeup. */}
      <LandingGlow />
      <Navbar />
      {/* Cursor glow re-add round: landing-only (not sitewide -- the old
          one lived in the root layout and ran on every page). Gated to
          desktop-with-a-real-mouse via CSS + JS, see CursorGlow.tsx. */}
      <CursorGlow />
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
      <Reveal><FAQ /></Reveal>
      <Reveal><Footer /></Reveal>
    </main>
  );
}
