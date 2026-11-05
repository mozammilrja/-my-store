import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api, getToken, onTokenChange, setToken } from "./api"
import type { Me } from "./types"

type Session = { me: Me; refresh: () => void; signOut: () => void; approved: boolean; selfShip: boolean }
const Ctx = createContext<Session | null>(null)

export function useToken() {
  const [token, set] = useState(getToken)
  useEffect(() => onTokenChange(set), [])
  return token
}

export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const client = useQueryClient()
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/me") })
  const value = useMemo<Session | null>(
    () =>
      me.data
        ? {
            me: me.data,
            approved: me.data.seller.status === "approved",
            selfShip: me.data.seller.fulfilmentModel === "seller",
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
    localStorage.setItem("everwear_seller_theme", dark ? "dark" : "light")
  } catch {
    // Not remembered.
  }
}

export const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100)
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
