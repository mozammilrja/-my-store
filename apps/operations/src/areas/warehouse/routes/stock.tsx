import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { useFeedback } from "@/areas/shared/feedback"
import { ScanField } from "@/areas/shared/scan-field"
import { Button, cn, Dialog, Empty, formatTime, Input, Label, Notice, PAGE, PageTitle, Select, Spinner, Textarea } from "@/areas/warehouse/components/ui"
import { api, errorMessage } from "@/areas/warehouse/lib/api"
import { useSession } from "@/areas/warehouse/lib/session"
import type { CatalogItem, LedgerEntry, StockLevel } from "@/areas/warehouse/lib/types"

/*
 * Stock: look up any SKU at this warehouse, shelve it in a bin, and (for
 * supervisors) receive goods, correct counts, book damage, write damaged
 * units off or transfer to another warehouse. Every change is a ledger
 * entry; nothing here types a count over another.
 */

const BUCKETS = ["available", "reserved", "picked", "packed", "damaged", "quarantine"] as const

export function Stock() {
  const { warehouseId, can } = useSession()
  const [sku, setSku] = useState("")
  const [selected, setSelected] = useState<StockLevel | null>(null)
  const [operation, setOperation] = useState(false)
  const levels = useQuery({ queryKey: ["stock", warehouseId, sku], queryFn: () => api<{ stock: StockLevel[] }>("/stock", { query: { warehouseId, sku, limit: 100 } }) })

  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle kicker="Warehouse">Stock</PageTitle>
        {can("stock") ? <Button onClick={() => setOperation(true)}>Stock movement</Button> : null}
      </div>
      {can("stock") ? <InboundPanel /> : null}
      <div className="flex flex-wrap items-end gap-2">
        <ScanField className="min-w-0 flex-1" label="Find a SKU (scan or type the start of it)" onScan={setSku} />
        {sku ? (
          <Button variant="ghost" onClick={() => setSku("")}>
            Show all
          </Button>
        ) : null}
      </div>
      {levels.isPending ? (
        <Spinner />
      ) : levels.isError ? (
        <Notice>{errorMessage(levels.error)}</Notice>
      ) : levels.data.stock.length === 0 ? (
        <Empty title={sku ? `No stock of ${sku} here` : "No stock recorded at this warehouse yet"}>{can("stock") ? "Receive goods with Stock movement." : null}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-subtle bg-surface-container-lowest">
          <table className="w-full min-w-[44rem] text-body">
            <thead className="border-b border-subtle text-left text-meta text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-2 py-2 font-medium">Bin</th>
                {BUCKETS.map((b) => (
                  <th key={b} className="px-2 py-2 text-right font-medium capitalize">
                    {b === "quarantine" ? "Returns" : b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {levels.data.stock.map((s) => (
                <tr key={s._id} className="cursor-pointer hover:bg-surface-subtle" onClick={() => setSelected(s)}>
                  <td className="px-4 py-2.5">
                    <button className="text-left" onClick={() => setSelected(s)}>
                      <span className="block font-mono text-meta font-semibold">{s.sku}</span>
                      <span className="text-secondary">
                        {s.productTitle} · {s.variantTitle}
                      </span>
                    </button>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-meta">{s.binCode ?? "–"}</td>
                  {BUCKETS.map((b) => (
                    <td key={b} className={cn("px-2 py-2.5 text-right tabular-nums", b === "available" && "font-semibold", b === "damaged" && s.damaged > 0 && "text-danger")}>
                      {s[b]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.sku} at this warehouse` : ""}>
        {selected ? <LevelDetail level={selected} onDone={() => setSelected(null)} /> : null}
      </Dialog>
      <Dialog open={operation} onClose={() => setOperation(false)} title="Stock movement">
        <OperationForm onDone={() => setOperation(false)} />
      </Dialog>
    </div>
  )
}

function LevelDetail({ level, onDone }: { level: StockLevel; onDone: () => void }) {
  const { warehouseId, can } = useSession()
  const client = useQueryClient()
  const feedback = useFeedback()
  const [bin, setBin] = useState(level.binCode ?? "")
  const ledger = useQuery({ queryKey: ["ledger", warehouseId, level.variantId], queryFn: () => api<{ entries: LedgerEntry[] }>("/stock/ledger", { query: { warehouseId, variantId: level.variantId, limit: 30 } }) })
  const saveBin = useMutation({
    mutationFn: () => api(`/stock/${level._id}/bin`, { method: "PATCH", body: { binCode: bin.trim() || null } }),
    onSuccess: () => {
      feedback.ok("Bin saved")
      void client.invalidateQueries({ queryKey: ["stock"] })
      onDone()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  return (
    <div className="space-y-4">
      <p className="text-body text-secondary">
        {level.productTitle} · {level.variantTitle}. Received {level.receivedTotal}, dispatched {level.dispatchedTotal} in total.
      </p>
      {can("stock") ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            saveBin.mutate()
          }}
        >
          <div className="flex-1">
            <Label htmlFor="bin">Rack / bin</Label>
            <Input id="bin" value={bin} onChange={(e) => setBin(e.target.value.toUpperCase())} placeholder="A-03-2" pattern="[A-Za-z0-9-]{1,20}" className="font-mono" />
          </div>
          <Button type="submit" variant="secondary" busy={saveBin.isPending}>
            Save
          </Button>
        </form>
      ) : null}
      <div>
        <h3 className="mb-2 text-body font-semibold">Recent movements</h3>
        {ledger.isPending ? (
          <Spinner />
        ) : ledger.isError ? (
          <Notice>{errorMessage(ledger.error)}</Notice>
        ) : (
          <ul tabIndex={0} aria-label="Recent stock movements" className="max-h-72 divide-y divide-subtle overflow-y-auto text-body">
            {ledger.data.entries.map((e) => (
              <li key={e._id} className="py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium capitalize">{e.reason.replace(/_/g, " ")}</span>
                  <span className="tabular-nums">
                    {e.quantity} · {e.from} → {e.to}
                  </span>
                </div>
                <p className="text-meta text-muted">
                  {formatTime(e.createdAt)} · {e.actor.name ?? e.actor.type}
                  {e.note ? ` · ${e.note}` : ""} · available after: {e.after.available}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

type OpType = "receive" | "adjust" | "damage" | "write_off" | "transfer"
const OP_LABEL: Record<OpType, string> = {
  receive: "Receive goods",
  adjust: "Correct a count",
  damage: "Book damage found on the shelf",
  write_off: "Write off damaged units",
  transfer: "Transfer to another warehouse",
}

function OperationForm({ onDone }: { onDone: () => void }) {
  const { warehouseId } = useSession()
  const client = useQueryClient()
  const feedback = useFeedback()
  const [type, setType] = useState<OpType>("receive")
  const [item, setItem] = useState<CatalogItem | null>(null)
  const [quantity, setQuantity] = useState("1")
  const [direction, setDirection] = useState<"add" | "remove">("add")
  const [note, setNote] = useState("")
  const [reference, setReference] = useState("")
  const [to, setTo] = useState("")
  const destinations = useQuery({ queryKey: ["destinations"], queryFn: () => api<{ warehouses: { _id: string; code: string; name: string; city: string }[] }>("/destinations"), enabled: type === "transfer" })

  const run = useMutation({
    mutationFn: () => {
      const q = Number(quantity)
      const base = { warehouseId, variantId: item!.variantId }
      const body =
        type === "receive"
          ? { type, ...base, quantity: q, ...(reference ? { reference } : {}), ...(note ? { note } : {}) }
          : type === "adjust"
            ? { type, ...base, delta: direction === "add" ? q : -q, note }
            : type === "transfer"
              ? { type, ...base, toWarehouseId: to, quantity: q, ...(note ? { note } : {}) }
              : { type, ...base, quantity: q, note }
      return api("/stock/operations", { body })
    },
    onSuccess: () => {
      feedback.ok(`${OP_LABEL[type]}: ${quantity} × ${item!.sku}`)
      void client.invalidateQueries({ queryKey: ["stock"] })
      void client.invalidateQueries({ queryKey: ["ledger"] })
      void client.invalidateQueries({ queryKey: ["summary"] })
      onDone()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })

  const findItem = async (code: string) => {
    try {
      const { items } = await api<{ items: CatalogItem[] }>("/catalog/lookup", { query: { sku: code } })
      setItem(items[0]!)
    } catch (e) {
      feedback.bad(errorMessage(e))
    }
  }

  const needsNote = type === "adjust" || type === "damage" || type === "write_off"
  const submit = (e: FormEvent) => {
    e.preventDefault()
    run.mutate()
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div>
        <Label htmlFor="op-type">What happened</Label>
        <Select id="op-type" value={type} onChange={(e) => setType(e.target.value as OpType)}>
          {(Object.keys(OP_LABEL) as OpType[]).map((t) => (
            <option key={t} value={t}>
              {OP_LABEL[t]}
            </option>
          ))}
        </Select>
      </div>
      {item ? (
        <div className="flex items-center justify-between rounded-lg border border-subtle px-3 py-2 text-body">
          <span>
            <span className="font-mono font-semibold">{item.sku}</span> · {item.productTitle} ({item.variantTitle})
          </span>
          <Button type="button" variant="ghost" onClick={() => setItem(null)}>
            Change
          </Button>
        </div>
      ) : (
        <ScanField label="Scan the item's SKU" onScan={findItem} />
      )}
      {item ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {type === "adjust" ? (
              <div>
                <Label htmlFor="op-dir">Change</Label>
                <Select id="op-dir" value={direction} onChange={(e) => setDirection(e.target.value as "add" | "remove")}>
                  <option value="add">Found more (add)</option>
                  <option value="remove">Fewer than recorded (remove)</option>
                </Select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="op-qty">Units</Label>
              <Input id="op-qty" type="number" inputMode="numeric" min={1} max={100000} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            {type === "receive" ? (
              <div>
                <Label htmlFor="op-ref">GRN / PO number (optional)</Label>
                <Input id="op-ref" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            ) : null}
            {type === "transfer" ? (
              <div>
                <Label htmlFor="op-to">To warehouse</Label>
                <Select id="op-to" required value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">Choose…</option>
                  {destinations.data?.warehouses
                    .filter((w) => w._id !== warehouseId)
                    .map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.code} · {w.city}
                      </option>
                    ))}
                </Select>
              </div>
            ) : null}
          </div>
          <div>
            <Label htmlFor="op-note">{needsNote ? "Reason" : "Note (optional)"}</Label>
            <Textarea id="op-note" required={needsNote} minLength={needsNote ? 3 : undefined} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" busy={run.isPending}>
              Record
            </Button>
          </div>
        </>
      ) : null}
    </form>
  )
}

type Inbound = { _id: string; code: string; status: "created" | "in_transit" | "receiving" | "closed"; carrier?: string; awb?: string; lines: { variantId: string; sku: string; title: string; expected: number; received: number }[] }

/** Stock a marketplace seller sent in: scan their ASN, count each line; only what's counted becomes stock. */
function InboundPanel() {
  const feedback = useFeedback()
  const client = useQueryClient()
  const [asn, setAsn] = useState<{ shipment: Inbound; seller: { displayName: string; code: string } | null } | null>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const find = async (code: string) => {
    try {
      setAsn(await api(`/inbound/${encodeURIComponent(code)}`))
      setCounts({})
    } catch (e) {
      feedback.bad(errorMessage(e))
    }
  }
  const receive = useMutation({
    mutationFn: (close: boolean) =>
      api<{ shipment: Inbound }>(`/inbound/${asn!.shipment.code}/receive`, {
        body: { close, counts: Object.entries(counts).filter(([, v]) => Number(v) > 0).map(([variantId, v]) => ({ variantId, quantity: Number(v) })) },
      }),
    onSuccess: (d, close) => {
      feedback.ok(close || d.shipment.status === "closed" ? `${d.shipment.code} received and closed` : `${d.shipment.code}: counts recorded`)
      setAsn((x) => (x ? { ...x, shipment: d.shipment } : x))
      setCounts({})
      void client.invalidateQueries({ queryKey: ["stock"] })
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  return (
    <details className="rounded-xl border border-subtle bg-surface-container-lowest">
      <summary className="cursor-pointer px-4 py-3 text-body font-semibold">Seller stock arriving (ASN)</summary>
      <div className="space-y-4 border-t border-subtle p-4">
        <ScanField label="Scan or type the ASN code on the seller's paperwork" placeholder="ASN-SEL-0001-…" onScan={find} autoFocus={false} />
        {asn ? (
          <div className="space-y-3">
            <p className="text-body text-secondary">
              <span className="font-mono font-semibold">{asn.shipment.code}</span> from {asn.seller?.displayName ?? "a seller"} · {asn.shipment.status.replace("_", " ")}
              {asn.shipment.awb ? ` · ${asn.shipment.carrier} ${asn.shipment.awb}` : ""}
            </p>
            <ul className="divide-y divide-subtle text-body">
              {asn.shipment.lines.map((l) => (
                <li key={l.variantId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-mono text-meta font-semibold">{l.sku}</span> · {l.title}
                    <span className="block text-meta text-muted">
                      {l.received} of {l.expected} received
                    </span>
                  </span>
                  {asn.shipment.status !== "closed" && l.received < l.expected ? (
                    <Input aria-label={`Count of ${l.sku}`} type="number" min={0} max={l.expected - l.received} className="w-24" value={counts[l.variantId] ?? ""} onChange={(e) => setCounts((c) => ({ ...c, [l.variantId]: e.target.value }))} />
                  ) : null}
                </li>
              ))}
            </ul>
            {asn.shipment.status !== "closed" ? (
              <div className="flex flex-wrap gap-2">
                <Button busy={receive.isPending} disabled={!Object.values(counts).some((v) => Number(v) > 0)} onClick={() => receive.mutate(false)}>
                  Receive counted units
                </Button>
                <Button variant="secondary" busy={receive.isPending} onClick={() => receive.mutate(true)}>
                  Close (nothing more coming)
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  )
}
