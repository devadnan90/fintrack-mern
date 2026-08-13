import { useCallback, useEffect, useState } from "react";
const STORAGE_KEY = "fintrack-theme";
function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
applyTheme(getInitialTheme());
export default function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);
  return {
    theme,
    toggleTheme,
  };
}
