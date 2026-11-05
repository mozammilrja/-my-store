import type { ClientSession } from "mongodb"
import { withTransaction } from "../../db/client.js"
import {
  db,
  STOCK_BUCKETS,
  type ActorRef,
  type StockBucket,
  type StockLedgerDoc,
  type StockLedgerReason,
  type StockLevelDoc,
  type WarehouseDoc,
} from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"

/*
 * Every change to warehouse stock goes through moveStock: a conditional
 * increment that refuses to take a bucket below zero, plus one immutable
 * ledger row, in the caller's transaction. Nothing sets a quantity directly.
 *
 * The product variant's `stock` (what the storefront sells against) is kept
 * equal to the sum of `available` across warehouses: any move into or out of
 * `available` changes it by the same amount in the same transaction, unless
 * the caller already did (order placement decrements it before reserving).
 */

export type Endpoint = StockBucket | "outside"

export type Move = {
  warehouseId: string
  variantId: string
  from: Endpoint
  to: Endpoint
  quantity: number
  reason: StockLedgerReason
  ref: StockLedgerDoc["ref"]
  actor: ActorRef
  note?: string
  /** False when the caller has already moved the variant's sellable count. */
  syncVariant?: boolean
}

const zeroBuckets = () => Object.fromEntries(STOCK_BUCKETS.map((b) => [b, 0])) as Record<StockBucket, number>

export const skuOf = (variant: { _id: string; sku?: string }) => variant.sku || `SKU-${variant._id.slice(-6)}`

