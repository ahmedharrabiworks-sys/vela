"use client";

import { useEffect, useRef } from "react";

/**
 * Small radial glow that follows the pointer within its parent section.
 * Replaces the old static/fixed big glows (FIX 1, polish pass #2). Must be
 * rendered as a direct child of a `position: relative` section, before the
 * section's real content, exactly like the static glow divs it replaces.
 *
 * Touch devices (no real pointer) get nothing rendered -- the effect
 * degrades to a permanently-invisible, listener-free div rather than a
 * broken/stuck glow.
 */
export default function CursorSpotlight({
  size = 380,
  color = "rgba(255,107,53,0.14)",
}: {
  size?: number;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return; // touch/no-cursor device -- stay inert, no listeners attached
    }

    let raf = 0;

    function onMove(e: MouseEvent) {
      const rect = parent!.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!el) return;
        if (inside) {
          el.style.setProperty("--sx", `${e.clientX - rect.left}px`);
          el.style.setProperty("--sy", `${e.clientY - rect.top}px`);
          el.style.opacity = "1";
        } else {
          el.style.opacity = "0";
        }
      });
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-300 ease-out"
      style={{
        opacity: 0,
        zIndex: 0,
        background: `radial-gradient(${size}px circle at var(--sx, 50%) var(--sy, 50%), ${color}, transparent 70%)`,
      }}
    />
  );
}
