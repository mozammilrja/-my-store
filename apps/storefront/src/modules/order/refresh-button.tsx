"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

/** "Live feed sync": re-fetches the order on the server, so the page shows its latest status. */
export function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      className="flex cursor-pointer items-center gap-1.5 rounded bg-surface-container-low px-space-md py-space-xs font-label-sm text-label-sm text-on-surface shadow-sm transition-all hover:bg-surface-container"
      data-testid="track-refresh"
    >
      <span aria-hidden className={`material-symbols-outlined text-[16px] text-secondary ${pending ? "animate-spin" : ""}`}>
        sync
      </span>
      <span className="font-medium uppercase tracking-widest">{pending ? "Syncing…" : "Live Feed Sync"}</span>
    </button>
  )
}
