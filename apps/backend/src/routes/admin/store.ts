import { Router } from "express"
import type { Filter } from "mongodb"
import { z } from "zod"
import { db, type CustomerDoc, type PromotionDoc } from "../../db/schema.js"
import { conflict, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { toAdminOrder } from "./orders.js"

const handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, "Use lowercase letters, numbers and dashes")
const name = z.string().trim().min(1).max(100)
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const adminStoreRoutes = Router()

/* ---------- customers ---------- */

const toAdminCustomer = (c: CustomerDoc, orders?: { count: number; spent: { currency: string; total: number }[] }) => ({
  id: c._id,
  email: c.email,
  firstName: c.firstName ?? null,
  lastName: c.lastName ?? null,
  phone: c.phone ?? null,
  hasAccount: !!c.passwordHash,
  addresses: c.addresses.map(({ _id, ...a }) => ({ id: _id, ...a })),
  createdAt: c.createdAt,
  ...(orders ? { orders } : {}),
})

adminStoreRoutes.get("/customers", async (req, res) => {
  const q = z
    .object({ q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).max(1000).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) })
    .parse(req.query)
  const filter: Filter<CustomerDoc> = q.q
    ? { $or: [{ email: { $regex: escape(q.q), $options: "i" } }, { firstName: { $regex: escape(q.q), $options: "i" } }, { lastName: { $regex: escape(q.q), $options: "i" } }] }
    : {}
  const [customers, count] = await Promise.all([
    db.customers().find(filter, { projection: { passwordHash: 0 }, sort: { createdAt: -1 }, skip: (q.page - 1) * q.limit, limit: q.limit }).toArray(),
    db.customers().countDocuments(filter),
  ])
  const stats = await db
    .orders()
    .aggregate<{ _id: string; count: number }>([{ $match: { customerId: { $in: customers.map((x) => x._id) }, status: { $ne: "canceled" } } }, { $group: { _id: "$customerId", count: { $sum: 1 } } }])
    .toArray()
  const countBy = new Map(stats.map((s) => [s._id, s.count]))
  res.json({
    customers: customers.map((x) => ({ ...toAdminCustomer(x), orderCount: countBy.get(x._id) ?? 0 })),
    count,
    page: q.page,
    pages: Math.max(1, Math.ceil(count / q.limit)),
  })
})

adminStoreRoutes.get("/customers/:id", async (req, res) => {
  const customer = await db.customers().findOne({ _id: req.params.id }, { projection: { passwordHash: 0 } })
  if (!customer) throw notFound("Customer")
  const orders = await db.orders().find({ customerId: customer._id }, { sort: { createdAt: -1 }, limit: 50 }).toArray()
  const spent = new Map<string, number>()
  for (const o of orders) if (o.status !== "canceled") spent.set(o.currency, (spent.get(o.currency) ?? 0) + o.totals.total)
  res.json({
    customer: toAdminCustomer(customer, { count: orders.length, spent: [...spent].map(([currency, total]) => ({ currency, total })) }),
    orders: orders.map(toAdminOrder),
  })
})

/* ---------- promotions ---------- */

const toAdminPromotion = (p: PromotionDoc) => ({
  id: p._id,
  code: p.code,
  type: p.type,
  value: p.value,
  currency: p.currency ?? null,
  active: p.active,
  usageLimit: p.usageLimit ?? null,
  usageCount: p.usageCount,
  startsAt: p.startsAt ?? null,
  endsAt: p.endsAt ?? null,
  createdAt: p.createdAt,
})

const promotionInput = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "3 to 32 letters, numbers, dashes"),
    type: z.enum(["percentage", "fixed"]),
    value: z.number().int().min(1).max(100_000_000),
    currency: z.string().regex(/^[a-z]{3}$/).nullable().default(null),
    active: z.boolean().default(true),
    usageLimit: z.number().int().min(1).max(1_000_000).nullable().default(null),
    startsAt: z.coerce.date().nullable().default(null),
    endsAt: z.coerce.date().nullable().default(null),
  })
  .refine((p) => p.type !== "percentage" || p.value <= 100, { message: "A percentage can't be over 100", path: ["value"] })
  .refine((p) => p.type !== "fixed" || !!p.currency, { message: "A fixed discount needs a currency", path: ["currency"] })
  .refine((p) => !p.startsAt || !p.endsAt || p.startsAt < p.endsAt, { message: "End must be after start", path: ["endsAt"] })

adminStoreRoutes.get("/promotions", async (_req, res) => {
  const promotions = await db.promotions().find({}, { sort: { createdAt: -1 } }).toArray()
  res.json({ promotions: promotions.map(toAdminPromotion) })
})

