"use client"

import { StoreSelect } from "@/components/store/store-select"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Customer, OrderSummary } from "@lib/api/types"
import { requestReturn } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useState, useTransition } from "react"
import { toast } from "sonner"

const REASONS = [
  "Size is too large",
  "Size is too small",
  "Colour or fabric differs from the photos",
  "Received a damaged or faulty item",
  "Received the wrong item",
  "No longer needed",
  "Other",
]

type RequestType = "refund" | "exchange"

/** Line id -> quantity to send back; a line missing from the map isn't returned. */
type Picks = Record<string, number>

const allLines = (order: OrderSummary | undefined): Picks =>
  Object.fromEntries((order?.items ?? []).map((i) => [i.id, i.quantity]))

/**
 * "Initiate return or exchange": pick a returnable order, the lines and
 * quantities going back, refund or exchange, and a reason. The API checks
 * the same rules (delivered, inside the window, no open request) again.
 */
export function ReturnRequestDialog({
  open,
  onOpenChange,
  orders,
  orderId,
  onOrderChange,
  customer,
  returnWindowDays,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Only the orders that can still be returned. */
  orders: OrderSummary[]
  orderId: string
  onOrderChange: (id: string) => void
  customer: Customer
  returnWindowDays: number | null
}) {
  const order = orders.find((o) => o.id === orderId) ?? orders[0]
  const [picksFor, setPicksFor] = useState<{ orderId: string | undefined; picks: Picks }>(() => ({
    orderId: order?.id,
    picks: allLines(order),
  }))
  // Switching order starts again with every line of the new one selected.
  const picks = picksFor.orderId === order?.id ? picksFor.picks : allLines(order)
  const setPicks = (next: Picks) => setPicksFor({ orderId: order?.id, picks: next })

  const [type, setType] = useState<RequestType>("refund")
  const [reason, setReason] = useState(REASONS[0]!)
  const [details, setDetails] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const address = customer.addresses[0] ?? null
  const chosen = Object.entries(picks).filter(([, q]) => q > 0)
  const refundValue = (order?.items ?? []).reduce((sum, i) => sum + (picks[i.id] ?? 0) * i.unitPrice, 0)
  const needsDetails = reason === "Other" && !details.trim()

  const toggle = (id: string, max: number) => {
    const next = { ...picks }
    if (next[id]) delete next[id]
    else next[id] = max
    setPicks(next)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!order) return
    if (!chosen.length) return setError("Choose at least one item to return.")
    if (needsDetails) return setError("Tell us a little about the reason.")
    const text = [type === "exchange" ? "Exchange" : "Refund", reason, details.trim()].filter(Boolean).join(": ")
    startTransition(async () => {
      const res = await requestReturn(
        order.id,
        text,
        chosen.map(([itemId, quantity]) => ({ itemId, quantity }))
      )
      if (res.error) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success(type === "exchange" ? "Exchange requested. We'll confirm the pickup shortly." : "Return requested. We'll confirm the pickup shortly.")
      setDetails("")
      onOpenChange(false)
    })
  }

  const optionClass = (active: boolean) =>
    `flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
      active ? "border-primary bg-surface-container-lowest" : "border-surface-container-high bg-surface-container-low hover:border-outline"
    }`
  const sectionLabel = "font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block mb-2"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] sm:max-w-xl bg-surface-container-lowest p-0 gap-0 rounded-xl overflow-hidden shadow-2xl border border-surface-container-high max-h-[90vh] flex flex-col"
        data-testid="return-dialog"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-surface-container-high">
          <div className="min-w-0">
            <DialogTitle className="font-headline-sm text-headline-sm text-on-surface font-semibold">Return or exchange</DialogTitle>
            <DialogDescription className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {returnWindowDays ? `Items can be sent back within ${returnWindowDays} days of delivery. ` : ""}
              We collect from your door.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="shrink-0 w-9 h-9 -mr-2 -mt-1 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {!order ? (
          <div className="px-6 py-10 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-outline">assignment_return</span>
            <p className="font-body-md text-body-md text-on-surface font-medium">No orders can be returned right now</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              Returns open once an order is delivered{returnWindowDays ? ` and stay open for ${returnWindowDays} days` : ""}. Orders with a return already in progress aren&apos;t listed.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
            <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">
              {/* 1. Order and items */}
              <div>
                <label htmlFor="return-order" className={sectionLabel}>
                  1. Order
                </label>
                <StoreSelect
                  id="return-order"
                  className="px-3 rounded-lg bg-surface-container"
                  value={order.id}
                  onValueChange={(id) => {
                    setError(null)
                    onOrderChange(id)
                  }}
                  options={orders.map((o) => ({
                    value: o.id,
                    label: `#${o.displayId} · ${o.itemCount} ${o.itemCount === 1 ? "item" : "items"} · ${formatMoney(o.total, o.currency)}`,
                  }))}
                  data-testid="return-order-select"
                />
                <fieldset className="mt-3 flex flex-col gap-2">
                  <legend className="sr-only">Items to return</legend>
                  {(order.items ?? []).map((item) => {
                    const qty = picks[item.id] ?? 0
                    const on = qty > 0
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          on ? "border-primary bg-surface-container-lowest" : "border-surface-container-high bg-surface-container-low"
                        }`}
                      >
                        <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-primary shrink-0"
                            checked={on}
                            onChange={() => toggle(item.id, item.quantity)}
                            data-testid="return-item-checkbox"
                          />
                          <span className="w-12 h-14 rounded bg-surface-container-high overflow-hidden relative shrink-0">
                            {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="48px" className="object-cover" />}
                          </span>
                          <span className="flex flex-col min-w-0">
                            <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{item.productTitle}</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                              {[item.variantTitle && item.variantTitle.toLowerCase() !== "default" ? item.variantTitle : null, formatMoney(item.unitPrice, order.currency)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </label>
                        {item.quantity > 1 && on && (
                          <div className="w-20 shrink-0">
                            <StoreSelect
                              aria-label={`Quantity of ${item.productTitle} to return`}
                              className="h-9 px-2 rounded bg-surface-container"
                              value={String(qty)}
                              onValueChange={(v) => setPicks({ ...picks, [item.id]: Number(v) })}
                              options={Array.from({ length: item.quantity }, (_, n) => ({ value: String(n + 1), label: `Qty ${n + 1}` }))}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </fieldset>
              </div>

              {/* 2. Refund or exchange */}
              <fieldset>
                <legend className={sectionLabel}>2. What would you like?</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      { id: "refund", title: "Refund", note: "To your original payment method" },
                      { id: "exchange", title: "Exchange", note: "Another size or colour" },
                    ] as const
                  ).map((o) => (
                    <label key={o.id} className={optionClass(type === o.id)}>
                      <input
                        type="radio"
                        name="return_type"
                        className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                        checked={type === o.id}
                        onChange={() => setType(o.id)}
                        data-testid={`return-type-${o.id}`}
                      />
                      <span className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">{o.title}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{o.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 3. Reason */}
              <div>
                <label htmlFor="return-reason" className={sectionLabel}>
                  3. Reason
                </label>
                <StoreSelect
                  id="return-reason"
                  className="px-3 rounded-lg bg-surface-container"
                  value={reason}
                  onValueChange={setReason}
                  options={REASONS.map((r) => ({ value: r, label: r }))}
                  data-testid="return-reason-select"
                />
                <textarea
                  className="mt-3 w-full p-3 rounded-lg bg-surface-container font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                  rows={2}
                  maxLength={300}
                  placeholder={reason === "Other" ? "Tell us what went wrong (required)" : "Anything else we should know? (optional)"}
                  aria-label="More about the reason"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  data-testid="return-details-input"
                />
              </div>

              {/* 4. Pickup */}
              <div>
                <span className={sectionLabel}>4. Pickup address</span>
                <div className="p-4 rounded-lg bg-surface-container-low border border-surface-container-high flex items-start justify-between gap-4">
                  {address ? (
                    <div className="min-w-0">
                      <p className="font-body-sm text-body-sm font-semibold text-on-surface">
                        {[address.firstName, address.lastName].filter(Boolean).join(" ")}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 break-words">
                        {[address.address1, address.address2, address.city].filter(Boolean).join(", ")}
                        {address.postalCode ? ` – ${address.postalCode}` : ""}
                      </p>
                      {address.phone && <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{address.phone}</p>}
                    </div>
                  ) : (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">No saved address. We&apos;ll call to arrange the pickup.</p>
                  )}
                  <LocalizedClientLink
                    href="/account/addresses"
                    className="shrink-0 font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {address ? "Change" : "Add"}
                  </LocalizedClientLink>
                </div>
              </div>

              {error && (
                <p className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm" role="alert" data-testid="return-error">
                  {error}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-surface-container-high bg-surface-container-low flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {chosen.length ? (
                  <>
                    {type === "refund" ? "Refund value" : "Exchange value"}:{" "}
                    <span className="font-semibold text-on-surface tabular-nums">{formatMoney(refundValue, order.currency)}</span>
                  </>
                ) : (
                  "No items selected"
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="h-10 px-4 rounded-lg font-label-sm text-label-sm uppercase tracking-wider text-on-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !chosen.length || needsDetails}
                  className="h-10 px-5 rounded-lg bg-primary text-on-primary hover:bg-inverse-surface font-label-sm text-label-sm uppercase tracking-wider font-semibold transition-colors disabled:opacity-50"
                  data-testid="return-submit"
                >
                  {pending ? "Submitting…" : type === "exchange" ? "Request exchange" : "Request return"}
                </button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
