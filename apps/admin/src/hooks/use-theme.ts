import { useEffect, useState } from "react"
import { applyTheme, getTheme, storeTheme, type Theme } from "@/lib/theme"

/** The chosen palette, kept in step with the browser while it is "system". */
export const useTheme = () => {
  const [theme, setChosen] = useState<Theme>(getTheme)

  useEffect(() => {
    if (theme !== "system") return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyTheme("system")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  return {
    theme,
    setTheme: (next: Theme) => {
      storeTheme(next)
      setChosen(next)
    },
  }
}
