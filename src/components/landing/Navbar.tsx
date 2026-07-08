"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E7EB] transition-all duration-300 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        <Logo showText />

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#374151] hover:text-[#111111] transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#FF6B35] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium px-4 py-2 rounded-lg text-[#374151] hover:text-[#FF6B35] transition-colors duration-200"
          >
            Log in
          </Link>
          <Link
            href="/demo"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all duration-200"
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
            className="text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151]"
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
