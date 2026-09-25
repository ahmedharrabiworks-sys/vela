"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Small EN / عربي switch, sits next to "Log in" on the homepage nav.
 * Extends the existing i18n system (src/lib/i18n.tsx) -- setLocale() already
 * flips document dir + persists to localStorage, nothing new to wire up.
 */
export default function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const isAr = locale === "ar";

  return (
    <button
      type="button"
      onClick={() => setLocale(isAr ? "en" : "ar")}
      aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
      className={`inline-flex items-center rounded-full border border-[#E5E7EB] p-0.5 text-xs font-semibold shrink-0 ${className}`}
    >
      <span
        className="px-2.5 py-1 rounded-full transition-colors duration-200"
        style={!isAr ? { background: "#FFF3EE", color: "#C2410C" } : { color: "#9CA3AF" }}
      >
        EN
      </span>
      <span
        className="px-2.5 py-1 rounded-full transition-colors duration-200"
        style={isAr ? { background: "#FFF3EE", color: "#C2410C" } : { color: "#9CA3AF" }}
      >
        عربي
      </span>
    </button>
  );
}
