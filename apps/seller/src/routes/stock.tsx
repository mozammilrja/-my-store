import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { useFeedback } from "@/components/feedback"
import { Button, Dialog, Empty, Input, Label, Notice, Panel, Select, Spinner, Textarea, formatTime } from "@/components/ui"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import type { Inbound, StockRow } from "@/lib/types"

export function Stock() {
  const { selfShip } = useSession()
  const stock = useQuery({ queryKey: ["stock"], queryFn: () => api<{ stock: StockRow[] }>("/stock") })
  const [moving, setMoving] = useState<StockRow | null>(null)
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{selfShip ? "Stock" : "Stock and sending stock"}</h1>
        <p className="text-sm text-ink-3">{selfShip ? "What's on your shelf for Everwear orders. Record goods in, counts and damage here." : "Your stock in Everwear warehouses. Send more with a shipping notice; only what the warehouse counts is added."}</p>
      </div>
      {stock.isPending ? (
        <Spinner />
      ) : stock.isError ? (
        <Notice>{errorMessage(stock.error)}</Notice>
      ) : stock.data.stock.length === 0 ? (
        <Empty title="No items yet">Add listings first.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line bg-panel">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-line text-left text-xs text-ink-3">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-2 py-2 text-right font-medium">Available</th>
                <th className="px-2 py-2 text-right font-medium">On orders</th>
                <th className="px-2 py-2 text-right font-medium">Damaged</th>
                <th className="px-4 py-2 font-medium">{selfShip ? "" : "Where"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stock.data.stock.map((s) => (
                <tr key={s.variantId}>
                  <td className="px-4 py-2.5">
                    <span className="block font-mono text-xs font-semibold">{s.sku}</span>
                    {s.productTitle} · {s.variantTitle}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{s.available}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.reserved}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.damaged}</td>
                  <td className="px-4 py-2.5 text-right">
                    {selfShip ? (
                      <Button size="md" variant="secondary" onClick={() => setMoving(s)}>
                        Update
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-3">{s.warehouses.map((w) => `${w.code}: ${w.available}`).join(", ") || "Not received yet"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selfShip ? null : <Inbounds stock={stock.data?.stock ?? []} />}
      <Dialog open={!!moving} onClose={() => setMoving(null)} title={moving ? `Update ${moving.sku}` : ""}>
        {moving ? <Movement row={moving} onDone={() => setMoving(null)} /> : null}
      </Dialog>
    </div>
  )
}

function Movement({ row, onDone }: { row: StockRow; onDone: () => void }) {
  const feedback = useFeedback()
  const client = useQueryClient()
  const [type, setType] = useState<"receive" | "adjust_up" | "adjust_down" | "damage" | "write_off">("receive")
  const [qty, setQty] = useState("1")
  const [note, setNote] = useState("")
  const run = useMutation({
    mutationFn: () => {
      const q = Number(qty)
      const body =
        type === "receive" ? { type, variantId: row.variantId, quantity: q, ...(note ? { note } : {}) } : type.startsWith("adjust") ? { type: "adjust", variantId: row.variantId, delta: type === "adjust_up" ? q : -q, note } : { type, variantId: row.variantId, quantity: q, note }
      return api("/stock/operations", { body })
    },
    onSuccess: () => {
      feedback.ok("Stock updated")
      void client.invalidateQueries({ queryKey: ["stock"] })
      onDone()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    run.mutate()
  }
  return (
    <form className="space-y-3" onSubmit={submit}>
      <div>
        <Label htmlFor="mt">What happened</Label>
        <Select id="mt" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="receive">New stock in</option>
          <option value="adjust_up">Counted more than recorded</option>
          <option value="adjust_down">Counted fewer than recorded</option>
          <option value="damage">Found damaged</option>
          <option value="write_off">Throw away damaged units</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="mq">Units</Label>
        <Input id="mq" type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="mn">{type === "receive" ? "Note (optional)" : "Reason"}</Label>
        <Textarea id="mn" required={type !== "receive"} minLength={type !== "receive" ? 3 : undefined} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" busy={run.isPending}>
          Record
        </Button>
      </div>
    </form>
  )
}

/** Advance shipping notices: what you're sending to an Everwear warehouse. */
function Inbounds({ stock }: { stock: StockRow[] }) {
  const feedback = useFeedback()
  const client = useQueryClient()
  const list = useQuery({ queryKey: ["inbound"], queryFn: () => api<{ shipments: Inbound[] }>("/inbound") })
  const whs = useQuery({ queryKey: ["store-warehouses"], queryFn: () => api<{ warehouses: { _id: string; code: string; name: string; city: string; address: string; pincode: string }[] }>("/store-warehouses") })
  const [open, setOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState("")
  const [qty, setQty] = useState<Record<string, string>>({})
  const [ship, setShip] = useState<Inbound | null>(null)
  const [carrier, setCarrier] = useState("")
  const [awb, setAwb] = useState("")
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["inbound"] })
    void client.invalidateQueries({ queryKey: ["stock"] })
  }
  const create = useMutation({
    mutationFn: () => api<{ shipment: Inbound }>("/inbound", { body: { warehouseId, lines: Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([variantId, v]) => ({ variantId, quantity: Number(v) })) } }),
    onSuccess: (r) => {
      feedback.ok(`${r.shipment.code} created. Write it on the boxes.`)
      setOpen(false)
      setQty({})
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const sent = useMutation({
    mutationFn: () => api(`/inbound/${ship!._id}/shipped`, { body: { carrier, awb } }),
    onSuccess: () => {
      feedback.ok("Marked as sent")
      setShip(null)
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const wh = whs.data?.warehouses.find((w) => w._id === warehouseId)
  return (
    <Panel title="Shipping notices" action={<Button onClick={() => setOpen(true)}>Send stock</Button>}>
      {list.data?.shipments.length ? (
        <ul className="divide-y divide-line text-sm">
          {list.data.shipments.map((s) => (
            <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <span className="font-mono font-semibold">{s.code}</span> · {s.status.replace("_", " ")} · {formatTime(s.createdAt)}
                <span className="block text-xs text-ink-3">{s.lines.map((l) => `${l.sku}: ${l.received}/${l.expected}`).join(", ")}</span>
              </span>
              {s.status === "created" ? (
                <Button variant="secondary" onClick={() => setShip(s)}>
                  Mark as sent
                </Button>
              ) : s.awb ? (
                <span className="text-xs text-ink-3">
                  {s.carrier} {s.awb}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">No shipping notices yet.</p>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="Send stock to Everwear">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <div>
            <Label htmlFor="wh">To warehouse</Label>
            <Select id="wh" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Choose…</option>
              {whs.data?.warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.code} · {w.city}
                </option>
              ))}
            </Select>
            {wh ? (
              <p className="mt-1 text-xs text-ink-3">
                Ship to: {wh.name}, {wh.address}, {wh.city} {wh.pincode}
              </p>
            ) : null}
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {stock.map((s) => (
              <li key={s.variantId} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-mono text-xs">{s.sku}</span> · {s.productTitle} · {s.variantTitle}
                </span>
                <Input aria-label={`Units of ${s.sku}`} type="number" min={0} className="w-24" value={qty[s.variantId] ?? ""} onChange={(e) => setQty((x) => ({ ...x, [s.variantId]: e.target.value }))} />
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" busy={create.isPending} disabled={!Object.values(qty).some((v) => Number(v) > 0)}>
              Create notice
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={!!ship} onClose={() => setShip(null)} title={`Mark ${ship?.code ?? ""} as sent`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            sent.mutate()
          }}
        >
          <div>
            <Label htmlFor="sc">Courier</Label>
            <Input id="sc" required minLength={2} value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sa">AWB</Label>
            <Input id="sa" required pattern="[A-Za-z0-9-]{4,40}" value={awb} onChange={(e) => setAwb(e.target.value)} className="font-mono" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" busy={sent.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>
    </Panel>
  )
}
