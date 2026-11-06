import { Download, Share, X } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"
import { useLocation } from "react-router"
import { usePortal } from "./session"

/*
 * Installing the portal as an app, and its service worker (public/sw.js).
 *
 * Chromium browsers (Chrome, Edge, Samsung Internet; Android and desktop)
 * fire `beforeinstallprompt`; it is caught as early as possible (this module
 * loads with the app) and kept, so "Install app" can open the browser's own
 * dialog later. Safari on iPhone and iPad has no such event: installing is
 * Share, Add to Home Screen, so that is what we tell people. Firefox for
 * desktop can't install web apps at all; nothing is offered there.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

let deferred: InstallEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    emit()
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    installed = true
    emit()
  })
}

export const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

export const isIos = () => {
  if (typeof navigator === "undefined") return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

/** "prompt": the browser's install dialog can be opened. "ios": explain Share, Add to Home Screen. null: nothing to offer. */
export function useInstall() {
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => void listeners.delete(cb)
    },
    () => (installed || isStandalone() ? null : deferred ? "prompt" : isIos() ? "ios" : null),
    () => null
  )
  const install = async () => {
    if (!deferred) return false
    const e = deferred
    await e.prompt()
    const { outcome } = await e.userChoice
    deferred = null
    emit()
    return outcome === "accepted"
  }
  return { mode: state as "prompt" | "ios" | null, install }
}

/**
 * Registers the service worker for production builds (offline start, cached
 * static files, push). VITE_ENABLE_SW=1 turns it on in development too.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  if (!import.meta.env.PROD && import.meta.env.VITE_ENABLE_SW !== "1") return
  const go = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
  if (document.readyState === "complete") go()
  else window.addEventListener("load", go, { once: true })
}

const SNOOZE = "everwear_ops_install_snooze"
const snoozed = () => {
  try {
    return Number(localStorage.getItem(SNOOZE) ?? 0) > Date.now()
  } catch {
    return true
  }
}

/**
 * Offered once, on a phone or tablet, after signing in to the floor, delivery
 * or seller workspace: the people who use it all day on a handheld. Admins
 * at desks and anyone who said "Not now" in the last 30 days aren't asked;
 * the account menu always has "Install app".
 */
export function InstallBanner() {
  const { status } = usePortal()
  const { mode, install } = useInstall()
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(snoozed)
  const [touch, setTouch] = useState(false)
  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), [])

  const area = pathname.split("/")[1]
  if (hidden || !mode || !touch || status !== "signedIn" || !["warehouse", "delivery", "seller"].includes(area ?? "")) return null

  const dismiss = () => {
    try {
      localStorage.setItem(SNOOZE, String(Date.now() + 30 * 86400_000))
    } catch {
      // Not remembered: asked again next visit.
    }
    setHidden(true)
  }

  return (
    <aside
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-3 bottom-20 z-[55] mx-auto max-w-md rounded-xl border border-subtle bg-surface-container-lowest p-4 text-primary shadow-xl md:bottom-6 md:left-auto md:right-6"
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 text-body">
          <p id="install-title" className="font-semibold">Install the app on this phone</p>
          {mode === "prompt" ? (
            <p className="mt-1 text-secondary">Opens full screen from your home screen, starts faster and can show notifications.</p>
          ) : (
            <p className="mt-1 text-secondary">
              In Safari, tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> Share, then <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="Not now" className="-mr-2 -mt-2 grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-subtle">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {mode === "prompt" ? (
        <button
          type="button"
          onClick={async () => {
            if (!(await install())) dismiss()
          }}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-body font-medium text-on-accent hover:bg-accent-hover"
        >
          <Download className="size-4" aria-hidden /> Install
        </button>
      ) : null}
    </aside>
  )
}
