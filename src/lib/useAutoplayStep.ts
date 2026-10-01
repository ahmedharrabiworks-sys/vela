"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * hero-v4 round: rewritten around a single real-time "elapsed ms in the
 * current step" clock instead of the old setTimeout-per-step approach.
 * This is what makes FIX 1 (nothing animates before it's on screen, and
 * pause/resume is exact) possible:
 *
 * - `elapsedMs` is anchored to wall-clock time (`performance.now()`), not
 *   accumulated by summing per-frame requestAnimationFrame deltas. On a
 *   page this animation-heavy, main-thread contention can genuinely delay
 *   or coalesce rAF callbacks -- summing deltas under that contention
 *   silently loses time (verified: a delta-summing version of this clock
 *   measurably drifted behind real time during testing). Anchoring
 *   instead ("elapsed = now - activeSince + baseElapsed") is immune to
 *   that: however many frames get dropped, the next one that does fire
 *   still reads the correct wall-clock-accurate value. rAF here only
 *   decides *when* to re-render, never *what value* to show.
 * - `hasBeenVisible` flips true (and stays true) the first time the
 *   element crosses `visibilityThreshold`. Before that, `elapsedMs` never
 *   leaves 0 -- callers render that as the step's static first frame
 *   ("mount fresh" the moment it's real is just "the clock starts
 *   ticking for the first time").
 * - A manual `goTo` jumps the step, resets the clock to 0 (fresh start
 *   for the clicked step) and marks a `manualPauseMs` window during which
 *   the content clock keeps running (so the clicked step's own animation
 *   still plays out) but auto-advance is held off.
 */
export function useAutoplayStep<T extends HTMLElement = HTMLElement>(
  stepCount: number,
  durationsMs: number[],
  opts?: { manualPauseMs?: number; visibilityThreshold?: number }
) {
  const manualPauseMs = opts?.manualPauseMs ?? 12000;
  // FIX 1 round: bumped 0.4 -> 0.5 ("at least 50% visible").
  const threshold = opts?.visibilityThreshold ?? 0.5;
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
  // Forces a re-render each animation frame while the clock is running;
  // the actual elapsed value is computed fresh from wall-clock time
  // below, never from this counter.
  const [, setTick] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) setHasBeenVisible(true);
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const contentActive = isVisible && hasBeenVisible && !prefersReducedMotion;

  // Wall-clock anchor: `baseElapsedRef` is the committed elapsed time from
  // any PRIOR active window(s) within the current step; `activeSinceRef`
  // is the performance.now() timestamp the CURRENT active window started
  // (null while inactive/paused-by-invisibility). Current elapsed is
  // always `baseElapsedRef + (activeSinceRef !== null ? now - activeSinceRef : 0)`.
  const baseElapsedRef = useRef(0);
  const activeSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (contentActive) {
      activeSinceRef.current = performance.now();
    } else if (activeSinceRef.current !== null) {
      baseElapsedRef.current += performance.now() - activeSinceRef.current;
      activeSinceRef.current = null;
    }
  }, [contentActive]);

  function readElapsedMs() {
    const live = activeSinceRef.current !== null ? performance.now() - activeSinceRef.current : 0;
    return baseElapsedRef.current + live;
  }

  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!contentActive) return;
    function loop() {
      setTick((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [contentActive]);

  const elapsedMs = contentActive || activeSinceRef.current !== null ? readElapsedMs() : baseElapsedRef.current;

  function resetClock() {
    baseElapsedRef.current = 0;
    activeSinceRef.current = contentActive ? performance.now() : null;
  }

  // Nothing re-renders on its own as real time passes, so schedule one
  // setTimeout to force a recheck exactly when a manual pause window ends.
  useEffect(() => {
    if (pausedUntil === null) return;
    const ms = Math.max(0, pausedUntil - Date.now());
    const t = setTimeout(() => setPausedUntil(null), ms);
    return () => clearTimeout(t);
  }, [pausedUntil]);

  // Advance once this step's own content has fully played out AND we're
  // not sitting inside a manual-interaction pause window. Checked every
  // render (elapsedMs is read fresh above, not just on a dependency
  // change), so this fires as soon as the rAF-driven re-render crosses
  // the duration.
  useEffect(() => {
    const manuallyPaused = pausedUntil !== null && pausedUntil > Date.now();
    if (manuallyPaused) return;
    const duration = durationsMs[step] ?? 4000;
    if (elapsedMs < duration) return;
    setStep((s) => (s + 1) % stepCount);
    resetClock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  function goTo(next: number) {
    setStep(((next % stepCount) + stepCount) % stepCount);
    resetClock();
    setPausedUntil(Date.now() + manualPauseMs);
  }

  const duration = durationsMs[step] ?? 4000;
  const advanceProgress = duration > 0 ? Math.min(1, elapsedMs / duration) : 1;

  return {
    sectionRef,
    step,
    goTo,
    isVisible,
    hasBeenVisible,
    contentActive,
    elapsedMs,
    duration,
    advanceProgress,
    prefersReducedMotion,
  };
}
