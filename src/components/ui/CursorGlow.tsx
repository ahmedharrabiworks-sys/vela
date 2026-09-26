"use client";

import { useEffect, useRef } from "react";

/**
 * Sitewide cursor-following ambient glow. Desktop only (pointer:fine +
 * hover:hover, also CSS-gated so touch devices never see it even before JS
 * runs). Perf contract: a SINGLE passive pointermove listener updates two
 * CSS custom properties directly via style.setProperty, throttled to one
 * update per animation frame -- no React state, no re-renders. The visual
 * layer is a small fixed-size div positioned via `transform: translate3d`
 * (compositor-only, never triggers layout/paint), not background-position
 * (which would repaint the full gradient every frame). `contain: paint`
 * isolates it from the rest of the page.
 */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (hover: hover)").matches) return;
    const el = ref.current;
    if (!el) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let raf = 0;
    let pending = false;

    const apply = () => {
      pending = false;
      el.style.setProperty("--cx", `${x}px`);
      el.style.setProperty("--cy", `${y}px`);
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!pending) {
        pending = true;
        raf = requestAnimationFrame(apply);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-glow-layer" aria-hidden="true" />;
}
