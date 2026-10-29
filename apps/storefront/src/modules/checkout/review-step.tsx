"use client"

import { Button } from "@/components/ui/button"
import { placeOrder } from "@lib/data/shop"
import { BanknoteIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { useActionState } from "react"
import { FormError } from "./step"

export function ReviewStep({ total }: { total: string }) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [state, action, pending] = useActionState(placeOrder, { error: null })

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="countryCode" value={countryCode} />
      <div className="flex items-start gap-4 border p-4" data-testid="payment-method-summary">
        <BanknoteIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Cash on delivery</span>
          <span className="text-muted-foreground">Pay {total} when your order arrives.</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        By placing your order you agree to our terms and confirm you&apos;ve read the privacy notice.
      </p>
      <FormError message={state.error} />
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending} className="w-full sm:w-fit" data-testid="submit-order-button">
        {pending ? "Placing order" : `Place order · ${total}`}
      </Button>
    </form>
  )
}
