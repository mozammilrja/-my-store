"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js (offline page, cached public files, push). Production
 * builds only: the dev server's files have no content hash, and a stale one
 * would be confusing while developing. NEXT_PUBLIC_ENABLE_SW=1 forces it on.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_SW !== "1") return
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])
  return null
}
