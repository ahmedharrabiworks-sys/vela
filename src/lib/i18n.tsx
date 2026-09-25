"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";

const TRANSLATIONS: Record<string, Record<string, unknown>> = {
  en: en as unknown as Record<string, unknown>,
  ar: ar as unknown as Record<string, unknown>,
  fr: fr as unknown as Record<string, unknown>,
  de: de as unknown as Record<string, unknown>,
};

const LANG_TO_CODE: Record<string, string> = {
  English: "en",
  Arabic: "ar",
  Français: "fr",
  Deutsch: "de",
};

const CODE_TO_LANG: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  fr: "Français",
  de: "Deutsch",
};

export const LANGUAGES = ["English", "Arabic", "Français", "Deutsch"] as const;
export type LangName = (typeof LANGUAGES)[number];

type I18nContextType = {
  t: (key: string) => string;
  locale: string;
  langName: string;
  setLocale: (lang: string) => void;
};

const I18nContext = createContext<I18nContextType>({
  t: (k) => k,
  locale: "en",
  langName: "English",
  setLocale: () => {},
});

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

function resolveLocale(saved: string | null): string {
  if (!saved) return "en";
  // support both full name ("English") and code ("en")
  if (saved in LANG_TO_CODE) return LANG_TO_CODE[saved];
  if (saved in TRANSLATIONS) return saved;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Root cause of the white-screen-on-mobile bug (confirmed via reproduction
  // with localStorage pre-seeded to "ar", real React errors #425/#418/#423
  // on both Chromium and WebKit mobile emulation): this initializer used to
  // read localStorage synchronously, so a returning Arabic-locale visitor's
  // very first CLIENT render already differed from the server's always-"en"
  // render -- a genuine SSR/CSR hydration mismatch, not a mobile-specific
  // bug per se (it fires on any device with "ar" cached), but it explains
  // "broken on my phone, fine on desktop" if Arabic had only been tested on
  // the phone. Always starting at "en" here (matching the server every
  // time) and applying the saved locale in the effect below -- a normal
  // post-mount state update, not a hydration diff -- removes the mismatch
  // entirely. Trade-off: a returning Arabic visitor sees one English frame
  // before the saved locale kicks in; far safer than an intermittent
  // hydration crash.
  const [locale, setLocaleState] = useState<string>("en");

  function applyDir(code: string) {
    document.documentElement.setAttribute("dir", code === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", code);
  }

  useEffect(() => {
    const saved = resolveLocale(localStorage.getItem("vela_lang"));
    if (saved !== "en") setLocaleState(saved);
    applyDir(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyDir(locale);
  }, [locale]);

  const setLocale = (lang: string) => {
    const code = resolveLocale(lang);
    setLocaleState(code);
    localStorage.setItem("vela_lang", lang);
    applyDir(code);
  };

  const t = (key: string): string => {
    const dict = TRANSLATIONS[locale] as Record<string, unknown>;
    const val = getNestedValue(dict, key);
    // fall back to English if key missing in current locale
    if (val === key && locale !== "en") {
      return getNestedValue(TRANSLATIONS.en as Record<string, unknown>, key);
    }
    return val;
  };

  return (
    <I18nContext.Provider
      value={{ t, locale, langName: CODE_TO_LANG[locale] ?? "English", setLocale }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
