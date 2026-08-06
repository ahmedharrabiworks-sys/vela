"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        {/* Logo — larger + light on hero, normal when scrolled */}
        <Link href="/" aria-label="Vela home">
          <Logo showText size={scrolled ? 28 : 38} light={!scrolled} />
        </Link>

        {/* Right group */}
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className={`hidden sm:inline-flex text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 ${
              scrolled
                ? "text-[#374151] hover:text-[var(--vp-color)]"
                : "text-white/80 hover:text-white"
            }`}
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
