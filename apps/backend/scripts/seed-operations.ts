import { connect, disconnect } from "../src/db/client.js"
import {
  db,
  ensureIndexes,
  type Address,
  type CreditNoteDoc,
  type CustomerDoc,
  type InvoiceDoc,
  type OrderDoc,
  type ProductDoc,
  type PromotionDoc,
  type PurchaseOrderDoc,
  type ShipmentDoc,
  type SupplierDoc,
} from "../src/db/schema.js"
import { hashPassword } from "../src/lib/auth.js"

/**
 * Development seed for the operational side of the admin.
 *
 * The catalog, customers and orders already have data; the collections behind
 * procurement, dispatch, tax and promotions were empty, which is why those
 * screens had nothing real to show.
 *
 * Every record is written with a deterministic `_id`, so a rerun updates the
 * same document instead of making a second copy. Nothing is ever deleted:
 * records you created by hand are left alone, and `--reset` is a separate,
 * guarded path.
 *
 *   npm run seed            # additive, idempotent
 *   npm run seed -- --reset # dev only, removes this script's own records first
 */

const RESET = process.argv.includes("--reset")

/** Namespaced so a reset can find exactly what this script owns. */
const id = (kind: string, n: number) => `seed_${kind}_${String(n).padStart(3, "0")}`

/**
 * Id for a record that belongs to one order. Keyed on the order rather than a
 * loop index: the index shifts as the source list grows between runs, which
 * mints a new id every time and quietly duplicates the record.
 */
const idFor = (kind: string, orderId: string) => `seed_${kind}_${orderId.replace(/^seed_ord_/, "")}`

const CITIES: { city: string; province: string; postalCode: string; stateCode: string }[] = [
  { city: "Bengaluru", province: "Karnataka", postalCode: "560038", stateCode: "29" },
  { city: "Mumbai", province: "Maharashtra", postalCode: "400050", stateCode: "27" },
  { city: "Gurugram", province: "Haryana", postalCode: "122002", stateCode: "06" },
  { city: "Kolkata", province: "West Bengal", postalCode: "700019", stateCode: "19" },
  { city: "Chennai", province: "Tamil Nadu", postalCode: "600020", stateCode: "33" },
  { city: "Hyderabad", province: "Telangana", postalCode: "500034", stateCode: "36" },
  { city: "Pune", province: "Maharashtra", postalCode: "411001", stateCode: "27" },
  { city: "Jaipur", province: "Rajasthan", postalCode: "302001", stateCode: "08" },
  { city: "Ahmedabad", province: "Gujarat", postalCode: "380009", stateCode: "24" },
  { city: "Kochi", province: "Kerala", postalCode: "682016", stateCode: "32" },
]

const FIRST_NAMES = ["Aarav", "Diya", "Rohan", "Ananya", "Vikram", "Meera", "Karan", "Priya", "Arjun", "Ishita"]
const LAST_NAMES = ["Sharma", "Iyer", "Nair", "Reddy", "Patel", "Banerjee", "Kulkarni", "Chauhan", "Menon", "Desai"]

/** 10-digit Indian mobile, always starting 6-9. */
const phoneFor = (n: number) => `9${String(810000000 + n * 7919).slice(0, 9)}`

const addressFor = (n: number): Address => {
  const place = CITIES[n % CITIES.length]
  return {
    firstName: FIRST_NAMES[n % FIRST_NAMES.length],
    lastName: LAST_NAMES[(n * 3) % LAST_NAMES.length],
    address1: `${12 + (n % 80)}, ${["MG Road", "Linking Road", "Sector 29", "Park Street", "Anna Salai"][n % 5]}`,
    address2: `${["Indiranagar", "Bandra West", "DLF Phase 2", "Ballygunge", "Alwarpet"][n % 5]}`,
    city: place.city,
    postalCode: place.postalCode,
    province: place.province,
    countryCode: "in",
    phone: phoneFor(n),
  }
}

/** GSTIN shape: 2-digit state code, 10-char PAN, entity digit, Z, checksum. */
const gstinFor = (n: number, stateCode: string) =>
  `${stateCode}AABCE${String(1000 + n).slice(0, 4)}K1Z${"ABCDEFGHJK"[n % 10]}`

