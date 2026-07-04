"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { useTheme } from "@/lib/theme";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-[#f0e8e0] shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        <Logo showText light={!scrolled} />

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-200 relative group ${
                scrolled ? "text-[#1A0A00]" : "text-white/90"
              }`}
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#FF6B35] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggle}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${scrolled ? "text-[#6B7280] hover:text-[#FF6B35]" : "text-white/70 hover:text-white"}`}
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13.5 9.4A6 6 0 016.6 2.5a5.5 5.5 0 100 11 6 6 0 006.9-4.1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
            )}
          </button>
          <Link
            href="/auth/login"
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 ${
              scrolled ? "text-[#1A0A00] hover:text-[#FF6B35]" : "text-white/90 hover:text-white"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/demo"
            className={`text-sm font-semibold px-5 py-2.5 rounded-xl border transition-all duration-200 ${
              scrolled
                ? "border-[#1A0A00]/15 text-[#1A0A00] hover:border-[#1A0A00]/40"
                : "border-white/30 text-white hover:border-white/60 hover:bg-white/10"
            }`}
          >
            Try Demo
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm px-5 py-2.5">
            Get Started
          </Link>
        </div>

        {/* Mobile: CTA buttons only, no hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/demo"
            className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition-all duration-200 ${
              scrolled ? "border-[#1A0A00]/15 text-[#1A0A00]" : "border-white/30 text-white"
            }`}
          >
            Try Demo
          </Link>
          <Link href="/auth/signup" className="btn-primary text-xs px-4 py-2.5">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
