"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

/*
 * "Add AVELIQ to your home screen", offered once the shopper has looked
 * around (a few pages or half a minute), never during checkout, never when
 * already installed, and not again for 30 days after "Not now".
 *
 * Chrome, Edge and Samsung Internet on Android (and desktop Chromium) fire
 * `beforeinstallprompt`, so the button opens the browser's own install
 * dialog. Safari on iPhone and iPad has no such event: it can only be done
 * from the Share menu, so we say how. Other browsers get nothing.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

const KEY = "aveliq_install_prompt"
const VIEWS = "aveliq_page_views"
const SNOOZE_DAYS = 30

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const isIosSafari = () => {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}
const snoozed = () => {
  try {
    const until = Number(localStorage.getItem(KEY) ?? 0)
    return until > Date.now()
  } catch {
    return true
  }
}

export function InstallPrompt() {
  const pathname = usePathname()
  const [deferred, setDeferred] = useState<InstallEvent | null>(null)
  const [mode, setMode] = useState<"android" | "ios" | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as InstallEvent)
      setMode("android")
    }
    const onInstalled = () => {
      setMode(null)
      try {
        localStorage.setItem(KEY, String(Date.now() + 10 * 365 * 86400_000))
      } catch {}
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    if (!isStandalone() && isIosSafari()) setMode("ios")
    const timer = window.setTimeout(() => setReady(true), 30_000)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
      window.clearTimeout(timer)
    }
  }, [])

  // Count pages seen this session; the offer waits for some interest.
  useEffect(() => {
    try {
      const n = Number(sessionStorage.getItem(VIEWS) ?? 0) + 1
      sessionStorage.setItem(VIEWS, String(n))
      if (n >= 3) setReady(true)
    } catch {}
  }, [pathname])

  const inCheckout = /\/(checkout|order|account)(\/|$)/.test(pathname ?? "")
  if (!mode || !ready || inCheckout || snoozed() || isStandalone()) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + SNOOZE_DAYS * 86400_000))
    } catch {}
    setMode(null)
  }

  return (
    <aside
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md border border-border bg-background p-4 text-foreground shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-start gap-3">
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} unoptimized className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p id="install-title" className="text-sm font-semibold">Add AVELIQ to your home screen</p>
          {mode === "android" ? (
            <p className="mt-1 text-sm text-muted-foreground">Opens like an app, full screen, and loads faster next time.</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              In Safari, tap <span className="font-medium text-foreground">Share</span> (the square with an arrow), then{" "}
              <span className="font-medium text-foreground">Add to Home Screen</span>.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-11 sm:h-9" onClick={dismiss}>
          Not now
        </Button>
        {mode === "android" && deferred ? (
          <Button
            size="sm"
            className="h-11 sm:h-9"
            onClick={async () => {
              await deferred.prompt()
              const { outcome } = await deferred.userChoice
              setDeferred(null)
              if (outcome === "accepted") setMode(null)
              else dismiss()
            }}
          >
            Install
          </Button>
        ) : null}
      </div>
    </aside>
  )
}
