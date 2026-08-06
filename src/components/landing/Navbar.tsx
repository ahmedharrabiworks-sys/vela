"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Navbar() {
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const update = () => {
      const heroH = window.innerHeight;
      setOverHero(window.scrollY < heroH * 0.85);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={
        overHero
          ? {
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }
          : {
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid #E5E7EB",
              boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
            }
      }
    >
      <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Vela home">
          <Logo showText size={overHero ? 36 : 28} light={overHero} />
        </Link>

        {/* Right group */}
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className={`hidden sm:inline-flex text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 ${
              overHero
                ? "text-white/80 hover:text-white"
                : "text-[#374151] hover:text-[var(--vp-color)]"
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
