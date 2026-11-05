"use client"

import type { Customer, OrderSummary, ReturnStatus, StoreReturn } from "@lib/api/types"
import { addReturnShipping, cancelReturnRequest } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { ReturnRequestDialog } from "./return-request-dialog"

const OPEN: ReturnStatus[] = ["requested", "approved", "pickup_scheduled", "in_transit", "received", "inspected", "refund_pending"]

const STATUS_TEXT: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  pickup_scheduled: "Pickup booked",
  in_transit: "On its way back",
  received: "Received",
  inspected: "Inspected",
  refund_pending: "Refund on its way",
  refunded: "Refunded",
  exchanged: "Exchange sent",
  rejected: "Not accepted",
  cancelled: "Cancelled",
}

/** The steps a return goes through, in order; the last depends on refund or exchange. */
const steps = (r: StoreReturn): { key: ReturnStatus[]; label: string }[] => [
  { key: ["requested"], label: "Requested" },
  { key: ["approved"], label: "Approved" },
  { key: r.method === "pickup" ? ["pickup_scheduled", "in_transit"] : ["in_transit"], label: r.method === "pickup" ? "Picked up" : "Sent back" },
  { key: ["received"], label: "Received" },
  { key: ["inspected"], label: "Inspected" },
  r.type === "exchange" ? { key: ["exchanged"], label: "Exchange sent" } : { key: ["refund_pending", "refunded"], label: "Refunded" },
]

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })

