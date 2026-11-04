import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { buildInvoiceLines } from "../src/lib/invoice.js"
import { computeTotals } from "../src/lib/totals.js"

const region = (taxInclusive: boolean) =>
  ({
    _id: "reg",
    name: "India",
    currency: "inr",
    countries: [],
    taxRate: 12,
    taxInclusive,
    shippingOptions: [
      { _id: "so_free", name: "Standard", amount: 0 },
      { _id: "so_exp", name: "Express", amount: 9900 },
    ],
  }) as any

const items = [
  { _id: "li1", productId: "p1", variantId: "var_aaaaaa", productTitle: "Hoodie", productHandle: "hoodie", variantTitle: "S", quantity: 1, unitPrice: 279000 },
  { _id: "li2", productId: "p2", variantId: "var_bbbbbb", productTitle: "Choker", productHandle: "choker", variantTitle: "", quantity: 3, unitPrice: 33333 },
]

/** An order the way checkout makes one, so the invoice is checked against real totals. */
const orderFor = (taxInclusive: boolean, shippingOptionId: string, percentOff = 0) => {
  const r = region(taxInclusive)
  const promos = percentOff
    ? [{ _id: "pr", code: "X", type: "percentage", value: percentOff, active: true, usageCount: 0 } as any]
    : []
  const totals = computeTotals({ items, currency: "inr", shippingOptionId }, r, promos)
  const shippingOption = r.shippingOptions.find((s: any) => s._id === shippingOptionId)
  return { order: { items, totals, shippingOption } as any, r }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe("GST invoice lines", () => {
  for (const taxInclusive of [false, true]) {
    for (const [ship, off] of [["so_free", 0], ["so_exp", 0], ["so_exp", 15]] as const) {
      test(`add up to the order (${taxInclusive ? "tax included" : "tax on top"}, ${ship}, ${off}% off)`, () => {
        const { order, r } = orderFor(taxInclusive, ship, off)
        const inv = buildInvoiceLines(order, r)

        const lineTax = sum(inv.items.map((l) => l.cgst + l.sgst + l.igst))
        assert.equal(sum(inv.items.map((l) => l.taxableValue)), inv.subtotal)
        assert.equal(inv.cgstTotal + inv.sgstTotal + inv.igstTotal, lineTax)
        assert.equal(inv.subtotal + lineTax, inv.grandTotal, "taxable + tax = grand total")
        assert.equal(inv.grandTotal, order.totals.total, "grand total = what was charged")
        if (!taxInclusive) assert.equal(lineTax, order.totals.taxTotal, "tax matches the order to the paisa")
        assert.equal(inv.items.some((l) => l.sku === "DELIVERY"), ship === "so_exp", "delivery is its own line when charged")
      })
    }
  }
})
