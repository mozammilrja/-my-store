"use client"

import type { Address, Cart, Customer } from "@lib/api/types"
import { setBuyerGstin, setCheckoutAddress, setDeliveryInstructions, setShippingOption } from "@lib/data/shop"
import { buyerGstinSchema } from "@lib/validation/checkout-schemas"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { CheckoutRegion } from "./checkout-data"
import { AddressCard, ConsignmentFrame, DeliveryProtocol, ErrorBanner, GstinBlock, OrderConsignment, PhaseOneTitle, RegisterAddressRow } from "./consignment"

type SavedAddress = Address & { id: string }

const same = (a: Partial<Address> | null | undefined, b: Partial<Address> | null | undefined) =>
  !!a && !!b && a.address1 === b.address1 && a.postalCode === b.postalCode && a.firstName === b.firstName


/**
 * Checkout step 3 (review), ported from storefront_checkout_shipping_delivery_selection:
 * confirms where and how the order travels before payment. The address and
 * delivery choice can still be switched here; both save to the bag at once.
 */
export function ReviewStep({
  cart,
  customer,
  region,
  countryCode,
}: {
  cart: Cart
  customer: Customer | null
  region: CheckoutRegion
  countryCode: string
}) {
  const router = useRouter()
  const saved: SavedAddress[] = customer?.addresses ?? []
  const ship = cart.shippingAddress

  // The bag's address, plus the account's other saved addresses to switch to.
  const cards: (Address & { id: string; isDefault: boolean })[] = (() => {
    const fromBook = saved.map((a, i) => ({ ...a, isDefault: i === 0 }))
    if (ship && !fromBook.some((a) => same(a, ship))) return [{ ...ship, id: "cart", isDefault: false }, ...fromBook]
    return fromBook.length ? fromBook : ship ? [{ ...ship, id: "cart", isDefault: false }] : []
  })()

  const [gstOn, setGstOn] = useState(!!cart.buyerGstin)
  const [gstin, setGstin] = useState(cart.buyerGstin?.gstin ?? "")
  const [legalName, setLegalName] = useState(cart.buyerGstin?.legalName ?? "")
  const [gstErrors, setGstErrors] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState(cart.deliveryInstructions ?? "")
  const [pending, startTransition] = useTransition()
  const [generalError, setGeneralError] = useState<string | null>(null)

  const fail = (message: string) => {
    setGeneralError(message)
    toast.error(message)
  }

  const chooseAddress = (a: Address & { id: string }) => {
    if (same(a, ship) || !cart.email) return
    const data = new FormData()
    data.append("email", cart.email)
    const fields: (keyof Address)[] = ["firstName", "lastName", "company", "address1", "address2", "city", "province", "postalCode", "countryCode", "phone"]
    for (const k of fields) if (a[k]) data.append(`shipping.${k}`, String(a[k]))
    data.append("sameAsShipping", "on")
    startTransition(async () => {
      const result = await setCheckoutAddress(data)
      if (result.error) return fail(result.error)
      toast.success("Delivery address updated")
      router.refresh()
    })
  }

  const chooseOption = (id: string) => {
    if (id === cart.shippingOptionId) return
    startTransition(async () => {
      const result = await setShippingOption(id)
      if (result.error) return fail(result.error)
      router.refresh()
    })
  }

  const continueToPayment = () => {
    setGeneralError(null)
    let gst: { gstin: string; legalName: string } | null = null
    if (gstOn) {
      const parsed = buyerGstinSchema.safeParse({ gstin, legalName })
      if (!parsed.success) {
        const errs: Record<string, string> = {}
        for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message
        setGstErrors(errs)
        return fail("Please check the GSTIN details.")
      }
      gst = parsed.data
    }
    setGstErrors({})
    startTransition(async () => {
      const gstChanged = (gst?.gstin ?? null) !== (cart.buyerGstin?.gstin ?? null) || (gst?.legalName ?? null) !== (cart.buyerGstin?.legalName ?? null)
      if (gstChanged) {
        const r = await setBuyerGstin(gst)
        if (r.error) return fail(r.error)
      }
      if (notes.trim() !== (cart.deliveryInstructions ?? "")) {
        const r = await setDeliveryInstructions(notes)
        if (r.error) return fail(r.error)
      }
      router.push(`/${countryCode}/checkout?step=payment`)
      window.scrollTo({ top: 0 })
    })
  }


  return (
    <ConsignmentFrame
      current="review"
      crumb="Checkout Review"
      testId="review-step"
      aside={<OrderConsignment cart={cart} region={region} cta={{ label: "Continue to Payment & Verification", onClick: continueToPayment, pending }} />}
    >
      <ErrorBanner message={generalError} />
      <PhaseOneTitle customer={customer} />

      <div className="flex flex-col gap-space-md" role="radiogroup" aria-label="Delivery address">
        {cards.map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            selected={same(a, ship)}
            isDefault={a.isDefault}
            onSelect={() => chooseAddress(a)}
            edit={{ href: "/checkout?step=address" }}
            disabled={pending}
            deliverable={cart.countryCodes.includes(a.countryCode.toLowerCase())}
          />
        ))}
        <RegisterAddressRow href="/checkout?step=address" />
      </div>

      <GstinBlock
        on={gstOn}
        onToggle={setGstOn}
        gstin={gstin}
        onGstin={setGstin}
        legalName={legalName}
        onLegalName={setLegalName}
        errors={gstErrors}
      />

      <DeliveryProtocol
        cart={cart}
        region={region}
        selectedId={cart.shippingOptionId ?? ""}
        onChoose={chooseOption}
        notes={notes}
        onNotes={setNotes}
        disabled={pending}
      />
    </ConsignmentFrame>
  )
}