const SUPPLIERS: { name: string; contactPerson: string; categories: string[]; rating: number }[] = [
  { name: "Jaipur Craft Guild", contactPerson: "Meera Rathore", categories: ["Block print", "Cotton"], rating: 4.7 },
  { name: "Tirupur Knit Collective", contactPerson: "Senthil Kumar", categories: ["Knitwear", "Jersey"], rating: 4.4 },
  { name: "Bhiwandi Weaves", contactPerson: "Imran Shaikh", categories: ["Woven", "Linen"], rating: 4.1 },
  { name: "Chanderi Handloom Society", contactPerson: "Asha Tiwari", categories: ["Chanderi", "Silk"], rating: 4.8 },
  { name: "Ludhiana Fleece Mills", contactPerson: "Gurpreet Singh", categories: ["Fleece", "Winterwear"], rating: 3.9 },
  { name: "Kanchipuram Silk House", contactPerson: "Lakshmi Iyer", categories: ["Silk", "Zari"], rating: 4.9 },
  { name: "Surat Textile Park", contactPerson: "Nilesh Patel", categories: ["Synthetic", "Printed"], rating: 3.6 },
  { name: "Kolhapur Leather Works", contactPerson: "Sanjay More", categories: ["Leather", "Footwear"], rating: 4.3 },
  { name: "Panipat Home Textiles", contactPerson: "Ritu Ahuja", categories: ["Home", "Furnishing"], rating: 4.0 },
  { name: "Noida Trims & Labels", contactPerson: "Vivek Bhatt", categories: ["Trims", "Packaging"], rating: 4.2 },
  { name: "Erode Dyeing Units", contactPerson: "Bala Subramanian", categories: ["Dyeing", "Finishing"], rating: 3.8 },
  { name: "Ahmedabad Denim Co", contactPerson: "Hiren Shah", categories: ["Denim", "Twill"], rating: 4.5 },
]

const PROMOTIONS: { code: string; type: "percentage" | "fixed"; value: number; active: boolean; usageLimit: number | null }[] = [
  { code: "WELCOME10", type: "percentage", value: 10, active: true, usageLimit: 1000 },
  { code: "FESTIVE25", type: "percentage", value: 25, active: true, usageLimit: 500 },
  { code: "FLAT500", type: "fixed", value: 50000, active: true, usageLimit: 300 },
  { code: "LINEN15", type: "percentage", value: 15, active: true, usageLimit: null },
  { code: "FIRSTBUY", type: "fixed", value: 25000, active: true, usageLimit: 2000 },
  { code: "DIWALI30", type: "percentage", value: 30, active: false, usageLimit: 800 },
  { code: "SUMMER20", type: "percentage", value: 20, active: false, usageLimit: 400 },
  { code: "FREESHIP", type: "fixed", value: 9900, active: true, usageLimit: null },
  { code: "LOYAL5", type: "percentage", value: 5, active: true, usageLimit: null },
  { code: "CLEARANCE40", type: "percentage", value: 40, active: false, usageLimit: 150 },
  { code: "BULK1000", type: "fixed", value: 100000, active: true, usageLimit: 100 },
  { code: "APPONLY12", type: "percentage", value: 12, active: true, usageLimit: 600 },
]

const REFUND_REASONS = [
  "Size did not fit",
  "Fabric differed from listing",
  "Damaged in transit",
  "Delivered late, customer refused",
  "Colour mismatch",
  "Duplicate order",
]

const PO_STATUSES: PurchaseOrderDoc["status"][] = [
  "draft",
  "submitted",
  "submitted",
  "partially_received",
  "received",
  "received",
  "canceled",
]

const SHIPMENT_STATUSES: ShipmentDoc["status"][] = [
  "manifested",
  "pickup_scheduled",
  "in_transit",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delivered",
  "rto",
]

const CARRIERS: ShipmentDoc["carrier"][] = ["delhivery", "bluedart", "custom"]

/** Days back from now, so the data spans a range charts and filters can use. */
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

/** Writes every document by its own `_id`; reruns update rather than insert. */
async function upsertAll<T extends { _id: string }>(
  collection: { bulkWrite: (ops: unknown[]) => Promise<unknown> },
  docs: T[]
) {
  if (!docs.length) return 0
  await collection.bulkWrite(
    docs.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })) as never
  )
  return docs.length
}

