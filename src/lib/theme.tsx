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
  const isDashboard = (pathname?.startsWith("/app") || pathname?.startsWith("/demo")) ?? false;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark" && isDashboard);
  }, [theme, isDashboard]);

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
