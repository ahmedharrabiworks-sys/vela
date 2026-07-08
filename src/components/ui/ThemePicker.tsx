"use client";

import { useState, useRef, useEffect } from "react";
import { useColorTheme } from "@/lib/theme";

type ColorThemeId = "classic" | "ocean" | "sunset";

const THEMES: { id: ColorThemeId; name: string; color: string }[] = [
  { id: "classic", name: "Classic", color: "#FF6B35" },
  { id: "ocean",   name: "Ocean",   color: "#3B82F6" },
  { id: "sunset",  name: "Sunset",  color: "#FB8C42" },
];

export function ThemePicker() {
  const { colorTheme, setColorTheme } = useColorTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = THEMES.find((t) => t.id === colorTheme) ?? THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Color theme"
        aria-label="Choose color theme"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6B7280] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all duration-200"
      >
        {/* Palette / swatch icon */}
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <circle cx="8.5" cy="8.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="6"   cy="7"   r="1.1" fill="currentColor"/>
          <circle cx="11"  cy="7"   r="1.1" fill="currentColor"/>
          <circle cx="8.5" cy="11"  r="1.1" fill="currentColor"/>
        </svg>
        {/* active dot indicator */}
        <span
          className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-white"
          style={{ backgroundColor: active.color }}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 w-44 bg-white border border-[#E5E7EB] rounded-2xl shadow-card-hover py-2 z-[200]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-3.5 pt-1 pb-2">
            Colour theme
          </p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setColorTheme(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-[#F9FAFB] ${
                colorTheme === t.id ? "font-semibold text-[#111111]" : "text-[#374151]"
              }`}
            >
              <span className="w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10" style={{ backgroundColor: t.color }} />
              {t.name}
              {colorTheme === t.id && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-auto shrink-0">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
