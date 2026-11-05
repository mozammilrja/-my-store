import { db, type InvoiceDoc, type OrderDoc, type RegionDoc } from "../db/schema.js"

type Line = InvoiceDoc["items"][number]

/** HSN used for every garment line until products carry their own code. */
const GOODS_HSN = "6204"
/** SAC/HSN for courier services, used for the delivery charge line. */
const COURIER_HSN = "996812"

/**
 * GST invoice lines and totals that add up to exactly what the order charged.
 *
 * Follows the order's own maths (see computeTotals): discounts come off the
 * items, delivery is taxed like goods, and tax is added on top unless the
 * region's prices already include it. A discount is shared across lines by
 * value, and rounding is settled on the last line so the invoice's tax equals
 * the order's tax to the paisa. Intra-state supply: tax is split CGST/SGST.
 */
export function buildInvoiceLines(order: Pick<OrderDoc, "items" | "totals" | "shippingOption">, region: Pick<RegionDoc, "taxRate" | "taxInclusive">) {
  const rate = region.taxRate
  const { itemSubtotal, discountTotal, shippingTotal } = order.totals

  // Each line's net value after its share of the discount.
  let discountLeft = discountTotal
  const goods = order.items.map((i, n) => {
    const gross = i.unitPrice * i.quantity
    const share =
      n === order.items.length - 1 ? discountLeft : itemSubtotal ? Math.round((discountTotal * gross) / itemSubtotal) : 0
    discountLeft -= share
    return {
      name: i.productTitle + (i.variantTitle ? ` (${i.variantTitle})` : ""),
      sku: `SKU-${i.variantId.slice(-6)}`,
      hsn: GOODS_HSN,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: share,
      net: gross - share,
    }
  })
  const delivery =
    shippingTotal > 0
      ? [{ name: `Delivery: ${order.shippingOption.name}`, sku: "DELIVERY", hsn: COURIER_HSN, quantity: 1, unitPrice: shippingTotal, discount: 0, net: shippingTotal }]
      : []

  const raw = [...goods, ...delivery].map((l) => {
    const taxable = region.taxInclusive ? Math.round((l.net * 100) / (100 + rate)) : l.net
    const tax = region.taxInclusive ? l.net - taxable : Math.round((l.net * rate) / 100)
    return { ...l, taxable, tax }
  })

  // Tax-exclusive orders recorded one rounded tax figure; match it exactly.
  if (!region.taxInclusive && raw.length) {
    const diff = order.totals.taxTotal - raw.reduce((s, l) => s + l.tax, 0)
    raw[raw.length - 1]!.tax += diff
  }

  const items: Line[] = raw.map((l) => {
    const cgst = Math.floor(l.tax / 2)
    return {
      name: l.name,
      sku: l.sku,
      hsn: l.hsn,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      taxableValue: l.taxable,
      gstRate: rate,
      cgst,
      sgst: l.tax - cgst,
      igst: 0,
    }
  })

  return {
    items,
    subtotal: items.reduce((s, l) => s + l.taxableValue, 0),
    cgstTotal: items.reduce((s, l) => s + l.cgst, 0),
    sgstTotal: items.reduce((s, l) => s + l.sgst, 0),
    igstTotal: 0,
    grandTotal: order.totals.total,
  }
}

/**
 * The warehouse an order ships from, for the invoice's dispatch block: the
 * warehouse its (first) fulfilment was allocated to, or for older orders the
 * hub their stock movement names,
 * else the default active warehouse, else any active one. Null when the
 * store has no warehouses at all.
 */
export async function dispatchWarehouse(orderId: string) {
  const fulfilment = await db.fulfilments().findOne({ orderId, status: { $nin: ["rejected", "cancelled"] } }, { sort: { createdAt: 1 } })
  // Orders placed before warehouse fulfilment recorded their hub as a stock movement.
  const movement = fulfilment ? null : await db.inventoryMovements().findOne({ referenceType: "order", referenceId: orderId, type: "outbound" }, { sort: { createdAt: 1 } })
  const allocated = fulfilment
    ? await db.warehouses().findOne({ _id: fulfilment.warehouseId })
    : movement
      ? await db.warehouses().findOne({ code: movement.hubId })
      : null
  const warehouse =
    allocated ??
    (await db.warehouses().findOne({ status: "active", isDefault: true })) ??
    (await db.warehouses().findOne({ status: "active" }, { sort: { code: 1 } }))
  if (!warehouse) return null
  return {
    code: warehouse.code,
    name: warehouse.name,
    address: warehouse.address,
    city: warehouse.city,
    state: warehouse.state,
    pincode: warehouse.pincode,
    gstin: warehouse.gstin || null,
    lat: typeof warehouse.lat === "number" ? warehouse.lat : null,
    lng: typeof warehouse.lng === "number" ? warehouse.lng : null,
    isDefault: !!warehouse.isDefault,
    /** How it was chosen: the hub the order's stock came from, or the store's fallback. */
    source: allocated ? ("allocated" as const) : ("default" as const),
  }
}