adminStoreRoutes.post("/promotions", async (req, res) => {
  const body = promotionInput.parse(req.body)
  const now = new Date()
  const { currency, ...rest } = body
  const doc: PromotionDoc = { _id: newId("promo"), ...rest, ...(currency ? { currency } : {}), usageCount: 0, createdAt: now, updatedAt: now }
  await db.promotions().insertOne(doc)
  res.status(201).json({ promotion: toAdminPromotion(doc) })
})

adminStoreRoutes.patch("/promotions/:id", async (req, res) => {
  const body = z.object({ active: z.boolean() }).strict().parse(req.body)
  const result = await db.promotions().findOneAndUpdate({ _id: req.params.id }, { $set: { active: body.active, updatedAt: new Date() } }, { returnDocument: "after" })
  if (!result) throw notFound("Promotion")
  res.json({ promotion: toAdminPromotion(result) })
})

adminStoreRoutes.delete("/promotions/:id", async (req, res) => {
  const promo = await db.promotions().findOne({ _id: req.params.id })
  if (!promo) throw notFound("Promotion")
  // Used codes are kept for the record; switch them off instead.
  if (promo.usageCount > 0) throw conflict("This code has been used. Deactivate it instead.", "in_use")
  await db.promotions().deleteOne({ _id: promo._id })
  res.json({ deleted: true })
})

/* ---------- categories and collections ---------- */

adminStoreRoutes.post("/categories", async (req, res) => {
  const body = z.object({ name, handle, description: z.string().trim().max(1000).optional() }).parse(req.body)
  const now = new Date()
  const doc = { _id: newId("pcat"), name: body.name, handle: body.handle, ...(body.description ? { description: body.description } : {}), parentId: null, rank: await db.categories().countDocuments(), createdAt: now, updatedAt: now }
  await db.categories().insertOne(doc)
  res.status(201).json({ category: { id: doc._id, name: doc.name, handle: doc.handle } })
})

adminStoreRoutes.patch("/categories/:id", async (req, res) => {
  const body = z.object({ name: name.optional(), handle: handle.optional(), description: z.string().trim().max(1000).optional() }).strict().parse(req.body)
  const result = await db.categories().findOneAndUpdate({ _id: req.params.id }, { $set: { ...body, updatedAt: new Date() } }, { returnDocument: "after" })
  if (!result) throw notFound("Category")
  res.json({ category: { id: result._id, name: result.name, handle: result.handle } })
})

adminStoreRoutes.delete("/categories/:id", async (req, res) => {
  const id = req.params.id
  const used = await db.products().countDocuments({ categoryIds: id })
  if (used) throw conflict(`${used} products use this category. Move them first.`, "in_use")
  const result = await db.categories().deleteOne({ _id: id })
  if (!result.deletedCount) throw notFound("Category")
  res.json({ deleted: true })
})

/** The admin's product list shows a collection name, so it needs to read them. */
adminStoreRoutes.get("/collections", async (_req, res) => {
  const collections = await db.collections().find({}, { sort: { title: 1 } }).toArray()
  res.json({
    collections: collections.map((c) => ({ id: c._id, handle: c.handle, title: c.title })),
  })
})

adminStoreRoutes.post("/collections", async (req, res) => {
  const body = z.object({ title: name, handle }).parse(req.body)
  const now = new Date()
  const doc = { _id: newId("pcol"), title: body.title, handle: body.handle, createdAt: now, updatedAt: now }
  await db.collections().insertOne(doc)
  res.status(201).json({ collection: { id: doc._id, title: doc.title, handle: doc.handle } })
})

adminStoreRoutes.patch("/collections/:id", async (req, res) => {
  const body = z.object({ title: name.optional(), handle: handle.optional() }).strict().parse(req.body)
  const result = await db.collections().findOneAndUpdate({ _id: req.params.id }, { $set: { ...body, updatedAt: new Date() } }, { returnDocument: "after" })
  if (!result) throw notFound("Collection")
  res.json({ collection: { id: result._id, title: result.title, handle: result.handle } })
})

adminStoreRoutes.delete("/collections/:id", async (req, res) => {
  const id = req.params.id
  const used = await db.products().countDocuments({ collectionId: id })
  if (used) throw conflict(`${used} products are in this collection. Move them first.`, "in_use")
  const result = await db.collections().deleteOne({ _id: id })
  if (!result.deletedCount) throw notFound("Collection")
  res.json({ deleted: true })
})
