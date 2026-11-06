import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { cn, Empty, Notice, Panel, Spinner } from "@/areas/shared/ui"
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
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Payments</h1>
      {balance.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Payable now", balance.data.payableNow, "In the next settlement"],
            ["Waiting", balance.data.waiting, "Return window still open, or the order not yet paid"],
            ["Paid out", balance.data.paidOut, "Total settled to your bank"],
          ].map(([label, value, note]) => (
            <div key={label as string} className="rounded-panel border border-line bg-panel p-4">
              <p className="text-sm text-ink-3">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{money(value as number)}</p>
              <p className="mt-1 text-xs text-ink-3">{note}</p>
            </div>
          ))}
        </div>
      ) : null}
      <Panel title="Settlements">
        {settlements.isPending ? (
          <Spinner />
        ) : !settlements.data?.settlements.length ? (
          <p className="text-sm text-ink-3">None yet. Sales become payable once their return window closes.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {settlements.data.settlements.map((s) => (
              <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <span className="font-mono font-semibold">{s.code}</span> · {day(s.createdAt)}
                  <span className="block text-xs text-ink-3">
                    Sales {money(s.totals.sale ?? 0)} · fees {money(Object.entries(s.totals).filter(([k]) => k !== "sale").reduce((n, [, v]) => n + v, 0))}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{money(s.net)}</span>
                  <span className={cn("text-xs", s.status === "paid" ? "text-ok" : "text-ink-3")}>{s.status === "paid" ? `Paid ${day(s.payout!.paidAt)} · UTR ${s.payout!.utr}` : "Being paid"}</span>
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
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs text-ink-3">
                <tr>
                  <th className="px-4 pb-2 font-medium">Date</th>
                  <th className="px-2 pb-2 font-medium">Order</th>
                  <th className="px-2 pb-2 font-medium">Entry</th>
                  <th className="px-2 pb-2 text-right font-medium">Amount</th>
                  <th className="px-4 pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ledger.data.entries.map((e) => (
                  <tr key={e._id}>
                    <td className="px-4 py-2 whitespace-nowrap">{day(e.createdAt)}</td>
                    <td className="px-2 py-2">#{e.displayId}</td>
                    <td className="px-2 py-2">
                      {KIND[e.kind] ?? e.kind}
                      {e.reversal ? " (refund)" : ""}
                      {e.note ? <span className="block text-xs text-ink-3">{e.note}</span> : null}
                    </td>
                    <td className={cn("px-2 py-2 text-right tabular-nums", e.amount < 0 ? "text-bad" : "text-ok")}>{money(e.amount)}</td>
                    <td className="px-4 py-2 text-xs text-ink-3">{e.status === "settled" ? "Settled" : `Payable from ${day(e.payableFrom)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Performance</h1>
        <div role="tablist" aria-label="Period" className="flex rounded-control border border-line p-0.5">
          {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
            <button key={k} role="tab" aria-selected={days === k} onClick={() => setDays(k)} className={cn("h-11 rounded-control px-3 text-sm font-medium sm:h-8", days === k ? "bg-accent text-area-on-accent" : "text-ink-2")}>
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
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-ink-3">Sales</dt>
                <dd className="text-lg font-semibold tabular-nums">{money(perf.data.sales.gross)}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Units sold</dt>
                <dd className="text-lg font-semibold tabular-nums">{perf.data.sales.unitsSold}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Return rate</dt>
                <dd className="text-lg font-semibold tabular-nums">{perf.data.sales.returnRate}%</dd>
              </div>
              <div>
                <dt className="text-ink-3">Net after fees</dt>
                <dd className="text-lg font-semibold tabular-nums">{money(perf.data.net)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-3">
              Fees: commission {money(perf.data.fees.commission)} + GST {money(perf.data.fees.commissionGst)} · fulfilment {money(perf.data.fees.fulfilment)} · TCS {money(perf.data.fees.tcs)} · TDS {money(perf.data.fees.tds)}
            </p>
          </Panel>
          {perf.data.fulfilment ? (
            <Panel title="Fulfilment">
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-ink-3">Orders</dt>
                  <dd className="text-lg font-semibold tabular-nums">{perf.data.fulfilment.orders}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Accepted on time</dt>
                  <dd className="text-lg font-semibold tabular-nums">{pct(perf.data.fulfilment.accepted - perf.data.fulfilment.acceptedLate, perf.data.fulfilment.accepted)}</dd>
                  <dd className="text-xs text-ink-3">within {perf.data.sla.acceptHours} h · median {perf.data.fulfilment.medianAcceptHours ?? "–"} h</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Shipped on time</dt>
                  <dd className="text-lg font-semibold tabular-nums">{pct(perf.data.fulfilment.dispatched - perf.data.fulfilment.dispatchedLate, perf.data.fulfilment.dispatched)}</dd>
                  <dd className="text-xs text-ink-3">within {perf.data.sla.dispatchHours} h · median {perf.data.fulfilment.medianDispatchHours ?? "–"} h</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Declined</dt>
                  <dd className="text-lg font-semibold tabular-nums">{pct(perf.data.fulfilment.declined, perf.data.fulfilment.orders)}</dd>
                  <dd className="text-xs text-ink-3">{perf.data.fulfilment.undelivered} undelivered (returned to you)</dd>
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
