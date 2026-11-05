import { writeFileSync } from "node:fs"
import { join } from "node:path"
import type { SeedContext } from "../api-server.ts"

/*
 * Marketplace records for the Sellers & Settlements screen, made through the
 * real marketplace code:
 *   Ravi Crafts      submitted, nothing verified yet (to verify and approve)
 *   Kavya Textiles   approved, ships its own orders; one live listing that
 *                    sold and was delivered (ledger lines payable now, so a
 *                    settlement can run) and two listings waiting for review
 */
export async function seed({ db, api, admin }: SeedContext) {
  // Real images behind the listings' photo paths (a 1x1 PNG), in the throwaway uploads folder.
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex")
  for (const name of ["seed-kurta.png", "seed-saree.png"]) writeFileSync(join(process.env.UPLOADS_DIR!, "products", name), png)

  const { approveSeller, registerSeller, submitKyc, updateKyc, verifyItem } = await import("../../../../backend/src/lib/marketplace/sellers.ts")
  const { createListing, reviewListing, submitListing } = await import("../../../../backend/src/lib/marketplace/products.ts")
  const { postDeliveredSales } = await import("../../../../backend/src/lib/marketplace/ledger.ts")
  const { runStockOperation } = await import("../../../../backend/src/lib/inventory/operations.ts")

  // Waiting for review.
  let ravi = await registerSeller({ email: "ravi@crafts.in", phone: "9845022222", displayName: "Ravi Crafts", password: "seller-password-1", fulfilmentModel: "platform" })
  ravi = await updateKyc(ravi, {
    businessType: "individual",
    legalName: "Ravi Kumar",
    pan: "BBBPR1234C",
    registeredAddress: { line1: "2 MG Road", city: "Bengaluru", state: "Karnataka", postalCode: "560001" },
    bank: { accountName: "Ravi Kumar", accountNumber: "123456789012", ifsc: "SBIN0001234" },
  })
  await submitKyc(ravi)

  // Approved, with sales.
  let kavya = await registerSeller({ email: "kavya@textiles.in", phone: "9845011111", displayName: "Kavya Textiles", password: "seller-password-1", fulfilmentModel: "seller" })
  kavya = await updateKyc(kavya, {
    businessType: "partnership",
    legalName: "Kavya Textiles LLP",
    pan: "AAPFU0939F",
    gstin: "27AAPFU0939F1ZV",
    registeredAddress: { line1: "14 Commercial Street", city: "Bengaluru", state: "Karnataka", postalCode: "560001" },
    bank: { accountName: "Kavya Textiles LLP", accountNumber: "50100123456789", ifsc: "HDFC0001234" },
    pickupAddress: { line1: "14 Commercial Street", city: "Bengaluru", state: "Karnataka", postalCode: "560001", phone: "9845011111" },
  })
  kavya = await submitKyc(kavya)
  for (const item of ["pan", "gstin", "bank"] as const) await verifyItem(kavya._id, item, admin)
  kavya = await approveSeller(kavya._id, admin)

  const live = await createListing(kavya, { title: "Handblock Kurta", description: "Cotton, hand block printed.", categoryIds: ["cat_kurtas"], images: ["/uploads/products/seed-kurta.png"], options: [{ title: "Size", values: ["M"] }], variants: [{ sku: "KAV-KUR-M", options: { Size: "M" }, price: 189900 }] })
  await submitListing(kavya, live._id)
  await reviewListing(live._id, "approved", admin)
  await runStockOperation({ type: "receive", warehouseId: kavya.warehouseId!, variantId: live.variants[0]!._id, quantity: 6 }, { type: "seller", id: kavya._id })

  for (const l of [
    { title: "Ajrakh Cotton Saree", sku: "KAV-SAR-FREE", size: "Free", price: 349900 },
    { title: "Block Print Dupatta", sku: "KAV-DUP-FREE", size: "Free", price: 79900 },
  ]) {
    const p = await createListing(kavya, { title: l.title, description: "Natural dyes.", categoryIds: ["cat_kurtas"], images: ["/uploads/products/seed-saree.png"], options: [{ title: "Size", values: [l.size] }], variants: [{ sku: l.sku, options: { Size: l.size }, price: l.price }] })
    await submitListing(kavya, p._id)
  }

  // A delivered, paid sale whose return window has closed.
  const store = { "content-type": "application/json" }
  const address = { firstName: "Meera", lastName: "Iyer", address1: "4 Residency Road", city: "Bengaluru", postalCode: "560025", province: "Karnataka", countryCode: "in", phone: "+91 9886011111" }
  const cart = (await api("POST", "/store/carts", { country: "in" }, store)).cart
  await api("POST", `/store/carts/${cart.id}/items`, { variantId: live.variants[0]!._id, quantity: 2 }, store)
  await api("PATCH", `/store/carts/${cart.id}`, { email: "meera@example.com", shippingAddress: address, billingAddress: address }, store)
  await api("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, store)
  const order = (await api("POST", `/store/carts/${cart.id}/complete`, undefined, store)).order
  const placed = (await db.orders().findOne({ _id: order.id }))!
  const deliveredAt = new Date(Date.now() - 20 * 86_400_000)
  await postDeliveredSales({
    _id: "ship_seed_kavya",
    orderId: placed._id,
    displayId: placed.displayId,
    provider: "manual",
    carrier: "Delhivery",
    awb: "SEEDAWB1",
    status: "delivered",
    items: placed.items.map((i) => ({ itemId: i._id, quantity: i.quantity })),
    parcel: { weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 },
    trackingEvents: [],
    isReturn: false,
    active: true,
    deliveredAt,
    createdAt: deliveredAt,
    updatedAt: deliveredAt,
  } as never)
  // The courier collected the cash and it was reconciled; the window has passed.
  await db.orders().updateOne({ _id: placed._id }, { $set: { paymentStatus: "paid", fulfillmentStatus: "delivered" } })
  await db.sellerLedger().updateMany({ sellerId: kavya._id }, { $set: { payableFrom: new Date(Date.now() - 1000) } })
}
