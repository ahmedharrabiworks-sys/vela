"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Navbar() {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const update = () => {
      const heroEl = document.getElementById("hero-section");
      // Show sticky nav once the in-hero nav row (~72px) has scrolled off the top.
      // Fall back to viewport height if the hero element isn't in the DOM yet.
      const threshold = heroEl ? Math.min(heroEl.offsetHeight * 0.9, 80) : 80;
      setPastHero(window.scrollY > threshold);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "#FFF5F0",
        borderBottom: "1px solid rgba(237,84,38,0.10)",
        boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
        opacity: pastHero ? 1 : 0,
        pointerEvents: pastHero ? "auto" : "none",
        transform: pastHero ? "translateY(0)" : "translateY(-6px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
      aria-hidden={!pastHero}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-[72px] flex items-center justify-between">
        <Link href="/" aria-label="Vela home">
          <Logo showText size={40} />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-base font-medium px-5 py-3 rounded-lg text-[#374151] hover:text-[var(--vp-color)] transition-colors duration-200"
          >
            Log in
          </Link>
          <Link href="/auth/signup" className="btn-primary text-base px-7 py-3.5">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
