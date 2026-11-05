import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronRight, Clock, Package } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { ScanField } from "@/areas/shared/scan-field"
import { Button, cn, Empty, Notice, Panel, Spinner } from "@/areas/shared/ui"
import { api, errorMessage } from "@/areas/delivery/lib/api"
import { money, useSession } from "@/areas/delivery/lib/session"
import type { Task, TaskStatus } from "@/areas/delivery/lib/types"

export const STATUS: Record<TaskStatus, { label: string; tone: string }> = {
  unassigned: { label: "Waiting", tone: "bg-panel-strong text-ink-2" },
  offered: { label: "Offered", tone: "bg-info-bg text-area-info" },
  assigned: { label: "Collect from hub", tone: "bg-warn-bg text-warn" },
  picked_up: { label: "With you", tone: "bg-accent-soft text-accent" },
  out_for_delivery: { label: "Out for delivery", tone: "bg-accent-soft text-accent" },
  attempt_failed: { label: "Try again", tone: "bg-warn-bg text-warn" },
  delivered: { label: "Delivered", tone: "bg-ok-bg text-ok" },
  rto: { label: "Return to hub", tone: "bg-bad-bg text-bad" },
  returned: { label: "Returned", tone: "bg-panel-strong text-ink-2" },
  cancelled: { label: "Cancelled", tone: "bg-panel-strong text-ink-2" },
}

export const StatusChip = ({ status }: { status: TaskStatus }) => <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", STATUS[status].tone)}>{STATUS[status].label}</span>

function useTasksActions() {
  const client = useQueryClient()
  const feedback = useFeedback()
  return (ok: string) => ({
    onSuccess: () => {
      feedback.ok(ok)
      void client.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (e: unknown) => feedback.bad(errorMessage(e)),
  })
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const s = Math.max(0, Math.round((new Date(until).getTime() - now) / 1000))
  return (
    <span className={cn("tabular-nums", s < 60 && "text-bad")}>
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  )
}

export function Today() {
  const { me } = useSession()
  const feedback = useFeedback()
  const client = useQueryClient()
  const handlers = useTasksActions()
  const approved = me.rider.status === "approved"
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<{ offers: Task[]; route: Task[] }>("/tasks"), enabled: approved, refetchInterval: 20_000 })
  const accept = useMutation({ mutationFn: (id: string) => api(`/tasks/${id}/accept`, { body: {} }), ...handlers("Accepted. Collect it from the hub.") })
  const decline = useMutation({ mutationFn: (id: string) => api(`/tasks/${id}/decline`, { body: {} }), ...handlers("Declined") })
  const start = useMutation({ mutationFn: (ids: string[]) => api("/tasks/start", { body: { taskIds: ids } }), ...handlers("Out for delivery. Customers can now see their OTP.") })

  if (!approved) return <Empty title="No deliveries yet">You'll see deliveries here once your account is approved.</Empty>
  if (tasks.isPending) return <Spinner />
  if (tasks.isError) return <Notice>{errorMessage(tasks.error)}</Notice>
  const { offers, route } = tasks.data
  const toCollect = route.filter((t) => t.status === "assigned")
  const ready = route.filter((t) => t.status === "picked_up" || t.status === "attempt_failed")
  const cashDue = route.filter((t) => t.cod && t.cod.collected === null).reduce((n, t) => n + t.cod!.due, 0)

  const pickup = async (awb: string) => {
    try {
      await api("/pickup", { body: { awb } })
      feedback.ok(`${awb.toUpperCase()} collected`)
      void client.invalidateQueries({ queryKey: ["tasks"] })
    } catch (e) {
      feedback.bad(errorMessage(e))
    }
  }

  return (
    <div className="space-y-5">
      {!me.rider.online ? <Notice tone="info">You're offline. Go online at the top to receive new deliveries.</Notice> : null}

      {offers.length ? (
        <section aria-label="New offers" className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-2">New offers</h2>
          {offers.map((t) => (
            <article key={t._id} className="rounded-panel border-2 border-accent bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {t.area.city} {t.area.postalCode}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{t.cod ? `Collect ${money(t.cod.due)} cash` : "Prepaid"}</p>
                </div>
                <p className="flex items-center gap-1 text-sm font-medium text-ink-2">
                  <Clock className="size-4" aria-hidden /> {t.offer ? <Countdown until={t.offer.expiresAt} /> : null}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="lg" onClick={() => decline.mutate(t._id)} busy={decline.isPending && decline.variables === t._id}>
                  Decline
                </Button>
                <Button size="lg" onClick={() => accept.mutate(t._id)} busy={accept.isPending && accept.variables === t._id}>
                  Accept
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {toCollect.length ? (
        <Panel title={`Collect from the hub (${toCollect.length})`}>
          <p className="mb-3 text-sm text-ink-2">
            At {me.warehouse?.name ?? "your hub"}, scan each parcel's AWB as the hub hands it to you.
          </p>
          <ScanField label="Scan the parcel's AWB" placeholder="EWF…" onScan={pickup} autoFocus={false} />
        </Panel>
      ) : null}

      {ready.length ? (
        <Button size="lg" className="w-full" busy={start.isPending} onClick={() => start.mutate(ready.map((t) => t._id))}>
          <Package className="size-5" aria-hidden /> Start delivering {ready.length} parcel{ready.length === 1 ? "" : "s"}
        </Button>
      ) : null}

      <section aria-label="Your route" className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-2">Your route</h2>
          {cashDue ? <p className="text-sm text-ink-2">Cash to collect: {money(cashDue)}</p> : null}
        </div>
        {route.length === 0 ? (
          <Empty title="No deliveries on your route">{me.rider.online ? "New offers appear here as orders are packed." : null}</Empty>
        ) : (
          <ol className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
            {route.map((t) => (
              <li key={t._id}>
                <Link to={`/delivery/tasks/${t._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-panel-muted">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-panel-strong text-sm font-semibold tabular-nums">{t.sequence}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={t.status} />
                      {t.cod && t.cod.collected === null ? <span className="text-xs font-medium text-warn">COD {money(t.cod.due)}</span> : null}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{t.stop?.address1 ?? `${t.area.city} ${t.area.postalCode}`}</p>
                    <p className="text-xs text-ink-3">
                      {t.stop?.name} · {t.area.postalCode} · <span className="font-mono">{t.code}</span>
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
