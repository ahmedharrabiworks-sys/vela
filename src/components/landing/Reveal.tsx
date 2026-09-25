"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Scroll-reveal wrapper: fade in + slight upward slide every time a section
 * enters the viewport, fading back out every time it leaves. Deliberately
 * NOT used on Hero -- Hero already has its own immediate on-load stagger
 * animation and must be visible right away, not wait to be scrolled to.
 * Respects prefers-reduced-motion by rendering children with no animation/
 * wrapper motion at all (checked via Framer Motion's own hook, not a manual
 * matchMedia re-implementation).
 *
 * Bug fix (confirmed live via a real multi-directional scroll test, both
 * Chromium desktop and WebKit mobile against production): `viewport.once`
 * was `true`, which disconnects the IntersectionObserver permanently after
 * the first trigger. Confirmed effect -- a section animates in correctly the
 * first time, then is permanently locked at that state forever after: it
 * never fades out when scrolled away from, and never replays its entrance
 * animation on a later re-entry. `once: false` restores Framer Motion's
 * native whileInView toggle: animates to `whileInView` on every entry,
 * automatically reverts to `initial` (fades out) on every exit -- no
 * separate exit-state bookkeeping needed.
 */
export default function Reveal({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.1, margin: "0px 0px -20% 0px" }}
      transition={{ duration: 1.1, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
