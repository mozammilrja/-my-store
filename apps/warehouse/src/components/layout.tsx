import { ClipboardList, LogOut, Moon, PackageSearch, Truck, Undo2 } from "lucide-react"
import { NavLink, Outlet } from "react-router"
import { toggleTheme, useSession } from "@/lib/session"
import { cn, Select } from "./ui"

const NAV = [
  { to: "/", label: "Orders", icon: ClipboardList, end: true },
  { to: "/dispatch", label: "Dispatch", icon: Truck },
  { to: "/stock", label: "Stock", icon: PackageSearch },
  { to: "/returns", label: "Returns", icon: Undo2 },
] as const

export function Layout() {
  const { me, warehouseId, setWarehouseId, signOut } = useSession()
  const current = me.warehouses.find((w) => w._id === warehouseId)
  return (
    <div className="min-h-dvh pb-20 md:pb-0 md:pl-56">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-panel focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-panel md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <img src="/favicon.svg" alt="" className="size-7" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">Everwear</p>
            <p className="text-xs text-ink-3">Warehouse</p>
          </div>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={"end" in n}
              className={({ isActive }) => cn("flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium", isActive ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-panel-muted")}
            >
              <n.icon className="size-4" aria-hidden /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3 text-xs text-ink-3">
          <p className="truncate font-medium text-ink-2">{me.user.name}</p>
          <p className="capitalize">{me.user.role}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-panel/95 px-4 backdrop-blur">
        <img src="/favicon.svg" alt="" className="size-7 md:hidden" />
        {me.warehouses.length > 1 ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Warehouse</span>
            <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-9 w-auto font-medium">
              {me.warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.code} · {w.city}
                </option>
              ))}
            </Select>
          </label>
        ) : (
          <p className="text-sm font-semibold">
            {current?.code} <span className="font-normal text-ink-3">· {current?.city}</span>
          </p>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={toggleTheme} className="grid size-10 place-items-center rounded-control text-ink-2 hover:bg-panel-muted" aria-label="Switch light or dark theme">
            <Moon className="size-4" aria-hidden />
          </button>
          <button onClick={signOut} aria-label="Sign out" className="flex h-10 items-center gap-2 rounded-control px-3 text-sm text-ink-2 hover:bg-panel-muted">
            <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={"end" in n} className={({ isActive }) => cn("flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium", isActive ? "text-accent" : "text-ink-3")}>
            <n.icon className="size-5" aria-hidden />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
