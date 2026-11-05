import { Router, type Request } from "express"
import { z } from "zod"
import { db, type WarehouseDoc } from "../../db/schema.js"
import { conflict, forbidden, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"

export const adminWarehouseRoutes = Router()

/** Changing the buildings orders ship from is for owners, store admins and inventory managers; everyone can look. */
const requireWriter = (req: Request) => {
  if (!["owner", "store_admin", "inventory_manager"].includes(req.admin!.role)) throw forbidden("Your role can't change warehouses")
}

const warehouseSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(20),
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(4).max(10),
  address: z.string().trim().min(5).max(250),
  /** Optional text fields take null to clear them. */
  leadDispatcher: z.string().trim().min(1).max(100).nullable().optional(),
  /** GSTIN: 2-digit state code, 10-character PAN, entity number, Z, check character. */
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN")
    .nullable()
    .optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  isDefault: z.boolean().optional(),
  /** PIN codes or prefixes served; empty means anywhere. */
  serviceAreas: z.array(z.string().trim().regex(/^\d{1,6}$/, "Use a PIN code or its first digits")).max(2000).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  acceptsOrders: z.boolean().optional(),
  shiprocketPickupLocation: z.string().trim().min(1).max(100).nullable().optional(),
  delhiveryPickupLocation: z.string().trim().min(1).max(100).nullable().optional(),
})
/** Fields stored only while set: null in a request removes them. */
const CLEARABLE = ["leadDispatcher", "shiprocketPickupLocation", "delhiveryPickupLocation"] as const
const split = (body: Record<string, unknown>) => {
  const set: Record<string, unknown> = {}
  const unset: Record<string, ""> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue
    if (v === null && (CLEARABLE as readonly string[]).includes(k)) unset[k] = ""
    else set[k] = v
  }
  return { set, unset }
}

adminWarehouseRoutes.get("/warehouses", async (_req, res) => {
  const warehouses = await db.warehouses().find({}, { sort: { isDefault: -1, code: 1 } }).toArray()
  res.json({ warehouses })
})

adminWarehouseRoutes.post("/warehouses", async (req, res) => {
  requireWriter(req)
  const parsed = warehouseSchema.parse(req.body)
  const body = { ...split(parsed).set, status: parsed.status ?? "active", isDefault: parsed.isDefault ?? false } as typeof parsed & { status: "active" | "inactive"; isDefault: boolean }
  const existing = await db.warehouses().findOne({ code: body.code })
  if (existing) throw conflict(`A warehouse with code ${body.code} already exists`, "duplicate_code")

  const now = new Date()
  if (body.isDefault) {
    await db.warehouses().updateMany({}, { $set: { isDefault: false, updatedAt: now } })
  }

  const doc: WarehouseDoc = {
    _id: newId("wh"),
    ...(body as Omit<WarehouseDoc, "_id" | "createdAt" | "updatedAt">),
    createdAt: now,
    updatedAt: now,
  }
  await db.warehouses().insertOne(doc)
  res.status(201).json({ warehouse: doc })
})

adminWarehouseRoutes.patch("/warehouses/:id", async (req, res) => {
  requireWriter(req)
  const body = warehouseSchema.partial().parse(req.body)
  const warehouse = await db.warehouses().findOne({ _id: req.params.id })
  if (!warehouse) throw notFound("Warehouse")

  const now = new Date()
  if (body.isDefault) {
    await db.warehouses().updateMany({ _id: { $ne: warehouse._id } }, { $set: { isDefault: false, updatedAt: now } })
  }

  const updated = await db.warehouses().findOneAndUpdate(
    { _id: warehouse._id },
    { $set: { ...split(body).set, updatedAt: now }, ...(Object.keys(split(body).unset).length ? { $unset: split(body).unset } : {}) },
    { returnDocument: "after" }
  )
  res.json({ warehouse: updated })
})

adminWarehouseRoutes.delete("/warehouses/:id", async (req, res) => {
  requireWriter(req)
  const warehouse = await db.warehouses().findOne({ _id: req.params.id })
  if (!warehouse) throw notFound("Warehouse")
  if (warehouse.isDefault) throw conflict("Cannot delete default fulfillment hub", "default_warehouse")

  await db.warehouses().updateOne({ _id: warehouse._id }, { $set: { status: "inactive", updatedAt: new Date() } })
  res.json({ success: true })
})

adminWarehouseRoutes.get("/warehouses/:id/stock", async (req, res) => {
  const warehouse = await db.warehouses().findOne({ _id: req.params.id })
  if (!warehouse) throw notFound("Warehouse")

  const stock = await db.stockLevels().find({ warehouseId: warehouse._id }, { sort: { sku: 1 } }).toArray()
  res.json({ warehouse, stock })
})
