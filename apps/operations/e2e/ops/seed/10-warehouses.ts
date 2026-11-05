import type { SeedContext } from "../api-server.ts"

/*
 * Warehouse operations: a second store warehouse (through the admin API), a
 * marketplace seller's own location, stock received through the ledger at
 * both store warehouses, an item not yet under warehouse tracking (for an
 * opening balance), a picker, and two cash on delivery orders the allocator
 * sends to Bengaluru.
 */
export async function seed(ctx: SeedContext) {
  const { db, now, api } = ctx
  const { runStockOperation } = await import("../../../../backend/src/lib/inventory/operations.ts")

  await api("POST", "/admin/warehouses", { code: "DEL-FC1", name: "Delhi FC", address: "Plot 4, Okhla Phase II", city: "New Delhi", state: "Delhi", pincode: "110020", status: "active", serviceAreas: ["11", "12"], priority: 50 })
  const del = (await db.warehouses().findOne({ code: "DEL-FC1" }))!
  await db.warehouses().insertOne({ _id: "wh_sel_demo", code: "SEL-0009", name: "Kavya Textiles", address: "14 Commercial Street", city: "Jaipur", state: "Rajasthan", pincode: "302001", status: "active", sellerId: "sel_demo", acceptsOrders: true, createdAt: now, updatedAt: now } as never)

  const variant = (id: string, sku: string, title: string, stock = 0) => ({ _id: id, sku, title, options: { Size: title }, prices: { inr: 189900 }, manageInventory: true, allowBackorder: false, stock })
  await db.products().insertMany([
    { _id: "prod_kurta", handle: "linen-kurta", title: "Linen Kurta", status: "published", images: [], categoryIds: ["cat_kurtas"], collectionId: null, tags: [], options: [{ title: "Size", values: ["M", "L"] }], variants: [variant("var_kurta_m", "EW-KUR-M", "M"), variant("var_kurta_l", "EW-KUR-L", "L")], createdAt: now, updatedAt: now },
    { _id: "prod_scarf", handle: "silk-scarf", title: "Silk Scarf", status: "published", images: [], categoryIds: [], collectionId: null, tags: [], options: [{ title: "Size", values: ["Free"] }], variants: [variant("var_scarf", "EW-SCARF", "Free", 7)], createdAt: now, updatedAt: now },
  ] as never)

  const admin = ctx.admin
  await runStockOperation({ type: "receive", warehouseId: "wh_blr", variantId: "var_kurta_m", quantity: 10, reference: "GRN-0001" }, admin)
  await runStockOperation({ type: "receive", warehouseId: "wh_blr", variantId: "var_kurta_l", quantity: 3, reference: "GRN-0001" }, admin)
  await runStockOperation({ type: "receive", warehouseId: del._id, variantId: "var_kurta_m", quantity: 4, reference: "GRN-0002" }, admin)

  await db.warehouseUsers().insertOne({ _id: "whu_priya", email: "priya@everwear.test", name: "Priya Nair", role: "picker", warehouseIds: ["wh_blr"], passwordHash: await ctx.hashPassword("picker-password-1"), status: "active", createdAt: now, updatedAt: now } as never)

  const address = { firstName: "Meera", lastName: "Iyer", address1: "4 Residency Road", city: "Bengaluru", postalCode: "560025", province: "Karnataka", countryCode: "in", phone: "+91 9886011111" }
  for (const email of ["meera@example.com", "arjun@example.com"]) {
    const cart = (await api("POST", "/store/carts", { country: "in" }, {})).cart
    await api("POST", `/store/carts/${cart.id}/items`, { variantId: "var_kurta_m", quantity: 1 }, {})
    await api("PATCH", `/store/carts/${cart.id}`, { email, shippingAddress: address, billingAddress: address }, {})
    await api("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, {})
    await api("POST", `/store/carts/${cart.id}/complete`, undefined, {})
  }
}
