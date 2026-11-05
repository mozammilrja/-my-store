import { Router, type Request, type RequestHandler } from "express"
import { z } from "zod"
import { db, FULFILMENT_STATUSES, type ProductDoc, type SellerDoc } from "../../db/schema.js"
import { adminLoginMaxAttempts } from "../../env.js"
import { clientKey, issueToken, rateLimit, requireAuth, verifyPassword } from "../../lib/auth.js"
import { ApiError, badRequest, conflict, forbidden, notFound, unauthorized } from "../../lib/errors.js"
import { acceptFulfilment, rejectFulfilment } from "../../lib/fulfilment/workflow.js"
import { runStockOperation } from "../../lib/inventory/operations.js"
import { createInbound, markInboundShipped } from "../../lib/marketplace/inbound.js"
import { sellerBalance, sellerPerformance } from "../../lib/marketplace/ledger.js"
import { handoverAsSeller, labelAsSeller, ownFulfilment, packAsSeller, sellerActor } from "../../lib/marketplace/fulfil.js"
import { createListing, submitListing, updateListing, type ListingInput } from "../../lib/marketplace/products.js"
import { publicSeller, registerSeller, submitKyc, updateKyc } from "../../lib/marketplace/sellers.js"
import { marketplaceSettings } from "../../lib/marketplace/support.js"
import { inspectReturn } from "../../lib/returns/inspect.js"
import { REASON_TEXT } from "../../lib/returns/returns.js"
import { assetUrl } from "../../lib/serialize.js"
import { email } from "../../lib/validation.js"
import { readUpload, storeProductImage } from "../admin/products.js"

/*
 * The seller portal API (apps/seller). Sellers are their own account type
 * and see only their own listings, stock, order lines, returns and money.
 * Customer contact details are never shown; a seller who ships their own
 * orders sees the delivery address only once a parcel is packed, to put on
 * the parcel.
 */

export const sellerRoutes = Router()

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, "").slice(-10))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a 10-digit Indian mobile number")

sellerRoutes.post("/auth/register", async (req, res) => {
  if (!rateLimit(`seller-register:${clientKey(req, "register")}`, 10, 60 * 60 * 1000)) throw new ApiError(429, "rate_limited", "Too many sign-ups from here. Try again later.")
  const body = z.object({ email, phone, displayName: z.string().trim().min(2).max(80), password: z.string().min(10, "Use at least 10 characters").max(200), fulfilmentModel: z.enum(["seller", "platform"]) }).parse(req.body)
  const seller = await registerSeller(body)
  res.status(201).json({ token: issueToken("seller", seller._id), seller: publicSeller(seller) })
})

sellerRoutes.post("/auth/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body)
  if (!rateLimit(`seller-login:${clientKey(req, body.email)}`, adminLoginMaxAttempts, 15 * 60 * 1000)) throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.")
  const seller = await db.sellers().findOne({ email: body.email })
  if (!(await verifyPassword(body.password, seller?.passwordHash)) || !seller) throw unauthorized("Email or password is incorrect")
  res.json({ token: issueToken("seller", seller._id) })
})

const loadSeller: RequestHandler = async (req, _res, next) => {
  const seller = await db.sellers().findOne({ _id: req.actorId! })
  if (!seller) throw unauthorized()
  req.seller = seller
  next()
}
sellerRoutes.use(requireAuth("seller"), loadSeller)

const approved = (req: Request) => {
  if (req.seller!.status !== "approved") throw forbidden(req.seller!.status === "suspended" ? "Your seller account is suspended." : "Your seller account isn't approved yet.")
  return req.seller!
}
const selfShip = (req: Request) => {
  const s = approved(req)
  if (s.fulfilmentModel !== "seller" || !s.warehouseId) throw conflict("The store ships your orders.", "platform_fulfilled")
  return s
}
const productIdsOf = async (s: SellerDoc) => (await db.products().find({ sellerId: s._id }, { projection: { _id: 1 } }).toArray()).map((p) => p._id)

/* ---------- Account and KYC ---------- */

