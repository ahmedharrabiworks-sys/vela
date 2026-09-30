"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * hero-v3 round: shared autoplay state machine for any step/tab/scene
 * carousel that should (a) only run while at least `visibilityThreshold`
 * of it is on screen, (b) auto-advance after each step's own duration,
 * looping back to 0 after the last step, (c) let a manual interaction
 * (tab click, Back/Next, swipe) jump straight to a step and pause
 * autoplay for `manualPauseMs`, after which it resumes normally, and
 * (d) never autoplay at all under prefers-reduced-motion (manual
 * navigation still works -- `goTo` doesn't check reduced-motion).
 *
 * Used by HeroDesktopStory.tsx, HeroPhoneStory.tsx and
 * ProductTourDemo.tsx so all three carousels share one real
 * implementation instead of three hand-rolled copies of the same
 * visibility + timer + pause logic.
 */
export function useAutoplayStep<T extends HTMLElement = HTMLElement>(
  stepCount: number,
  durationsMs: number[],
  opts?: { manualPauseMs?: number; visibilityThreshold?: number }
) {
  const manualPauseMs = opts?.manualPauseMs ?? 12000;
  const threshold = opts?.visibilityThreshold ?? 0.4;
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<T>(null);
  // Starts false -- "does not start on page load if it's off-screen"
  // means never assuming visibility before the observer has actually
  // measured it.
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);
  // A future timestamp while paused from a manual interaction, else null.
  const [pausedUntil, setPausedUntil] = useState<number | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  useEffect(() => {
    if (!isVisible || prefersReducedMotion) return;
    const now = Date.now();
    if (pausedUntil !== null && pausedUntil > now) {
      // Wait out the remaining pause, then clear it -- clearing re-runs
      // this same effect, which (with pausedUntil now null) falls
      // through to scheduling a fresh full-duration advance for the
      // CURRENT step, i.e. "pauses for 12s, then autoplay resumes."
      const t = setTimeout(() => setPausedUntil(null), pausedUntil - now);
      return () => clearTimeout(t);
    }
    const duration = durationsMs[step] ?? 4000;
    const t = setTimeout(() => {
      setStep((s) => (s + 1) % stepCount);
    }, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pausedUntil, isVisible, prefersReducedMotion, stepCount]);

  function goTo(next: number) {
    setStep(((next % stepCount) + stepCount) % stepCount);
    setPausedUntil(Date.now() + manualPauseMs);
  }

  // Whether the progress-fill bar should currently be animating.
  const running = isVisible && !prefersReducedMotion && pausedUntil === null;
  // Changes exactly when a new "counting toward the next advance" window
  // starts (a new step, or the pause ending) -- callers remount/restart
  // their progress bar keyed on this.
  const resetKey = `${step}-${pausedUntil ?? "go"}`;

  return { sectionRef, step, goTo, isVisible, running, resetKey, duration: durationsMs[step] ?? 4000 };
}
