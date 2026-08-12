"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const pathname = usePathname();
  // Only the exact root homepage (hero + marketing sections) is hardcoded
  // to always render light, regardless of the stored preference. Every
  // other route (dashboard, pricing, privacy, terms, etc.) respects it.
  const isHomepage = (pathname ?? "/") === "/";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark" && !isHomepage);
  }, [theme, isHomepage]);

  useEffect(() => {
    const saved = localStorage.getItem("vela_theme") as Theme | null;
    setTheme(saved ?? "light");
    // Lock to Vela orange — single brand colour, no switching
    document.documentElement.setAttribute("data-theme", "orange");
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("vela_theme", next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Stub — colour theme is always orange, switching removed
export function useColorTheme() {
  return { colorTheme: "orange" as const, setColorTheme: (_: string) => {} };
}
