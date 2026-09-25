"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Scroll-reveal wrapper: fade in + slight upward slide as a section enters
 * the viewport, once. Deliberately NOT used on Hero -- Hero already has its
 * own immediate on-load stagger animation and must be visible right away,
 * not wait to be scrolled to. Respects prefers-reduced-motion by rendering
 * children with no animation/wrapper motion at all (checked via Framer
 * Motion's own hook, not a manual matchMedia re-implementation).
 */
export default function Reveal({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      // Root cause of the "instant, not smooth" bug: amount:0.2 with no
      // margin triggers as soon as just 20% of the section's *area* enters
      // the viewport -- for these tall sections that means the reveal fires
      // (and finishes its 0.6s animation) while only a thin sliver at the
      // very bottom edge is visible, so by the time the section's actual
      // content scrolls into view the animation is long over and it just
      // looks like it "was already there". The negative bottom margin
      // shrinks the effective viewport so the trigger point moves further
      // up the screen -- the section has to scroll meaningfully into view
      // before it's considered "entered", so the fade/slide is still
      // running while the content is actually visible and being watched.
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -20% 0px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