sellerRoutes.get("/me", async (req, res) => {
  const s = req.seller!
  const [settings, warehouse] = await Promise.all([marketplaceSettings(), s.warehouseId ? db.warehouses().findOne({ _id: s.warehouseId }, { projection: { code: 1, name: 1, city: 1, pincode: 1, acceptsOrders: 1 } }) : null])
  res.json({
    seller: publicSeller(s),
    warehouse,
    terms: { commissionPct: s.commissionPct ?? settings.commissionPct, fulfilmentFeePerUnit: s.fulfilmentModel === "platform" ? settings.fulfilmentFeePerUnit : 0, feeGstPct: settings.feeGstPct, tcsPct: settings.tcsPct, tdsPct: settings.tdsPct, acceptSlaHours: settings.acceptSlaHours, dispatchSlaHours: settings.dispatchSlaHours },
  })
})

const address = z.object({ line1: z.string().trim().min(5).max(200), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), postalCode: z.string().trim().regex(/^\d{6}$/, "Six-digit PIN code") })

sellerRoutes.put("/me/kyc", async (req, res) => {
  const body = z
    .object({
      businessType: z.enum(["individual", "proprietorship", "partnership", "llp", "company"]).optional(),
      legalName: z.string().trim().min(2).max(150).optional(),
      pan: z.string().trim().toUpperCase().optional(),
      gstin: z.string().trim().toUpperCase().nullable().optional(),
      registeredAddress: address.optional(),
      bank: z.object({ accountName: z.string().trim().min(2).max(120), accountNumber: z.string().trim().regex(/^\d+$/, "Digits only"), ifsc: z.string().trim().toUpperCase() }).optional(),
      pickupAddress: address.extend({ phone }).optional(),
      fulfilmentModel: z.enum(["seller", "platform"]).optional(),
    })
    .parse(req.body)
  res.json({ seller: publicSeller(await updateKyc(req.seller!, body)) })
})

sellerRoutes.post("/me/kyc/submit", async (req, res) => {
  res.json({ seller: publicSeller(await submitKyc(req.seller!)) })
})

/* ---------- Listings ---------- */

sellerRoutes.get("/categories", async (_req, res) => {
  res.json({ categories: await db.categories().find({}, { projection: { name: 1, handle: 1, parentId: 1 }, sort: { name: 1 } }).toArray() })
})

sellerRoutes.post("/uploads", readUpload, async (req, res) => {
  res.status(201).json(await storeProductImage(req.file))
})

const listingSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional(),
  categoryIds: z.array(z.string()).min(1).max(5),
  images: z
    .array(z.string().max(500))
    .max(12)
    .transform((xs) => xs.map((u) => u.replace(/^https?:\/\/[^/]+(?=\/uploads\/)/, "")))
    .refine((xs) => xs.every((u) => u.startsWith("/uploads/products/")), "Upload photos first"),
  material: z.string().trim().max(100).optional(),
  weight: z.number().int().positive().max(50_000).optional(),
  options: z.array(z.object({ title: z.string().trim().min(1).max(40), values: z.array(z.string().trim().min(1).max(40)).min(1).max(30) })).max(3),
  variants: z.array(z.object({ sku: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/, "SKUs are 3-40 letters, digits and dashes"), options: z.record(z.string(), z.string()), price: z.number().int().positive().max(100_000_000), compareAtPrice: z.number().int().positive().nullable().optional() })).min(1).max(100),
})

const toSellerListing = (p: ProductDoc) => ({
  id: p._id,
  title: p.title,
  description: p.description ?? null,
  status: p.status,
  review: p.review ?? { status: "draft" },
  categoryIds: p.categoryIds,
  images: p.images.map((i) => ({ path: i, url: assetUrl(i) })),
  options: p.options,
  material: p.material ?? null,
  weight: p.weight ?? null,
  variants: p.variants.map((v) => ({ id: v._id, sku: v.sku ?? "", title: v.title, options: v.options, price: v.prices.inr ?? 0, compareAtPrice: v.compareAtPrices?.inr ?? null, stock: v.stock })),
  updatedAt: p.updatedAt,
})

