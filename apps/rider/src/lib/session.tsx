import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { api, getToken, onTokenChange, setToken } from "./api"
import type { Me } from "./types"

type Session = { me: Me; refresh: () => void; signOut: () => void }
const Ctx = createContext<Session | null>(null)

export function useToken() {
  const [token, set] = useState(getToken)
  useEffect(() => onTokenChange(set), [])
  return token
}

export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const client = useQueryClient()
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/me"), refetchInterval: 60_000 })
  const value = useMemo<Session | null>(
    () =>
      me.data
        ? {
            me: me.data,
            refresh: () => void client.invalidateQueries({ queryKey: ["me"] }),
            signOut: () => {
              setToken(null)
              client.clear()
            },
          }
        : null,
    [me.data, client]
  )
  if (!value)
    return me.isError ? (
      <div className="mx-auto mt-24 max-w-sm space-y-3 px-4 text-center">
        <p>{(me.error as Error).message}</p>
        <button className="text-sm font-medium text-accent underline" onClick={() => setToken(null)}>
          Sign in again
        </button>
      </div>
    ) : (
      <>{fallback}</>
    )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useSession outside SessionProvider")
  return v
}

export function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark")
  try {
    localStorage.setItem("everwear_rider_theme", dark ? "dark" : "light")
  } catch {
    // Not remembered.
  }
}

/**
 * Shares the rider's position while, and only while, `active` (online with
 * a parcel out for delivery). The browser asks for permission the first time;
 * a refusal is reported and nothing is sent. Posts at most every 20 seconds.
 */
export function useLocationSharing(active: boolean) {
  const [state, setState] = useState<"off" | "sharing" | "denied" | "unavailable">("off")
  const last = useRef(0)
  useEffect(() => {
    if (!active) {
      setState("off")
      return
    }
    if (!("geolocation" in navigator)) {
      setState("unavailable")
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState("sharing")
        if (Date.now() - last.current < 20_000) return
        last.current = Date.now()
        void api("/me/location", { body: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) } }).catch(() => {})
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])
  return state
}

/** One-off position for a delivery or failed-attempt record, if the rider allows it. Resolves undefined otherwise. */
export function currentPosition(): Promise<{ lat: number; lng: number } | undefined> {
  if (!("geolocation" in navigator)) return Promise.resolve(undefined)
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 }
    )
  )
}

export const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100)
export const REASON_LABEL: Record<string, string> = {
  customer_unavailable: "Customer not available",
  customer_refused: "Customer refused the parcel",
  address_not_found: "Address not found",
  customer_rescheduled: "Customer asked for another time",
  cash_not_ready: "Cash not ready",
  premises_closed: "Premises closed",
  unsafe_location: "Unsafe to deliver",
  other: "Other",
}
