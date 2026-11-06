import { BarChart3, Boxes, ClipboardList, LayoutDashboard, PackageOpen, ShoppingBag, Undo2, Wallet } from "lucide-react"
import { Outlet } from "react-router"
import { useSession } from "@/areas/seller/lib/session"
import { WorkspaceShell } from "@/areas/shared/WorkspaceShell"

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
    <WorkspaceShell
      area="Seller Hub"
      nav={nav}
      mobileNav="tabs"
      headerStart={
        <div className="min-w-0 leading-tight">
          <p className="truncate text-label font-semibold text-primary">{s.displayName}</p>
          <p className="hidden truncate text-micro text-muted sm:block">
            {s.code} · {selfShip ? "You ship orders" : "Everwear ships orders"}
          </p>
        </div>
      }
      sidebarFooter={
        <div className="rounded-lg border border-subtle bg-surface-subtle px-3 py-2.5">
          <p className="truncate text-label font-semibold text-primary">{s.displayName}</p>
          <p className="truncate text-micro text-muted">
            {s.code} · {selfShip ? "You ship orders" : "Everwear ships orders"}
          </p>
        </div>
      }
    >
      {s.status === "suspended" ? (
        <p className="mb-space-md rounded-xl border border-status-danger/25 bg-status-danger-bg px-4 py-3 text-body text-danger">Your account is suspended{s.statusReason ? `: ${s.statusReason}` : ""}. Your listings are off sale. Contact seller support.</p>
      ) : s.status === "rejected" ? (
        <p className="mb-space-md rounded-xl border border-status-danger/25 bg-status-danger-bg px-4 py-3 text-body text-danger">Your application wasn't approved{s.statusReason ? `: ${s.statusReason}` : ""}. Update your details and submit again.</p>
      ) : null}
      <Outlet />
    </WorkspaceShell>
  )
}