/** Finds or creates the variant's stock level in a warehouse (all buckets zero). */
async function levelFor(warehouse: WarehouseDoc, variantId: string, session: ClientSession) {
  const existing = await db.stockLevels().findOne({ warehouseId: warehouse._id, variantId }, { session })
  if (existing) return existing
  const product = await db.products().findOne({ "variants._id": variantId }, { session })
  const variant = product?.variants.find((v) => v._id === variantId)
  if (!product || !variant) throw notFound("Variant")
  const now = new Date()
  const doc: StockLevelDoc = {
    _id: newId("stk"),
    warehouseId: warehouse._id,
    warehouseCode: warehouse.code,
    productId: product._id,
    variantId,
    sku: skuOf(variant),
    binCode: null,
    ...zeroBuckets(),
    dispatchedTotal: 0,
    receivedTotal: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.stockLevels().insertOne(doc, { session })
  return doc
}

export async function moveStock(m: Move, session: ClientSession) {
  if (!Number.isInteger(m.quantity) || m.quantity <= 0) throw badRequest("Quantity must be a positive whole number")
  if (m.from === m.to) throw badRequest("A stock move needs two different places")
  const warehouse = await db.warehouses().findOne({ _id: m.warehouseId }, { session })
  if (!warehouse) throw notFound("Warehouse")
  const level = m.from === "outside" ? await levelFor(warehouse, m.variantId, session) : await db.stockLevels().findOne({ warehouseId: m.warehouseId, variantId: m.variantId }, { session })
  if (!level) throw conflict("This warehouse holds none of that item.", "insufficient_stock")

  const inc: Record<string, number> = {}
  if (m.from !== "outside") inc[m.from] = -m.quantity
  if (m.to !== "outside") inc[m.to] = m.quantity
  if (m.to === "outside" && m.reason === "dispatch") inc.dispatchedTotal = m.quantity
  if (m.from === "outside" && (m.reason === "receive" || m.reason === "opening_balance" || m.reason === "transfer_in")) inc.receivedTotal = m.quantity

  const guard = m.from === "outside" ? {} : { [m.from]: { $gte: m.quantity } }
  const updated = await db
    .stockLevels()
    .findOneAndUpdate({ _id: level._id, ...guard }, { $inc: inc, $set: { updatedAt: new Date() } }, { returnDocument: "after", session })
  if (!updated) throw conflict(`Not enough stock of ${level.sku} in ${warehouse.code} (${m.from.replace(/_/g, " ")}).`, "insufficient_stock")

  const delta = (m.to === "available" ? m.quantity : 0) - (m.from === "available" ? m.quantity : 0)
  if (delta && m.syncVariant !== false) {
    const synced = await db.products().updateOne(
      { _id: level.productId, variants: { $elemMatch: { _id: m.variantId, stock: { $gte: -delta } } } },
      { $inc: { "variants.$[v].stock": delta }, $set: { updatedAt: new Date() } },
      { arrayFilters: [{ "v._id": m.variantId }], session }
    )
    if (!synced.matchedCount) throw conflict("The item's sellable count changed meanwhile. Try again.", "stock_changed")
  }

  const after = Object.fromEntries(STOCK_BUCKETS.map((b) => [b, updated[b]])) as Record<StockBucket, number>
  await db.stockLedger().insertOne(
    {
      _id: newId("led"),
      warehouseId: m.warehouseId,
      variantId: m.variantId,
      sku: level.sku,
      reason: m.reason,
      from: m.from,
      to: m.to,
      quantity: m.quantity,
      after,
      ref: m.ref,
      ...(m.note ? { note: m.note } : {}),
      actor: m.actor,
      createdAt: new Date(),
    },
    { session }
  )
  return updated
}

/** Whether a variant is managed by the warehouse system: it has a stock level somewhere. */
export async function trackedVariants(variantIds: string[], session?: ClientSession) {
  const ids = await db.stockLevels().distinct("variantId", { variantId: { $in: variantIds } }, { session })
  return new Set(ids as string[])
}

/**
 * Brings a variant into the warehouse system with its current sellable count
 * as an opening balance in one warehouse. Refused once the variant has any
 * stock level, so it can't double-count.
 */
export async function openingBalance(input: { warehouseId: string; variantId: string; actor: ActorRef }, session: ClientSession) {
  if ((await trackedVariants([input.variantId], session)).size) throw conflict("This item already has warehouse stock.", "already_tracked")
  const product = await db.products().findOne({ "variants._id": input.variantId }, { session })
  const variant = product?.variants.find((v) => v._id === input.variantId)
  if (!variant) throw notFound("Variant")
  const warehouse = await db.warehouses().findOne({ _id: input.warehouseId }, { session })
  if (!warehouse) throw notFound("Warehouse")
  if (variant.stock <= 0) {
    await levelFor(warehouse, input.variantId, session)
    return 0
  }
  // The sellable count already includes these units, so the variant isn't moved again.
  await moveStock(
    {
      warehouseId: input.warehouseId,
      variantId: input.variantId,
      from: "outside",
      to: "available",
      quantity: variant.stock,
      reason: "opening_balance",
      ref: { type: "manual", id: newId("open") },
      actor: input.actor,
      note: "Stock on hand when warehouse tracking began",
      syncVariant: false,
    },
    session
  )
  return variant.stock
}

/** Moves sellable stock between two warehouses (dispatched and received in one step). */
export async function transferStock(input: { fromWarehouseId: string; toWarehouseId: string; variantId: string; quantity: number; actor: ActorRef; note?: string }) {
  if (input.fromWarehouseId === input.toWarehouseId) throw badRequest("Pick two different warehouses")
  return withTransaction(async (session) => {
    const ref = { type: "transfer" as const, id: newId("trf") }
    await moveStock({ warehouseId: input.fromWarehouseId, variantId: input.variantId, from: "available", to: "outside", quantity: input.quantity, reason: "transfer_out", ref, actor: input.actor, note: input.note, syncVariant: false }, session)
    await moveStock({ warehouseId: input.toWarehouseId, variantId: input.variantId, from: "outside", to: "available", quantity: input.quantity, reason: "transfer_in", ref, actor: input.actor, note: input.note, syncVariant: false }, session)
    return ref.id
  })
}
