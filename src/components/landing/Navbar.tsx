"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Navbar() {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const update = () => {
      const heroEl = document.getElementById("hero-section");
      const threshold = heroEl ? heroEl.offsetHeight * 0.9 : window.innerHeight * 0.9;
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
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Vela home">
          <Logo showText size={28} />
        </Link>

        <div className="flex items-center gap-2">
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
