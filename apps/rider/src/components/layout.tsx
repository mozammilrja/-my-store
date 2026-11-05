import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { IndianRupee, MapPin, MapPinOff, Moon, Route, UserRound, Wallet } from "lucide-react"
import { NavLink, Outlet } from "react-router"
import { api, errorMessage } from "@/lib/api"
import { toggleTheme, useLocationSharing, useSession } from "@/lib/session"
import type { Rider, Task } from "@/lib/types"
import { useFeedback } from "./feedback"
import { cn } from "./ui"

const NAV = [
  { to: "/", label: "Today", icon: Route, end: true },
  { to: "/cash", label: "Cash", icon: Wallet },
  { to: "/earnings", label: "Earnings", icon: IndianRupee },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const

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
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <img src="/favicon.svg" alt="" className="size-7" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</p>
          <button onClick={toggleTheme} className="grid size-10 place-items-center rounded-control text-ink-2 hover:bg-panel-muted" aria-label="Switch light or dark theme">
            <Moon className="size-4" aria-hidden />
          </button>
          {approved ? (
            <button
              role="switch"
              aria-checked={r.online}
              aria-label={r.online ? "Online. Go offline" : "Offline. Go online"}
              disabled={availability.isPending}
              onClick={() => availability.mutate(!r.online)}
              className={cn("flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors", r.online ? "border-ok/40 bg-ok-bg text-ok" : "border-line bg-panel-muted text-ink-2")}
            >
              <span className={cn("size-2.5 rounded-full", r.online ? "bg-ok" : "bg-ink-3")} aria-hidden />
              {r.online ? "Online" : "Offline"}
            </button>
          ) : null}
        </div>
        {delivering ? (
          <p className={cn("flex items-center justify-center gap-1.5 py-1 text-xs font-medium", location === "sharing" ? "bg-info-bg text-info" : "bg-warn-bg text-warn")}>
            {location === "sharing" ? <MapPin className="size-3.5" aria-hidden /> : <MapPinOff className="size-3.5" aria-hidden />}
            {location === "sharing"
              ? "Sharing your location with your customers while you deliver"
              : location === "denied"
                ? "Location is blocked. Customers won't see where you are."
                : "Waiting for your location…"}
          </p>
        ) : null}
      </header>

      <main id="main" className="mx-auto max-w-xl px-4 py-5">
        {r.status === "pending" ? (
          <p className="mb-4 rounded-panel border border-info/30 bg-info-bg px-4 py-3 text-sm text-info">
            Your account is waiting for approval. Add your documents in Profile; your hub verifies them and assigns your zone.
          </p>
        ) : r.status === "suspended" ? (
          <p className="mb-4 rounded-panel border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">Your account is suspended{r.statusReason ? `: ${r.statusReason}` : ""}. Contact your hub.</p>
        ) : null}
        <Outlet />
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={"end" in n} className={({ isActive }) => cn("flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium", isActive ? "text-accent" : "text-ink-3")}>
              <n.icon className="size-5" aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

