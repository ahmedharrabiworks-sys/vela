"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up to `target`.
 *
 * FIX 4 (round H): previously re-ran the full 0->target ease on EVERY
 * target change -- switching the 7d/30d/90d filter, or simply navigating
 * back to Analytics/Dashboard (a fresh mount), made every number restart
 * from 0 and count up again. Real first-load-of-real-data animation is nice;
 * doing it on every interaction reads as heavy and janky, which is exactly
 * what was reported three times.
 *
 * Now: the full ease-in animation plays at most ONCE per browser tab
 * session (tracked via sessionStorage -- survives client-side navigations
 * within the app, resets on a real page reload/new tab), the first time any
 * value actually changes from its initial mount value. Every later value
 * change (filter switch, refetch, revisiting the page later in the same
 * session) briefly cross-fades from the currently-displayed number to the
 * new one instead of resetting through 0.
 */
const SESSION_KEY = "vela_countup_played";

function hasPlayedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}
function markPlayedThisSession() {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
}

export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);
  const valueRef = useRef(target);
  valueRef.current = value;

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (target === prevTarget.current) return; // nothing real changed -- no animation needed

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const isFirstRealReveal = !hasPlayedThisSession();
    prevTarget.current = target;

    if (reduceMotion) {
      setValue(target);
      return;
    }

    const animDuration = isFirstRealReveal ? durationMs : 300;
    // First reveal eases in from 0 (the deliberate, once-per-session count
    // up). Every later change cross-fades from whatever's on screen now.
    const startVal = isFirstRealReveal ? 0 : valueRef.current;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / animDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else if (isFirstRealReveal) {
        markPlayedThisSession();
      }
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
