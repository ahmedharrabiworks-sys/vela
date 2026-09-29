"use client";

import { useEffect, useRef } from "react";

// Visibility round: was reading as a parked orange ball because it had no
// idle/leave hide -- once a stray early pointermove set a position, it
// just sat there. Now opacity-gated: invisible until the first real move,
// fades out (CSS `.is-visible` toggle, see globals.css) after this long
// with no movement, or immediately when the pointer leaves the window.
const FADE_OUT_IDLE_MS = 2500;

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
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastX = 0;
    let lastY = 0;

    function hide() {
      ref.current?.classList.remove("is-visible");
    }

    function scheduleHide() {
      if (idleTimer !== null) clearTimeout(idleTimer);
      idleTimer = setTimeout(hide, FADE_OUT_IDLE_MS);
    }

    function onMove(e: PointerEvent) {
      lastX = e.clientX;
      lastY = e.clientY;
      ref.current?.classList.add("is-visible");
      scheduleHide();
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = ref.current;
        if (el) el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
      });
    }

    function onLeave() {
      if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null; }
      hide();
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    // pointerleave on document (not window -- PointerEvent doesn't fire
    // leave on window) mirrors the well-established mouseleave-on-document
    // pattern for detecting "the pointer left the whole viewport."
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (idleTimer !== null) clearTimeout(idleTimer);
    };
  }, []);

  return <div ref={ref} className="cursor-glow-layer" aria-hidden="true" />;
}
