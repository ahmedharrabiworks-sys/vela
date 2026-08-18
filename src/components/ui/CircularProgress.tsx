"use client";

import { useCountUp } from "./CountUp";

/**
 * Real interactive circular percentage indicator -- same visual language as
 * the "AI Score" ring on Train Your AI. Value animates from 0 to its real
 * percentage on mount (see CountUp), and the stroke fills in step with it.
 */
export default function CircularProgress({
  value,
  size = 56,
  strokeWidth = 5,
  color = "#16A34A",
  trackColor = "#F3F4F6",
  duration = 1000,
  showLabel = true,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  duration?: number;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const animated = useCountUp(clamped, duration);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, animated)) / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.08s linear" }}
        />
      </svg>
      {showLabel && (
        <span className="absolute font-bold" style={{ color, fontSize: size * 0.24 }}>
          {animated}%
        </span>
      )}
    </div>
  );
}
