"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";
type ColorTheme = "classic" | "ocean" | "sunset";

type ThemeContextType = {
  theme: Theme;
  toggle: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggle: () => {},
  colorTheme: "classic",
  setColorTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("classic");
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/app") ?? false;

  // Apply/remove dark class whenever pathname or theme changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark" && isDashboard);
  }, [theme, isDashboard]);

  useEffect(() => {
    const saved = localStorage.getItem("vela_theme") as Theme | null;
    const initial = saved ?? "light";
    setTheme(initial);

    const savedColor = localStorage.getItem("vela_color_theme") as ColorTheme | null;
    const initialColor: ColorTheme = (savedColor === "ocean" || savedColor === "sunset") ? savedColor : "classic";
    setColorThemeState(initialColor);
    document.documentElement.setAttribute("data-theme", initialColor);
  }, []);

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
