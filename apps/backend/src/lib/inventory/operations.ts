import { z } from "zod"
import { withTransaction } from "../../db/client.js"
import { db, type ActorRef } from "../../db/schema.js"
import { badRequest, conflict } from "../errors.js"
import { newId } from "../ids.js"
import { moveStock, transferStock } from "./stock.js"

/*
 * Stock operations a warehouse supervisor or an inventory admin performs by
 * hand. Each is one or two ledger moves in a transaction; none sets a count.
 */

const qty = z.number().int().positive().max(100_000)
const note = z.string().trim().min(3).max(300)

export const stockOperationSchema = z.discriminatedUnion("type", [
  /** Goods arrived (supplier delivery, purchase order). */
  z.object({ type: z.literal("receive"), warehouseId: z.string(), variantId: z.string(), quantity: qty, reference: z.string().trim().max(80).optional(), note: note.optional() }),
  /** Cycle-count correction: positive finds units, negative loses them. A note is required. */
  z.object({ type: z.literal("adjust"), warehouseId: z.string(), variantId: z.string(), delta: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0, "Enter a non-zero change"), note }),
  /** A sellable unit found damaged on the shelf. */
  z.object({ type: z.literal("damage"), warehouseId: z.string(), variantId: z.string(), quantity: qty, note }),
  /** Damaged units disposed of or sent back to the supplier. */
  z.object({ type: z.literal("write_off"), warehouseId: z.string(), variantId: z.string(), quantity: qty, note }),
  z.object({ type: z.literal("transfer"), warehouseId: z.string(), toWarehouseId: z.string(), variantId: z.string(), quantity: qty, note: note.optional() }),
])
export type StockOperation = z.infer<typeof stockOperationSchema>

export async function runStockOperation(op: StockOperation, actor: ActorRef) {
  const exists = await db.products().countDocuments({ "variants._id": op.variantId })
  if (!exists) throw badRequest("Unknown variant")
  if (op.type === "transfer") {
    const to = await db.warehouses().findOne({ _id: op.toWarehouseId, status: "active" })
    if (!to) throw badRequest("Pick an active destination warehouse")
    const id = await transferStock({ fromWarehouseId: op.warehouseId, toWarehouseId: op.toWarehouseId, variantId: op.variantId, quantity: op.quantity, actor, note: op.note })
    return { reference: id }
  }
  return withTransaction(async (session) => {
    const ref = { type: op.type === "receive" ? ("receipt" as const) : ("manual" as const), id: op.type === "receive" && op.reference ? op.reference : newId(op.type) }
    const base = { warehouseId: op.warehouseId, variantId: op.variantId, ref, actor, note: op.note }
    if (op.type === "receive") await moveStock({ ...base, from: "outside", to: "available", quantity: op.quantity, reason: "receive" }, session)
    else if (op.type === "damage") await moveStock({ ...base, from: "available", to: "damaged", quantity: op.quantity, reason: "damage" }, session)
    else if (op.type === "write_off") await moveStock({ ...base, from: "damaged", to: "outside", quantity: op.quantity, reason: "adjust" }, session)
    else if (op.delta > 0) await moveStock({ ...base, from: "outside", to: "available", quantity: op.delta, reason: "adjust" }, session)
    else await moveStock({ ...base, from: "available", to: "outside", quantity: -op.delta, reason: "adjust" }, session)
    const level = await db.stockLevels().findOne({ warehouseId: op.warehouseId, variantId: op.variantId }, { session })
    if (!level) throw conflict("Stock level missing after the move")
    return { reference: ref.id, level }
  })
}
