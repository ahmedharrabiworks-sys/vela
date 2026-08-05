"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";
type ColorTheme = "orange" | "blue" | "teal";

type ThemeContextType = {
  theme: Theme;
  toggle: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggle: () => {},
  colorTheme: "orange",
  setColorTheme: () => {},
});

const VALID_THEMES: ColorTheme[] = ["orange", "blue", "teal"];
// Migrate old localStorage preset names → new names
const LEGACY_MAP: Record<string, ColorTheme> = { classic: "orange", ocean: "blue", sunset: "teal" };

function resolveTheme(raw: string | null): ColorTheme {
  if (!raw) return "orange";
  if (VALID_THEMES.includes(raw as ColorTheme)) return raw as ColorTheme;
  return LEGACY_MAP[raw] ?? "orange";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("orange");
  const pathname = usePathname();
  const isDashboard = (pathname?.startsWith("/app") || pathname?.startsWith("/demo")) ?? false;

  // Apply/remove dark class whenever pathname or theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark" && isDashboard);
  }, [theme, isDashboard]);

  // On mount: apply saved theme from localStorage immediately (no flash)
  useEffect(() => {
    const saved = localStorage.getItem("vela_theme") as Theme | null;
    setTheme(saved ?? "light");

    const savedColor = localStorage.getItem("vela_color_theme");
    const initial = resolveTheme(savedColor);
    setColorThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  // Dashboard-only: sync color theme from DB (authoritative source)
  useEffect(() => {
    if (!isDashboard) return;
    fetch("/api/user/theme")
      .then((r) => r.json())
      .then((data) => {
        if (data.theme && VALID_THEMES.includes(data.theme)) {
          setColorThemeState(data.theme);
          localStorage.setItem("vela_color_theme", data.theme);
          document.documentElement.setAttribute("data-theme", data.theme);
        }
      })
      .catch(() => {}); // localStorage value already applied — silent fail
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDashboard]);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("vela_theme", next);
      return next;
    });
  };

  const setColorTheme = (t: ColorTheme) => {
    setColorThemeState(t);
    localStorage.setItem("vela_color_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    // Persist to DB (fire-and-forget — localStorage already updated)
    fetch("/api/user/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColorTheme() {
  const { colorTheme, setColorTheme } = useContext(ThemeContext);
  return { colorTheme, setColorTheme };
}
