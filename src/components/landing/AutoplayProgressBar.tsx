"use client";

/**
 * hero-v4 round: simplified to a pure function of `progress` (0-1),
 * supplied by useAutoplayStep's own elapsedMs/duration clock. No more
 * resetKey/CSS-transition restart trick -- the caller already re-renders
 * this every animation frame while the clock is running, so the width
 * itself is smooth with no transition needed, and it freezes for free
 * whenever the clock (and therefore progress) stops changing.
 */
export default function AutoplayProgressBar({
  progress,
  color = "#E8552B",
}: {
  progress: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
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
        width: `${pct}%`,
        pointerEvents: "none",
      }}
    />
  );
}
