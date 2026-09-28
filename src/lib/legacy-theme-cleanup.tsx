"use client";

import { useEffect } from "react";

/** Mounted once at the root layout. Dark mode has been removed from Vela
    entirely -- a returning visitor who previously chose "dark" still has
    that value sitting in localStorage from before removal. Nothing reads
    it anymore (the theme provider it belonged to is gone), so it's already
    inert, but this clears it outright rather than leaving dead state
    behind in the browser. */
export function LegacyThemeCleanup() {
  useEffect(() => {
    try {
      localStorage.removeItem("vela_theme");
    } catch { /* localStorage unavailable (private mode, etc.) -- harmless */ }
  }, []);

  return null;
}
