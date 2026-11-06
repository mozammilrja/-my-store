import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Printer } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { Button, cn, Dialog, Empty, formatTime, Input, Label, Notice, PAGE, PageTitle, Panel, Spinner, Textarea } from "@/areas/shared/ui"
import { api, errorMessage } from "@/areas/seller/lib/api"
import { useSession } from "@/areas/seller/lib/session"
import type { FulfilmentStatus, SellerOrder } from "@/areas/seller/lib/types"

const STAGES: { key: string; label: string; statuses: FulfilmentStatus[] }[] = [
  { key: "accept", label: "To accept", statuses: ["assigned"] },
  { key: "pack", label: "To pack", statuses: ["picking_pending", "picking", "picked", "qc_passed"] },
  { key: "ship", label: "To ship", statuses: ["packed", "label_generated"] },
  { key: "pickup", label: "Ready for pickup", statuses: ["ready_to_dispatch", "manifested", "handed_over"] },
  { key: "done", label: "Shipped", statuses: ["dispatched"] },
  { key: "closed", label: "Declined", statuses: ["rejected", "cancelled"] },
]

export function Orders() {
  const { me } = useSession()
  const [params, setParams] = useSearchParams()
  const stage = STAGES.find((s) => s.key === params.get("stage")) ?? STAGES[0]!
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api<{ orders: SellerOrder[] }>("/orders"), refetchInterval: 30_000 })
  const all = orders.data?.orders ?? []
  const shown = all.filter((o) => stage.statuses.includes(o.status))
  const ready = all.filter((o) => o.status === "ready_to_dispatch")
  return (
    <div className={PAGE}>
      <div>
        <PageTitle kicker="Seller Hub">Orders</PageTitle>
        <p className="text-body text-secondary">
          Accept within {me.terms.acceptSlaHours} hours; hand over to the courier within {me.terms.dispatchSlaHours} hours of accepting.
        </p>
      </div>
      <div role="tablist" aria-label="Stage" className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <button key={s.key} role="tab" aria-selected={s.key === stage.key} onClick={() => setParams({ stage: s.key }, { replace: true })} className={cn("h-11 rounded-lg px-3 text-body font-medium sm:h-9", s.key === stage.key ? "bg-accent text-on-accent" : "bg-surface-subtle text-secondary")}>
            {s.label} ({all.filter((o) => s.statuses.includes(o.status)).length})
          </button>
        ))}
      </div>
      {stage.key === "pickup" && ready.length ? <Handover ready={ready} /> : null}
      {orders.isPending ? (
        <Spinner />
      ) : orders.isError ? (
        <Notice>{errorMessage(orders.error)}</Notice>
      ) : shown.length === 0 ? (
        <Empty title={`Nothing ${stage.label.toLowerCase()}`}>New orders appear here.</Empty>
      ) : (
        <ul className="divide-y divide-subtle overflow-hidden rounded-xl border border-subtle bg-surface-container-lowest">
          {shown.map((o) => (
            <li key={o._id}>
              <Link to={`/seller/orders/${o._id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-subtle">
                <span className="min-w-0">
                  <span className="font-mono text-body font-semibold">{o.code}</span>
                  <span className="block truncate text-body text-secondary">{o.lines.map((l) => `${l.quantity} × ${l.productTitle} (${l.variantTitle})`).join(", ")}</span>
                  <span className="text-meta text-muted">
                    {formatTime(o.createdAt)} · to {o.destination.city} {o.destination.postalCode}
                    {o.paymentMethod === "cod" ? " · cash on delivery" : ""}
                  </span>
                </span>
                {o.awb ? <span className="text-meta text-muted">{o.carrier} {o.awb}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Handover({ ready }: { ready: SellerOrder[] }) {
  const feedback = useFeedback()
  const client = useQueryClient()
  const carriers = [...new Set(ready.map((o) => o.carrier ?? ""))]
  const [carrier, setCarrier] = useState(carriers[0] ?? "")
  const [name, setName] = useState("")
  const run = useMutation({
    mutationFn: () => api<{ manifest: { awbs: string[] } }>("/handover", { body: { carrier, courierExecutive: name } }),
    onSuccess: (r) => {
      feedback.ok(`${r.manifest.awbs.length} parcel(s) handed to ${carrier}`)
      setName("")
      void client.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  return (
    <Panel title="Hand parcels to the courier">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          run.mutate()
        }}
      >
        <div>
          <Label htmlFor="hc">Courier</Label>
          <select id="hc" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="h-10 rounded-lg border border-subtle bg-surface-container-lowest px-3">
            {carriers.map((c) => (
              <option key={c} value={c}>
                {c} ({ready.filter((o) => o.carrier === c).length})
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <Label htmlFor="hn">Pickup person's name</Label>
          <Input id="hn" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" busy={run.isPending}>
          Hand over
        </Button>
      </form>
    </Panel>
  )
}

type Detail = { order: SellerOrder; history: { _id: string; to: string; at: string; reason?: string }[]; label: { awb: string; carrier: string; labelUrl?: string; provider: string } | null; shipTo: { name: string; address1: string; address2: string | null; city: string; state: string; postalCode: string } | null }

export function OrderDetail() {
  const { id = "" } = useParams()
  const { me } = useSession()
  const feedback = useFeedback()
  const client = useQueryClient()
  const detail = useQuery({ queryKey: ["order", id], queryFn: () => api<Detail>(`/orders/${id}`) })
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState("")
  const [dims, setDims] = useState({ weightKg: "", lengthCm: "", breadthCm: "", heightCm: "" })
  const [manual, setManual] = useState({ carrier: "", awb: "" })
  const [printing, setPrinting] = useState(false)
  const act = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown; ok: string }) => api(`/orders/${id}${path}`, { body: body ?? {} }),
    onSuccess: (_d, v) => {
      feedback.ok(v.ok)
      setDeclining(false)
      void client.invalidateQueries({ queryKey: ["order", id] })
      void client.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  if (detail.isPending) return <Spinner />
  if (detail.isError) return <Notice>{errorMessage(detail.error)}</Notice>
  const { order: o, history, label, shipTo } = detail.data
  const pack = (e: FormEvent) => {
    e.preventDefault()
    act.mutate({ path: "/pack", body: { weightKg: Number(dims.weightKg), lengthCm: Number(dims.lengthCm), breadthCm: Number(dims.breadthCm), heightCm: Number(dims.heightCm) }, ok: "Packed" })
  }
  const print = () => {
    setPrinting(true)
    requestAnimationFrame(() => {
      window.print()
      setPrinting(false)
    })
  }

  return (
    <div className={PAGE}>
      <Link to="/seller/orders" className="inline-flex items-center gap-1 text-body text-secondary">
        <ArrowLeft className="size-4" aria-hidden /> Orders
      </Link>
      <div>
        <PageTitle kicker="Seller Hub" mono>{o.code}</PageTitle>
        <p className="text-body text-secondary">
          Order #{o.displayId} · {o.status.replace(/_/g, " ")} · {o.paymentMethod === "cod" ? "cash on delivery (the courier collects)" : "prepaid"}
        </p>
      </div>
      <Panel title="Items">
        <ul className="space-y-1 text-body">
          {o.lines.map((l) => (
            <li key={l.itemId}>
              {l.quantity} × {l.productTitle} · {l.variantTitle} <span className="font-mono text-meta text-muted">{l.sku}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {o.status === "assigned" ? (
        <Panel title="New order">
          <div className="flex flex-wrap gap-2">
            <Button busy={act.isPending} onClick={() => act.mutate({ path: "/accept", ok: "Accepted. Pack it next." })}>
              Accept
            </Button>
            <Button variant="secondary" onClick={() => setDeclining(true)}>
              Can't fulfil
            </Button>
          </div>
        </Panel>
      ) : null}

      {["picking_pending", "picking", "picked", "qc_passed"].includes(o.status) ? (
        <Panel title="Pack the order">
          <form className="space-y-3" onSubmit={pack}>
            <p className="text-body text-secondary">Check each item matches the size and colour above, pack it, then weigh and measure the box.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["weightKg", "Weight (kg)"],
                  ["lengthCm", "Length (cm)"],
                  ["breadthCm", "Breadth (cm)"],
                  ["heightCm", "Height (cm)"],
                ] as const
              ).map(([k, l]) => (
                <div key={k}>
                  <Label htmlFor={k}>{l}</Label>
                  <Input id={k} type="number" min="0.01" step="0.01" required value={dims[k]} onChange={(e) => setDims((d) => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <Button type="submit" busy={act.isPending}>
              Packed
            </Button>
          </form>
        </Panel>
      ) : null}

      {o.status === "packed" ? (
        <Panel title="Book the courier">
          <div className="space-y-4">
            <Button busy={act.isPending} onClick={() => act.mutate({ path: "/ship", ok: "Booked. Print the courier label." })}>
              Book through Everwear
            </Button>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault()
                act.mutate({ path: "/ship", body: { manual }, ok: "AWB recorded" })
              }}
            >
              <p className="text-body text-muted sm:col-span-3">Or, if you booked it on a courier's own website, enter the AWB:</p>
              <div>
                <Label htmlFor="mc">Courier</Label>
                <Input id="mc" required minLength={2} value={manual.carrier} onChange={(e) => setManual((m) => ({ ...m, carrier: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="ma">AWB</Label>
                <Input id="ma" autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off" required minLength={4} value={manual.awb} onChange={(e) => setManual((m) => ({ ...m, awb: e.target.value }))} className="font-mono" />
              </div>
              <Button type="submit" variant="secondary" busy={act.isPending}>
                Record AWB
              </Button>
            </form>
          </div>
        </Panel>
      ) : null}

      {shipTo ? (
        <Panel title="Ship to" action={<Button variant="secondary" onClick={print}><Printer className="size-4" aria-hidden /> Print address label</Button>}>
          <address className="text-body not-italic">
            {shipTo.name}
            <br />
            {shipTo.address1}
            {shipTo.address2 ? <>, {shipTo.address2}</> : null}
            <br />
            {shipTo.city}, {shipTo.state} {shipTo.postalCode}
          </address>
          {label?.labelUrl ? (
            <a href={label.labelUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-body font-medium text-accent underline">
              Courier label (PDF)
            </a>
          ) : null}
          {o.awb ? <p className="mt-2 text-body text-secondary">{o.carrier} · AWB <span className="font-mono">{o.awb}</span></p> : null}
        </Panel>
      ) : null}

      {o.status === "ready_to_dispatch" ? <Notice tone="info">Ready for the courier. Hand it over from the Orders page (Ready for pickup).</Notice> : null}
      {o.status === "dispatched" ? <Notice tone="ok">Handed to {o.carrier} on {formatTime(o.dispatchedAt)}.</Notice> : null}
      {o.status === "rejected" || o.status === "cancelled" ? <Notice tone="warn">{o.status === "rejected" ? "Declined" : "Cancelled"}: {o.cancelReason}</Notice> : null}

      <Panel title="History">
        <ol className="space-y-1.5 text-body">
          {history.map((e) => (
            <li key={e._id}>
              <span className="text-muted tabular-nums">{formatTime(e.at)}</span> · {e.to.replace(/_/g, " ")}
              {e.reason ? ` · ${e.reason}` : ""}
            </li>
          ))}
        </ol>
      </Panel>

      <Dialog open={declining} onClose={() => setDeclining(false)} title={`Can't fulfil ${o.code}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            act.mutate({ path: "/decline", body: { reason }, ok: "Declined. The order is cancelled for your items and counts in your performance." })
          }}
        >
          <Label htmlFor="dr">Why</Label>
          <Textarea id="dr" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="text-meta text-muted">Declined orders count against your fulfilment rate.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeclining(false)}>
              Back
            </Button>
            <Button type="submit" variant="danger" busy={act.isPending}>
              Decline
            </Button>
          </div>
        </form>
      </Dialog>

      {printing && shipTo ? (
        <div className="print-area print-only w-[100mm] space-y-2 p-4 font-sans">
          <p className="text-meta">From: {me.seller.displayName} · Order #{o.displayId} · {o.code}</p>
          <p className="text-base font-bold">{shipTo.name}</p>
          <p className="text-body">
            {shipTo.address1}
            {shipTo.address2 ? `, ${shipTo.address2}` : ""}
          </p>
          <p className="text-body font-semibold">
            {shipTo.city}, {shipTo.state} {shipTo.postalCode}
          </p>
          {o.awb ? <p className="font-mono text-body">{o.carrier} AWB {o.awb}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
