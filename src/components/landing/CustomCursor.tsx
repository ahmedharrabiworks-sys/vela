"use client";

import { useEffect, useRef } from "react";

/**
 * Simple on-brand custom cursor -- desktop only (pointer:fine + hover:hover).
 * Two parts: a small solid orange dot that snaps exactly to the real cursor
 * position every frame, and a slightly larger ring that trails it via a CSS
 * transition (no JS smoothing/physics needed -- see .vela-cursor-ring in
 * globals.css). The ring tightens and fills on mousedown for a small tap
 * response. Never renders/attaches on touch devices; mounted once for the
 * whole landing page (see src/app/page.tsx).
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return; // touch device -- never attach, native cursor behavior stays untouched
    }

    document.documentElement.classList.add("vela-custom-cursor");

    let raf = 0;
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        if (dotRef.current) dotRef.current.style.transform = transform;
        if (ringRef.current) ringRef.current.style.transform = transform;
      });
    }
    function onDown() { ringRef.current?.classList.add("vela-cursor-active"); }
    function onUp() { ringRef.current?.classList.remove("vela-cursor-active"); }
    function onLeaveWindow() {
      dotRef.current?.style.setProperty("opacity", "0");
      ringRef.current?.style.setProperty("opacity", "0");
    }
    function onEnterWindow() {
      dotRef.current?.style.setProperty("opacity", "1");
      ringRef.current?.style.setProperty("opacity", "1");
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeaveWindow);
    document.addEventListener("mouseenter", onEnterWindow);

    return () => {
      document.documentElement.classList.remove("vela-custom-cursor");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeaveWindow);
      document.removeEventListener("mouseenter", onEnterWindow);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="vela-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="vela-cursor-dot" aria-hidden="true" />
    </>
  );
}
