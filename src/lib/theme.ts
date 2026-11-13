/**
 * Theme mechanism: light and dark follow the system through CSS light-dark();
 * a stored choice adds a .light/.dark class to <html> before first paint.
 * The toggle UI lives in components/theme and only calls these functions.
 */
export type Theme = "light" | "dark";

export const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#09090b" };
const STORAGE_KEY = "theme";

/** Self-contained: it is also serialised into the inline head script. */
function apply(theme: string | null) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  document.getElementById("theme-color")?.remove();
  if (theme !== "light" && theme !== "dark") return;
  root.classList.add(theme);
  // First theme-color meta wins, so this one overrides the two system-keyed ones.
  const meta = document.createElement("meta");
  meta.id = "theme-color";
  meta.name = "theme-color";
  meta.content = theme === "dark" ? "#09090b" : "#ffffff";
  document.head.prepend(meta);
}

/** Blocking script for <head>: applies a stored choice before first paint. */
export const themeScript = `try{(${apply.toString()})(localStorage.getItem("${STORAGE_KEY}"))}catch{}`;

function systemTheme(): Theme {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function currentTheme(): Theme {
  const { classList } = document.documentElement;
  if (classList.contains("dark")) return "dark";
  if (classList.contains("light")) return "light";
  return systemTheme();
}

/** Choosing the system's own theme clears the override, so the page follows the system again. */
export function setTheme(theme: Theme) {
  const stored = theme === systemTheme() ? null : theme;
  try {
    if (stored) localStorage.setItem(STORAGE_KEY, stored);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the choice then lasts for this page only.
  }
  apply(stored);
}

export function toggleTheme(): Theme {
  const next = currentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
