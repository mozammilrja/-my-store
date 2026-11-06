import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { IndianRupee, MapPin, MapPinOff, Route, UserRound, Wallet } from "lucide-react"
import { Outlet } from "react-router"
import { api, errorMessage } from "@/areas/delivery/lib/api"
import { useLocationSharing, useSession } from "@/areas/delivery/lib/session"
import type { Rider, Task } from "@/areas/delivery/lib/types"
import { useFeedback } from "@/areas/shared/feedback"
import { cn } from "@/areas/shared/ui"
import { WorkspaceShell, type WorkspaceNavItem } from "@/areas/shared/WorkspaceShell"

const NAV: WorkspaceNavItem[] = [
  { to: "/delivery", label: "Today", icon: Route, end: true },
  { to: "/delivery/cash", label: "Cash", icon: Wallet },
  { to: "/delivery/earnings", label: "Earnings", icon: IndianRupee },
  { to: "/delivery/profile", label: "Profile", icon: UserRound },
]

export function Layout() {
  const { me, refresh } = useSession()
  const feedback = useFeedback()
  const client = useQueryClient()
  const r = me.rider
  const approved = r.status === "approved"
  // Shared with the Today screen's query, so the location follows the real run.
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<{ offers: Task[]; route: Task[] }>("/tasks"), enabled: approved, refetchInterval: 20_000 })
  const delivering = r.online && !!tasks.data?.route.some((t) => t.status === "out_for_delivery")
  const location = useLocationSharing(delivering)
  const availability = useMutation({
    mutationFn: (online: boolean) => api<{ rider: Rider }>("/me/availability", { body: { online } }),
    onSuccess: (d) => {
      feedback.ok(d.rider.online ? "You're online. New deliveries will be offered to you." : "You're offline.")
      refresh()
      // Going online may have brought offers; going offline handed them back.
      void client.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })

  return (
    <WorkspaceShell
      area="Delivery"
      nav={NAV}
      headerStart={
        <div className="min-w-0 leading-tight">
          <p className="truncate text-label font-semibold text-primary">{r.name}</p>
          <p className="hidden truncate text-micro text-muted sm:block">{me.warehouse ? `${me.warehouse.name} · ${me.warehouse.city}` : "No hub assigned yet"}</p>
        </div>
      }
      headerActions={
        approved ? (
          <button
            role="switch"
            aria-checked={r.online}
            aria-label={r.online ? "Online. Go offline" : "Offline. Go online"}
            disabled={availability.isPending}
            onClick={() => availability.mutate(!r.online)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-full border px-3 text-label font-semibold transition-colors sm:h-9",
              r.online ? "border-status-success/30 bg-status-success-bg text-success" : "border-subtle bg-surface-subtle text-muted"
            )}
          >
            <span className={cn("size-2.5 rounded-full", r.online ? "bg-status-success" : "bg-text-faint")} aria-hidden />
            {r.online ? "Online" : "Offline"}
          </button>
        ) : null
      }
      sidebarFooter={
        <div className="rounded-lg border border-subtle bg-surface-subtle px-3 py-2.5">
          <p className="truncate text-label font-semibold text-primary">{r.name}</p>
          <p className="truncate text-micro text-muted">
            <span className="capitalize">{r.vehicle.type}</span>
            {r.vehicle.registration ? ` · ${r.vehicle.registration}` : ""}
          </p>
          <p className="mt-1 truncate text-micro text-muted">{me.warehouse ? `Hub: ${me.warehouse.code}` : "No hub assigned yet"}</p>
        </div>
      }
      strip={
        delivering ? (
          <p
            className={cn(
              "flex items-center justify-center gap-1.5 border-b px-4 py-1.5 text-label font-medium",
              location === "sharing" ? "border-status-info/20 bg-status-info-bg text-info" : "border-status-warning/20 bg-status-warning-bg text-warning"
            )}
          >
            {location === "sharing" ? <MapPin className="size-3.5" aria-hidden /> : <MapPinOff className="size-3.5" aria-hidden />}
            {location === "sharing"
              ? "Sharing your location with your customers while you deliver"
              : location === "denied"
                ? "Location is blocked. Customers won't see where you are."
                : "Waiting for your location…"}
          </p>
        ) : null
      }
    >
      {r.status === "pending" ? (
        <p className="mb-space-md rounded-xl border border-status-info/25 bg-status-info-bg px-4 py-3 text-body text-info">
          Your account is waiting for approval. Add your documents in Profile; your hub verifies them and assigns your zone.
        </p>
      ) : r.status === "suspended" ? (
        <p className="mb-space-md rounded-xl border border-status-danger/25 bg-status-danger-bg px-4 py-3 text-body text-danger">
          Your account is suspended{r.statusReason ? `: ${r.statusReason}` : ""}. Contact your hub.
        </p>
      ) : null}
      <Outlet />
    </WorkspaceShell>
  )
}

