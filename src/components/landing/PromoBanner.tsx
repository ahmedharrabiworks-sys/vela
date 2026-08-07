"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.65);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: "linear-gradient(90deg, #E55A18 0%, #FF6B35 100%)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
    >
      <div className="max-w-5xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5">
        <p className="text-base font-medium text-white text-center leading-snug">
          Bring your business to the next level with our AI Business Operating System
        </p>
        <Link
          href="/auth/signup"
          className="shrink-0 text-base font-bold px-6 py-2.5 rounded-lg bg-white text-[#FF6B35] hover:bg-white/90 transition-colors whitespace-nowrap"
        >
          Start 7-Day Free Trial
        </Link>
      </div>
    </div>
  );
}
