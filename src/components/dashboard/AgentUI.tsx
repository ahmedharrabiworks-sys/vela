"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

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

// The chat bubble ends 80px from the screen edge (24px offset + 56px wide).
const BUBBLE_REACH = 80;
const BUBBLE_GAP = 12;

type SaveFrame = { left: number; width: number; padding: number; shift: number };

/**
 * Fixed to the screen, so scrolling can never move it. The wrapper copies the
 * main content area (which already follows the sidebar, expanded or collapsed)
 * and repeats the page column inside it, so the button's end edge lands on the
 * cards' edge. Only a window or sidebar size change can move it: if that edge
 * would reach the chat bubble, the button shifts sideways to stay 12px clear.
 * On phones it is a full width bar that steps aside while the keyboard is open.
 * `columnClass` is the max-width class of the page's column.
 */
export function FloatingSave({ saving, dirty, justSaved, error, onSave, label, savingLabel, savedLabel, columnClass }: { saving: boolean; dirty: boolean; justSaved: boolean; error: string | null; onSave: () => void; label: string; savingLabel: string; savedLabel: string; columnClass: string }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [frame, setFrame] = useState<SaveFrame | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setKeyboardOpen(window.innerHeight - vv.height > 140);
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);

  useLayoutEffect(() => {
    const main = document.querySelector("main");
    const column = columnRef.current;
    if (!main || !column) return;
    const measure = () => {
      const styles = getComputedStyle(main);
      const padding = parseFloat(styles.paddingLeft) || 0;
      const left = main.getBoundingClientRect().left + main.clientLeft;
      const room = main.clientWidth - padding * 2;
      const columnWidth = Math.min(room, parseFloat(getComputedStyle(column).maxWidth) || room);
      const margin = (room - columnWidth) / 2;
      const columnEnd = left + padding + margin + columnWidth;
      const edgeGap = styles.direction === "rtl" ? left + padding + margin : window.innerWidth - columnEnd;
      const bubbleShown = window.matchMedia("(min-width: 640px)").matches;
      const shift = bubbleShown ? Math.max(0, BUBBLE_REACH + BUBBLE_GAP - edgeGap) : 0;
      setFrame({ left, width: main.clientWidth, padding, shift });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const active = dirty || saving;
  return (
    <div
      data-testid="save-bar"
      className={`fixed z-30 bottom-0 pointer-events-none sm:bottom-[calc(24px+env(safe-area-inset-bottom))] max-sm:!left-0 max-sm:!w-full max-sm:pointer-events-auto max-sm:border-t max-sm:border-[#E5E7EB] max-sm:bg-white max-sm:pt-3 max-sm:pb-[max(12px,env(safe-area-inset-bottom))] ${keyboardOpen ? "max-sm:hidden" : ""}`}
      style={{ left: frame?.left, width: frame?.width, paddingInline: frame?.padding, visibility: frame ? undefined : "hidden" }}
    >
      <div ref={columnRef} className={`${columnClass} mx-auto w-full flex flex-col items-end gap-2`} style={{ paddingInlineEnd: frame?.shift }}>
        {error && <p role="alert" className="max-w-[260px] rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 shadow-sm">{error}</p>}
        <button
          type="button"
          onClick={onSave}
          disabled={!active || saving}
          className={`pointer-events-auto max-sm:w-full ${active
            ? "btn-primary hover:!scale-100 active:!scale-100 h-12 px-6 text-sm disabled:opacity-70"
            : "h-12 px-6 rounded-full border border-[#E5E7EB] bg-white text-sm font-semibold text-[#9CA3AF] shadow-[0_4px_14px_rgba(15,23,42,0.08)] cursor-default"}`}
        >
          {saving ? savingLabel : !dirty && justSaved ? savedLabel : label}
        </button>
      </div>
    </div>
  );
}
