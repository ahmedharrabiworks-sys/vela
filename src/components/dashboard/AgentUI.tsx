"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Shared building blocks for the AI Agent section: one quiet visual language.

export const fieldCls =
  "w-full h-10 !rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15 transition-colors";
export const areaCls =
  "w-full !rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm leading-relaxed text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15 transition-colors resize-y";
export const labelCls = "block text-xs font-medium text-[#6B7280] mb-1.5";
export const quietBtnCls =
  "inline-flex items-center justify-center h-10 px-3.5 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#111111]">{title}</h2>
          {hint && <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHead({ title, subtitle, aside }: { title: string; subtitle: string; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-[#111111]">{title}</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>
      </div>
      {aside}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-9 px-3.5 rounded-lg border text-sm transition-colors ${active ? "border-[#FF6B35] bg-[#FFF5F0] text-[#111111] font-medium" : "border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111111]"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// The chat bubble takes 80px from the screen edge (bottom 24px, 56px tall).
const BUBBLE_ZONE = 88;
const ABOVE_BUBBLE = "max(92px, calc(env(safe-area-inset-bottom) + 84px))";
const CLEAR_OF_BUBBLE = "max(20px, calc(env(safe-area-inset-bottom) + 12px))";

/**
 * Sticks to the bottom of the page. On screens from 640px its end edge lines
 * up with the content column it is placed in (put it last in that column), and
 * it lifts above the chat bubble when that edge reaches the bubble. On phones
 * it is a full width bar that steps aside while the keyboard is open.
 */
export function FloatingSave({ saving, dirty, justSaved, error, onSave, label, savingLabel, savedLabel }: { saving: boolean; dirty: boolean; justSaved: boolean; error: string | null; onSave: () => void; label: string; savingLabel: string; savedLabel: string }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setKeyboardOpen(window.innerHeight - vv.height > 140);
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const edgeGap = getComputedStyle(el).direction === "rtl" ? box.left : window.innerWidth - box.right;
      setLifted(edgeGap < BUBBLE_ZONE);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const active = dirty || saving;
  return (
    <div
      ref={wrapRef}
      data-testid="save-bar"
      className={`pointer-events-none z-30 flex flex-col items-end gap-2 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:border-t max-sm:border-[#E5E7EB] max-sm:bg-white max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(12px,env(safe-area-inset-bottom))] sm:sticky sm:mt-4 sm:bottom-[var(--save-bottom)] ${keyboardOpen ? "max-sm:hidden" : ""}`}
      style={{ "--save-bottom": lifted ? ABOVE_BUBBLE : CLEAR_OF_BUBBLE } as CSSProperties}
    >
      {error && <p role="alert" className="max-w-[260px] rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 shadow-sm">{error}</p>}
      <button
        type="button"
        onClick={onSave}
        disabled={!active || saving}
        className={`pointer-events-auto max-sm:w-full ${active
          ? "btn-primary h-12 px-6 text-sm disabled:opacity-70"
          : "h-12 px-6 rounded-full border border-[#E5E7EB] bg-white text-sm font-semibold text-[#9CA3AF] shadow-[0_4px_14px_rgba(15,23,42,0.08)] cursor-default"}`}
      >
        {saving ? savingLabel : !dirty && justSaved ? savedLabel : label}
      </button>
    </div>
  );
}
