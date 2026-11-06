import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useFeedback } from "@/areas/shared/feedback"
import { Button, cn, Dialog, Empty, formatTime, Input, Label, Notice, Panel, Spinner } from "@/areas/shared/ui"
import { api, errorMessage } from "@/areas/delivery/lib/api"
import { money } from "@/areas/delivery/lib/session"
import type { Cash, Earnings } from "@/areas/delivery/lib/types"
import { ErrorState, PageContainer, PageHeader } from "@/components/ui"

/** Cash collected on deliveries and not yet handed to the hub, and the handovers made. */
export function CashScreen() {
  const feedback = useFeedback()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [declared, setDeclared] = useState("")
  const cash = useQuery({ queryKey: ["cash"], queryFn: () => api<Cash>("/cash") })
  const remit = useMutation({
    mutationFn: () => api("/cash/remit", { body: { declared: Math.round(Number(declared) * 100) } }),
    onSuccess: () => {
      feedback.ok("Handover recorded. Finance will count it.")
      setOpen(false)
      void client.invalidateQueries({ queryKey: ["cash"] })
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const header = <PageHeader kicker="Delivery" title="Cash" description="Cash on delivery you've collected, and your handovers to the hub." />
  if (cash.isPending)
    return (
      <PageContainer>
        {header}
        <Spinner />
      </PageContainer>
    )
  if (cash.isError)
    return (
      <PageContainer>
        {header}
        <ErrorState variant="page" error={cash.error} title="Your cash couldn't be loaded" onRetry={() => void cash.refetch()} />
      </PageContainer>
    )
  const c = cash.data
  return (
    <PageContainer>
      {header}
      <div className="grid items-start gap-space-lg lg:grid-cols-3">
      <Panel>
        <p className="text-label text-muted">Cash in hand</p>
        <p className="mt-1.5 text-kpi tabular-nums text-primary">{money(c.inHand)}</p>
        <p className="mt-1 text-meta text-muted">
          From {c.parcels.length} delivered parcel{c.parcels.length === 1 ? "" : "s"}
        </p>
        <Button size="lg" className="mt-4 w-full" disabled={!c.inHand} onClick={() => setOpen(true)}>
          Hand over to the hub
        </Button>
      </Panel>
      {c.parcels.length ? (
        <Panel title="Collected">
          <ul className="divide-y divide-subtle text-body">
            {c.parcels.map((p) => (
              <li key={p.code} className="flex justify-between py-2">
                <span className="font-mono">{p.code}</span>
                <span className="tabular-nums">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel title="Handovers">
        {c.remittances.length === 0 ? (
          <p className="text-body text-secondary">None yet.</p>
        ) : (
          <ul className="divide-y divide-subtle text-body">
            {c.remittances.map((r) => (
              <li key={r._id} className="py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-mono">{r.code}</span>
                  <span className={cn("font-medium", r.status === "reconciled" ? "text-success" : r.status === "mismatch" ? "text-danger" : "text-secondary")}>
                    {r.status === "reconciled" ? "Counted, matches" : r.status === "mismatch" ? "Doesn't match" : "Waiting for count"}
                  </span>
                </div>
                <p className="text-meta text-muted">
                  {formatTime(r.submittedAt)} · due {money(r.expected)} · you handed {money(r.declared)}
                  {r.counted !== undefined ? <> · counted {money(r.counted)}</> : null}
                  {r.note ? <> · {r.note}</> : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Dialog open={open} onClose={() => setOpen(false)} title="Hand over cash">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            remit.mutate()
          }}
        >
          <p className="text-body text-secondary">You collected {money(c.inHand)}. Count the cash you're handing over and enter it.</p>
          <div>
            <Label htmlFor="declared">Amount handed over (₹)</Label>
            <Input id="declared" type="number" inputMode="decimal" min={0} step="0.01" required value={declared} onChange={(e) => setDeclared(e.target.value)} />
          </div>
          {declared && Math.round(Number(declared) * 100) !== c.inHand ? <Notice tone="warn">That's different from what you collected. Finance will flag the difference.</Notice> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" busy={remit.isPending}>
              Record handover
            </Button>
          </div>
        </form>
      </Dialog>
      </div>
    </PageContainer>
  )
}

const RANGES = { week: 7, month: 30 } as const

export function EarningsScreen() {
  const [range, setRange] = useState<keyof typeof RANGES>("week")
  const from = new Date(Date.now() - RANGES[range] * 86_400_000).toISOString()
  const earnings = useQuery({ queryKey: ["earnings", range], queryFn: () => api<Earnings>("/earnings", { query: { from } }) })
  return (
    <PageContainer>
      <PageHeader
        kicker="Delivery"
        title="Earnings"
        description="What you've earned, booked as each delivery and attempt happens."
        actions={
          <div role="tablist" aria-label="Period" className="flex rounded-lg border border-subtle bg-surface-container-lowest p-0.5 shadow-xs">
            {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
              <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn("h-11 rounded-md px-3 text-label font-medium sm:h-8", range === r ? "bg-primary-fixed text-on-primary-fixed" : "text-muted hover:text-primary")}>
                Last {RANGES[r]} days
              </button>
            ))}
          </div>
        }
      />
      {earnings.isPending ? (
        <Spinner />
      ) : earnings.isError ? (
        <ErrorState variant="page" error={earnings.error} title="Your earnings couldn't be loaded" onRetry={() => void earnings.refetch()} />
      ) : earnings.data.deliveries + earnings.data.failedAttempts === 0 ? (
        <Empty title="No earnings in this period">Earnings are booked as you deliver.</Empty>
      ) : (
        <div className="grid gap-space-md sm:grid-cols-3">
          <div className="flex min-h-[7.5rem] flex-col justify-center rounded-xl border border-subtle bg-surface-container-lowest p-space-md shadow-xs">
            <p className="text-label text-muted">Earned</p>
            <p className="text-kpi tabular-nums text-primary">{money(earnings.data.amount)}</p>
          </div>
          <dl className="contents">
            <div className="flex min-h-[7.5rem] flex-col justify-center rounded-xl border border-subtle bg-surface-container-lowest p-space-md shadow-xs">
              <dt className="text-label text-muted">Delivered</dt>
              <dd className="text-kpi tabular-nums text-primary">{earnings.data.deliveries}</dd>
            </div>
            <div className="flex min-h-[7.5rem] flex-col justify-center rounded-xl border border-subtle bg-surface-container-lowest p-space-md shadow-xs">
              <dt className="text-label text-muted">Attempted</dt>
              <dd className="text-kpi tabular-nums text-primary">{earnings.data.failedAttempts}</dd>
            </div>
          </dl>
        </div>
      )}
    </PageContainer>
  )
}
