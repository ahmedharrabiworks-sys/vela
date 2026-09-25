"use client";

import { useEffect } from "react";

/**
 * Custom cursor -- desktop only (pointer:fine + hover:hover). Replaced the
 * dot/scale design entirely (FIX 9, consolidated fix round): now a standard
 * arrow-pointer silhouette in Vela orange, applied via the native CSS
 * `cursor` property (see html.vela-custom-cursor in globals.css) instead of
 * a JS-positioned overlay element. No mousemove tracking, no
 * requestAnimationFrame, no possible lag -- the browser renders the cursor
 * natively at the real pointer position every frame for free. This
 * component's only job is toggling the class on <html> for the lifetime of
 * the page, gated to desktop-only exactly like the previous version.
 */
export default function CustomCursor() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return; // touch device -- never attach, native cursor behavior stays untouched
    }
    document.documentElement.classList.add("vela-custom-cursor");
    return () => document.documentElement.classList.remove("vela-custom-cursor");
  }, []);

  return null;
}
