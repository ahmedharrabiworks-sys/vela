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
 * Trigger-once behavior (bug-fix round #4): fires the fade/slide-in the
 * first time a section is scrolled into view going DOWN, then stays fully
 * visible forever after -- it must not fade out when the user scrolls back
 * up past it, and must not replay if they scroll down into it again.
 * `viewport.once: true` is exactly this: the IntersectionObserver
 * disconnects permanently after the first trigger, so `whileInView` is
 * applied once and never reverts to `initial`. (An earlier session had
 * this as `once: false` to solve the opposite, now-superseded complaint --
 * sections not re-animating/fading out on re-entry. That request has since
 * reversed; `once: true` is the current, intended behavior.)
 *
 * Mobile first-load fix (unchanged, still confirmed load-bearing): on a
 * short mobile viewport, Hero doesn't fill the screen and the very next
 * section's top edge already pokes into view at zero scroll. The old
 * `-20%` bottom margin shrank the effective trigger area enough that it
 * still needed ~175px of extra scroll before opacity started rising above
 * 0 -- reading as a blank/broken gap right after Hero. `-8%` shrinks the
 * trigger area much less, so that same section starts revealing almost
 * immediately at load. This margin value is independent of `once` and must
 * stay as-is regardless of which `once` setting is active.
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
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.75, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
