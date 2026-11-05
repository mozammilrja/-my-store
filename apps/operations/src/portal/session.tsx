import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { notifySignedOut, onSessionExpired, portalJson, PortalError } from "./client"

/*
 * Who is signed in to the portal: the accounts their session holds, the
 * roles and areas those give, and where they land. All of it comes from the
 * API (/ops/auth/me); nothing here decides access, it only decides what to
 * show. The API refuses anything the session's accounts can't do.
 */

export type Area = "admin" | "warehouse" | "delivery" | "seller"
export type PortalRole = "OWNER" | "ADMIN" | "WAREHOUSE_SUPERVISOR" | "WAREHOUSE_STAFF" | "DELIVERY_RIDER" | "SELLER"

export type Principal = {
  email: string
  name: string | null
  roles: PortalRole[]
  areas: Area[]
  home: string | null
  accounts: {
    admin?: { id: string; role: string; name: string | null }
    warehouse?: { id: string; role: string; name: string; warehouseIds: string[] }
    rider?: { id: string; name: string; status: string }
    seller?: { id: string; displayName: string; status: string }
  }
  session: { id: string; createdAt: string; expiresAt: string }
}

export const AREA_LABEL: Record<Area, string> = { admin: "Admin", warehouse: "Warehouse", delivery: "Delivery", seller: "Seller Hub" }
export const ROLE_LABEL: Record<PortalRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  WAREHOUSE_SUPERVISOR: "Warehouse supervisor",
  WAREHOUSE_STAFF: "Warehouse staff",
  DELIVERY_RIDER: "Delivery rider",
  SELLER: "Seller",
}

type Session = {
  status: "loading" | "signedOut" | "signedIn" | "error"
  principal: Principal | null
  /** Why the last session ended: "user" signed out, "expired" when the API refused it. */
  endedBy: "user" | "expired" | null
  error: Error | null
  signIn: (email: string, password: string) => Promise<Principal>
  signOut: () => Promise<void>
  refresh: () => Promise<unknown>
  hasArea: (area: Area) => boolean
}

const Ctx = createContext<Session | null>(null)
const ME = ["ops", "me"] as const

/** Drops every cached query except the session record (the areas' own caches go via notifySignedOut). */
const forgetEverythingBut = (client: QueryClient) => client.removeQueries({ predicate: (q) => !(q.queryKey[0] === "ops" && q.queryKey[1] === "me") })

export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const [endedBy, setEndedBy] = useState<Session["endedBy"]>(null)
  const me = useQuery({
    queryKey: ME,
    queryFn: async () => {
      try {
        return await portalJson<Principal>("/ops/auth/me")
      } catch (e) {
        if (e instanceof PortalError && e.status === 401) return null
        throw e
      }
    },
    retry: (count, e) => !(e instanceof PortalError && e.status < 500 && e.status > 0) && count < 2,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  })

  // The API refused the session mid-use: forget who was signed in. The cache
  // isn't emptied here, so queries still in flight fail instead of hanging.
  useEffect(
    () =>
      onSessionExpired(() => {
        if (client.getQueryData(ME)) {
          setEndedBy("expired")
          client.setQueryData(ME, null)
        }
      }),
    [client]
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      const p = await portalJson<Principal>("/ops/auth/login", { body: { email, password } })
      // Nothing cached under someone else may show in this session. The
      // session record itself stays, so the guards watching it never see a gap.
      client.setQueryData(ME, p)
      forgetEverythingBut(client)
      notifySignedOut()
      setEndedBy(null)
      return p
    },
    [client]
  )

  const signOut = useCallback(async () => {
    try {
      await portalJson("/ops/auth/logout", { method: "POST" })
    } finally {
      setEndedBy("user")
      client.setQueryData(ME, null)
      forgetEverythingBut(client)
      notifySignedOut()
    }
  }, [client])

  const value = useMemo<Session>(() => {
    const principal = me.data ?? null
    return {
      status: me.isPending ? "loading" : me.isError && me.data === undefined ? "error" : principal ? "signedIn" : "signedOut",
      principal,
      endedBy,
      error: (me.error as Error | null) ?? null,
      signIn,
      signOut,
      refresh: () => me.refetch(),
      hasArea: (area) => !!principal?.areas.includes(area),
    }
  }, [me, endedBy, signIn, signOut])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePortal() {
  const v = useContext(Ctx)
  if (!v) throw new Error("usePortal outside PortalSessionProvider")
  return v
}
