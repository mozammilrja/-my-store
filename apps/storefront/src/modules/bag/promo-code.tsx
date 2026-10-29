"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { applyPromotions } from "@lib/data/cart"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { HttpTypes } from "@medusajs/types"
import { XIcon } from "lucide-react"
import { FormEvent, useState } from "react"

/** Add or remove promotion codes; the backend validates every code. */
export function PromoCode({ cart }: { cart: HttpTypes.StoreCart }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const applied = (cart.promotions ?? []).filter((p) => p.code).map((p) => p.code!)

  const apply = async (codes: string[]) => {
    setPending(true)
    setError(null)
    try {
      await applyPromotions(codes)
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
    const value = code.trim()
    if (!value || pending) return
    if (applied.includes(value)) {
      setError("That code is already applied.")
      return
    }
    if (await apply([...applied, value])) setCode("")
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex items-end gap-2" noValidate>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="promo-code" className="text-xs text-muted-foreground">Promotion code</label>
          <Input
            id="promo-code"
            value={code}
            maxLength={64}
            autoComplete="off"
            onChange={(e) => setCode(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "promo-error" : undefined}
            data-testid="discount-input"
          />
        </div>
        <Button type="submit" variant="outline" disabled={!code.trim() || pending} data-testid="discount-apply-button">
          {pending ? "Applying" : "Apply"}
        </Button>
      </form>
      {error && (
        <p id="promo-error" role="alert" className="text-sm text-destructive-foreground" data-testid="discount-error-message">
          {error}
        </p>
      )}
      {applied.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Applied codes">
          {applied.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => apply(applied.filter((a) => a !== c))}
                disabled={pending}
                className="inline-flex h-8 items-center gap-1.5 border border-border bg-card px-3 text-xs uppercase tracking-wide hover:border-foreground"
                data-testid="remove-discount-button"
              >
                {c}
                <XIcon className="size-3" aria-hidden />
                <span className="sr-only">Remove code</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
