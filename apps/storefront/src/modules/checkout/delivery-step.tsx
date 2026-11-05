"use client"

import type { Cart } from "@lib/api/types"
import { deleteLineItem, setDeliveryInstructions, setShippingOption } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { type CheckoutRegion, cityLine, fullName, itemCountLabel, streetLine } from "./checkout-data"
import { ConsignmentFrame, DeliveryProtocol, ErrorBanner, OrderConsignment } from "./consignment"
import { MIcon } from "./m-icon"

/**
 * Checkout step 2 (delivery). Styled as Phase 02 of
 * storefront_checkout_shipping_delivery_selection, with the same frame and
 * "Order Consignment" summary as the address and review steps.
 */
export function DeliveryStep({
  cart,
  region,
  countryCode,
  isDefaultAddress,
}: {
  cart: Cart
  region: CheckoutRegion
  countryCode: string
  /** The bag's address is the account's default one. */
  isDefaultAddress: boolean
}) {
  const router = useRouter()
  const options = cart.shippingOptions
  const [selectedId, setSelectedId] = useState(cart.shippingOptionId ?? options[0]?.id ?? "")
  const [notes, setNotes] = useState(cart.deliveryInstructions ?? "")
  const [pending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const ship = cart.shippingAddress

  const fail = (message: string) => {
    setGeneralError(message)
    toast.error(message)
  }

  // Each choice is saved straight away so the summary shows the API's totals.
  const choose = async (id: string) => {
    setSelectedId(id)
    setSaving(true)
    const result = await setShippingOption(id)
    setSaving(false)
    if (result.error) return fail(result.error)
    router.refresh()
  }

  const removeItem = (lineId: string) => {
    startTransition(async () => {
      const result = await deleteLineItem(lineId)
      if (result.error) return fail(result.error)
      notifyCartUpdated()
      // deleteLineItem re-renders this page in its own response.
      if (cart.items.length <= 1) router.push(`/${countryCode}/cart`)
    })
  }

  const continueToReview = () => {
    setGeneralError(null)
    if (!selectedId) return fail("Please choose a delivery method.")
    startTransition(async () => {
      const shipping = await setShippingOption(selectedId)
      if (shipping.error) return fail(shipping.error)
      if (notes.trim() !== (cart.deliveryInstructions ?? "")) {
        const saved = await setDeliveryInstructions(notes)
        if (saved.error) return fail(saved.error)
      }
      router.push(`/${countryCode}/checkout?step=review`)
      window.scrollTo({ top: 0 })
    })
  }

  return (
    <ConsignmentFrame
      current="delivery"
      crumb={`Order Checkout · ${itemCountLabel(cart)}`}
      testId="delivery-step"
      aside={
        <OrderConsignment
          cart={cart}
          region={region}
          cta={{ label: "Continue to Review", onClick: continueToReview, pending }}
          onRemove={removeItem}
          updating={saving}
        />
      }
    >
      <ErrorBanner message={generalError} />

      {/* The address chosen in Phase 01, in the export's address-card style. */}
      <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm" data-testid="delivery-address-summary">
        <div className="flex items-start justify-between gap-space-md">
          <div className="flex items-start gap-space-md min-w-0">
            <MIcon name="location_on" className="text-[20px] text-primary mt-1 shrink-0" />
            <div className="flex flex-col gap-space-xs min-w-0">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">Phase 01 / Consignment Address</span>
              <div className="flex flex-wrap items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-primary font-medium">{fullName(ship)}</span>
                {isDefaultAddress && (
                  <span className="px-space-xs py-0.5 bg-primary text-on-primary font-label-caps text-label-caps uppercase rounded-sm">Default</span>
                )}
              </div>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                {streetLine(ship)}
                <br />
                {cityLine(ship)}
              </p>
              {ship?.phone && (
                <span className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                  <MIcon name="call" className="text-[16px]" /> {ship.phone}
                </span>
              )}
            </div>
          </div>
          <LocalizedClientLink
            href="/checkout?step=address"
            className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors py-1 px-space-xs shrink-0"
          >
            Change
          </LocalizedClientLink>
        </div>
      </div>

      <DeliveryProtocol
        cart={cart}
        region={region}
        selectedId={selectedId}
        onChoose={choose}
        notes={notes}
        onNotes={setNotes}
        disabled={pending}
        heading="h1"
      />
    </ConsignmentFrame>
  )
}
