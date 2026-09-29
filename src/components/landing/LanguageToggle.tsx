"use client";

import { useI18n } from "@/lib/i18n";

// Hero mobile-navbar-bigger round: "lg" scales every dimension up roughly
// proportionally to the pill's own 52px->64px height increase (~1.23x) --
// "sm" is the untouched original so every other call site (desktop nav,
// AuthChrome) keeps its exact prior output with no prop change needed.
const SIZE_CLASSES = {
  sm: { button: "text-xs", span: "px-2.5 py-1" },
  lg: { button: "text-sm", span: "px-3 py-1.5" },
} as const;

/**
 * Small EN / عربي switch, sits next to "Log in" on the homepage nav.
 * Extends the existing i18n system (src/lib/i18n.tsx) -- setLocale() already
 * flips document dir + persists to localStorage, nothing new to wire up.
 */
export default function LanguageToggle({
  className = "",
  size = "sm",
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const { locale, setLocale } = useI18n();
  const isAr = locale === "ar";
  const sz = SIZE_CLASSES[size];

  return (
    <button
      type="button"
      onClick={() => setLocale(isAr ? "en" : "ar")}
      aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
      className={`inline-flex items-center rounded-full border border-[#E5E7EB] p-0.5 font-semibold shrink-0 ${sz.button} ${className}`}
    >
      <span
        className={`${sz.span} rounded-full transition-colors duration-200`}
        style={!isAr ? { background: "#FFF3EE", color: "#C2410C" } : { color: "#9CA3AF" }}
      >
        EN
      </span>
      <span
        className={`${sz.span} rounded-full transition-colors duration-200`}
        style={isAr ? { background: "#FFF3EE", color: "#C2410C" } : { color: "#9CA3AF" }}
      >
        عربي
      </span>
    </button>
  );
}
