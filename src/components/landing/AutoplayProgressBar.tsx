"use client";

import { useEffect, useState } from "react";

/**
 * hero-v3 round: thin fill bar for the active tab of an autoplaying
 * carousel (Hero story tabs, ProductTourDemo tabs). Animates 0% -> 100%
 * over `durationMs` via a CSS width transition; `resetKey` changing
 * (see useAutoplayStep's own `resetKey`) restarts it from 0. Renders at
 * 0 width and does nothing when `running` is false (off screen, manual-
 * interaction pause, or prefers-reduced-motion) -- never a decorative
 * indicator claiming progress that isn't actually happening.
 */
export default function AutoplayProgressBar({
  running,
  durationMs,
  resetKey,
  color = "#E8552B",
}: {
  running: boolean;
  durationMs: number;
  resetKey: string | number;
  color?: string;
}) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    setFilled(false);
    if (!running) return;
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, [resetKey, running]);

  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 2,
        borderRadius: "0 0 0 999px",
        background: color,
        width: filled ? "100%" : "0%",
        transition: running ? `width ${durationMs}ms linear` : "none",
        pointerEvents: "none",
      }}
    />
  );
}
