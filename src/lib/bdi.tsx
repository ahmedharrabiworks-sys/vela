import type { ReactNode } from "react";

/**
 * hero-v5 round (FIX 6): wraps every "Vela" substring in <bdi> so it
 * renders correctly embedded inside an Arabic (RTL) sentence -- without
 * this, a Latin word mid-RTL-run can visually swap position with
 * adjacent Arabic punctuation/words. No-op (returns the plain string)
 * when there's nothing to wrap, so this is always safe to call
 * regardless of locale.
 */
export function bdiVela(text: string): ReactNode {
  if (!text.includes("Vela")) return text;
  const parts = text.split(/(Vela)/g);
  return parts.map((part, i) => (part === "Vela" ? <bdi key={i}>Vela</bdi> : part));
}
