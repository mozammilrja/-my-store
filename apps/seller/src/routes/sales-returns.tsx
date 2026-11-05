import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useFeedback } from "@/components/feedback"
import { Button, Dialog, Empty, Input, Label, Notice, Spinner } from "@/components/ui"
import { api, errorMessage } from "@/lib/api"
import { day, money, useSession } from "@/lib/session"
import type { Sale, SellerReturn } from "@/lib/types"

export function Sales() {
  const sales = useQuery({ queryKey: ["sales"], queryFn: () => api<{ sales: Sale[] }>("/sales") })
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Sales</h1>
        <p className="text-sm text-ink-3">Orders with your items, newest first. On orders with other sellers' items, you see only yours.</p>
      </div>
      {sales.isPending ? (
        <Spinner />
      ) : sales.isError ? (
        <Notice>{errorMessage(sales.error)}</Notice>
      ) : sales.data.sales.length === 0 ? (
        <Empty title="No sales yet" />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-panel">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-line text-left text-xs text-ink-3">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-2 py-2 font-medium">Items</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sales.data.sales.map((s) => (
                <tr key={s.orderId}>
                  <td className="px-4 py-2.5">
                    #{s.displayId}
                    <span className="block text-xs text-ink-3">
                      {day(s.createdAt)} · {s.city}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">{s.items.map((i) => `${i.quantity} × ${i.productTitle} (${i.variantTitle})`).join(", ")}</td>
                  <td className="px-2 py-2.5 capitalize">{s.status === "canceled" ? "cancelled" : s.fulfillmentStatus}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(s.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function Returns() {
  const { selfShip } = useSession()
  const returns = useQuery({ queryKey: ["returns"], queryFn: () => api<{ returns: SellerReturn[] }>("/returns") })
  const [inspecting, setInspecting] = useState<SellerReturn | null>(null)
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Returns</h1>
        <p className="text-sm text-ink-3">{selfShip ? "Returned items come back to your pickup address. Grade each unit when it arrives; sellable units go back into your stock." : "Returned items go to an Everwear warehouse, which inspects them."}</p>
      </div>
      {returns.isPending ? (
        <Spinner />
      ) : returns.isError ? (
        <Notice>{errorMessage(returns.error)}</Notice>
      ) : returns.data.returns.length === 0 ? (
        <Empty title="No returns" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
          {returns.data.returns.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="font-mono text-sm font-semibold">{r.code}</span> · order #{r.displayId} · {r.type === "exchange" ? "exchange" : "return"} · {r.status.replace(/_/g, " ")}
                <span className="block text-sm text-ink-2">
                  {r.items.map((i) => `${i.quantity} × ${i.productTitle} (${i.variantTitle}): ${i.reason}${i.note ? `, ${i.note}` : ""}`).join("; ")}
                </span>
                <span className="text-xs text-ink-3">Requested {day(r.requestedAt)}</span>
              </span>
              {selfShip && ["approved", "pickup_scheduled", "in_transit", "received"].includes(r.status) ? (
                <Button variant="secondary" onClick={() => setInspecting(r)}>
                  It arrived: grade it
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!inspecting} onClose={() => setInspecting(null)} title={`Grade ${inspecting?.code ?? ""}`}>
        {inspecting ? <Inspect r={inspecting} onDone={() => setInspecting(null)} /> : null}
      </Dialog>
    </div>
  )
}

function Inspect({ r, onDone }: { r: SellerReturn; onDone: () => void }) {
  const feedback = useFeedback()
  const client = useQueryClient()
  const [sellable, setSellable] = useState<Record<string, number>>(() => Object.fromEntries(r.items.map((i) => [i.itemId, i.quantity])))
  const run = useMutation({
    mutationFn: () =>
      api(`/returns/${r.id}/inspect`, {
        body: {
          lines: r.items.flatMap((i) => [
            ...(sellable[i.itemId]! > 0 ? [{ itemId: i.itemId, quantity: sellable[i.itemId]!, condition: "sellable" }] : []),
            ...(i.quantity - sellable[i.itemId]! > 0 ? [{ itemId: i.itemId, quantity: i.quantity - sellable[i.itemId]!, condition: "damaged" }] : []),
          ]),
        },
      }),
    onSuccess: () => {
      feedback.ok("Recorded. Sellable units are back in your stock.")
      void client.invalidateQueries({ queryKey: ["returns"] })
      void client.invalidateQueries({ queryKey: ["stock"] })
      onDone()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        run.mutate()
      }}
    >
      {r.items.map((i) => (
        <div key={i.itemId} className="flex items-end justify-between gap-3">
          <span className="text-sm">
            {i.productTitle} · {i.variantTitle} · {i.quantity} returned
          </span>
          <div className="w-28">
            <Label htmlFor={`s-${i.itemId}`}>Sellable</Label>
            <Input id={`s-${i.itemId}`} type="number" min={0} max={i.quantity} value={sellable[i.itemId]} onChange={(e) => setSellable((x) => ({ ...x, [i.itemId]: Math.max(0, Math.min(i.quantity, Number(e.target.value) || 0)) }))} />
          </div>
        </div>
      ))}
      <p className="text-xs text-ink-3">Units not sellable are booked as damaged.</p>
      <div className="flex justify-end">
        <Button type="submit" busy={run.isPending}>
          Record
        </Button>
      </div>
    </form>
  )
}
