import { Router, type Request } from "express"
import { z } from "zod"
import { db, SELLER_STATUSES } from "../../db/schema.js"
import { forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { markSettlementPaid, runSettlements, sellerBalance, sellerPerformance } from "../../lib/marketplace/ledger.js"
import { reviewListing } from "../../lib/marketplace/products.js"
import { approveSeller, publicSeller, setSellerStatus, verifyItem } from "../../lib/marketplace/sellers.js"
import { MARKETPLACE_DEFAULTS, marketplaceSettings, unseal } from "../../lib/marketplace/support.js"

/*
 * Running the marketplace: seller review (KYC checks, approval, suspension),
 * listing review, fees and deductions, settlements and payouts, and each
 * seller's performance.
 */

export const adminMarketplaceRoutes = Router()

const actorOf = (req: Request) => ({ type: "admin" as const, id: req.admin!.id, name: req.admin!.email })
const role = (req: Request, ...roles: string[]) => {
  if (req.admin!.role !== "owner" && !roles.includes(req.admin!.role)) throw forbidden("Your role can't do this")
}

adminMarketplaceRoutes.get("/marketplace/settings", async (_req, res) => {
  res.json({ settings: await marketplaceSettings(), defaults: MARKETPLACE_DEFAULTS })
})

adminMarketplaceRoutes.patch("/marketplace/settings", async (req, res) => {
  role(req)
  const body = z
    .object({
      commissionPct: z.number().min(0).max(60),
      fulfilmentFeePerUnit: z.number().int().min(0).max(10_000_00),
      feeGstPct: z.number().min(0).max(28),
      tcsPct: z.number().min(0).max(5),
      tdsPct: z.number().min(0).max(5),
      acceptSlaHours: z.number().int().min(1).max(168),
      dispatchSlaHours: z.number().int().min(1).max(336),
    })
    .partial()
    .parse(req.body)
  await db.settings().updateOne({ _id: "store" }, { $set: { ...Object.fromEntries(Object.entries(body).map(([k, v]) => [`marketplace.${k}`, v])), updatedAt: new Date() } }, { upsert: true })
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: req.admin!.id, adminEmail: req.admin!.email, action: "marketplace.settings", targetCollection: "settings", targetId: "store", diff: body, createdAt: new Date() })
  res.json({ settings: await marketplaceSettings() })
})

/* ---------- Sellers ---------- */

adminMarketplaceRoutes.get("/sellers", async (req, res) => {
  const { status } = z.object({ status: z.enum(SELLER_STATUSES).optional() }).parse(req.query)
  const sellers = await db.sellers().find(status ? { status } : {}, { sort: { createdAt: -1 }, limit: 500 }).toArray()
  res.json({ sellers: sellers.map(publicSeller) })
})

adminMarketplaceRoutes.get("/sellers/:id", async (req, res) => {
  const s = await db.sellers().findOne({ _id: req.params.id })
  if (!s) throw notFound("Seller")
  const [listings, balance] = await Promise.all([
    db.products().aggregate<{ _id: string; n: number }>([{ $match: { sellerId: s._id } }, { $group: { _id: "$review.status", n: { $sum: 1 } } }]).toArray(),
    s.status === "approved" || s.status === "suspended" ? sellerBalance(s._id) : null,
  ])
  res.json({ seller: publicSeller(s), listings: Object.fromEntries(listings.map((l) => [l._id ?? "draft", l.n])), balance })
})

/** The full account number, for verification or a payout: finance and owners only, and every view is audited. */
adminMarketplaceRoutes.get("/sellers/:id/bank", async (req, res) => {
  role(req, "finance_manager")
  const s = await db.sellers().findOne({ _id: req.params.id })
  if (!s?.bank) throw notFound("Bank account")
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: req.admin!.id, adminEmail: req.admin!.email, action: "seller.bank_viewed", targetCollection: "sellers", targetId: s._id, ip: req.ip, createdAt: new Date() })
  res.json({ accountName: s.bank.accountName, accountNumber: unseal(s.bank.sealed), ifsc: s.bank.ifsc })
})

