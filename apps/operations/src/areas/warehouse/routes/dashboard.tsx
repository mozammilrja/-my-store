import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Clock } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { ScanField } from "@/areas/shared/scan-field"
import { cn, Empty, humanAge, Notice, PAGE, PageTitle, Spinner, StatusBadge } from "@/areas/warehouse/components/ui"
import { api, errorMessage } from "@/areas/warehouse/lib/api"
import { useSession } from "@/areas/warehouse/lib/session"
import type { Fulfilment, FulfilmentStatus, Summary } from "@/areas/warehouse/lib/types"

/** Floor stages, each a group of fulfilment statuses, in the order work flows. */
const STAGES: { key: string; label: string; empty: string; statuses: FulfilmentStatus[] }[] = [
  { key: "incoming", label: "Incoming", empty: "No new orders", statuses: ["assigned"] },
  { key: "pick", label: "Pick", empty: "Nothing to pick", statuses: ["picking_pending", "picking"] },
  { key: "inspect", label: "Inspect", empty: "Nothing to inspect", statuses: ["picked"] },
  { key: "pack", label: "Pack", empty: "Nothing to pack", statuses: ["qc_passed"] },
  { key: "label", label: "Label", empty: "Nothing to label", statuses: ["packed", "label_generated"] },
  { key: "dispatch", label: "Dispatch", empty: "Nothing waiting for the courier", statuses: ["ready_to_dispatch", "manifested", "handed_over"] },
]

// The queue refreshes on its own so new orders appear without a reload.
const POLL_MS = 15_000

export function Dashboard() {
  const { warehouseId } = useSession()
  const feedback = useFeedback()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const stage = STAGES.find((s) => s.key === params.get("stage")) ?? STAGES[0]!

  const summary = useQuery({ queryKey: ["summary", warehouseId], queryFn: () => api<Summary>("/summary", { query: { warehouseId } }), refetchInterval: POLL_MS })
  const queue = useQuery({
    queryKey: ["queue", warehouseId, stage.key],
    queryFn: () => api<{ fulfilments: Fulfilment[] }>(`/fulfilments?${new URLSearchParams([["warehouseId", warehouseId], ...stage.statuses.map((s) => ["status", s])])}`),
    refetchInterval: POLL_MS,
  })

  const count = (s: (typeof STAGES)[number]) => s.statuses.reduce((n, st) => n + (summary.data?.byStatus[st] ?? 0), 0)

  const openSlip = async (code: string) => {
    try {
      const { fulfilment } = await api<{ fulfilment: Fulfilment }>(`/scan/fulfilment/${encodeURIComponent(code)}`)
      navigate(`/warehouse/fulfilments/${fulfilment._id}`)
    } catch (e) {
      feedback.bad(errorMessage(e))
    }
  }

  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle kicker="Warehouse">Orders</PageTitle>
          <p className="text-body text-secondary">
            {summary.data ? (
              <>
                {summary.data.dispatchedToday} dispatched today
                {summary.data.oldestWaitingSince ? <> · oldest waiting {humanAge(summary.data.oldestWaitingSince)}</> : null}
                {summary.data.damagedUnits ? <> · {summary.data.damagedUnits} damaged unit{summary.data.damagedUnits === 1 ? "" : "s"} on hold</> : null}
              </>
            ) : (
              " "
            )}
          </p>
        </div>
      </div>

      <ScanField label="Scan a pick slip to open its order" placeholder="FUL-1042-1" onScan={openSlip} />

      {summary.isError ? <Notice>{errorMessage(summary.error)}</Notice> : null}

      <div role="tablist" aria-label="Stage" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STAGES.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={s.key === stage.key}
            onClick={() => setParams({ stage: s.key }, { replace: true })}
            className={cn(
              "rounded-xl border p-space-md text-left shadow-xs transition-colors",
              s.key === stage.key ? "border-primary bg-primary-fixed" : "border-subtle bg-surface-container-lowest hover:border-strong hover:bg-surface-subtle"
            )}
          >
            <span className={cn("block text-kpi tabular-nums", s.key === stage.key ? "text-accent" : "text-primary")}>{summary.data ? count(s) : "–"}</span>
            <span className="text-label text-muted">{s.label}</span>
          </button>
        ))}
      </div>

      <section aria-label={`${stage.label} queue`}>
        {queue.isPending ? (
          <Spinner />
        ) : queue.isError ? (
          <Notice>{errorMessage(queue.error)}</Notice>
        ) : queue.data.fulfilments.length === 0 ? (
          <Empty title={stage.empty}>New work appears here automatically.</Empty>
        ) : (
          <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface-container-lowest">
            {queue.data.fulfilments.map((f) => (
              <li key={f._id}>
                <Link to={`/warehouse/fulfilments/${f._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-subtle">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-body font-semibold">{f.code}</span>
                      <StatusBadge status={f.status} />
                      {f.paymentMethod === "cod" ? <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-meta font-medium text-warning">COD</span> : null}
                    </div>
                    <p className="mt-1 truncate text-body text-secondary">
                      {f.lines.reduce((n, l) => n + l.quantity, 0)} unit{f.lines.reduce((n, l) => n + l.quantity, 0) === 1 ? "" : "s"} · {f.lines.map((l) => `${l.productTitle} (${l.variantTitle})`).join(", ")}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-meta text-muted">
                      <Clock className="size-3" aria-hidden /> {humanAge(f.createdAt)} · to {f.destination.city} {f.destination.postalCode}
                      {f.carrier ? <> · {f.carrier}</> : null}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
