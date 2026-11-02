import { Router } from "express"
import { z } from "zod"
import { db, type WarehouseDoc } from "../../db/schema.js"
import { conflict, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"

export const adminWarehouseRoutes = Router()

const warehouseSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(20),
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(4).max(10),
  address: z.string().trim().min(5).max(250),
  leadDispatcher: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  isDefault: z.boolean().default(false),
})

adminWarehouseRoutes.get("/warehouses", async (_req, res) => {
  const warehouses = await db.warehouses().find({}, { sort: { isDefault: -1, code: 1 } }).toArray()
  res.json({ warehouses })
})

adminWarehouseRoutes.post("/warehouses", async (req, res) => {
  const body = warehouseSchema.parse(req.body)
  const existing = await db.warehouses().findOne({ code: body.code })
  if (existing) throw conflict(`A warehouse with code ${body.code} already exists`, "duplicate_code")

  const now = new Date()
  if (body.isDefault) {
    await db.warehouses().updateMany({}, { $set: { isDefault: false, updatedAt: now } })
  }

  const doc: WarehouseDoc = {
    _id: newId("wh"),
    ...body,
    createdAt: now,
    updatedAt: now,
  }
  await db.warehouses().insertOne(doc)
  res.status(201).json({ warehouse: doc })
})

adminWarehouseRoutes.patch("/warehouses/:id", async (req, res) => {
  const body = warehouseSchema.partial().parse(req.body)
  const warehouse = await db.warehouses().findOne({ _id: req.params.id })
  if (!warehouse) throw notFound("Warehouse")

  const now = new Date()
  if (body.isDefault) {
    await db.warehouses().updateMany({ _id: { $ne: warehouse._id } }, { $set: { isDefault: false, updatedAt: now } })
  }

  const updated = await db.warehouses().findOneAndUpdate(
    { _id: warehouse._id },
    { $set: { ...body, updatedAt: now } },
    { returnDocument: "after" }
  )
  res.json({ warehouse: updated })
})

adminWarehouseRoutes.delete("/warehouses/:id", async (req, res) => {
  const warehouse = await db.warehouses().findOne({ _id: req.params.id })
  if (!warehouse) throw notFound("Warehouse")
  if (warehouse.isDefault) throw conflict("Cannot delete default fulfillment hub", "default_warehouse")

  await db.warehouses().updateOne({ _id: warehouse._id }, { $set: { status: "inactive", updatedAt: new Date() } })
  res.json({ success: true })
})

adminWarehouseRoutes.get("/warehouses/:id/stock", async (req, res) => {
  const warehouse = await db.warehouses().findOne({ _id: req.params.id })
  if (!warehouse) throw notFound("Warehouse")

  const items = await db.inventory().find({ hubId: warehouse.code }).toArray()
  res.json({ warehouse, stock: items })
})
