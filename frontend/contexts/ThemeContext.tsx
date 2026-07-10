"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Au premier chargement : récupérer la préférence sauvegardée
  useEffect(() => {
    const stored = localStorage.getItem("calibrate-theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  // À chaque changement : appliquer sur <html> et sauvegarder
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("calibrate-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider");
  return ctx;
}