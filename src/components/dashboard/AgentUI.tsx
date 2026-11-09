"use client";

import { useEffect, useState, type ReactNode } from "react";

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

/**
 * Fixed at the bottom end of the screen, just inside the chat bubble (the
 * logical "end" mirrors both to the left in Arabic). On phones it steps
 * aside while the keyboard is open so it can never cover the field in use.
 */
export function FloatingSave({ saving, dirty, justSaved, error, onSave, label, savingLabel, savedLabel }: { saving: boolean; dirty: boolean; justSaved: boolean; error: string | null; onSave: () => void; label: string; savingLabel: string; savedLabel: string }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setKeyboardOpen(window.innerHeight - vv.height > 140);
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);

  const active = dirty || saving;
  return (
    <div
      className={`fixed z-[130] end-4 sm:end-[92px] flex flex-col items-end gap-2 ${keyboardOpen ? "max-sm:hidden" : ""}`}
      style={{ bottom: "max(28px, calc(env(safe-area-inset-bottom) + 20px))" }}
    >
      {error && <p role="alert" className="max-w-[260px] rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 shadow-sm">{error}</p>}
      <button
        type="button"
        onClick={onSave}
        disabled={!active || saving}
        className={active
          ? "btn-primary h-12 px-6 text-sm disabled:opacity-70"
          : "h-12 px-6 rounded-full border border-[#E5E7EB] bg-white text-sm font-semibold text-[#9CA3AF] shadow-[0_4px_14px_rgba(15,23,42,0.08)] cursor-default"}
      >
        {saving ? savingLabel : !dirty && justSaved ? savedLabel : label}
      </button>
    </div>
  );
}
