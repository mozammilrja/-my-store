import { BarChart3, Boxes, ClipboardList, LayoutDashboard, Moon, PackageOpen, ShoppingBag, Undo2, Wallet } from "lucide-react"
import { NavLink, Outlet } from "react-router"
import { toggleTheme, useSession } from "@/areas/seller/lib/session"
import { cn } from "@/areas/shared/ui"
import { Breadcrumbs } from "@/portal/Breadcrumbs"
import { PortalMenu } from "@/portal/PortalMenu"

export function Layout() {
  const { me, approved, selfShip } = useSession()
  const s = me.seller
  const nav = [
    { to: "/seller", label: "Overview", icon: LayoutDashboard, end: true, show: true },
    { to: "/seller/listings", label: "Listings", icon: ShoppingBag, show: true },
    { to: "/seller/stock", label: selfShip ? "Stock" : "Send stock", icon: Boxes, show: approved },
    { to: "/seller/orders", label: "Orders", icon: ClipboardList, show: approved && selfShip },
    { to: "/seller/sales", label: "Sales", icon: PackageOpen, show: approved },
    { to: "/seller/returns", label: "Returns", icon: Undo2, show: approved },
    { to: "/seller/payments", label: "Payments", icon: Wallet, show: approved },
    { to: "/seller/reports", label: "Performance", icon: BarChart3, show: approved },
  ].filter((n) => n.show)

  return (
    <div className="min-h-dvh md:pl-60">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-panel focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-panel md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <img src="/favicon.svg" alt="" className="size-7" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Everwear</p>
            <p className="text-xs text-ink-3">Seller Hub</p>
          </div>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 p-3">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={"end" in n} className={({ isActive }) => cn("flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium", isActive ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-panel-muted")}>
              <n.icon className="size-4" aria-hidden /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3 text-xs text-ink-3">
          <p className="truncate font-medium text-ink-2">{s.displayName}</p>
          <p>
            {s.code} · {selfShip ? "You ship orders" : "Everwear ships orders"}
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-panel/95 px-4 backdrop-blur">
        <img src="/favicon.svg" alt="" className="size-7 md:hidden" />
        <p className="truncate text-sm font-semibold md:hidden">{s.displayName}</p>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleTheme} className="grid size-10 place-items-center rounded-control text-ink-2 hover:bg-panel-muted" aria-label="Switch light or dark theme">
            <Moon className="size-4" aria-hidden />
          </button>
          <PortalMenu />
        </div>
      </header>

      <nav aria-label="Sections" className="flex gap-1 overflow-x-auto border-b border-line bg-panel px-2 md:hidden">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={"end" in n} className={({ isActive }) => cn("flex h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-medium", isActive ? "border-b-2 border-accent text-accent" : "text-ink-3")}>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <Breadcrumbs className="mb-4" />
        {s.status === "suspended" ? (
          <p className="mb-5 rounded-panel border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">Your account is suspended{s.statusReason ? `: ${s.statusReason}` : ""}. Your listings are off sale. Contact seller support.</p>
        ) : s.status === "rejected" ? (
          <p className="mb-5 rounded-panel border border-bad/30 bg-bad-bg px-4 py-3 text-sm text-bad">Your application wasn't approved{s.statusReason ? `: ${s.statusReason}` : ""}. Update your details and submit again.</p>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}
