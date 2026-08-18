"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from 0 to `target` on mount / whenever
 * `target` changes. Subtle ease-out over ~900ms by default -- not a
 * gimmicky odometer effect. Respects prefers-reduced-motion (jumps
 * straight to the final value for users who've asked for less motion).
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setValue(target);
      return;
    }

    startRef.current = null;
    let raf = 0;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
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
