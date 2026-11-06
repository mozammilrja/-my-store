import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronRight, Clock, ExternalLink, MapPinned, Navigation, Package, Phone, RefreshCw, Wallet } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { ScanField } from "@/areas/shared/scan-field"
import { cn } from "@/areas/shared/ui"
import { Badge, Button, ContentGrid, EmptyState, ErrorState, PageContainer, PageHeader, SectionCard, SkeletonCard, SkeletonStatsCard, StatsCard } from "@/components/ui"
import { api, errorMessage } from "@/areas/delivery/lib/api"
import { directions, routeDirections } from "@/areas/delivery/lib/maps"
import { money, useSession } from "@/areas/delivery/lib/session"
import type { Cash, Earnings, Task, TaskStatus } from "@/areas/delivery/lib/types"

/*
 * The rider's day, on the admin's dashboard pattern: page header, today's
 * figures, then the work. Every figure comes from the API: offers and the
 * route from /tasks, today's deliveries and failed attempts from /earnings
 * (booked as they happen), cash in hand from /cash. Nothing is estimated.
 */

type Tone = "secondary" | "info" | "warning" | "success" | "destructive" | "vip"

export const STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  unassigned: { label: "Waiting", tone: "secondary" },
  offered: { label: "Offered", tone: "info" },
  assigned: { label: "Collect from hub", tone: "warning" },
  picked_up: { label: "With you", tone: "vip" },
  out_for_delivery: { label: "Out for delivery", tone: "vip" },
  attempt_failed: { label: "Try again", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  rto: { label: "Return to hub", tone: "destructive" },
  returned: { label: "Returned", tone: "secondary" },
  cancelled: { label: "Cancelled", tone: "secondary" },
}

export const StatusChip = ({ status }: { status: TaskStatus }) => (
  <Badge variant={STATUS[status].tone} className="whitespace-nowrap">
    {STATUS[status].label}
  </Badge>
)

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
    <span className={cn("tabular-nums", s < 60 && "text-danger")}>
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>
  )
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
const todayLabel = () => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())

