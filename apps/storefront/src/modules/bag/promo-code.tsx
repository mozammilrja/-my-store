"use client"

import { ensureOk } from "@lib/util/cart-action"
import { applyPromotions } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import type { Cart } from "@lib/api/types"
import { FormEvent, useState } from "react"
import { toast } from "sonner"

export function PromoCode({ cart }: { cart: Cart }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const applied = cart.promoCodes

  const apply = async (codes: string[]) => {
    setPending(true)
    setError(null)
    try {
      ensureOk(await applyPromotions(codes))
      notifyCartUpdated()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code couldn't be applied.")
      return false
    } finally {
      setPending(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value || pending) return
    if (applied.includes(value)) {
      setError("That code is already applied.")
      return
    }
    const success = await apply([...applied, value])
    if (success) {
      setCode("")
      toast.success(`Coupon code ${value} applied successfully`)
    }
  }

  const removeCode = async (codeToRemove: string) => {
    const next = applied.filter((c) => c !== codeToRemove)
    await apply(next)
    toast.info(`Removed promo code ${codeToRemove}`)
  }

  return (
    <div className="p-space-lg bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.02)] border border-surface-container-high/60">
      <span className="font-label-caps text-label-caps tracking-wider uppercase text-on-surface-variant block mb-space-sm font-bold">
        Promotional Offers &amp; Coupons
      </span>

      <form onSubmit={submit} className="flex items-center gap-space-xs" noValidate>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            local_offer
          </span>
          <input
            id="promo-code"
            value={code}
            maxLength={64}
            autoComplete="off"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              if (error) setError(null)
            }}
            placeholder="Enter coupon code"
            className="w-full h-11 pl-11 pr-space-md bg-surface-container-low text-on-surface text-[14px] font-medium rounded-lg uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
            data-testid="discount-input"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="h-11 px-space-lg bg-secondary text-on-secondary font-label-md text-label-md uppercase tracking-wider rounded-lg hover:bg-secondary/90 transition-colors cursor-pointer disabled:opacity-50 shrink-0 font-semibold"
        >
          {pending ? "Applying..." : "Apply"}
        </button>
      </form>

      {/* Applied Promo Codes List */}
      {applied.length > 0 && (
        <div className="mt-space-sm flex flex-col gap-1.5">
          {applied.map((c) => (
            <div
              key={c}
              className="flex items-center justify-between text-secondary font-label-sm text-label-sm bg-secondary-fixed/30 px-3 py-1.5 rounded-lg border border-secondary/20"
            >
              <span className="flex items-center gap-space-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Code {c} applied successfully
              </span>
              <button
                type="button"
                onClick={() => removeCode(c)}
                disabled={pending}
                className="text-on-surface-variant hover:text-error transition-colors p-0.5 cursor-pointer"
                title={`Remove code ${c}`}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs font-body-sm text-error flex items-center gap-1" role="alert">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
    </div>
  )
}
