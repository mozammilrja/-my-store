import type { Address, Cart, CartItem, RegionPolicies, ShippingOption } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import { deliveryDays } from "@lib/util/policies"

/**
 * Plain helpers shared by the checkout steps (address, delivery, review,
 * payment) and the bank-authentication page. No React, no data fetching:
 * everything here formats values the page already loaded.
 */

/** Checkout runs address -> delivery -> review -> payment (the order is placed on payment). */
export type CheckoutStep = "address" | "delivery" | "review" | "payment"

/** What the page knows about the region the bag is in. */
export type CheckoutRegion = {
  /** GST / VAT rate in percent. */
  taxRate: number
  taxInclusive: boolean
  policies: RegionPolicies | null
}

export const money = (cart: Pick<Cart, "currency">, amount: number) => formatMoney(amount, cart.currency)

export const fullName = (a: Partial<Address> | null | undefined) =>
  [a?.firstName, a?.lastName].filter(Boolean).join(" ")

export const streetLine = (a: Partial<Address> | null | undefined) =>
  [a?.address1, a?.address2].filter(Boolean).join(", ")

export const cityLine = (a: Partial<Address> | null | undefined) =>
  [a?.city, a?.province].filter(Boolean).join(", ") + (a?.postalCode ? ` — ${a.postalCode}` : "")

export const oneLine = (a: Partial<Address> | null | undefined) =>
  [a?.address1, a?.address2, a?.city, a?.province].filter(Boolean).join(", ") + (a?.postalCode ? ` — ${a.postalCode}` : "")

export const itemCount = (cart: Pick<Cart, "items">) => cart.items.reduce((n, i) => n + i.quantity, 0)

export const itemCountLabel = (cart: Pick<Cart, "items">) => {
  const n = itemCount(cart)
  return `${n} ${n === 1 ? "Item" : "Items"}`
}

/** "Size M" style line for a bag line; the variant title holds the option values. */
export const variantLine = (item: CartItem) =>
  item.variantTitle && item.variantTitle.toLowerCase() !== "default" ? item.variantTitle : null

/** The cheapest option is the standard one; the region policy's delivery time applies to it. */
const isStandard = (option: ShippingOption, options: ShippingOption[]) =>
  option.amount === Math.min(...options.map((o) => o.amount))

/**
 * What can honestly be said about when an option arrives. Only the standard
 * service has a configured delivery time (the region policy); for the others
 * the store has no promise to quote, so none is invented.
 */
export const deliveryEstimate = (option: ShippingOption, options: ShippingOption[], policies: RegionPolicies | null) => {
  if (isStandard(option, options)) {
    return policies ? `Estimated arrival in ${deliveryDays(policies).replace("-", "–")} business days.` : "Arrival date confirmed when your order is dispatched."
  }
  return "Prioritised handling. The courier confirms the arrival date when your order is dispatched."
}

/** Short form of the estimate for compact summaries. */
export const deliveryEstimateShort = (option: ShippingOption, options: ShippingOption[], policies: RegionPolicies | null) => {
  if (isStandard(option, options) && policies) return `Arriving in ${deliveryDays(policies).replace("-", "–")} business days`
  return "Arrival date confirmed at dispatch"
}

export const taxLabel = (region: CheckoutRegion) =>
  `GST (${region.taxRate}%${region.taxInclusive ? ", included" : ""})`

export const returnsLine = (policies: RegionPolicies | null) =>
  policies
    ? `${policies.freeReturns ? "Complimentary " : ""}${policies.returnWindowDays}-day ${policies.freeReturns ? "hassle-free " : ""}returns`
    : "Returns as per our returns policy"

export type PaymentMethodId = "upi" | "card" | "netbanking" | "cod" | "emi"

export const METHOD_LABEL: Record<PaymentMethodId, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net Banking",
  cod: "Pay on Delivery",
  emi: "EMI & PayLater",
}

export const isMethod = (v: string | null | undefined): v is PaymentMethodId =>
  v === "upi" || v === "card" || v === "netbanking" || v === "cod" || v === "emi"
