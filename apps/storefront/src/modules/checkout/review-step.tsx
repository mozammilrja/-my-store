"use client"

import { Button } from "@/components/ui/button"
import { placeOrder } from "@lib/data/shop"
import { BanknoteIcon, CreditCardIcon, ShieldCheckIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { useActionState, useState } from "react"
import { FormError } from "./step"

export function ReviewStep({ total }: { total: string }) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const isIndia = countryCode?.toLowerCase() === "in"
  const defaultMethod = isIndia ? "razorpay" : "stripe"
  const [selectedMethod, setSelectedMethod] = useState<"razorpay" | "stripe" | "cod">(defaultMethod)
  const [state, action, pending] = useActionState(placeOrder, { error: null })

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="paymentMethod" value={selectedMethod} />

      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-foreground">Select Payment Option</label>

        {/* Online Payment Option */}
        <label
          onClick={() => setSelectedMethod(isIndia ? "razorpay" : "stripe")}
          className={`flex items-start gap-4 border p-4 rounded-lg cursor-pointer transition-colors ${
            selectedMethod !== "cod"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:bg-muted/40"
          }`}
          data-testid="payment-method-online"
        >
          <input
            type="radio"
            name="methodSelection"
            checked={selectedMethod !== "cod"}
            onChange={() => setSelectedMethod(isIndia ? "razorpay" : "stripe")}
            className="mt-1 size-4 accent-primary"
          />
          <CreditCardIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-1 text-sm flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                {isIndia ? "Online Payment (UPI, Cards, NetBanking)" : "Debit / Credit Card (Stripe)"}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                <ShieldCheckIcon className="size-3" />
                100% Secure
              </span>
            </div>
            <span className="text-muted-foreground">
              {isIndia
                ? "Instant verification via Razorpay • Zero payment transaction fee"
                : "Secure international payment processed via Stripe"}
            </span>
          </div>
        </label>

        {/* Cash on Delivery Option */}
        <label
          onClick={() => setSelectedMethod("cod")}
          className={`flex items-start gap-4 border p-4 rounded-lg cursor-pointer transition-colors ${
            selectedMethod === "cod"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:bg-muted/40"
          }`}
          data-testid="payment-method-cod"
        >
          <input
            type="radio"
            name="methodSelection"
            checked={selectedMethod === "cod"}
            onChange={() => setSelectedMethod("cod")}
            className="mt-1 size-4 accent-primary"
          />
          <BanknoteIcon className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden />
          <div className="flex flex-col gap-1 text-sm flex-1">
            <span className="font-semibold text-foreground">Cash on delivery</span>
            <span className="text-muted-foreground">Pay {total} in cash or UPI when your order arrives.</span>
          </div>
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        By placing your order you agree to Everwear&apos;s terms of service and confirm you&apos;ve read our return policy.
      </p>

      <FormError message={state.error} />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        aria-busy={pending}
        className="w-full sm:w-fit"
        data-testid="submit-order-button"
      >
        {pending ? "Processing order..." : `Confirm & Place Order · ${total}`}
      </Button>
    </form>
  )
}
