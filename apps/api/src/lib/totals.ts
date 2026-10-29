import type { CartDoc, OrderTotals, PromotionDoc, RegionDoc } from "../db/schema.js"

/** Whether a promotion can be used right now in this currency. */
export function promotionUsable(p: PromotionDoc, currency: string, now = new Date()) {
  if (!p.active) return false
  if (p.startsAt && p.startsAt > now) return false
  if (p.endsAt && p.endsAt < now) return false
  if (p.usageLimit != null && p.usageCount >= p.usageLimit) return false
  if (p.type === "fixed" && p.currency !== currency) return false
  return true
}

/**
 * All money maths for a cart or order, in integer minor units. Prices must
 * already be refreshed from the catalog; nothing here trusts client input.
 */
export function computeTotals(cart: Pick<CartDoc, "items" | "currency" | "shippingOptionId">, region: RegionDoc, promotions: PromotionDoc[]): OrderTotals {
  const itemSubtotal = cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  let discountTotal = 0
  for (const p of promotions) {
    if (!promotionUsable(p, cart.currency)) continue
    const remaining = itemSubtotal - discountTotal
    discountTotal += p.type === "percentage" ? Math.round((remaining * Math.min(p.value, 100)) / 100) : Math.min(p.value, remaining)
  }

  const shipping = region.shippingOptions.find((s) => s._id === cart.shippingOptionId)
  const shippingTotal = cart.items.length && shipping ? shipping.amount : 0
  const taxable = itemSubtotal - discountTotal + shippingTotal
  const taxTotal = region.taxInclusive ? 0 : Math.round((taxable * region.taxRate) / 100)

  return { itemSubtotal, discountTotal, shippingTotal, taxTotal, total: taxable + taxTotal }
}
