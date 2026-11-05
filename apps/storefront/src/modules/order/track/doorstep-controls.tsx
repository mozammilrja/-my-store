"use client"

import type { DeliveryPreferences } from "@lib/api/types"
import { updateDeliveryPreferences } from "@lib/data/order-preferences"
import { useState, useTransition } from "react"

type Slot = "morning" | "evening"
type Options = { measuringTape: boolean; reusableBox: boolean }

const SLOTS: { id: Slot; tag: string; time: string; note: string }[] = [
  { id: "morning", tag: "Slot A", time: "10 AM – 1 PM", note: "Morning fitting" },
  { id: "evening", tag: "Slot B", time: "2 PM – 6 PM", note: "Evening fitting" },
]

const OPTIONS: { id: keyof Options; title: string; body: string }[] = [
  {
    id: "measuringTape",
    title: "Request Sartorial Tape on Arrival",
    body: "Courier brings atelier measuring tape to record precise sleeve & chest measurements.",
  },
  {
    id: "reusableBox",
    title: "Zero-Waste Reusable Box Retention",
    body: "Hand back the rigid archival transport box immediately after trial if keeping items.",
  },
]

/**
 * The export's "Doorstep Controls": a handover slot and two doorstep options,
 * saved on the order (PATCH /store/orders/:id/delivery-preferences). Changes
 * show at once and roll back if the save fails; once the order ships the API
 * refuses changes and the controls lock.
 */
export function DoorstepControls({
  orderId,
  initial,
  editable,
}: {
  orderId: string
  initial: DeliveryPreferences | undefined
  editable: boolean
}) {
  const [slot, setSlot] = useState<Slot | null>(initial?.slot ?? null)
  const [options, setOptions] = useState<Options>(initial?.options ?? { measuringTape: false, reusableBox: false })
  const [locked, setLocked] = useState(!editable)
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const save = (nextSlot: Slot | null, nextOptions: Options) => {
    const prev = { slot, options }
    setSlot(nextSlot)
    setOptions(nextOptions)
    setStatus(null)
    startTransition(async () => {
      const res = await updateDeliveryPreferences(orderId, { slot: nextSlot, options: nextOptions })
      if (res.ok) {
        setSlot(res.preferences.slot)
        setOptions(res.preferences.options)
        setStatus({ tone: "ok", text: "Saved to your order." })
      } else {
        setSlot(prev.slot)
        setOptions(prev.options)
        if (res.locked) setLocked(true)
        setStatus({ tone: "error", text: res.error })
      }
    })
  }

  const disabled = locked || pending

  return (
    <div data-testid="doorstep-controls" className="flex flex-col gap-space-md">
      <div>
        <p id="slot-label" className="block font-label-sm text-label-sm text-on-surface mb-2 font-medium">
          Select Preferred Handover Window:
        </p>
        <div className="grid grid-cols-2 gap-space-xs" role="radiogroup" aria-labelledby="slot-label">
          {SLOTS.map((s) => {
            const on = slot === s.id
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => save(on ? null : s.id, options)}
                data-testid={`doorstep-slot-${s.id}`}
                className={`border-2 p-space-sm rounded text-left transition-all disabled:cursor-not-allowed ${
                  on
                    ? "border-primary bg-primary text-on-primary"
                    : "border-transparent bg-surface-container-low hover:bg-surface-container text-on-surface"
                } ${locked && !on ? "opacity-60" : ""} ${disabled ? "" : "cursor-pointer"}`}
              >
                <span className={`block font-label-caps text-label-caps uppercase ${on ? "opacity-80" : "text-on-surface-variant"}`}>{s.tag}</span>
                <span className="font-label-md text-label-md font-semibold">{s.time}</span>
                <span className={`block font-body-sm text-[11px] mt-0.5 ${on ? "opacity-90" : "text-on-surface-variant"}`}>{s.note}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-space-sm pt-space-xs">
        {OPTIONS.map((o) => (
          <label
            key={o.id}
            className={`flex items-start gap-space-sm p-space-sm rounded bg-surface-container-low/40 transition-colors ${
              disabled ? "cursor-not-allowed opacity-70" : "hover:bg-surface-container-low cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={options[o.id]}
              disabled={disabled}
              onChange={(e) => save(slot, { ...options, [o.id]: e.target.checked })}
              className="mt-1 w-4 h-4 accent-primary rounded cursor-pointer disabled:cursor-not-allowed"
              data-testid={`doorstep-option-${o.id}`}
            />
            <div className="text-left">
              <span className="block font-label-sm text-label-sm font-semibold text-primary">{o.title}</span>
              <span className="block font-body-sm text-[12px] text-on-surface-variant">{o.body}</span>
            </div>
          </label>
        ))}
      </div>
      <p role="status" aria-live="polite" className="font-body-sm text-[12px] min-h-0" data-testid="doorstep-status">
        {pending ? (
          <span className="text-on-surface-variant">Saving…</span>
        ) : status ? (
          <span className={status.tone === "ok" ? "text-emerald-700" : "text-error"}>{status.text}</span>
        ) : locked ? (
          <span className="text-on-surface-variant">Your order has left the warehouse, so these choices are now fixed.</span>
        ) : null}
      </p>
    </div>
  )
}
