"use client";

// Theme is a display preference, not data, so it lives in its own key and never
// touches the problem records. The inline script in layout.tsx applies it before
// first paint; this component only handles the switch afterwards.

import { useEffect, useState } from "react";

export const THEME_KEY = "oppie.lab.theme";
type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    setTheme(stored === "dark" ? "dark" : "light");
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the toggle still works for this session */
    }
  };

  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title="Light or dark. Same information either way."
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