adminMarketplaceRoutes.post("/sellers/:id/verify/:item", async (req, res) => {
  role(req, "store_admin", "finance_manager")
  const item = z.enum(["pan", "gstin", "bank"]).parse(req.params.item)
  res.json({ seller: publicSeller(await verifyItem(req.params.id, item, actorOf(req))) })
})

adminMarketplaceRoutes.post("/sellers/:id/approve", async (req, res) => {
  role(req, "store_admin")
  const body = z.object({ commissionPct: z.number().min(0).max(60).nullable().optional(), shiprocketPickupLocation: z.string().trim().min(1).max(100).optional(), delhiveryPickupLocation: z.string().trim().min(1).max(100).optional() }).parse(req.body ?? {})
  res.json({ seller: publicSeller(await approveSeller(req.params.id, actorOf(req), body)) })
})

adminMarketplaceRoutes.post("/sellers/:id/:action", async (req, res) => {
  role(req, "store_admin")
  const action = z.enum(["suspend", "reject"]).parse(req.params.action)
  const { reason } = z.object({ reason: z.string().trim().min(3).max(300) }).parse(req.body)
  res.json({ seller: publicSeller(await setSellerStatus(req.params.id, action === "suspend" ? "suspended" : "rejected", reason, actorOf(req))) })
})

adminMarketplaceRoutes.get("/sellers/:id/performance", async (req, res) => {
  const q = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query)
  const to = q.to ?? new Date()
  res.json(await sellerPerformance(req.params.id, q.from ?? new Date(to.getTime() - 30 * 86_400_000), to))
})

/* ---------- Listings ---------- */

adminMarketplaceRoutes.get("/listings/review", async (_req, res) => {
  const pending = await db.products().find({ sellerId: { $type: "string" }, "review.status": "pending" }, { sort: { "review.submittedAt": 1 }, limit: 200 }).toArray()
  res.json({ listings: pending })
})

adminMarketplaceRoutes.post("/listings/:id/:decision", async (req, res) => {
  role(req, "store_admin", "catalog_manager")
  const decision = z.enum(["approve", "reject"]).parse(req.params.decision)
  const { note } = z.object({ note: z.string().trim().min(3).max(500).optional() }).parse(req.body ?? {})
  res.json({ listing: await reviewListing(req.params.id, decision === "approve" ? "approved" : "rejected", actorOf(req), note) })
})

/* ---------- Settlements ---------- */

adminMarketplaceRoutes.get("/settlements", async (req, res) => {
  const { status } = z.object({ status: z.enum(["pending", "paid"]).optional() }).parse(req.query)
  const settlements = await db.sellerSettlements().find(status ? { status } : {}, { sort: { createdAt: -1 }, limit: 200 }).toArray()
  const sellers = await db.sellers().find({ _id: { $in: [...new Set(settlements.map((x) => x.sellerId))] } }, { projection: { code: 1, displayName: 1 } }).toArray()
  const byId = new Map(sellers.map((x) => [x._id, x]))
  res.json({ settlements: settlements.map((x) => ({ ...x, seller: byId.has(x.sellerId) ? { code: byId.get(x.sellerId)!.code, displayName: byId.get(x.sellerId)!.displayName } : null })) })
})

adminMarketplaceRoutes.post("/settlements/run", async (req, res) => {
  role(req, "finance_manager")
  const { asOf } = z.object({ asOf: z.coerce.date().optional() }).parse(req.body ?? {})
  const at = asOf && asOf < new Date() ? asOf : new Date()
  res.status(201).json({ settlements: await runSettlements(at, actorOf(req)) })
})

adminMarketplaceRoutes.post("/settlements/:id/paid", async (req, res) => {
  role(req, "finance_manager")
  const { utr } = z.object({ utr: z.string().trim().toUpperCase() }).parse(req.body)
  res.json({ settlement: await markSettlementPaid(req.params.id, utr, actorOf(req)) })
})
