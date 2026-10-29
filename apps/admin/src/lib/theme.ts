/** Which palette the admin paints in. "system" follows the browser. */
export type Theme = "light" | "dark" | "system"

/** Shared with the no-flash script in index.html; change both together. */
const THEME_KEY = "everwear_admin_theme"

/* Private browsing and blocked site data make localStorage throw, so every access is guarded. */
export const getTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === "light" || stored === "dark" ? stored : "system"
  } catch {
    return "system"
  }
}

export const resolveTheme = (theme: Theme): "light" | "dark" =>
  theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : theme

/** The one place the `.dark` class is set; the CSS does the rest. */
export const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark")
}

export const storeTheme = (theme: Theme) => {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Nothing to do: the choice then lasts only as long as the page.
  }
  applyTheme(theme)
}
