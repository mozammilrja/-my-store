"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ShippingOption } from "@lib/api/types"
import { saveShipping } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { useParams } from "next/navigation"
import { useActionState, useState } from "react"
import { FormError } from "./step"

export function DeliveryStep({ options, selected, currency }: { options: ShippingOption[]; selected: string | null; currency: string }) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [state, action, pending] = useActionState(saveShipping, { error: null })
  const [choice, setChoice] = useState(selected ?? options[0]?.id ?? "")

  if (options.length === 0) {
    return <FormError message="We don't deliver to this address yet. Please choose another country." />
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="countryCode" value={countryCode} />
      <fieldset className="flex flex-col gap-3" data-testid="delivery-options-container">
        <legend className="sr-only">Delivery option</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
              choice === o.id ? "border-foreground" : "border-border hover:border-foreground/50"
            )}
          >
            <span className="flex items-center gap-3">
              <input type="radio" name="optionId" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="size-4.5 accent-foreground" data-testid="delivery-option-radio" />
              <span className="text-sm font-medium">{o.name}</span>
            </span>
            <span className="text-sm tabular-nums">{formatMoney(o.amount, currency)}</span>
          </label>
        ))}
      </fieldset>
      <FormError message={state.error} />
      <Button type="submit" size="lg" disabled={pending || !choice} className="w-full sm:w-fit" data-testid="submit-delivery-option-button">
        {pending ? "Saving" : "Continue to review"}
      </Button>
    </form>
  )
}