export function Today() {
  const { me } = useSession()
  const feedback = useFeedback()
  const client = useQueryClient()
  const handlers = useTasksActions()
  const approved = me.rider.status === "approved"
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<{ offers: Task[]; route: Task[] }>("/tasks"), enabled: approved, refetchInterval: 20_000 })
  const today = useQuery({ queryKey: ["earnings", "today"], queryFn: () => api<Earnings>("/earnings", { query: { from: startOfToday() } }), enabled: approved, refetchInterval: 60_000 })
  const cash = useQuery({ queryKey: ["cash"], queryFn: () => api<Cash>("/cash"), enabled: approved })
  const accept = useMutation({ mutationFn: (id: string) => api(`/tasks/${id}/accept`, { body: {} }), ...handlers("Accepted. Collect it from the hub.") })
  const decline = useMutation({ mutationFn: (id: string) => api(`/tasks/${id}/decline`, { body: {} }), ...handlers("Declined") })
  const start = useMutation({ mutationFn: (ids: string[]) => api("/tasks/start", { body: { taskIds: ids } }), ...handlers("Out for delivery. Customers can now see their OTP.") })

  const refreshing = tasks.isFetching || today.isFetching || cash.isFetching
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["tasks"] })
    void client.invalidateQueries({ queryKey: ["earnings", "today"] })
    void client.invalidateQueries({ queryKey: ["cash"] })
  }
  const refreshButton = (
    <Button variant="outline" onClick={refresh} disabled={refreshing || !approved} className="tap-target">
      <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
      <span>Refresh</span>
    </Button>
  )

  const header = (
    <PageHeader
      kicker="Delivery"
      title="Delivery overview"
      description={`${todayLabel()} · ${me.warehouse ? `${me.warehouse.name}, ${me.warehouse.city}` : "No hub assigned yet"}`}
      actions={refreshButton}
    />
  )

  if (!approved)
    return (
      <PageContainer>
        {header}
        <EmptyState
          icon="local_shipping"
          title="No deliveries yet"
          description={me.rider.status === "suspended" ? "Your account is suspended, so no deliveries are offered to you." : "You'll see deliveries here once your account is approved. Add your documents in Profile so your hub can check them."}
        />
      </PageContainer>
    )

  if (tasks.isPending)
    return (
      <PageContainer aria-busy="true">
        {header}
        <ContentGrid columns={6} className="grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </ContentGrid>
        <div className="grid gap-space-lg xl:grid-cols-3">
          <SkeletonCard lines={6} className="xl:col-span-2" />
          <SkeletonCard lines={4} />
        </div>
      </PageContainer>
    )

  if (tasks.isError)
    return (
      <PageContainer>
        {header}
        <ErrorState variant="page" error={tasks.error} title="Your deliveries couldn't be loaded" onRetry={() => void tasks.refetch()} />
      </PageContainer>
    )

  const { offers, route } = tasks.data
  const toCollect = route.filter((t) => t.status === "assigned")
  const ready = route.filter((t) => t.status === "picked_up" || t.status === "attempt_failed")
  const outNow = route.filter((t) => t.status === "out_for_delivery")
  const cashDue = route.filter((t) => t.cod && t.cod.collected === null).reduce((n, t) => n + t.cod!.due, 0)
  const stops = route.flatMap((t) => (t.stop ? [t.stop] : []))
  const routeUrl = routeDirections(stops)
  const figure = (q: { isPending: boolean; isError: boolean }, value: number | undefined) => (q.isPending ? "…" : q.isError || value === undefined ? "–" : value)

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
    <PageContainer>
      {header}

      {!me.rider.online ? (
        <p role="status" className="rounded-xl border border-status-info/25 bg-status-info-bg px-4 py-3 text-body text-info">
          You're offline. Go online at the top to receive new deliveries.
        </p>
      ) : null}

      <ContentGrid columns={6} className="grid-cols-2">
        <StatsCard title="Offers waiting" value={offers.length} icon="notifications_active" subtext="Accept before they expire" />
        <StatsCard title="To collect at hub" value={toCollect.length} icon="inventory_2" iconColor="text-warning" subtext="Scan each AWB at pickup" />
        <StatsCard title="With you" value={ready.length} icon="package_2" subtext="Collected, not yet out" />
        <StatsCard title="Out for delivery" value={outNow.length} icon="local_shipping" iconColor="text-info" subtext={outNow.length ? "Customers can see their OTP" : "Start once parcels are with you"} />
        <StatsCard title="Delivered today" value={figure(today, today.data?.deliveries)} icon="task_alt" iconColor="text-success" subtext={today.data ? `${money(today.data.amount)} earned today` : "Booked as you deliver"} />
        <StatsCard title="Failed attempts today" value={figure(today, today.data?.failedAttempts)} icon="error_outline" iconColor="text-danger" subtext="Recorded with a reason" />
      </ContentGrid>

      <div className="grid items-start gap-space-lg xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-space-lg xl:col-span-2">
          {offers.length ? (
            <section aria-label="New offers" className="flex flex-col gap-space-md">
              <h2 className="text-subheading font-semibold text-primary">New offers</h2>
              <div className="grid gap-space-md md:grid-cols-2">
                {offers.map((t) => (
                  <article key={t._id} className="flex flex-col gap-space-md rounded-xl border-2 border-primary bg-surface-container-lowest p-space-md shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-heading text-primary">
                          {t.area.city} {t.area.postalCode}
                        </p>
                        <p className="mt-1 text-body text-secondary">{t.cod ? `Collect ${money(t.cod.due)} cash` : "Prepaid"}</p>
                        <p className="mt-1 font-mono text-meta text-muted">{t.code}</p>
                      </div>
                      <p className="flex shrink-0 items-center gap-1 text-label text-muted">
                        <Clock className="size-4" aria-hidden /> {t.offer ? <Countdown until={t.offer.expiresAt} /> : null}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="lg" className="tap-target" onClick={() => decline.mutate(t._id)} disabled={decline.isPending && decline.variables === t._id}>
                        Decline
                      </Button>
                      <Button size="lg" className="tap-target" onClick={() => accept.mutate(t._id)} disabled={accept.isPending && accept.variables === t._id}>
                        Accept
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <SectionCard
            title="Your route"
            description={route.length ? `${route.length} parcel${route.length === 1 ? "" : "s"}, in the order to deliver them${cashDue ? ` · ${money(cashDue)} cash to collect` : ""}` : "Parcels you've accepted appear here in delivery order."}
            action={
              ready.length ? (
                <Button onClick={() => start.mutate(ready.map((t) => t._id))} disabled={start.isPending} className="tap-target">
                  <Package className="size-4" aria-hidden /> Start delivering {ready.length} parcel{ready.length === 1 ? "" : "s"}
                </Button>
              ) : null
            }
            contentClassName={route.length ? "p-0" : undefined}
          >
            {route.length === 0 ? (
              <EmptyState
                icon="local_shipping"
                title="No deliveries assigned yet"
                description={
                  me.rider.online
                    ? "You're online. New offers appear above as soon as the hub packs an order in your zone; accept one and it joins your route."
                    : "You're offline, so no offers are sent to you. Go online with the switch at the top when you're ready to deliver."
                }
                action={refreshButton}
                className="border-0 bg-transparent"
              />
            ) : (
              <ol className="divide-y divide-subtle">
                <li className="hidden grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-space-md bg-surface-subtle px-space-md py-2 text-caption uppercase tracking-wider text-faint lg:grid" aria-hidden>
                  <span>#</span>
                  <span>Order</span>
                  <span>Deliver to</span>
                  <span>Payment</span>
                  <span>Status</span>
                  <span className="w-24 text-right">Actions</span>
                </li>
                {route.map((t) => (
                  <li key={t._id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-space-md gap-y-2 px-space-md py-space-md lg:grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                    <span className="grid size-8 place-items-center rounded-full bg-surface-container text-label font-semibold tabular-nums text-primary lg:row-auto">{t.sequence}</span>
                    <div className="min-w-0">
                      <p className="font-mono text-label text-primary">{t.code}</p>
                      <p className="text-micro text-muted">Order #{t.displayId}</p>
                    </div>
                    <div className="col-start-2 min-w-0 lg:col-start-auto">
                      <Link to={`/delivery/tasks/${t._id}`} className="group block min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="block truncate text-body font-medium text-primary group-hover:text-accent group-hover:underline">{t.stop?.address1 ?? `${t.area.city} ${t.area.postalCode}`}</span>
                        <span className="block truncate text-meta text-muted">
                          {[t.stop?.name, t.stop?.city ?? t.area.city, t.area.postalCode].filter(Boolean).join(" · ")}
                        </span>
                      </Link>
                    </div>
                    <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:contents">
                    <div className="text-body">
                      {t.cod ? (
                        t.cod.collected === null ? (
                          <span className="font-medium text-warning">COD {money(t.cod.due)}</span>
                        ) : (
                          <span className="text-success">{money(t.cod.collected)} collected</span>
                        )
                      ) : (
                        <span className="text-muted">Prepaid</span>
                      )}
                    </div>
                    <div>
                      <StatusChip status={t.status} />
                      {t.attempts.length ? <p className="mt-1 text-micro text-muted">{t.attempts.length} earlier attempt{t.attempts.length === 1 ? "" : "s"}</p> : null}
                    </div>
                    </div>
                    <div className="col-start-2 flex items-center gap-1 lg:col-start-auto lg:w-24 lg:justify-end">
                      {t.stop?.phone ? (
                        <a href={`tel:+91${t.stop.phone}`} aria-label={`Call ${t.stop.name}`} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-subtle hover:text-primary lg:size-9">
                          <Phone className="size-4" aria-hidden />
                        </a>
                      ) : null}
                      {t.stop ? (
                        <a href={directions(t.stop)} target="_blank" rel="noreferrer" aria-label={`Directions to stop ${t.sequence}`} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-subtle hover:text-primary lg:size-9">
                          <Navigation className="size-4" aria-hidden />
                        </a>
                      ) : null}
                      <Link to={`/delivery/tasks/${t._id}`} aria-label={`Open ${t.code}`} className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-subtle hover:text-primary lg:size-9">
                        <ChevronRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-space-lg">
          {toCollect.length ? (
            <SectionCard title={`Collect from the hub (${toCollect.length})`} description={`At ${me.warehouse?.name ?? "your hub"}, scan each parcel's AWB as the hub hands it to you.`}>
              <ScanField label="Scan the parcel's AWB" placeholder="EWF…" onScan={pickup} autoFocus={false} />
            </SectionCard>
          ) : null}

          <SectionCard
            title="Route"
            description={stops.length ? `${stops.length} stop${stops.length === 1 ? "" : "s"} with addresses` : "Stops get addresses once you collect the parcels."}
            action={
              routeUrl ? (
                <a href={routeUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-subtle bg-surface-container-lowest px-3 text-label font-medium text-primary shadow-xs hover:bg-surface-subtle lg:h-9">
                  <ExternalLink className="size-4" aria-hidden /> Open in Maps
                </a>
              ) : null
            }
          >
            {stops.length ? (
              <ol className="relative flex flex-col gap-space-md">
                {me.warehouse ? (
                  <li className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-container text-faint">
                      <MapPinned className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 text-body">
                      <span className="block font-medium text-primary">{me.warehouse.name}</span>
                      <span className="block truncate text-meta text-muted">Hub · {me.warehouse.city} {me.warehouse.pincode}</span>
                    </span>
                  </li>
                ) : null}
                {route
                  .filter((t) => t.stop)
                  .map((t) => (
                    <li key={t._id} className="flex items-start gap-3">
                      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-micro font-semibold tabular-nums", t.status === "out_for_delivery" ? "bg-primary-container text-on-accent" : "bg-surface-container text-primary")}>{t.sequence}</span>
                      <span className="min-w-0 text-body">
                        <span className="block truncate font-medium text-primary">{t.stop!.address1}</span>
                        <span className="block truncate text-meta text-muted">
                          {t.stop!.name} · {t.stop!.postalCode} · {STATUS[t.status].label}
                        </span>
                      </span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-body text-muted">{route.length ? "Collect your parcels at the hub to see where they go." : "No stops yet."}</p>
            )}
          </SectionCard>

          <SectionCard
            title="Cash"
            description="Cash on delivery you're holding for the hub."
            action={
              <Link to="/delivery/cash" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-subtle bg-surface-container-lowest px-3 text-label font-medium text-primary shadow-xs hover:bg-surface-subtle lg:h-9">
                <Wallet className="size-4" aria-hidden /> Hand in
              </Link>
            }
          >
            <p className="text-kpi tabular-nums text-primary">{cash.isPending ? "…" : cash.isError ? "–" : money(cash.data.inHand)}</p>
            <p className="mt-1 text-meta text-muted">{cash.data ? `${cash.data.parcels.length} parcel${cash.data.parcels.length === 1 ? "" : "s"} not handed in yet` : cash.isError ? errorMessage(cash.error) : ""}</p>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  )
}
