import { onlineManager } from "@tanstack/react-query"
import { CloudOff, RefreshCw } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

/*
 * Connection state for phones on patchy networks. TanStack Query already
 * pauses requests while the browser is offline and sends them when it comes
 * back (onlineManager); this makes that visible, so a rider or packer knows
 * their tap was kept and will go through, rather than tapping again.
 */

export function useOnline() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true
  )
}

/** A strip at the top of the screen while offline, and a short "back online" after. */
export function NetworkBanner() {
  const online = useOnline()
  const [recovered, setRecovered] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  useEffect(() => {
    if (!online) {
      setWasOffline(true)
      setRecovered(false)
      return
    }
    if (!wasOffline) return
    setRecovered(true)
    const t = window.setTimeout(() => setRecovered(false), 4000)
    return () => window.clearTimeout(t)
  }, [online, wasOffline])

  if (online && !recovered) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        online
          ? "fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 border-b border-status-success/30 bg-status-success-bg px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-body font-medium text-success"
          : "fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 border-b border-status-warning/30 bg-status-warning-bg px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-body font-medium text-warning"
      }
    >
      {online ? <RefreshCw className="size-4" aria-hidden /> : <CloudOff className="size-4" aria-hidden />}
      {online ? "Back online. Sending anything that was waiting." : "You're offline. What you do now is kept and sent when you're back online."}
    </div>
  )
}
