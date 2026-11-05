import type { SeedContext } from "../api-server.ts"

/*
 * Logistics analytics records, dated in the last fortnight so the default
 * 30-day window holds them: Delhivery and own-fleet parcels (delivered first
 * time and on time, delivered after a failed attempt, late, returned to
 * origin, still moving), warehouse fulfilments at the store's warehouse and a
 * seller's location, rider tasks with cash collected and handed in, a
 * remittance short by ₹10, and returns. Plus one unshipped cash-on-delivery
 * order, placed through the real checkout, to book from the order panel.
 */
export async function seed({ db, now, api }: SeedContext) {
  const ago = (days: number, hours = 0) => new Date(now.getTime() - days * 86_400_000 - hours * 3_600_000)
  const ev = (status: string, internalStatus: string, at: Date) => ({ timestamp: at, status, internalStatus, location: "", note: "" })
  let n = 0
  const ship = (o: Record<string, unknown>) => {
    n++
    return {
      _id: `lg_ship_${n}`,
      orderId: `lg_ord_${n}`,
      displayId: 9000 + n,
      provider: "delhivery",
      carrier: "Delhivery Surface",
      awb: `LG${1234500000 + n}`,
      status: "in_transit",
      items: [],
      parcel: { weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 },
      trackingEvents: [],
      isReturn: false,
      active: false,
      customer: { name: "Seed", phone: "9000000000", city: "Bengaluru", postalCode: "560038" },
      itemsCount: 1,
      createdAt: ago(10),
      updatedAt: ago(10),
      ...o,
    }
  }
  await db.shipments().insertMany([
    ship({ status: "delivered", trackingEvents: [ev("Picked", "picked_up", ago(10)), ev("Delivered", "delivered", ago(8))], deliveredAt: ago(8), estimatedDelivery: ago(7) }),
    ship({ status: "delivered", ndr: { reason: "Consignee unavailable", attempts: 1, updatedAt: ago(7) }, trackingEvents: [ev("In Transit", "in_transit", ago(10)), ev("Pending", "delivery_failed", ago(7)), ev("Delivered", "delivered", ago(6))], deliveredAt: ago(6), estimatedDelivery: ago(6) }),
    ship({ status: "delivered", trackingEvents: [ev("Picked", "picked_up", ago(10))], deliveredAt: ago(4), estimatedDelivery: ago(6), customer: { name: "Seed", phone: "9", city: "New Delhi", postalCode: "110003" } }),
    ship({ status: "rto_delivered", ndr: { reason: "Consignee refused", attempts: 2, updatedAt: ago(5) }, customer: { name: "Seed", phone: "9", city: "New Delhi", postalCode: "110017" } }),
    ship({ status: "in_transit", createdAt: ago(2), updatedAt: ago(2) }),
    ship({ provider: "own_fleet", carrier: "Everwear Fleet", status: "delivered", trackingEvents: [ev("Out", "out_for_delivery", ago(9, 4))], deliveredAt: ago(9, 2), createdAt: ago(9, 6) }),
  ] as never)

  const ful = (o: Record<string, unknown>) => ({ orderId: `lg_o_${o._id}`, displayId: 1, lines: [], paymentMethod: "cod", destination: {}, assignment: {}, rejectedBy: [], active: false, updatedAt: now, ...o })
  await db.warehouses().insertOne({ _id: "lg_wh_sel", code: "SEL-LG01", name: "Kavya Textiles", city: "Jaipur", state: "Rajasthan", pincode: "302001", address: "Johari Bazaar", status: "active", sellerId: "lg_sel", acceptsOrders: false, createdAt: now, updatedAt: now } as never)
  await db.fulfilments().insertMany([
    ful({ _id: "lg_f1", code: "LGF-1", warehouseId: "wh_blr", warehouseCode: "BLR-FC1", status: "dispatched", createdAt: ago(10), package: { packedAt: ago(10, -4) }, handedOverAt: ago(10, -10) }),
    ful({ _id: "lg_f2", code: "LGF-2", warehouseId: "wh_blr", warehouseCode: "BLR-FC1", status: "handed_over", createdAt: ago(9), package: { packedAt: ago(9, -8) }, handedOverAt: ago(9, -30) }),
    ful({ _id: "lg_f3", code: "LGF-3", warehouseId: "wh_blr", warehouseCode: "BLR-FC1", status: "picking", active: true, createdAt: ago(1) }),
    ful({ _id: "lg_f4", code: "LGF-4", warehouseId: "lg_wh_sel", warehouseCode: "SEL-LG01", status: "dispatched", createdAt: ago(8), package: { packedAt: ago(8, -2) }, dispatchedAt: ago(8, -5) }),
  ] as never)

  await db.riders().insertMany([
    { _id: "lg_rid_1", email: "imran@fleet.test", phone: "9811000001", passwordHash: "x", name: "Imran Khan", status: "approved", vehicle: { type: "bike" }, documents: [], warehouseId: "wh_blr", zoneIds: [], shifts: [], online: false, createdAt: now, updatedAt: now },
    { _id: "lg_rid_2", email: "sana@fleet.test", phone: "9811000002", passwordHash: "x", name: "Sana Mirza", status: "approved", vehicle: { type: "scooter" }, documents: [], warehouseId: "wh_blr", zoneIds: [], shifts: [], online: false, createdAt: now, updatedAt: now },
  ] as never)
  const task = (o: Record<string, unknown>) => ({ shipmentId: `lg_s_${o._id}`, fulfilmentId: `lg_f_${o._id}`, orderId: `lg_o_${o._id}`, displayId: 1, warehouseId: "wh_blr", zoneId: "z", declinedBy: [], stop: {}, attempts: [], earnings: [], cod: null, createdAt: ago(9), updatedAt: now, ...o })
  await db.deliveryTasks().insertMany([
    task({ _id: "lg_t1", code: "EWFLG1", status: "delivered", riderId: "lg_rid_1", cod: { due: 249000, currency: "inr", collected: 249000, remittanceId: "lg_rem_1" } }),
    task({ _id: "lg_t2", code: "EWFLG2", status: "delivered", riderId: "lg_rid_1", attempts: [{ at: ago(8), reason: "customer_unavailable", riderId: "lg_rid_1" }], cod: { due: 100000, currency: "inr", collected: 100000, remittanceId: null } }),
    task({ _id: "lg_t3", code: "EWFLG3", status: "rto", riderId: "lg_rid_2", attempts: [{ at: ago(8), reason: "customer_refused", riderId: "lg_rid_2" }] }),
  ] as never)
  await db.codRemittances().insertOne({ _id: "lg_rem_1", code: "REM-LG1", riderId: "lg_rid_1", taskIds: ["lg_t1"], expected: 249000, declared: 249000, counted: 248000, status: "mismatch", submittedAt: ago(7) } as never)

  const ret = (o: Record<string, unknown>) => ({ orderId: `lg_o_${o._id}`, displayId: 1, customerId: null, method: "pickup", refundableAmount: 1000, currency: "inr", updatedAt: now, ...o })
  await db.returns().insertMany([
    ret({ _id: "lg_r1", code: "RET-LG1", type: "return", status: "refunded", items: [{ itemId: "i", variantId: "v", productId: "p", productTitle: "Linen Shirt", variantTitle: "M", quantity: 2, reason: "too_small" }], requestedAt: ago(6), resolution: { action: "refund", at: ago(2), by: "a" } }),
    ret({ _id: "lg_r2", code: "RET-LG2", type: "exchange", status: "requested", items: [{ itemId: "j", variantId: "w", productId: "p", productTitle: "Linen Shirt", variantTitle: "L", quantity: 1, reason: "damaged" }], requestedAt: ago(3) }),
  ] as never)

  // An unshipped COD order, through the real checkout, for the order panel.
  await db.products().insertOne({
    _id: "lg_prod_shirt",
    handle: "lg-linen-shirt",
    title: "Linen Shirt",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["M"] }],
    variants: [{ _id: "lg_var_m", title: "M", options: { Size: "M" }, prices: { inr: 249000 }, manageInventory: false, allowBackorder: false, stock: 0 }],
    createdAt: now,
    updatedAt: now,
  } as never)
  const shopper = {} // no admin token on store routes
  const address = { firstName: "Meera", lastName: "Iyer", address1: "4 Residency Road", city: "Bengaluru", postalCode: "560025", province: "Karnataka", countryCode: "in", phone: "+91 9886011111" }
  const cart = (await api("POST", "/store/carts", { country: "in" }, shopper)).cart
  await api("POST", `/store/carts/${cart.id}/items`, { variantId: "lg_var_m", quantity: 1 }, shopper)
  await api("PATCH", `/store/carts/${cart.id}`, { email: "meera@example.com", shippingAddress: address, billingAddress: address }, shopper)
  await api("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, shopper)
  await api("POST", `/store/carts/${cart.id}/complete`, undefined, shopper)
}
