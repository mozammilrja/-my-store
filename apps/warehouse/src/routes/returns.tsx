import { useMutation } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { useFeedback } from "@/components/feedback"
import { ScanField } from "@/components/scan-field"
import { Button, Input, Label, Notice, Panel, Textarea } from "@/components/ui"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import type { ReturnLookup } from "@/lib/types"

/*
 * Returns at the dock: find the parcel by its reverse AWB (or the order
 * number), open it and grade every unit. Sellable units go back on the
 * shelf; damaged ones are held as damaged. Nothing is restocked before this.
 */

export function Returns() {
  const { can } = useSession()
  const feedback = useFeedback()
  const [found, setFound] = useState<ReturnLookup | null>(null)

  const lookup = async (code: string) => {
    try {
      const isOrder = /^#?\d{1,8}$/.test(code)
      const { return: r } = await api<{ return: ReturnLookup }>("/returns/lookup", { query: isOrder ? { orderNumber: code.replace("#", "") } : { awb: code } })
      setFound(r)
    } catch (e) {
      feedback.bad(errorMessage(e))
      setFound(null)
    }
  }

  if (!can("qc")) return <Notice tone="info">Returns are inspected by inspectors, packers and supervisors.</Notice>

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Returns</h1>
      <ScanField label="Scan the return parcel's AWB, or type the order number" placeholder="AWB or 1042" onScan={lookup} />
      {found ? <Inspect key={found.orderId} r={found} onDone={() => setFound(null)} /> : null}
    </div>
  )
}

function Inspect({ r, onDone }: { r: ReturnLookup; onDone: () => void }) {
  const { warehouseId } = useSession()
  const feedback = useFeedback()
  const [grades, setGrades] = useState<Record<string, { sellable: number; notes: string }>>(() => Object.fromEntries(r.items.map((i) => [i.itemId, { sellable: i.quantity, notes: "" }])))
  const run = useMutation({
    mutationFn: () => {
      const lines = r.items.flatMap((i) => {
        const g = grades[i.itemId]!
        const damaged = i.quantity - g.sellable
        return [
          ...(g.sellable > 0 ? [{ itemId: i.itemId, quantity: g.sellable, condition: "sellable" as const, ...(g.notes ? { notes: g.notes } : {}) }] : []),
          ...(damaged > 0 ? [{ itemId: i.itemId, quantity: damaged, condition: "damaged" as const, ...(g.notes ? { notes: g.notes } : {}) }] : []),
        ]
      })
      return api<{ status: string }>(`/returns/${r.orderId}/inspect`, { body: { warehouseId, lines } })
    },
    onSuccess: () => {
      feedback.ok(`Return for order #${r.displayId} inspected. Sellable units are back on the shelf.`)
      onDone()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const inspectable = ["approved", "pickup_scheduled", "received"].includes(r.status)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    run.mutate()
  }

  return (
    <Panel title={`Order #${r.displayId}${r.awb ? ` · ${r.awb}` : ""}`}>
      <p className="mb-4 text-sm text-ink-2">
        Customer's reason: “{r.reason}”. Return is <span className="font-medium">{r.status.replace(/_/g, " ")}</span>.
      </p>
      {!inspectable ? (
        <Notice tone="warn">{r.status === "requested" ? "This return hasn't been approved yet. Hold the parcel and ask the admin team." : "This return has already been inspected or closed."}</Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          {r.items.map((i) => {
            const g = grades[i.itemId]!
            return (
              <fieldset key={i.itemId} className="space-y-3 rounded-control border border-line p-3">
                <legend className="px-1 text-sm font-medium">
                  {i.productTitle} · {i.variantTitle} · {i.quantity} returned
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`s-${i.itemId}`}>Sellable</Label>
                    <Input
                      id={`s-${i.itemId}`}
                      type="number"
                      min={0}
                      max={i.quantity}
                      value={g.sellable}
                      onChange={(e) => setGrades((x) => ({ ...x, [i.itemId]: { ...g, sellable: Math.max(0, Math.min(i.quantity, Number(e.target.value) || 0)) } }))}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-ink-2">Damaged</p>
                    <p className="flex h-10 items-center text-lg font-semibold tabular-nums">{i.quantity - g.sellable}</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`n-${i.itemId}`}>Condition notes</Label>
                  <Textarea id={`n-${i.itemId}`} maxLength={300} value={g.notes} onChange={(e) => setGrades((x) => ({ ...x, [i.itemId]: { ...g, notes: e.target.value } }))} placeholder="Tags intact, unworn" />
                </div>
              </fieldset>
            )
          })}
          <Button type="submit" size="lg" busy={run.isPending}>
            Record inspection
          </Button>
        </form>
      )}
    </Panel>
  )
}
