import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useFeedback } from "@/components/feedback"
import { Button, cn, Dialog, Empty, formatTime, Input, Label, Notice, Panel, Spinner } from "@/components/ui"
import { api, errorMessage } from "@/lib/api"
import { money } from "@/lib/session"
import type { Cash, Earnings } from "@/lib/types"

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
  if (cash.isPending) return <Spinner />
  if (cash.isError) return <Notice>{errorMessage(cash.error)}</Notice>
  const c = cash.data
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Cash</h1>
      <Panel>
        <p className="text-sm text-ink-3">Cash in hand</p>
        <p className="text-3xl font-semibold tabular-nums">{money(c.inHand)}</p>
        <p className="mt-1 text-sm text-ink-2">
          From {c.parcels.length} delivered parcel{c.parcels.length === 1 ? "" : "s"}
        </p>
        <Button size="lg" className="mt-4 w-full" disabled={!c.inHand} onClick={() => setOpen(true)}>
          Hand over to the hub
        </Button>
      </Panel>
      {c.parcels.length ? (
        <Panel title="Collected">
          <ul className="divide-y divide-line text-sm">
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
          <p className="text-sm text-ink-3">None yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {c.remittances.map((r) => (
              <li key={r._id} className="py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-mono">{r.code}</span>
                  <span className={cn("font-medium", r.status === "reconciled" ? "text-ok" : r.status === "mismatch" ? "text-bad" : "text-ink-2")}>
                    {r.status === "reconciled" ? "Counted, matches" : r.status === "mismatch" ? "Doesn't match" : "Waiting for count"}
                  </span>
                </div>
                <p className="text-xs text-ink-3">
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
          <p className="text-sm text-ink-2">You collected {money(c.inHand)}. Count the cash you're handing over and enter it.</p>
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
  )
}

const RANGES = { week: 7, month: 30 } as const

export function EarningsScreen() {
  const [range, setRange] = useState<keyof typeof RANGES>("week")
  const from = new Date(Date.now() - RANGES[range] * 86_400_000).toISOString()
  const earnings = useQuery({ queryKey: ["earnings", range], queryFn: () => api<Earnings>("/earnings", { query: { from } }) })
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Earnings</h1>
        <div role="tablist" aria-label="Period" className="flex rounded-control border border-line p-0.5">
          {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn("h-8 rounded-control px-3 text-sm font-medium", range === r ? "bg-accent text-on-accent" : "text-ink-2")}>
              Last {RANGES[r]} days
            </button>
          ))}
        </div>
      </div>
      {earnings.isPending ? (
        <Spinner />
      ) : earnings.isError ? (
        <Notice>{errorMessage(earnings.error)}</Notice>
      ) : earnings.data.deliveries + earnings.data.failedAttempts === 0 ? (
        <Empty title="No earnings in this period">Earnings are booked as you deliver.</Empty>
      ) : (
        <Panel>
          <p className="text-sm text-ink-3">Earned</p>
          <p className="text-3xl font-semibold tabular-nums">{money(earnings.data.amount)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-control bg-panel-muted p-3">
              <dt className="text-ink-3">Delivered</dt>
              <dd className="text-xl font-semibold tabular-nums">{earnings.data.deliveries}</dd>
            </div>
            <div className="rounded-control bg-panel-muted p-3">
              <dt className="text-ink-3">Attempted</dt>
              <dd className="text-xl font-semibold tabular-nums">{earnings.data.failedAttempts}</dd>
            </div>
          </dl>
        </Panel>
      )}
    </div>
  )
}
