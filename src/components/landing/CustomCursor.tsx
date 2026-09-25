"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, textarea, select, label, summary, [onclick]';

/**
 * Simple on-brand custom cursor -- desktop only (pointer:fine + hover:hover).
 * Redesigned (the dot+trailing-ring version wasn't landing visually): now a
 * single small solid orange dot that snaps exactly to the real cursor
 * position every frame, with a subtle scale-up when hovering a clickable
 * element (buttons/links/inputs) as the only "interaction" cue -- no
 * separate ring, no trail. pointer-events:none so clicks, hover states, and
 * text selection all work exactly as if this weren't here. Mounted once for
 * the whole landing page (see src/app/page.tsx).
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return; // touch device -- never attach, native cursor behavior stays untouched
    }

    document.documentElement.classList.add("vela-custom-cursor");

    let raf = 0;
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        dotRef.current?.style.setProperty("transform", `translate3d(${e.clientX}px, ${e.clientY}px, 0)`);
      });
    }
    function onOver(e: MouseEvent) {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        dotRef.current?.classList.add("vela-cursor-hover");
      }
    }
    function onOut(e: MouseEvent) {
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        dotRef.current?.classList.remove("vela-cursor-hover");
      }
    }
    function onLeaveWindow() { dotRef.current?.style.setProperty("opacity", "0"); }
    function onEnterWindow() { dotRef.current?.style.setProperty("opacity", "1"); }

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    document.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseenter", onEnterWindow);

    return () => {
      document.documentElement.classList.remove("vela-custom-cursor");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseenter", onEnterWindow);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={dotRef} className="vela-cursor-dot" aria-hidden="true" />;
}