export function ReturnsView({
  customer,
  orders,
  returns,
  returnWindowDays = null,
}: {
  customer: Customer
  orders: OrderSummary[]
  returns: StoreReturn[]
  returnWindowDays?: number | null
}) {
  const searchParams = useSearchParams()
  const preselectedOrderId = searchParams.get("orderId")
  const [modalOpen, setModalOpen] = useState(!!preselectedOrderId)
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "eligible">("active")
  const [searchQuery, setSearchQuery] = useState("")
  const [now] = useState(() => Date.now())

  // Delivered, not cancelled, not a replacement, no return in progress and, when known, inside the window.
  const eligibleOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (o.status === "canceled" || o.fulfillmentStatus !== "delivered") return false
        if (returns.some((r) => r.orderId === o.id && OPEN.includes(r.status))) return false
        const delivered = o.shipment?.deliveredAt ? Date.parse(o.shipment.deliveredAt) : NaN
        if (returnWindowDays && !Number.isNaN(delivered) && now - delivered > returnWindowDays * 86_400_000) return false
        return true
      }),
    [orders, returns, returnWindowDays, now]
  )
  const [selectedOrderId, setSelectedOrderId] = useState<string>(preselectedOrderId ?? eligibleOrders[0]?.id ?? "")

  const active = returns.filter((r) => OPEN.includes(r.status))
  const completed = returns.filter((r) => !OPEN.includes(r.status))
  const refunded = returns.filter((r) => r.refund?.status === "processed").reduce((s, r) => s + (r.refund?.amount ?? 0), 0)
  const currency = returns[0]?.currency ?? orders[0]?.currency ?? "inr"
  const match = (r: StoreReturn) => !searchQuery || r.code.toLowerCase().includes(searchQuery.toLowerCase()) || String(r.displayId).includes(searchQuery) || r.items.some((i) => i.productTitle.toLowerCase().includes(searchQuery.toLowerCase()))

  const tab = (id: typeof activeTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === id}
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-lg font-label-md text-label-md uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
        activeTab === id ? "bg-primary text-on-primary font-semibold" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-space-lg w-full" data-testid="returns-refunds-view">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-md pb-space-md border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
            <span>Account</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-on-surface">Returns &amp; Refunds</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase font-medium">Returns &amp; Refunds</h1>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-11 px-6 bg-primary text-on-primary hover:bg-inverse-surface font-label-md text-label-md rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider font-semibold shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Return or exchange</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {[
          { label: "Eligible for return", icon: "inventory_2", value: `${eligibleOrders.length} ${eligibleOrders.length === 1 ? "order" : "orders"}`, note: returnWindowDays ? `Within ${returnWindowDays} days of delivery` : "Once delivered" },
          { label: "In progress", icon: "local_shipping", value: `${active.length} ${active.length === 1 ? "request" : "requests"}`, note: active.length ? "Track each one below" : "Nothing on its way back" },
          { label: "Refunded", icon: "payments", value: formatMoney(refunded, currency), note: "To your original payment method" },
        ].map((c) => (
          <div key={c.label} className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">{c.label}</span>
              <span className="material-symbols-outlined text-primary text-[20px]">{c.icon}</span>
            </div>
            <div>
              <div className="font-headline-xl text-headline-xl text-on-surface font-light" data-testid={`returns-metric-${c.icon}`}>
                {c.value}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{c.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md pt-space-xs">
        <div role="tablist" aria-label="Returns" className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {tab("active", `In progress (${active.length})`)}
          {tab("completed", `Completed (${completed.length})`)}
          {tab("eligible", `Eligible orders (${eligibleOrders.length})`)}
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search returns"
            className="w-full h-10 pl-9 pr-3 bg-surface-container-lowest text-on-surface font-body-sm text-body-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all border border-surface-container-high"
            placeholder="Return code, order or item"
            type="text"
          />
        </div>
      </div>

      {activeTab !== "eligible" ? (
        <div className="flex flex-col gap-space-lg">
          {(activeTab === "active" ? active : completed).filter(match).length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 text-center flex flex-col items-center border border-dashed border-outline-variant">
              <span className="material-symbols-outlined text-[28px] text-outline mb-3">published_with_changes</span>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{activeTab === "active" ? "No returns in progress" : "No completed returns yet"}</h3>
              {eligibleOrders.length > 0 && activeTab === "active" && (
                <button type="button" onClick={() => setModalOpen(true)} className="mt-4 h-10 px-5 bg-primary text-on-primary rounded font-label-sm text-label-sm uppercase font-semibold">
                  Start a return
                </button>
              )}
            </div>
          ) : (
            (activeTab === "active" ? active : completed).filter(match).map((r) => <ReturnCard key={r.id} r={r} />)
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {eligibleOrders.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">No delivered orders can be returned right now.</p>
          ) : (
            eligibleOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-4 bg-surface-container-lowest rounded-xl p-space-md border border-surface-container-high/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex -space-x-3">
                    {o.thumbnails.slice(0, 3).map((t, i) => (
                      <span key={i} className="w-12 h-14 rounded bg-surface-container-high overflow-hidden relative border-2 border-surface-container-lowest">
                        {t && <Image src={t} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-on-surface font-medium">Order #{o.displayId}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · delivered {o.shipment?.deliveredAt ? day(o.shipment.deliveredAt) : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(o.id)
                    setModalOpen(true)
                  }}
                  className="h-10 px-4 rounded-lg border border-primary text-primary font-label-sm text-label-sm uppercase font-semibold shrink-0"
                >
                  Return or exchange
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <ReturnRequestDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        orders={eligibleOrders}
        orderId={selectedOrderId}
        onOrderChange={setSelectedOrderId}
        customer={customer}
        returnWindowDays={returnWindowDays}
      />
    </div>
  )
}

function ReturnCard({ r }: { r: StoreReturn }) {
  const [pending, startTransition] = useTransition()
  const [carrier, setCarrier] = useState("")
  const [awb, setAwb] = useState("")
  const s = steps(r)
  const reached = new Map(r.timeline.map((t) => [t.status, t.at]))
  const doneUpTo = s.reduce((n, st, i) => (st.key.some((k) => reached.has(k)) ? i : n), 0)
  const ended = r.status === "rejected" || r.status === "cancelled"
  const tone = ended ? "bg-surface-container-high text-on-surface-variant" : OPEN.includes(r.status) ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary text-on-primary"

  const cancel = () =>
    startTransition(async () => {
      const res = await cancelReturnRequest(r.id)
      if (res.error) toast.error(res.error)
      else toast.success(`${r.code} cancelled`)
    })
  const ship = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await addReturnShipping(r.id, carrier, awb)
      if (res.error) toast.error(res.error)
      else toast.success("Thanks. We'll look out for it.")
    })
  }

  return (
    <article className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col gap-space-lg border border-surface-container-high/60" data-testid="return-card" aria-label={`${r.type === "exchange" ? "Exchange" : "Return"} ${r.code}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md pb-space-md border-b border-surface-container">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`font-label-caps text-label-caps px-2.5 py-1 rounded font-bold uppercase ${tone}`} data-testid="return-status">
            {STATUS_TEXT[r.status]}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {r.type === "exchange" ? "Exchange" : "Return"} <strong className="text-on-surface font-medium">{r.code}</strong>
          </span>
          <span className="text-outline-variant">&bull;</span>
          <LocalizedClientLink href={`/account/orders/details/${r.orderId}`} className="font-body-sm text-body-sm text-on-surface-variant underline underline-offset-4">
            Order #{r.displayId}
          </LocalizedClientLink>
        </div>
        {r.type === "return" && (
          <div className="flex items-center gap-2">
            <span className="font-body-sm text-body-sm text-on-surface-variant">{r.refund ? "Refund" : "Refund after inspection"}:</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">{formatMoney(r.refund?.amount ?? r.refundableAmount, r.currency)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <ul className="lg:col-span-4 flex flex-col gap-3">
          {r.items.map((i) => (
            <li key={i.itemId} className="flex items-center gap-space-md">
              <span className="w-16 h-20 bg-surface-container-low rounded-lg overflow-hidden shrink-0 relative">{i.thumbnail && <Image src={i.thumbnail} alt="" fill sizes="64px" className="object-cover" />}</span>
              <span className="min-w-0">
                <span className="block font-body-md text-body-md text-on-surface font-medium truncate">{i.productTitle}</span>
                <span className="block font-body-sm text-body-sm text-on-surface-variant">
                  {i.variantTitle}
                  {i.exchangeFor ? ` → ${i.exchangeFor}` : ""} · Qty {i.quantity}
                </span>
                <span className="block font-label-sm text-label-sm text-on-surface-variant">
                  {i.reason}
                  {i.note ? `: ${i.note}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {ended ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {r.status === "cancelled" ? `Cancelled on ${day(r.updatedAt)}.` : `Not accepted${r.rejectionReason ? `: ${r.rejectionReason}` : ""}.`}
            </p>
          ) : (
            <ol className="grid grid-cols-6 gap-1" aria-label="Progress">
              {s.map((st, i) => {
                const at = st.key.map((k) => reached.get(k)).find(Boolean)
                const done = i <= doneUpTo
                return (
                  <li key={st.label} className="flex flex-col items-center text-center" aria-current={i === doneUpTo ? "step" : undefined}>
                    <span className={`w-full h-1 rounded-full mb-2 ${done ? "bg-secondary" : "bg-surface-container-high"}`} />
                    <span className={`font-label-sm text-label-sm ${done ? "text-on-surface font-medium" : "text-on-surface-variant"}`}>{st.label}</span>
                    <span className="text-[11px] text-on-surface-variant">{at ? day(at) : ""}</span>
                  </li>
                )
              })}
            </ol>
          )}

          {r.pickup?.awb && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Pickup by {r.pickup.carrier || "our courier"} · AWB <span className="font-mono text-on-surface">{r.pickup.awb}</span>
              {r.pickup.events.at(-1) ? ` · ${r.pickup.events.at(-1)!.status}` : ""}
              {r.pickup.trackingUrl && (
                <>
                  {" · "}
                  <a href={r.pickup.trackingUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Track
                  </a>
                </>
              )}
            </p>
          )}
          {r.selfShip && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Sent with {r.selfShip.carrier} · AWB <span className="font-mono text-on-surface">{r.selfShip.awb}</span>
            </p>
          )}
          {r.status === "requested" && <p className="font-body-sm text-body-sm text-on-surface-variant">We&apos;re reviewing your request.</p>}
          {r.status === "approved" && r.method === "pickup" && <p className="font-body-sm text-body-sm text-on-surface-variant">Approved. We&apos;re booking a pickup from your address.</p>}
          {r.refund && <p className="font-body-sm text-body-sm text-on-surface-variant">Refund of {formatMoney(r.refund.amount, r.currency)} {r.refund.status === "processed" ? `processed on ${day(r.refund.at)}` : "is on its way to your bank"}.</p>}
          {r.exchangeOrder && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Your replacement is order{" "}
              <LocalizedClientLink href={`/order/${r.exchangeOrder.id}/track`} className="underline underline-offset-4 text-on-surface">
                #{r.exchangeOrder.displayId}
              </LocalizedClientLink>
              {r.exchangeOrder.awb ? ` (AWB ${r.exchangeOrder.awb})` : ""}.
            </p>
          )}

          {r.canAddShipping && (
            <form onSubmit={ship} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-lg bg-surface-container-low p-space-md">
              <p className="sm:col-span-3 font-body-sm text-body-sm text-on-surface">Approved. Post it to us, then tell us the courier and AWB.</p>
              <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
                Courier
                <input required minLength={2} value={carrier} onChange={(e) => setCarrier(e.target.value)} className="h-10 px-3 rounded bg-surface-container-lowest border border-surface-container-high text-on-surface font-body-sm" />
              </label>
              <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">
                AWB / tracking number
                <input required pattern="[A-Za-z0-9-]{4,40}" value={awb} onChange={(e) => setAwb(e.target.value)} className="h-10 px-3 rounded bg-surface-container-lowest border border-surface-container-high text-on-surface font-mono text-sm" />
              </label>
              <button type="submit" disabled={pending} className="h-10 px-5 rounded bg-primary text-on-primary font-label-sm text-label-sm uppercase font-semibold disabled:opacity-60">
                Save
              </button>
            </form>
          )}
          {r.canCancel && (
            <div>
              <button type="button" onClick={cancel} disabled={pending} className="h-10 px-4 rounded-lg border border-surface-container-high font-label-sm text-label-sm uppercase text-on-surface hover:bg-surface-container disabled:opacity-60">
                Cancel {r.type === "exchange" ? "exchange" : "return"}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
