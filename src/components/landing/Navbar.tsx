"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const navLinks = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing",      href: "#pricing" },
  { label: "FAQ",          href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={
        scrolled
          ? {
              background: "rgba(10,9,8,0.88)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }
          : {
              background: "transparent",
            }
      }
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Logo showText light />

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium transition-colors duration-200 relative group"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              <span className="group-hover:text-white transition-colors">{link.label}</span>
              <span
                className="absolute -bottom-0.5 left-0 h-px w-0 group-hover:w-full transition-all duration-300"
                style={{ background: "#FF6B35" }}
              />
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Log in
          </Link>
          <Link
            href="/demo"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            Try Demo
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(135deg,#FF6B35,#FF3366)",
              boxShadow: "0 2px 12px rgba(255,107,53,0.3)",
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile: minimal CTA */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/demo"
            className="text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)" }}
          >
            Demo
          </Link>
          <Link
            href="/auth/signup"
            className="text-xs font-semibold px-4 py-2.5 rounded-xl text-white transition-all"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", minHeight: 44 }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