async function seed() {
  await connect()
  await ensureIndexes()

  if (RESET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to reset: NODE_ENV is production")
    }
    const owned = { _id: { $regex: "^seed_" } }
    await Promise.all([
      db.suppliers().deleteMany(owned),
      db.purchaseOrders().deleteMany(owned),
      db.shipments().deleteMany(owned),
      db.invoices().deleteMany(owned),
      db.promotions().deleteMany(owned),
      db.creditNotes().deleteMany(owned),
      db.adminUsers().deleteMany(owned),
    ])
    console.log("reset: removed records previously written by this script")
  }

  // References come from what is already in the database, so every seeded
  // record points at a product and an order that genuinely exist.
  const products = await db.products().find({}, { limit: 60 }).toArray()
  const existingOrders = await db
    .orders()
    .find({ _id: { $not: /^seed_/ } }, { sort: { createdAt: -1 }, limit: 40 })
    .toArray()
  if (!products.length) {
    throw new Error("No products found. Run the catalog seed first; this script references real products.")
  }

  const now = new Date()

  /* ---------- customers ---------- */
  // The store had six customers and seven orders, five of them in euros, which
  // left every operational screen too thin to page, filter or chart. These are
  // India-region shoppers paying in rupees, which is the single operating
  // region the admin is configured for.
  const customers: CustomerDoc[] = Array.from({ length: 24 }, (_, i) => {
    const addr = addressFor(i)
    return {
      _id: id("cus", i + 1),
      email: `${addr.firstName.toLowerCase()}.${addr.lastName.toLowerCase()}${i + 1}@example.in`,
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone,
      addresses: [{ ...addr, _id: id("adr", i + 1) }],
      createdAt: daysAgo(240 - i * 9),
      updatedAt: now,
    }
  })

  /* ---------- orders ---------- */
  const INDIA_REGION = await db.regions().findOne({ currency: "inr" })
  if (!INDIA_REGION) {
    throw new Error("No INR region found. The admin is configured for a single India region.")
  }

  const PAYMENT_METHODS: OrderDoc["paymentMethod"][] = ["razorpay", "cod", "razorpay", "razorpay", "cod"]
  // Weighted so most orders are paid and delivered, with a realistic tail of
  // unpaid, cancelled and returned ones for the filters and charts to show.
  const ORDER_SHAPES: {
    payment: OrderDoc["paymentStatus"]
    fulfillment: OrderDoc["fulfillmentStatus"]
    status: OrderDoc["status"]
  }[] = [
    { payment: "paid", fulfillment: "delivered", status: "completed" },
    { payment: "paid", fulfillment: "delivered", status: "completed" },
    { payment: "paid", fulfillment: "delivered", status: "completed" },
    { payment: "paid", fulfillment: "shipped", status: "pending" },
    { payment: "paid", fulfillment: "shipped", status: "pending" },
    { payment: "paid", fulfillment: "unfulfilled", status: "pending" },
    { payment: "awaiting", fulfillment: "unfulfilled", status: "pending" },
    { payment: "awaiting", fulfillment: "unfulfilled", status: "pending" },
    { payment: "refunded", fulfillment: "returned", status: "completed" },
    { payment: "awaiting", fulfillment: "unfulfilled", status: "canceled" },
  ]

  const highestDisplayId =
    (await db.orders().find({}, { sort: { displayId: -1 }, limit: 1 }).toArray())[0]?.displayId ?? 1000

  const seededOrders: OrderDoc[] = Array.from({ length: 48 }, (_, i) => {
    const customer = customers[i % customers.length]
    const addr = customer.addresses[0]
    const shape = ORDER_SHAPES[i % ORDER_SHAPES.length]
    const createdAt = daysAgo(89 - Math.floor(i * 1.8))

    const items = Array.from({ length: 1 + (i % 3) }, (_, j) => {
      const product = products[(i * 5 + j * 11) % products.length]
      const variant = product.variants[j % product.variants.length] ?? product.variants[0]
      const quantity = 1 + ((i + j) % 3)
      return {
        _id: id(`li${i + 1}`, j + 1),
        productId: product._id,
        variantId: variant?._id ?? `${product._id}_v1`,
        productTitle: product.title,
        productHandle: product.handle,
        variantTitle: variant?.title ?? "Default",
        thumbnail: product.thumbnail ?? product.images?.[0],
        quantity,
        unitPrice: variant?.prices?.inr ?? 249900,
      }
    })

    const itemSubtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
    const discountTotal = i % 4 === 0 ? Math.round(itemSubtotal * 0.1) : 0
    const shippingTotal = itemSubtotal > 300000 ? 0 : 9900
    const taxable = itemSubtotal - discountTotal
    const taxTotal = Math.round((taxable * 12) / 100)
    const total = taxable + shippingTotal + taxTotal

    const paidAt = shape.payment === "paid" || shape.payment === "refunded" ? createdAt : undefined

    return {
      _id: id("ord", i + 1),
      displayId: highestDisplayId + i + 1,
      cartId: id("cart", i + 1),
      regionId: INDIA_REGION._id,
      currency: "inr",
      customerId: customer._id,
      email: customer.email,
      items,
      shippingAddress: addr,
      billingAddress: addr,
      shippingOption: { _id: "so_standard", name: "Standard delivery", amount: shippingTotal },
      promoCodes: discountTotal ? [PROMOTIONS[i % PROMOTIONS.length].code] : [],
      totals: { itemSubtotal, discountTotal, shippingTotal, taxTotal, total },
      paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
      paymentStatus: shape.payment,
      paymentDetails: {
        provider: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
        ...(paidAt ? { paidAt, transactionId: `pay_${id("tx", i + 1).slice(5)}` } : {}),
        ...(shape.payment === "refunded"
          ? {
              refunds: [
                {
                  id: id("rf", i + 1),
                  amount: total,
                  reason: REFUND_REASONS[i % REFUND_REASONS.length],
                  createdAt: daysAgo(80 - Math.floor(i * 1.8)),
                },
              ],
            }
          : {}),
      },
      fulfillmentStatus: shape.fulfillment,
      ...(shape.fulfillment === "returned"
        ? {
            returnRequest: {
              status: "refunded" as const,
              reason: REFUND_REASONS[i % REFUND_REASONS.length],
              items: items.map((it) => ({ itemId: it._id, quantity: it.quantity })),
              requestedAt: daysAgo(82 - Math.floor(i * 1.8)),
              updatedAt: daysAgo(79 - Math.floor(i * 1.8)),
            },
          }
        : {}),
      status: shape.status,
      createdAt,
      updatedAt: now,
    } as OrderDoc
  })

  /* ---------- suppliers ---------- */
  const suppliers: SupplierDoc[] = SUPPLIERS.map((s, i) => ({
    _id: id("sup", i + 1),
    name: s.name,
    contactPerson: s.contactPerson,
    email: `${s.contactPerson.split(" ")[0].toLowerCase()}@${s.name.toLowerCase().replace(/[^a-z]+/g, "")}.in`,
    phone: phoneFor(i + 3),
    categories: s.categories,
    rating: s.rating,
    status: i % 7 === 6 ? "inactive" : "active",
    createdAt: daysAgo(300 - i * 7),
    updatedAt: now,
  }))

  /* ---------- purchase orders ---------- */
  const purchaseOrders: PurchaseOrderDoc[] = Array.from({ length: 18 }, (_, i) => {
    const supplier = suppliers[i % suppliers.length]
    const status = PO_STATUSES[i % PO_STATUSES.length]
    const items = Array.from({ length: 2 + (i % 3) }, (_, j) => {
      const product = products[(i * 3 + j) % products.length]
      const variant = product.variants[0]
      const quantity = 40 + ((i * 7 + j * 13) % 160)
      // Landed cost sits below the retail price, as a real PO would.
      const unitCost = Math.max(20000, Math.round((variant?.prices?.inr ?? 300000) * 0.42))
      const received =
        status === "received"
          ? quantity
          : status === "partially_received"
            ? Math.floor(quantity * 0.6)
            : 0
      return {
        sku: variant?.sku ?? `EVR-${product._id.slice(-6).toUpperCase()}-${j + 1}`,
        name: product.title,
        quantity,
        unitCost,
        received,
      }
    })
    const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0)
    return {
      _id: id("po", i + 1),
      poNumber: `PO-2026-${String(1001 + i)}`,
      supplierId: supplier._id,
      supplierName: supplier.name,
      hubId: ["BLR-FC1", "BOM-FC2", "DEL-FC1", "CCU-FC4"][i % 4],
      items,
      status,
      expectedDate: daysAgo(-7 + (i % 30)),
      totalAmount,
      createdAt: daysAgo(90 - i * 4),
      updatedAt: now,
    }
  })

  /* ---------- shipments ---------- */
  // Prefer real orders so an AWB can be traced back to something real; top up
  // beyond that only as far as the orders allow.
  const shippableOrders = seededOrders.filter((o) => o.fulfillmentStatus !== "unfulfilled")
  const shipments: ShipmentDoc[] = shippableOrders.slice(0, 26).map((order: OrderDoc, i) => {
    const status = SHIPMENT_STATUSES[i % SHIPMENT_STATUSES.length]
    const carrier = CARRIERS[i % CARRIERS.length]
    const created = daysAgo(30 - (i % 28))
    const addr = order.shippingAddress ?? addressFor(i)

    const journey: { status: string; location: string; note: string; afterHours: number }[] = [
      { status: "Manifested", location: "BLR-FC1", note: "Label generated", afterHours: 0 },
      { status: "Picked up", location: addr.city, note: "Collected by carrier", afterHours: 6 },
      { status: "In transit", location: "Sorting hub", note: "Departed origin facility", afterHours: 20 },
      { status: "Out for delivery", location: addr.city, note: "With delivery associate", afterHours: 40 },
      { status: "Delivered", location: addr.city, note: "Signed by recipient", afterHours: 46 },
    ]
    const stages =
      status === "manifested" ? 1
        : status === "pickup_scheduled" ? 2
        : status === "in_transit" ? 3
        : status === "out_for_delivery" ? 4
        : status === "delivered" ? 5
        : 4

    const trackingEvents = journey.slice(0, stages).map((e) => ({
      timestamp: new Date(created.getTime() + e.afterHours * 60 * 60 * 1000),
      status: e.status,
      location: e.location,
      note: e.note,
    }))
    if (status === "rto") {
      trackingEvents.push({
        timestamp: new Date(created.getTime() + 60 * 60 * 60 * 1000),
        status: "Returned to origin",
        location: addr.city,
        note: "Three delivery attempts failed",
      })
    }

    return {
      _id: idFor("shp", order._id),
      orderId: order._id,
      displayId: order.displayId,
      carrier,
      // AWB is unique in the database, so it is derived from the order rather
      // than a loop index that shifts between runs.
      awb: `${carrier === "delhivery" ? "DL" : carrier === "bluedart" ? "BD" : "DX"}${String(
        76400000 + order.displayId * 9173
      ).slice(0, 10)}`,
      status,
      trackingEvents,
      pickupDate: stages >= 2 ? new Date(created.getTime() + 6 * 60 * 60 * 1000) : undefined,
      isReturn: false,
      customer: {
        name: `${addr.firstName} ${addr.lastName}`.trim(),
        phone: addr.phone,
        city: addr.city,
        postalCode: addr.postalCode,
      },
      itemsCount: order.items?.reduce((n, it) => n + (it.quantity ?? 1), 0) ?? 1,
      createdAt: created,
      updatedAt: now,
    }
  })

  /* ---------- GST invoices ---------- */
  // Only for orders that were actually paid; an invoice for an unpaid order
  // would be a tax document the business never issued.
  const invoiceable = [...seededOrders, ...existingOrders].filter(
    (o: OrderDoc) => o.paymentStatus === "paid"
  )
  const invoices: InvoiceDoc[] = invoiceable.map((order: OrderDoc, i) => {
    const addr = order.shippingAddress ?? addressFor(i)
    const place = CITIES.find((c) => c.province === addr.province) ?? CITIES[0]
    // Karnataka is the place of supply, so same-state orders split CGST/SGST
    // and the rest attract IGST.
    const intraState = addr.province === "Karnataka"
    const gstRate = 12

    const items = (order.items ?? []).map((it, j) => {
      const taxableValue = Math.round((it.unitPrice ?? 0) * (it.quantity ?? 1))
      const tax = Math.round((taxableValue * gstRate) / 100)
      return {
        name: it.productTitle ?? `Item ${j + 1}`,
        sku: `${(it.productHandle ?? "evr").toUpperCase()}-${j + 1}`,
        hsn: "6204.49.00",
        quantity: it.quantity ?? 1,
        unitPrice: it.unitPrice ?? 0,
        taxableValue,
        gstRate,
        cgst: intraState ? Math.round(tax / 2) : 0,
        sgst: intraState ? Math.round(tax / 2) : 0,
        igst: intraState ? 0 : tax,
      }
    })

    const subtotal = items.reduce((s, it) => s + it.taxableValue, 0)
    const cgstTotal = items.reduce((s, it) => s + it.cgst, 0)
    const sgstTotal = items.reduce((s, it) => s + it.sgst, 0)
    const igstTotal = items.reduce((s, it) => s + it.igst, 0)

    return {
      _id: idFor("inv", order._id),
      invoiceNumber: `EVR/26-27/${String(1001 + i)}`,
      orderId: order._id,
      displayId: order.displayId,
      customerName: `${addr.firstName} ${addr.lastName}`.trim(),
      customerGstin: i % 4 === 0 ? gstinFor(i, place.stateCode) : undefined,
      shippingAddress: addr,
      billingAddress: order.billingAddress ?? addr,
      items,
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      grandTotal: subtotal + cgstTotal + sgstTotal + igstTotal,
      currency: order.currency ?? "inr",
      status: i % 9 === 8 ? "canceled" : "paid",
      issuedAt: order.createdAt ?? daysAgo(20 - i),
    }
  })

  /* ---------- credit notes ---------- */
  const creditNotes: CreditNoteDoc[] = invoices.slice(0, 14).map((inv, i) => ({
    _id: idFor("cn", inv.orderId),
    creditNoteNumber: `CN/26-27/${String(501 + i)}`,
    invoiceNumber: inv.invoiceNumber,
    orderId: inv.orderId,
    customerName: inv.customerName,
    // A partial refund on most, a full one where the whole order came back.
    refundAmount: i % 3 === 0 ? inv.grandTotal : Math.round(inv.grandTotal * 0.45),
    reason: REFUND_REASONS[i % REFUND_REASONS.length],
    status: i % 5 === 4 ? "canceled" : i % 2 === 0 ? "settled" : "issued",
    createdAt: daysAgo(25 - i),
  }))

  /* ---------- promotions ---------- */
  const promotions: PromotionDoc[] = PROMOTIONS.map((p, i) => ({
    _id: id("promo", i + 1),
    code: p.code,
    type: p.type,
    value: p.value,
    currency: p.type === "fixed" ? "inr" : undefined,
    active: p.active,
    usageLimit: p.usageLimit,
    usageCount: p.usageLimit ? Math.floor(p.usageLimit * ((i % 7) / 10)) : i * 13,
    startsAt: daysAgo(60 - i * 3),
    endsAt: p.active ? daysAgo(-45 + i) : daysAgo(5 - i),
    createdAt: daysAgo(80 - i * 3),
    updatedAt: now,
  }))

  /* ---------- admin users ---------- */
  // Staff accounts so the users screen and the RBAC checks have more than one
  // row. All share a development password and are owned by this script.
  const staffPassword = await hashPassword("adminpassword123")
  const staff = [
    { name: "Priya Nair", role: "staff" as const },
    { name: "Rohan Mehta", role: "staff" as const },
    { name: "Ananya Rao", role: "staff" as const },
    { name: "Vikram Joshi", role: "staff" as const },
    { name: "Ishita Banerjee", role: "staff" as const },
    { name: "Karan Malhotra", role: "owner" as const },
    { name: "Meera Krishnan", role: "staff" as const },
  ].map((u, i) => ({
    _id: id("usr", i + 1),
    email: `${u.name.split(" ")[0].toLowerCase()}@everwear.test`,
    name: u.name,
    passwordHash: staffPassword,
    role: u.role,
    createdAt: daysAgo(200 - i * 11),
    updatedAt: now,
  }))

  // Customers and orders go in first; shipments and invoices below reference them.
  await upsertAll(db.customers(), customers)
  await upsertAll(db.orders(), seededOrders)

  const written = {
    customers: customers.length,
    orders: seededOrders.length,
    suppliers: await upsertAll(db.suppliers(), suppliers),
    purchaseOrders: await upsertAll(db.purchaseOrders(), purchaseOrders),
    shipments: await upsertAll(db.shipments(), shipments),
    invoices: await upsertAll(db.invoices(), invoices),
    creditNotes: await upsertAll(db.creditNotes(), creditNotes),
    promotions: await upsertAll(db.promotions(), promotions),
    adminUsers: await upsertAll(db.adminUsers(), staff),
  }

  console.table(written)
  console.log(
    `\nReferenced ${products.length} existing products; ${existingOrders.length} pre-existing orders were left untouched.` +
      "\nRerunning this command updates the same records; it never creates duplicates."
  )

  await disconnect()
}

seed().catch(async (err) => {
  console.error(err)
  await disconnect().catch(() => {})
  process.exit(1)
})
