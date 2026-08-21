"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up to `target`.
 *
 * FIX 3 (round J): round I's sessionStorage-based "play the full reveal at
 * most once per browser tab, ever" was solving the wrong problem. It DID
 * stop filter switches from replaying the animation, but it also silently
 * blocked the deliberate reveal from playing again on a fresh page
 * visit -- navigating away from Analytics/Dashboard and back (a genuine
 * new mount) no longer animated at all, which is the opposite of what's
 * wanted: replay on mount/navigation, stay quiet on in-page filter changes.
 *
 * Replaced with a per-mount reveal window instead of a global flag: each
 * hook instance remembers its own mount time. Any target change that
 * arrives within ~3s of mount (covers real fetch latency -- data rarely
 * shows up instantly) gets the full deliberate 0->target ease; anything
 * after that window (a filter switch, a manual refresh button, etc. later
 * in the same page visit) briefly cross-fades from the currently-displayed
 * number instead of resetting through 0. A real navigation away and back
 * creates a brand new component instance with a brand new mount time, so
 * this replays correctly with no persistence mechanism needed at all.
 */
const REVEAL_WINDOW_MS = 3000;

export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef<number | null>(null);
  const valueRef = useRef(0);
  const mountedAt = useRef(Date.now());
  valueRef.current = value;

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (prevTarget.current === target) return; // nothing real changed -- no animation needed

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const isWithinRevealWindow = Date.now() - mountedAt.current < REVEAL_WINDOW_MS;
    prevTarget.current = target;

    if (reduceMotion) {
      setValue(target);
      return;
    }

    const animDuration = isWithinRevealWindow ? durationMs : 300;
    // Within the reveal window (fresh mount, real data just arrived): ease
    // in from 0, the deliberate first-load count up. Outside it (a later
    // in-page change): cross-fade from whatever's currently on screen.
    const startVal = isWithinRevealWindow ? 0 : valueRef.current;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / animDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

export default function CountUp({
  value,
  duration = 900,
  prefix = "",
  suffix = "",
  formatter,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (n: number) => string;
}) {
  const animated = useCountUp(value, duration);
  return (
    <>
      {prefix}
      {formatter ? formatter(animated) : animated.toLocaleString()}
      {suffix}
    </>
  );
}