sellerRoutes.get("/listings", async (req, res) => {
  const listings = await db.products().find({ sellerId: req.seller!._id }, { sort: { updatedAt: -1 } }).toArray()
  res.json({ listings: listings.map(toSellerListing) })
})

sellerRoutes.get("/listings/:id", async (req, res) => {
  const p = await db.products().findOne({ _id: String(req.params.id), sellerId: req.seller!._id })
  if (!p) throw notFound("Listing")
  res.json({ listing: toSellerListing(p) })
})

sellerRoutes.post("/listings", async (req, res) => {
  res.status(201).json({ listing: toSellerListing(await createListing(req.seller!, listingSchema.parse(req.body) as ListingInput)) })
})

sellerRoutes.put("/listings/:id", async (req, res) => {
  res.json({ listing: toSellerListing(await updateListing(req.seller!, String(req.params.id), listingSchema.parse(req.body) as ListingInput)) })
})

sellerRoutes.post("/listings/:id/submit", async (req, res) => {
  res.json({ listing: toSellerListing(await submitListing(req.seller!, String(req.params.id))) })
})

/* ---------- Stock ---------- */

/** Your items' stock: at your location (you ship) or across the store's warehouses (the store ships). */
sellerRoutes.get("/stock", async (req, res) => {
  const s = approved(req)
  const products = await db.products().find({ sellerId: s._id }, { projection: { title: 1, "variants._id": 1, "variants.title": 1, "variants.sku": 1 } }).toArray()
  const variantIds = products.flatMap((p) => p.variants.map((v) => v._id))
  const levels = await db.stockLevels().find({ variantId: { $in: variantIds }, ...(s.warehouseId ? { warehouseId: s.warehouseId } : {}) }).toArray()
  const titleOf = (variantId: string) => {
    const p = products.find((x) => x.variants.some((v) => v._id === variantId))!
    return { productTitle: p.title, variantTitle: p.variants.find((v) => v._id === variantId)!.title }
  }
  res.json({
    stock: products.flatMap((p) =>
      p.variants.map((v) => {
        const at = levels.filter((l) => l.variantId === v._id)
        return { variantId: v._id, sku: v.sku ?? "", ...titleOf(v._id), available: at.reduce((n, l) => n + l.available, 0), reserved: at.reduce((n, l) => n + l.reserved + l.picked + l.packed, 0), damaged: at.reduce((n, l) => n + l.damaged, 0), warehouses: at.map((l) => ({ code: l.warehouseCode, available: l.available })) }
      })
    ),
  })
})

/** Sellers who ship their own orders record stock at their location (goods in, counts, damage), on the ledger. */
sellerRoutes.post("/stock/operations", async (req, res) => {
  const s = selfShip(req)
  const body = z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("receive"), variantId: z.string(), quantity: z.number().int().positive().max(100_000), note: z.string().trim().max(300).optional() }),
      z.object({ type: z.literal("adjust"), variantId: z.string(), delta: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0), note: z.string().trim().min(3).max(300) }),
      z.object({ type: z.literal("damage"), variantId: z.string(), quantity: z.number().int().positive().max(100_000), note: z.string().trim().min(3).max(300) }),
      z.object({ type: z.literal("write_off"), variantId: z.string(), quantity: z.number().int().positive().max(100_000), note: z.string().trim().min(3).max(300) }),
    ])
    .parse(req.body)
  if (!(await db.products().countDocuments({ sellerId: s._id, "variants._id": body.variantId }))) throw notFound("Item")
  res.status(201).json(await runStockOperation({ ...body, warehouseId: s.warehouseId! } as Parameters<typeof runStockOperation>[0], sellerActor(s)))
})

/* ---------- Sending stock to the store (store-fulfilled sellers) ---------- */

sellerRoutes.get("/store-warehouses", async (req, res) => {
  approved(req)
  res.json({ warehouses: await db.warehouses().find({ status: "active", sellerId: { $in: [null] } }, { projection: { code: 1, name: 1, city: 1, address: 1, pincode: 1 }, sort: { code: 1 } }).toArray() })
})

