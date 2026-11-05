import { withTransaction } from "../../db/client.js"
import { db, type ActorRef } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { moveStock, trackedVariants } from "../inventory/stock.js"
import { moveReturn } from "./returns.js"

/*
 * The returned parcel is opened at a warehouse. Each unit is received into
 * quarantine and then, by its condition, restocked as sellable or booked as
 * damaged, all on the stock ledger. Nothing returns to sellable stock any
 * other way. Units of variants that aren't warehouse-managed go straight back
 * onto the variant's count when sellable.
 */

export type InspectionLine = { itemId: string; quantity: number; condition: "sellable" | "damaged"; notes?: string }

export async function inspectReturn(returnId: string, warehouseId: string, lines: InspectionLine[], actor: ActorRef) {
  return withTransaction(async (session) => {
    let ret = await db.returns().findOne({ _id: returnId }, { session })
    if (!ret) throw notFound("Return")
    if (!["approved", "pickup_scheduled", "in_transit", "received"].includes(ret.status)) throw conflict(`This return is ${ret.status.replace(/_/g, " ")}; it can't be inspected now.`, "not_inspectable")
    const warehouse = await db.warehouses().findOne({ _id: warehouseId, status: "active" }, { session })
    if (!warehouse) throw notFound("Warehouse")
    const order = await db.orders().findOne({ _id: ret.orderId }, { session })
    if (!order) throw notFound("Order")

    for (const want of ret.items) {
      const got = lines.filter((l) => l.itemId === want.itemId).reduce((n, l) => n + l.quantity, 0)
      if (got !== want.quantity) throw badRequest(`Inspect all ${want.quantity} returned unit(s) of each item, no more and no fewer.`)
    }
    if (lines.some((l) => !ret!.items.some((w) => w.itemId === l.itemId))) throw badRequest("An inspected item isn't part of this return.")

    const tracked = await trackedVariants(ret.items.map((i) => i.variantId), session)
    const ref = { type: "return" as const, id: ret._id }
    for (const line of lines) {
      const item = ret.items.find((i) => i.itemId === line.itemId)!
      if (tracked.has(item.variantId)) {
        await moveStock({ warehouseId, variantId: item.variantId, from: "outside", to: "quarantine", quantity: line.quantity, reason: "return_receive", ref, actor, note: `${ret.code}, order #${ret.displayId}` }, session)
        await moveStock(
          { warehouseId, variantId: item.variantId, from: "quarantine", to: line.condition === "sellable" ? "available" : "damaged", quantity: line.quantity, reason: line.condition === "sellable" ? "return_restock" : "return_reject", ref, actor, note: line.notes },
          session
        )
      } else if (line.condition === "sellable") {
        await db.products().updateOne({ _id: item.productId }, { $inc: { "variants.$[v].stock": line.quantity }, $set: { updatedAt: new Date() } }, { arrayFilters: [{ "v._id": item.variantId, "v.manageInventory": true }], session })
      }
    }

    if (ret.status !== "received") ret = await moveReturn(ret, "received", actor, `Received at ${warehouse.code}`, {}, session)
    const inspection = { warehouseId, at: new Date(), by: actor.id, lines }
    return moveReturn(ret, "inspected", actor, lines.map((l) => `${l.quantity} ${l.condition}`).join(", "), { inspection }, session)
  })
}
