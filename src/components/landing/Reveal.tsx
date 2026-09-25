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
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