sellerRoutes.get("/inbound", async (req, res) => {
  res.json({ shipments: await db.inboundShipments().find({ sellerId: req.seller!._id }, { sort: { createdAt: -1 }, limit: 100 }).toArray() })
})

sellerRoutes.post("/inbound", async (req, res) => {
  const body = z.object({ warehouseId: z.string(), lines: z.array(z.object({ variantId: z.string(), quantity: z.number().int().positive().max(100_000) })).min(1).max(200) }).parse(req.body)
  res.status(201).json({ shipment: await createInbound(approved(req), body) })
})

sellerRoutes.post("/inbound/:id/shipped", async (req, res) => {
  const body = z.object({ carrier: z.string().trim().min(2).max(80), awb: z.string().trim().regex(/^[A-Za-z0-9-]{4,40}$/) }).parse(req.body)
  res.json({ shipment: await markInboundShipped(approved(req), String(req.params.id), body) })
})

/* ---------- Orders ---------- */

/** Order lines for your items, newest first; on mixed orders, only your lines. */
sellerRoutes.get("/sales", async (req, res) => {
  const s = approved(req)
  const q = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(req.query)
  const productIds = await productIdsOf(s)
  const orders = await db.orders().find({ "items.productId": { $in: productIds } }, { sort: { createdAt: -1 }, limit: q.limit }).toArray()
  res.json({
    sales: orders.map((o) => ({
      orderId: o._id,
      displayId: o.displayId,
      createdAt: o.createdAt,
      status: o.status,
      fulfillmentStatus: o.fulfillmentStatus,
      paymentMethod: o.paymentMethod,
      city: o.shippingAddress.city,
      items: o.items.filter((i) => productIds.includes(i.productId)).map((i) => ({ itemId: i._id, productTitle: i.productTitle, variantTitle: i.variantTitle, quantity: i.quantity, unitPrice: i.unitPrice })),
    })),
  })
})

/** Orders you ship yourself, by stage. */
sellerRoutes.get("/orders", async (req, res) => {
  const s = selfShip(req)
  const q = z.object({ status: z.union([z.enum(FULFILMENT_STATUSES), z.array(z.enum(FULFILMENT_STATUSES))]).optional() }).parse(req.query)
  const statuses = q.status ? [q.status].flat() : undefined
  const fulfilments = await db.fulfilments().find({ warehouseId: s.warehouseId!, ...(statuses ? { status: { $in: statuses } } : {}) }, { sort: { createdAt: -1 }, limit: 200 }).toArray()
  res.json({ orders: fulfilments })
})

sellerRoutes.get("/orders/:id", async (req, res) => {
  const s = selfShip(req)
  const f = await ownFulfilment(s, String(req.params.id))
  const [history, shipment] = await Promise.all([db.statusEvents().find({ entityId: f._id }, { sort: { at: 1 } }).toArray(), f.shipmentId ? db.shipments().findOne({ _id: f.shipmentId }, { projection: { awb: 1, carrier: 1, labelUrl: 1, status: 1, provider: 1 } }) : null])
  // The address goes on the parcel: shown once it's packed and while it's yours to ship.
  const order = ["packed", "label_generated", "ready_to_dispatch", "manifested", "handed_over"].includes(f.status) ? await db.orders().findOne({ _id: f.orderId }, { projection: { shippingAddress: 1 } }) : null
  const a = order?.shippingAddress
  res.json({ order: f, history, label: shipment, shipTo: a ? { name: `${a.firstName} ${a.lastName}`, address1: a.address1, address2: a.address2 ?? null, city: a.city, state: a.province ?? "", postalCode: a.postalCode } : null })
})

sellerRoutes.post("/orders/:id/accept", async (req, res) => {
  const s = selfShip(req)
  const f = await ownFulfilment(s, String(req.params.id))
  res.json({ order: await acceptFulfilment(f._id, sellerActor(s)) })
})

sellerRoutes.post("/orders/:id/decline", async (req, res) => {
  const s = selfShip(req)
  const f = await ownFulfilment(s, String(req.params.id))
  const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body)
  const r = await rejectFulfilment(f._id, sellerActor(s), reason)
  res.json({ order: r.rejected })
})

