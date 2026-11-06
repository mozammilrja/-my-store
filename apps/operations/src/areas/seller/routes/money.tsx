import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { cn, Empty, Notice, PAGE, PageTitle, Panel, Spinner } from "@/areas/shared/ui"
import { api, errorMessage } from "@/areas/seller/lib/api"
import { day, money } from "@/areas/seller/lib/session"
import type { Balance, LedgerEntry, Performance, Settlement } from "@/areas/seller/lib/types"

const KIND: Record<string, string> = {
  sale: "Sale",
  commission: "Commission",
  commission_gst: "GST on commission",
  fulfilment_fee: "Fulfilment fee",
  fulfilment_fee_gst: "GST on fulfilment fee",
  tcs: "TCS (GST s.52)",
  tds: "TDS (IT s.194-O)",
}

export function Payments() {
  const balance = useQuery({ queryKey: ["balance"], queryFn: () => api<Balance>("/balance") })
  const settlements = useQuery({ queryKey: ["settlements"], queryFn: () => api<{ settlements: Settlement[] }>("/settlements") })
  const ledger = useQuery({ queryKey: ["ledger"], queryFn: () => api<{ entries: LedgerEntry[] }>("/ledger") })
  return (
    <div className={PAGE}>
      <PageTitle kicker="Seller Hub">Payments</PageTitle>
      {balance.data ? (
        <div className="grid gap-space-md sm:grid-cols-3">
          {[
            ["Payable now", balance.data.payableNow, "In the next settlement"],
            ["Waiting", balance.data.waiting, "Return window still open, or the order not yet paid"],
            ["Paid out", balance.data.paidOut, "Total settled to your bank"],
          ].map(([label, value, note]) => (
            <div key={label as string} className="min-h-[7.5rem] rounded-xl border border-subtle bg-surface-container-lowest p-space-md shadow-xs">
              <p className="text-label text-muted">{label}</p>
              <p className="mt-1.5 text-kpi tabular-nums text-primary">{money(value as number)}</p>
              <p className="mt-1 text-micro text-muted">{note}</p>
            </div>
          ))}
        </div>
      ) : null}
      <Panel title="Settlements">
        {settlements.isPending ? (
          <Spinner />
        ) : !settlements.data?.settlements.length ? (
          <p className="text-body text-secondary">None yet. Sales become payable once their return window closes.</p>
        ) : (
          <ul className="divide-y divide-subtle text-body">
            {settlements.data.settlements.map((s) => (
              <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <span className="font-mono font-semibold">{s.code}</span> · {day(s.createdAt)}
                  <span className="block text-meta text-muted">
                    Sales {money(s.totals.sale ?? 0)} · fees {money(Object.entries(s.totals).filter(([k]) => k !== "sale").reduce((n, [, v]) => n + v, 0))}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{money(s.net)}</span>
                  <span className={cn("text-meta", s.status === "paid" ? "text-success" : "text-muted")}>{s.status === "paid" ? `Paid ${day(s.payout!.paidAt)} · UTR ${s.payout!.utr}` : "Being paid"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Ledger (last 30 days)">
        {ledger.isPending ? (
          <Spinner />
        ) : ledger.isError ? (
          <Notice>{errorMessage(ledger.error)}</Notice>
        ) : !ledger.data.entries.length ? (
          <Empty title="No entries yet">Entries appear when your items are delivered.</Empty>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <Table className="w-full min-w-[40rem] text-body">
              <TableHeader className="text-left text-meta text-muted">
                <TableRow>
                  <TableHead className="px-4 pb-2 font-medium">Date</TableHead>
                  <TableHead className="px-2 pb-2 font-medium">Order</TableHead>
                  <TableHead className="px-2 pb-2 font-medium">Entry</TableHead>
                  <TableHead className="px-2 pb-2 text-right font-medium">Amount</TableHead>
                  <TableHead className="px-4 pb-2 font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-subtle">
                {ledger.data.entries.map((e) => (
                  <TableRow key={e._id}>
                    <TableCell className="px-4 py-2 whitespace-nowrap">{day(e.createdAt)}</TableCell>
                    <TableCell className="px-2 py-2">#{e.displayId}</TableCell>
                    <TableCell className="px-2 py-2">
                      {KIND[e.kind] ?? e.kind}
                      {e.reversal ? " (refund)" : ""}
                      {e.note ? <span className="block text-meta text-muted">{e.note}</span> : null}
                    </TableCell>
                    <TableCell className={cn("px-2 py-2 text-right tabular-nums", e.amount < 0 ? "text-danger" : "text-success")}>{money(e.amount)}</TableCell>
                    <TableCell className="px-4 py-2 text-meta text-muted">{e.status === "settled" ? "Settled" : `Payable from ${day(e.payableFrom)}`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  )
}

const PERIODS = { "30": 30, "90": 90 } as const

export function Reports() {
  const [days, setDays] = useState<keyof typeof PERIODS>("30")
  const from = new Date(Date.now() - PERIODS[days] * 86_400_000).toISOString()
  const perf = useQuery({ queryKey: ["performance", days], queryFn: () => api<Performance>("/performance", { query: { from } }) })
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 1000) / 10}%` : "–")
  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle kicker="Seller Hub">Performance</PageTitle>
        <div role="tablist" aria-label="Period" className="flex rounded-lg border border-subtle p-0.5">
          {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
            <button key={k} role="tab" aria-selected={days === k} onClick={() => setDays(k)} className={cn("h-11 rounded-lg px-3 text-body font-medium sm:h-8", days === k ? "bg-accent text-on-accent" : "text-secondary")}>
              Last {k} days
            </button>
          ))}
        </div>
      </div>
      {perf.isPending ? (
        <Spinner />
      ) : perf.isError ? (
        <Notice>{errorMessage(perf.error)}</Notice>
      ) : (
        <>
          <Panel title="Sales">
            <dl className="grid grid-cols-2 gap-4 text-body sm:grid-cols-4">
              <div>
                <dt className="text-muted">Sales</dt>
                <dd className="text-lg font-semibold tabular-nums">{money(perf.data.sales.gross)}</dd>
              </div>
              <div>
                <dt className="text-muted">Units sold</dt>
                <dd className="text-lg font-semibold tabular-nums">{perf.data.sales.unitsSold}</dd>
              </div>
              <div>
                <dt className="text-muted">Return rate</dt>
                <dd className="text-lg font-semibold tabular-nums">{perf.data.sales.returnRate}%</dd>
              </div>
              <div>
                <dt className="text-muted">Net after fees</dt>
                <dd className="text-lg font-semibold tabular-nums">{money(perf.data.net)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-meta text-muted">
              Fees: commission {money(perf.data.fees.commission)} + GST {money(perf.data.fees.commissionGst)} · fulfilment {money(perf.data.fees.fulfilment)} · TCS {money(perf.data.fees.tcs)} · TDS {money(perf.data.fees.tds)}
            </p>
          </Panel>
          {perf.data.fulfilment ? (
            <Panel title="Fulfilment">
              <dl className="grid grid-cols-2 gap-4 text-body sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Orders</dt>
                  <dd className="text-lg font-semibold tabular-nums">{perf.data.fulfilment.orders}</dd>
                </div>
                <div>
                  <dt className="text-muted">Accepted on time</dt>
                  <dd className="text-lg font-semibold tabular-nums">{pct(perf.data.fulfilment.accepted - perf.data.fulfilment.acceptedLate, perf.data.fulfilment.accepted)}</dd>
                  <dd className="text-meta text-muted">within {perf.data.sla.acceptHours} h · median {perf.data.fulfilment.medianAcceptHours ?? "–"} h</dd>
                </div>
                <div>
                  <dt className="text-muted">Shipped on time</dt>
                  <dd className="text-lg font-semibold tabular-nums">{pct(perf.data.fulfilment.dispatched - perf.data.fulfilment.dispatchedLate, perf.data.fulfilment.dispatched)}</dd>
                  <dd className="text-meta text-muted">within {perf.data.sla.dispatchHours} h · median {perf.data.fulfilment.medianDispatchHours ?? "–"} h</dd>
                </div>
                <div>
                  <dt className="text-muted">Declined</dt>
                  <dd className="text-lg font-semibold tabular-nums">{pct(perf.data.fulfilment.declined, perf.data.fulfilment.orders)}</dd>
                  <dd className="text-meta text-muted">{perf.data.fulfilment.undelivered} undelivered (returned to you)</dd>
                </div>
              </dl>
            </Panel>
          ) : (
            <Notice tone="info">Everwear packs and ships your orders, so fulfilment speed isn't measured for you.</Notice>
          )}
        </>
      )}
    </div>
  )
}
