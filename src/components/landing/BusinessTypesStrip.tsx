"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { BUSINESS_TYPES } from "@/components/landing/business-types";

/**
 * Single-row, seamlessly-looping strip of business-type names between the
 * Hero and "Watch Vela handle it all". Always moves left-to-right on
 * screen -- the outer track is pinned `dir="ltr"` regardless of app locale
 * (same pattern Sidebar.tsx already uses to keep its own layout
 * un-mirrored), so Arabic mode changes the WORDS, never the direction of
 * travel.
 *
 * Pure CSS transform animation (translateX 0 -> -50% of the track's own
 * width): the list renders twice back to back, so translating by exactly
 * half the doubled track's width lands pixel-for-pixel back on the start
 * of the second copy, which is visually identical to the start of the
 * first -- a seamless loop with no JS measurement or reset needed,
 * regardless of how wide the rendered text actually is.
 */
export default function BusinessTypesStrip() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Pause while off-screen -- same perf pattern already used by
  // ProductTourDemo's autoplay (a plain IntersectionObserver, not
  // scroll-tied), so this animation does zero work once scrolled away.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const items = BUSINESS_TYPES.map((b) => (isAr ? b.ar : b.en));
  // Duplicated once for the seamless loop (see doc comment above).
  const doubled = [...items, ...items];

  return (
    <div ref={wrapperRef} className="py-12 business-strip">
      <div
        dir="ltr"
        className="relative overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 64px, #000 calc(100% - 64px), transparent 100%)",
          maskImage: "linear-gradient(90deg, transparent 0, #000 64px, #000 calc(100% - 64px), transparent 100%)",
        }}
      >
        <div
          className="business-strip-track flex items-center whitespace-nowrap w-max"
          style={{ animationPlayState: paused ? "paused" : "running" }}
        >
          {doubled.map((label, i) => (
            <span key={i} className="flex items-center shrink-0">
              <span className="text-[13px] sm:text-sm font-medium text-[#6B7280] px-3">{label}</span>
              <span className="w-1 h-1 rounded-full bg-[#FF6B35] shrink-0" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
