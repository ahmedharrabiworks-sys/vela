"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor glow re-add round: a soft orange glow that tracks the mouse on the
 * landing page, desktop-with-a-real-mouse only. Rebuilt from scratch (not a
 * revert of the old CursorGlow the perf round deleted) with the perf
 * lessons from that round applied: ONE fixed element (not several), moved
 * purely via `transform: translate3d` from a passive, rAF-throttled
 * pointermove listener (never more than one queued frame of work), no
 * filter:blur() (see .cursor-glow-layer in globals.css for the
 * pre-softened radial-gradient instead), no backdrop-filter.
 *
 * The (hover: hover) + (pointer: fine) + lg+ gating is duplicated here in
 * JS (matching the CSS media query on .cursor-glow-layer) so the
 * pointermove listener itself is never even attached on a touch device or
 * a narrow viewport -- the CSS alone would just hide the element, this
 * also avoids the wasted listener + rAF work entirely on devices that can
 * never see it.
 */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hoverFine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!hoverFine.matches || !desktop.matches || reduceMotion.matches) return;

    let rafId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    function onMove(e: PointerEvent) {
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = ref.current;
        if (el) el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
      });
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return <div ref={ref} className="cursor-glow-layer" aria-hidden="true" />;
}
