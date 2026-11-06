import { Bell, BellOff, ClipboardList, PackageSearch, Truck, Undo2 } from "lucide-react"
import { useEffect, useState } from "react"
import { disablePush, enablePush, PUSH_NOTE, pushState, type PushState } from "@/areas/warehouse/lib/push"
import { useFeedback } from "@/areas/shared/feedback"
import { Outlet } from "react-router"
import { useSession } from "@/areas/warehouse/lib/session"
import { WorkspaceShell, type WorkspaceNavItem } from "@/areas/shared/WorkspaceShell"
import { Select } from "./ui"

const NAV: WorkspaceNavItem[] = [
  { to: "/warehouse", label: "Orders", icon: ClipboardList, end: true },
  { to: "/warehouse/dispatch", label: "Dispatch", icon: Truck },
  { to: "/warehouse/stock", label: "Stock", icon: PackageSearch },
  { to: "/warehouse/returns", label: "Returns", icon: Undo2 },
]

export function Layout() {
  const { me, warehouseId, setWarehouseId } = useSession()
  const current = me.warehouses.find((w) => w._id === warehouseId)
  return (
    <WorkspaceShell
      area="Warehouse"
      nav={NAV}
      headerStart={
        me.warehouses.length > 1 ? (
          <label className="flex min-w-0 shrink items-center gap-2">
            <span className="sr-only">Warehouse</span>
            <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-9 w-auto min-w-0 max-w-full truncate font-medium">
              {me.warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.code} · {w.city}
                </option>
              ))}
            </Select>
          </label>
        ) : (
          <p className="truncate text-label font-semibold text-primary">
            {current?.code} <span className="font-normal text-muted">· {current?.city}</span>
          </p>
        )
      }
      headerActions={<PushButton />}
      sidebarFooter={
        <div className="rounded-lg border border-subtle bg-surface-subtle px-3 py-2.5">
          <p className="truncate text-label font-semibold text-primary">{me.user.name}</p>
          <p className="truncate text-micro capitalize text-muted">{me.user.role}</p>
        </div>
      }
    >
      <Outlet />
    </WorkspaceShell>
  )
}

/** New orders for this warehouse as device notifications. Hidden where the browser can't show them. */
function PushButton() {
  const feedback = useFeedback()
  const [state, setState] = useState<PushState | "checking">("checking")
  useEffect(() => {
    pushState().then(setState, () => setState("unavailable"))
  }, [])
  if (state !== "on" && state !== "off" && state !== "denied") return null
  const toggle = async () => {
    try {
      const next = state === "on" ? await disablePush() : await enablePush()
      setState(next)
      if (next === "on") feedback.ok("New orders will notify this device.")
      else if (next === "denied") feedback.bad(PUSH_NOTE.denied)
      else feedback.ok("Notifications off on this device.")
    } catch (e) {
      feedback.bad((e as Error).message)
    }
  }
  const on = state === "on"
  return (
    <button onClick={toggle} disabled={state === "denied"} className="grid size-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-primary disabled:opacity-50 sm:size-9" aria-label={on ? "Turn off new-order notifications" : state === "denied" ? PUSH_NOTE.denied : "Turn on new-order notifications"} aria-pressed={on} title={on ? "New-order notifications on" : PUSH_NOTE[state]}>
      {on ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}
    </button>
  )
}
