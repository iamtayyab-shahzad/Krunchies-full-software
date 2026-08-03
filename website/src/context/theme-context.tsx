"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** Website appearance presets — CSS-only, no runtime cost beyond one attribute. */
export type SiteTheme = "dark" | "dim" | "light" | "warm";

export const SITE_THEME_KEY = "krunchies_site_theme";

export const SITE_THEMES: {
  id: SiteTheme;
  label: string;
  swatch: string;
}[] = [
  { id: "dark", label: "Night", swatch: "#050505" },
  { id: "dim", label: "Soft", swatch: "#1c1c1f" },
  { id: "light", label: "Day", swatch: "#f4f4f5" },
  { id: "warm", label: "Warm", swatch: "#f7f1e8" },
];

type ThemeContextValue = {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function applySiteTheme(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

function readStoredTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = localStorage.getItem(SITE_THEME_KEY);
    if (raw === "dim" || raw === "light" || raw === "warm" || raw === "dark") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>("dark");

  useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
    applySiteTheme(initial);
  }, []);

  const setTheme = useCallback((next: SiteTheme) => {
    setThemeState(next);
    applySiteTheme(next);
    try {
      localStorage.setItem(SITE_THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useSiteTheme must be used within SiteThemeProvider");
  }
  return ctx;
}
