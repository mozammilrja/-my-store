"use client"

import { useEffect, useState, type ReactNode } from "react"

const KEY = "everwear:announcement-dismissed"

/**
 * The order-confirmed header's fixed frame: the dismissible announcement bar
 * from the export, the server-rendered header rows passed in as children, and
 * a spacer the same height as the fixed header so the page starts below it
 * (160px with the bar, 124px once dismissed). Dismissal lasts for the session.
 */
export function OrderHeaderFrame({ announcement, children }: { announcement: ReactNode; children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from sessionStorage after hydration
    if (sessionStorage.getItem(KEY) === "1") setDismissed(true)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        {!dismissed && (
          <div className="bg-primary-container text-on-primary font-label-sm text-label-sm py-2 px-margin-mobile md:px-margin flex items-center justify-between">
            <div className="flex-1 text-center truncate pr-2">{announcement}</div>
            <button
              aria-label="Dismiss announcement"
              className="text-on-primary/70 hover:text-on-primary transition-colors flex items-center"
              type="button"
              onClick={() => {
                sessionStorage.setItem(KEY, "1")
                setDismissed(true)
              }}
            >
              <span aria-hidden className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
        {children}
      </header>
      <div aria-hidden className={dismissed ? "h-[124px]" : "h-40"} />
    </>
  )
}
