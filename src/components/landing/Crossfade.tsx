"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Phase = "entering" | "steady" | "leaving";
interface Layer<K> {
  key: K;
  phase: Phase;
}

/**
 * hero-v4 round (FIX 3): generic crossfade -- the outgoing item fades out
 * WHILE the incoming one fades in, simultaneously, over `durationMs`.
 * Never an instant swap, never a sequential wait-then-enter.
 *
 * `renderItem(key, frozen)` lets the caller pass a live, ticking value for
 * the current `activeKey` and a frozen/final value for whatever key is
 * mid-exit (e.g. the hero story passes elapsedMs=duration for the leaving
 * step, so it fades out showing its settled final frame, not a restart).
 *
 * Used by the hero story (steps) and the "How it works" tour (tabs) so
 * both get the exact same crossfade feel from one real implementation.
 */
export default function Crossfade<K extends string | number>({
  activeKey,
  renderItem,
  durationMs = 500,
}: {
  activeKey: K;
  renderItem: (key: K, frozen: boolean) => ReactNode;
  durationMs?: number;
}) {
  const [layers, setLayers] = useState<Layer<K>[]>([{ key: activeKey, phase: "steady" }]);
  const prevKeyRef = useRef(activeKey);

  useEffect(() => {
    if (prevKeyRef.current === activeKey) return;
    const leavingKey = prevKeyRef.current;
    prevKeyRef.current = activeKey;
    setLayers([
      { key: leavingKey, phase: "steady" },
      { key: activeKey, phase: "entering" },
    ]);
    const raf = requestAnimationFrame(() => {
      setLayers([
        { key: leavingKey, phase: "leaving" },
        { key: activeKey, phase: "steady" },
      ]);
    });
    const t = setTimeout(() => {
      setLayers([{ key: activeKey, phase: "steady" }]);
    }, durationMs + 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [activeKey, durationMs]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {layers.map((l) => (
        <div
          key={String(l.key)}
          style={{
            position: "absolute",
            inset: 0,
            opacity: l.phase === "steady" ? 1 : 0,
            transition: `opacity ${durationMs}ms cubic-bezier(.2,.8,.2,1)`,
            pointerEvents: l.key === activeKey ? "auto" : "none",
          }}
        >
          {renderItem(l.key, l.key !== activeKey)}
        </div>
      ))}
    </div>
  );
}
