"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ShippingOption } from "@lib/api/types"
import { saveShipping } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { useParams } from "next/navigation"
import { useActionState, useState } from "react"
import { FormError } from "./step"

export function DeliveryStep({
  options,
  selected,
  currency,
}: {
  options: ShippingOption[]
  selected: string | null
  currency: string
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [state, action, pending] = useActionState(saveShipping, { error: null })
  const [choice, setChoice] = useState(selected ?? options[0]?.id ?? "")

  if (options.length === 0) {
    return (
      <FormError message="We don't deliver to this address yet. Please choose another country or address." />
    )
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="countryCode" value={countryCode} />

      <fieldset
        className="grid grid-cols-1 md:grid-cols-2 gap-space-md"
        data-testid="delivery-options-container"
      >
        <legend className="sr-only">Delivery option</legend>
        {options.map((o) => {
          const isSelected = choice === o.id
          const isFree = o.amount === 0
          return (
            <label
              key={o.id}
              className={cn(
                "flex items-start gap-space-md p-space-md rounded-xl cursor-pointer transition-all border",
                isSelected
                  ? "bg-surface-container/70 border-primary ring-1 ring-primary shadow-xs"
                  : "bg-surface-container-lowest border-surface-container-high/80 hover:bg-surface-container/40"
              )}
            >
              <input
                type="radio"
                name="optionId"
                value={o.id}
                checked={isSelected}
                onChange={() => setChoice(o.id)}
                className="size-4.5 accent-primary mt-1"
                data-testid="delivery-option-radio"
              />
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                    {o.name}
                  </span>
                  <span
                    className={cn(
                      "font-label-md text-label-md font-semibold tabular-nums",
                      isFree ? "text-secondary font-bold uppercase" : "text-on-surface"
                    )}
                  >
                    {isFree ? "FREE" : formatMoney(o.amount, currency)}
                  </span>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                  {isFree
                    ? "Complimentary standard delivery within 3-5 business days."
                    : "Priority dispatch, guaranteed 24-48 hour delivery in major metropolitan hubs."}
                </p>
              </div>
            </label>
          )
        })}
      </fieldset>

      <FormError message={state.error} />

      <Button
        type="submit"
        size="lg"
        disabled={pending || !choice}
        className="w-full sm:w-fit uppercase tracking-wider font-semibold h-12 px-8 rounded-lg"
        data-testid="submit-delivery-option-button"
      >
        {pending ? "Saving..." : "Continue to Secure Payment"}
      </Button>
    </form>
  )
}
