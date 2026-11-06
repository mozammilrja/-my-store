import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { usePortal } from "@/portal/session"
import { api } from "./api"
import type { Me, Permission } from "./types"

/*
 * Who is signed in, what they may do, and which of their warehouses they are
 * working in. Staff assigned to one warehouse never choose; others pick one
 * and the choice is remembered on the device.
 */

const WH_KEY = "everwear_warehouse_current"

type Session = {
  me: Me
  warehouseId: string
  setWarehouseId: (id: string) => void
  can: (p: Permission) => boolean
  signOut: () => void
}

const Ctx = createContext<Session | null>(null)

export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const portal = usePortal()
  const client = useQueryClient()
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/me"), staleTime: 5 * 60_000 })
  const [chosen, setChosen] = useState(() => {
    try {
      return localStorage.getItem(WH_KEY)
    } catch {
      return null
    }
  })

  const value = useMemo<Session | null>(() => {
    if (!me.data) return null
    const ids = me.data.user.warehouseIds
    const warehouseId = chosen && ids.includes(chosen) ? chosen : ids[0]!
    return {
      me: me.data,
      warehouseId,
      setWarehouseId: (id) => {
        try {
          localStorage.setItem(WH_KEY, id)
        } catch {
          // Remembered for this tab only.
        }
        setChosen(id)
        void client.invalidateQueries()
      },
      can: (p) => me.data.permissions.includes(p),
      signOut: () => {
        void portal.signOut()
      },
    }
  }, [me.data, chosen, client])

  if (!value) return <>{me.isError ? <SignInAgain error={(me.error as Error).message} /> : fallback}</>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function SignInAgain({ error }: { error: string }) {
  const portal = usePortal()
  return (
    <div className="mx-auto mt-24 max-w-sm space-y-3 px-4 text-center">
      <p className="text-primary">{error}</p>
      <button className="text-body font-medium text-accent underline" onClick={() => void portal.signOut()}>
        Sign in again
      </button>
    </div>
  )
}

export function useSession() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useSession outside SessionProvider")
  return v
}

export { toggleThemeGlobal as toggleTheme } from "@/lib/theme"
