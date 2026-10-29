import { useCallback, useEffect, useState } from "react"

const THEME_KEY = "everwear-admin-theme"

type Theme = "light" | "dark"

const readTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light"

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage can be unavailable; the switch still applies for this visit
    }
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
