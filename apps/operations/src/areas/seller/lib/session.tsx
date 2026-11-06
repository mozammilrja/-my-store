import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useMemo, type ReactNode } from "react"
import { usePortal } from "@/portal/session"
import { api } from "./api"
import type { Me } from "./types"

type Session = { me: Me; refresh: () => void; signOut: () => void; approved: boolean; selfShip: boolean }
const Ctx = createContext<Session | null>(null)

export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const portal = usePortal()
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
              void portal.signOut()
            },
          }
        : null,
    [me.data, client]
  )
  if (!value)
    return me.isError ? (
      <div className="mx-auto mt-24 max-w-sm space-y-3 px-4 text-center">
        <p>{(me.error as Error).message}</p>
        <button className="text-body font-medium text-accent underline" onClick={() => void portal.signOut()}>
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

export { toggleThemeGlobal as toggleTheme } from "@/lib/theme"

export const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100)
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
