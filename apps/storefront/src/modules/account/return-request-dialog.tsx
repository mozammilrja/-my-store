"use client"

import { StoreSelect } from "@/components/store/store-select"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Customer, OrderSummary, ReturnOptions } from "@lib/api/types"
import { createReturnRequest, getReturnOptions } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import Image from "next/image"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

type RequestType = "return" | "exchange"
type Method = "pickup" | "self_ship"
/** Per line: units going back, why, and for an exchange which size or colour instead. */
type Pick = { quantity: number; reason: string; note: string; exchangeVariantId: string }

/**
 * "Return or exchange": pick a delivered order, the lines and quantities going
 * back with a reason each, refund or exchange (another size or colour at the
 * same price), and door pickup or sending it yourself. What's offered comes
 * from the API (what's left to return, the refund each unit earns, sizes in
 * stock), which checks the same rules again on submit.
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
  /** Delivered orders with no return in progress. */
  orders: OrderSummary[]
  orderId: string
  onOrderChange: (id: string) => void
  customer: Customer
  returnWindowDays: number | null
}) {
  const order = orders.find((o) => o.id === orderId) ?? orders[0]
  const [loaded, setLoaded] = useState<{ orderId: string; options: ReturnOptions | null; error: string | null } | null>(null)
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [type, setType] = useState<RequestType>("return")
  const [method, setMethod] = useState<Method>("pickup")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Options for the chosen order, fetched when the dialog opens or the order changes.
  useEffect(() => {
    if (!open || !order) return
    let live = true
    getReturnOptions(order.id).then((r) => {
      if (!live) return
      setLoaded({ orderId: order.id, ...r })
      setPicks({})
    })
    return () => {
      live = false
    }
  }, [open, order])

  // Only what was loaded for the order on screen (none chosen, nothing loaded: neither applies).
  const current = loaded && order && loaded.orderId === order.id ? loaded : null
  const options = current?.options ?? null
  const loadError = current?.error ?? null
  const items = options?.items.filter((i) => i.returnable > 0) ?? []
  const chosen = Object.entries(picks).filter(([, p]) => p.quantity > 0)
  const estimate = chosen.reduce((s, [id, p]) => s + (items.find((i) => i.itemId === id)?.refundPerUnit ?? 0) * p.quantity, 0)
  const exchangeable = items.some((i) => i.exchangeFor.length > 0)
  const address = customer.addresses[0] ?? null
  const firstReason = options?.reasons[0]?.value ?? "other"

  const toggle = (itemId: string, max: number) => {
    const next = { ...picks }
    if (next[itemId]) delete next[itemId]
    else next[itemId] = { quantity: max, reason: firstReason, note: "", exchangeVariantId: items.find((i) => i.itemId === itemId)?.exchangeFor[0]?.variantId ?? "" }
    setPicks(next)
  }
  const update = (itemId: string, patch: Partial<Pick>) => setPicks({ ...picks, [itemId]: { ...picks[itemId]!, ...patch } })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!order) return
    if (!chosen.length) return setError("Choose at least one item.")
    if (chosen.some(([, p]) => p.reason === "other" && !p.note.trim())) return setError("Tell us a little about the reason.")
    if (type === "exchange" && chosen.some(([, p]) => !p.exchangeVariantId)) return setError("Choose the size or colour you'd like instead.")
    startTransition(async () => {
      const res = await createReturnRequest({
        orderId: order.id,
        type,
        method,
        items: chosen.map(([itemId, p]) => ({ itemId, quantity: p.quantity, reason: p.reason, ...(p.note.trim() ? { note: p.note.trim() } : {}), ...(type === "exchange" ? { exchangeVariantId: p.exchangeVariantId } : {}) })),
      })
      if (res.error) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success(`${type === "exchange" ? "Exchange" : "Return"} ${res.code} requested. We'll confirm it shortly.`)
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
              {returnWindowDays ? `Items can be sent back within ${returnWindowDays} days of delivery.` : "Items can be sent back once delivered."}
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
              <div>
                <label htmlFor="return-order" className={sectionLabel}>
                  1. Order and items
                </label>
                <StoreSelect
                  id="return-order"
                  className="px-3 rounded-lg bg-surface-container"
                  value={order.id}
                  onValueChange={(id) => {
                    setError(null)
                    onOrderChange(id)
                  }}
                  options={orders.map((o) => ({ value: o.id, label: `#${o.displayId} · ${o.itemCount} ${o.itemCount === 1 ? "item" : "items"} · ${formatMoney(o.total, o.currency)}` }))}
                  data-testid="return-order-select"
                />
                {loadError ? (
                  <p role="alert" className="mt-3 font-body-sm text-body-sm text-error">
                    {loadError}
                  </p>
                ) : !options ? (
                  <p role="status" className="mt-3 font-body-sm text-body-sm text-on-surface-variant">
                    Loading the items…
                  </p>
                ) : items.length === 0 ? (
                  <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">Everything on this order has already been sent back.</p>
                ) : (
                  <fieldset className="mt-3 flex flex-col gap-2">
                    <legend className="sr-only">Items to send back</legend>
                    {items.map((item) => {
                      const p = picks[item.itemId]
                      return (
                        <div key={item.itemId} className={`rounded-lg border transition-colors ${p ? "border-primary bg-surface-container-lowest" : "border-surface-container-high bg-surface-container-low"}`}>
                          <div className="flex items-center gap-3 p-3">
                            <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 accent-primary shrink-0" checked={!!p} onChange={() => toggle(item.itemId, item.returnable)} data-testid="return-item-checkbox" />
                              <span className="w-12 h-14 rounded bg-surface-container-high overflow-hidden relative shrink-0">
                                {item.thumbnail && <Image src={item.thumbnail} alt="" fill sizes="48px" className="object-cover" />}
                              </span>
                              <span className="flex flex-col min-w-0">
                                <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">{item.productTitle}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                                  {[item.variantTitle && item.variantTitle.toLowerCase() !== "default" ? item.variantTitle : null, `refund ${formatMoney(item.refundPerUnit, order.currency)} each`].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                            </label>
                            {item.returnable > 1 && p && (
                              <div className="w-20 shrink-0">
                                <StoreSelect
                                  aria-label={`Quantity of ${item.productTitle}`}
                                  className="h-9 px-2 rounded bg-surface-container"
                                  value={String(p.quantity)}
                                  onValueChange={(v) => update(item.itemId, { quantity: Number(v) })}
                                  options={Array.from({ length: item.returnable }, (_, n) => ({ value: String(n + 1), label: `Qty ${n + 1}` }))}
                                />
                              </div>
                            )}
                          </div>
                          {p && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 pb-3">
                              <div>
                                <label htmlFor={`reason-${item.itemId}`} className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                                  Reason
                                </label>
                                <StoreSelect id={`reason-${item.itemId}`} className="h-10 px-3 rounded bg-surface-container" value={p.reason} onValueChange={(v) => update(item.itemId, { reason: v })} options={options.reasons} data-testid="return-reason-select" />
                              </div>
                              {type === "exchange" ? (
                                <div>
                                  <label htmlFor={`swap-${item.itemId}`} className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                                    Exchange for
                                  </label>
                                  {item.exchangeFor.length ? (
                                    <StoreSelect
                                      id={`swap-${item.itemId}`}
                                      className="h-10 px-3 rounded bg-surface-container"
                                      value={p.exchangeVariantId}
                                      onValueChange={(v) => update(item.itemId, { exchangeVariantId: v })}
                                      options={item.exchangeFor.map((v) => ({ value: v.variantId, label: v.title }))}
                                    />
                                  ) : (
                                    <p className="font-body-sm text-body-sm text-on-surface-variant pt-2">No other size in stock. Choose a refund for this one.</p>
                                  )}
                                </div>
                              ) : null}
                              <div className="sm:col-span-2">
                                <label htmlFor={`note-${item.itemId}`} className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                                  {p.reason === "other" ? "Tell us what happened" : "Anything to add (optional)"}
                                </label>
                                <textarea
                                  id={`note-${item.itemId}`}
                                  value={p.note}
                                  onChange={(e) => update(item.itemId, { note: e.target.value })}
                                  rows={2}
                                  maxLength={500}
                                  className="w-full p-3 rounded bg-surface-container-low border border-surface-container-high font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </fieldset>
                )}
              </div>

              <fieldset>
                <legend className={sectionLabel}>2. What would you like?</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      { id: "return", title: "Refund", note: "To your original payment method", disabled: false },
                      { id: "exchange", title: "Exchange", note: exchangeable ? "Another size or colour, same price" : "No other size in stock right now", disabled: !exchangeable },
                    ] as const
                  ).map((o) => (
                    <label key={o.id} className={`${optionClass(type === o.id)} ${o.disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
                      <input type="radio" name="return_type" disabled={o.disabled} className="mt-0.5 w-4 h-4 accent-primary shrink-0" checked={type === o.id} onChange={() => setType(o.id)} data-testid={`return-type-${o.id === "return" ? "refund" : "exchange"}`} />
                      <span className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">{o.title}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{o.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={sectionLabel}>3. How it comes back</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      { id: "pickup", title: "Pickup from your door", note: address ? `${address.address1}, ${address.city}` : "From your delivery address" },
                      { id: "self_ship", title: "I'll send it", note: "Post it to us and add the AWB here" },
                    ] as const
                  ).map((o) => (
                    <label key={o.id} className={optionClass(method === o.id)}>
                      <input type="radio" name="return_method" className="mt-0.5 w-4 h-4 accent-primary shrink-0" checked={method === o.id} onChange={() => setMethod(o.id)} data-testid={`return-method-${o.id}`} />
                      <span className="flex flex-col min-w-0">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface">{o.title}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{o.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {type === "return" && chosen.length > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Refund after inspection</span>
                  <span className="font-body-md text-body-md font-semibold text-on-surface" data-testid="return-estimate">
                    {formatMoney(estimate, order.currency)}
                  </span>
                </div>
              )}
              {error && (
                <p role="alert" className="font-body-sm text-body-sm text-error">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-container-high">
              <button type="button" onClick={() => onOpenChange(false)} className="h-11 px-5 rounded-lg font-label-md text-label-md uppercase tracking-wider text-on-surface hover:bg-surface-container">
                Cancel
              </button>
              <button type="submit" disabled={pending || !options || !items.length} className="h-11 px-6 rounded-lg bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold disabled:opacity-60" data-testid="return-submit">
                {pending ? "Sending…" : type === "exchange" ? "Request exchange" : "Request return"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
