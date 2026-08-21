"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "calibrate_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // globals.css keys every color token off the `.dark` class on <html>
  // (see `@custom-variant dark (&:where(.dark, .dark *));`), so this
  // toggles that class rather than a data-attribute. The inline script in
  // app/layout.tsx has already set it by the time this runs, so read it back
  // rather than starting on light and correcting in an effect.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document === "undefined"
      ? "light"
      : document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
  );

  const setTheme = (next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
