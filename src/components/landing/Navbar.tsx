"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ThemePicker } from "@/components/ui/ThemePicker";

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
        {/* Logo */}
        <Link href="/" aria-label="Vela home">
          <Logo showText />
        </Link>

        {/* Right group */}
        <div className="flex items-center gap-2">
          <ThemePicker />

          <div className="w-px h-5 bg-[#E5E7EB] mx-1 hidden sm:block" />

          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-sm font-medium px-4 py-2 rounded-lg text-[#374151] hover:text-[var(--vp-color)] transition-colors duration-200"
          >
            Log in
          </Link>

          <Link href="/auth/signup" className="btn-primary text-sm px-5 py-2.5">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
