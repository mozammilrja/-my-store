"use client"

import { applyPromotions } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { MIcon } from "./m-icon"
import { type FormEvent, useState } from "react"

/**
 * The coupon box of the checkout exports. Each step's design draws it a
 * little differently (the `variant`), but all apply real codes through the
 * bag's promotions endpoint and show only codes the API accepted.
 */
export function PromoField({
  applied,
  variant,
}: {
  applied: string[]
  variant: "address" | "delivery" | "shipping" | "payment"
}) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const apply = async (codes: string[]) => {
    setPending(true)
    setError(null)
    const result = await applyPromotions(codes)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return false
    }
    // applyPromotions re-renders this page in its own response.
    notifyCartUpdated()
    return true
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value || pending) return
    if (applied.includes(value)) {
      setError("That code is already applied.")
      return
    }
    if (await apply([...applied, value])) setCode("")
  }

  const remove = (c: string) => apply(applied.filter((x) => x !== c))

  const input = (className: string, placeholder: string, iconClass?: string) => (
    <div className="relative flex-1">
      {iconClass && <MIcon name="sell" className={iconClass} />}
      <input
        id={`coupon-input-${variant}`}
        aria-label="Coupon code"
        className={className}
        placeholder={placeholder}
        type="text"
        value={code}
        maxLength={64}
        autoComplete="off"
        onChange={(e) => {
          setCode(e.target.value.toUpperCase())
          if (error) setError(null)
        }}
        data-testid="discount-input"
      />
    </div>
  )

  const appliedList = applied.length > 0 && (
    <ul className="flex flex-col gap-1" data-testid="applied-promotions">
      {applied.map((c) => (
        <li key={c} className="flex items-center justify-between gap-space-xs text-secondary">
          <span className="flex items-center gap-space-xs">
            <MIcon name="check_circle" className="text-[14px]" />
            <span className="font-label-sm text-label-sm">
              Code <strong>{c}</strong> applied to this order.
            </span>
          </span>
          <button
            type="button"
            onClick={() => remove(c)}
            disabled={pending}
            className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-error"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  )

  const errorLine = error && (
    <p role="alert" className="font-label-sm text-label-sm text-error" data-testid="discount-error">
      {error}
    </p>
  )

  if (variant === "address") {
    return (
      <form onSubmit={submit} noValidate className="flex flex-col gap-space-xs pt-space-xs">
        <label htmlFor={`coupon-input-${variant}`} className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          Promotional Offers &amp; Coupons
        </label>
        <div className="flex items-center gap-space-xs">
          {input(
            "w-full h-11 pl-9 pr-space-sm bg-surface-container-low text-on-surface font-body-sm text-body-sm uppercase rounded focus:bg-surface-container-lowest focus:outline-none",
            "Enter coupon code",
            "absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
          )}
          <button
            className="h-11 px-space-md bg-secondary text-on-secondary font-label-caps text-label-caps uppercase rounded hover:opacity-90 transition-opacity disabled:opacity-60"
            type="submit"
            disabled={pending || !code.trim()}
          >
            {pending ? "Applying" : "Apply"}
          </button>
        </div>
        {errorLine}
        {appliedList}
      </form>
    )
  }

  if (variant === "delivery") {
    return (
      <form onSubmit={submit} noValidate className="pt-4 pb-2 flex flex-col gap-2">
        <label htmlFor={`coupon-input-${variant}`} className="font-label-caps text-label-caps uppercase tracking-wider text-outline block">
          Promotional Voucher / Gift Card
        </label>
        <div className="flex gap-2">
          {input(
            "w-full h-10 pl-9 pr-3 bg-surface-container-low rounded font-body-sm text-body-sm text-on-surface uppercase placeholder:normal-case placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-colors",
            "Enter code",
            "text-[18px] text-outline absolute left-3 top-3"
          )}
          <button
            className="h-10 px-4 bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded transition-colors disabled:opacity-60"
            type="submit"
            disabled={pending || !code.trim()}
          >
            {pending ? "Applying" : "Apply"}
          </button>
        </div>
        {errorLine}
        {appliedList}
      </form>
    )
  }

  if (variant === "shipping") {
    return (
      <form onSubmit={submit} noValidate className="pt-space-xs flex flex-col gap-space-xs">
        <div className="flex gap-space-xs">
          {input(
            "w-full h-11 px-space-md bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none rounded-sm",
            "Privilege Code / Gift Monograph"
          )}
          <button
            className="h-11 px-space-md bg-surface-container hover:bg-surface-container-high text-primary font-label-caps text-label-caps uppercase transition-colors rounded-sm disabled:opacity-60"
            type="submit"
            disabled={pending || !code.trim()}
          >
            {pending ? "Applying" : "Apply"}
          </button>
        </div>
        {errorLine}
        {appliedList}
      </form>
    )
  }

  // Payment: an applied code shows as the export's "Applied / Active" card.
  return (
    <div className="flex flex-col gap-2">
      {applied.map((c) => (
        <div key={c} className="flex flex-col gap-2 p-3.5 bg-surface-container-low rounded" data-testid="applied-promotions">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MIcon name="local_offer" className="text-[18px] text-emerald-600" />
              <span className="font-label-caps text-label-caps uppercase text-on-surface font-bold">{c} Applied</span>
            </div>
            <span className="font-label-sm text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-body-sm text-xs text-on-surface-variant">The discount is included in the total below.</p>
            <button
              type="button"
              onClick={() => remove(c)}
              disabled={pending}
              className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-error"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <form onSubmit={submit} noValidate className="flex flex-col gap-2 p-3.5 bg-surface-container-low rounded">
        <label htmlFor={`coupon-input-${variant}`} className="flex items-center gap-2">
          <MIcon name="local_offer" className="text-[18px] text-on-surface-variant" />
          <span className="font-label-caps text-label-caps uppercase text-on-surface font-bold">Have a coupon?</span>
        </label>
        <div className="flex gap-2">
          {input(
            "w-full h-10 px-3 bg-surface-container-lowest rounded font-body-sm text-body-sm text-on-surface uppercase placeholder:normal-case placeholder:text-outline focus:outline-none",
            "Enter coupon code"
          )}
          <button
            className="h-10 px-4 bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded transition-colors disabled:opacity-60"
            type="submit"
            disabled={pending || !code.trim()}
          >
            {pending ? "Applying" : "Apply"}
          </button>
        </div>
        {errorLine}
      </form>
    </div>
  )
}