sellerRoutes.post("/orders/:id/pack", async (req, res) => {
  const s = selfShip(req)
  const parcel = z.object({ weightKg: z.number().positive().max(100), lengthCm: z.number().positive().max(300), breadthCm: z.number().positive().max(300), heightCm: z.number().positive().max(300) }).parse(req.body)
  res.json({ order: await packAsSeller(s, String(req.params.id), parcel) })
})

sellerRoutes.post("/orders/:id/ship", async (req, res) => {
  const s = selfShip(req)
  const body = z.object({ courierId: z.number().int().positive().optional(), manual: z.object({ carrier: z.string().trim().min(2).max(80), awb: z.string().trim().min(4).max(40), trackingUrl: z.url().optional() }).optional() }).parse(req.body ?? {})
  res.json({ order: await labelAsSeller(s, String(req.params.id), body) })
})

sellerRoutes.post("/handover", async (req, res) => {
  const s = selfShip(req)
  const body = z.object({ carrier: z.string().trim().min(1).max(80), courierExecutive: z.string().trim().min(2).max(100) }).parse(req.body)
  res.json({ manifest: await handoverAsSeller(s, body.carrier, body.courierExecutive) })
})

/* ---------- Returns ---------- */

sellerRoutes.get("/returns", async (req, res) => {
  const s = approved(req)
  const productIds = await productIdsOf(s)
  const returns = await db.returns().find({ "items.productId": { $in: productIds } }, { sort: { requestedAt: -1 }, limit: 100 }).toArray()
  res.json({
    returns: returns.map((r) => ({
      id: r._id,
      code: r.code,
      displayId: r.displayId,
      type: r.type,
      status: r.status,
      requestedAt: r.requestedAt,
      items: r.items.filter((i) => productIds.includes(i.productId)).map((i) => ({ itemId: i.itemId, productTitle: i.productTitle, variantTitle: i.variantTitle, quantity: i.quantity, reason: REASON_TEXT[i.reason], note: i.note ?? null })),
      inspection: r.inspection ?? null,
    })),
  })
})

/** Sellers who ship themselves get their returns back and grade them; only then does stock come back. */
sellerRoutes.post("/returns/:id/inspect", async (req, res) => {
  const s = selfShip(req)
  const body = z.object({ lines: z.array(z.object({ itemId: z.string(), quantity: z.number().int().positive(), condition: z.enum(["sellable", "damaged"]), notes: z.string().trim().max(300).optional() })).min(1).max(100) }).parse(req.body)
  const ret = await db.returns().findOne({ _id: String(req.params.id) })
  const productIds = await productIdsOf(s)
  if (!ret || !ret.items.every((i) => productIds.includes(i.productId))) throw notFound("Return")
  const done = await inspectReturn(ret._id, s.warehouseId!, body.lines, sellerActor(s))
  res.json({ status: done.status, inspection: done.inspection })
})

/* ---------- Money and reports ---------- */

const period = (req: Request) => {
  const q = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query)
  const to = q.to ?? new Date()
  const from = q.from ?? new Date(to.getTime() - 30 * 86_400_000)
  if (from > to) throw badRequest("The start must be before the end")
  return { from, to }
}

sellerRoutes.get("/balance", async (req, res) => {
  res.json(await sellerBalance(approved(req)._id))
})

sellerRoutes.get("/ledger", async (req, res) => {
  const s = approved(req)
  const { from, to } = period(req)
  res.json({ entries: await db.sellerLedger().find({ sellerId: s._id, createdAt: { $gte: from, $lte: to } }, { sort: { createdAt: -1 }, limit: 500 }).toArray() })
})

sellerRoutes.get("/settlements", async (req, res) => {
  res.json({ settlements: await db.sellerSettlements().find({ sellerId: approved(req)._id }, { sort: { createdAt: -1 }, limit: 100 }).toArray() })
})

sellerRoutes.get("/performance", async (req, res) => {
  const { from, to } = period(req)
  res.json(await sellerPerformance(approved(req)._id, from, to))
})


declare global {
  namespace Express {
    interface Request {
      seller?: SellerDoc
    }
  }
}
