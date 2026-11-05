import { withTransaction } from "../../db/client.js"
import { db, type ActorRef, type OrderDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { moveStock, trackedVariants } from "../inventory/stock.js"
import { assertTransition, recordTransition, sourcesOf, type ReturnStatus } from "../state/machines.js"

/*
 * Returns: every status change goes through the return state machine, and
 * returned goods become sellable again only after a warehouse inspects them.
 */

type Return = NonNullable<OrderDoc["returnRequest"]>

/** Moves the order's return to `to` if the machine allows it from its current status; guarded against concurrent changes. */
export async function moveReturn(order: OrderDoc, to: ReturnStatus, actor: ActorRef, reason?: string, extra: Record<string, unknown> = {}, session?: import("mongodb").ClientSession) {
  const from = order.returnRequest?.status
  if (!from) throw conflict("This order has no return request.", "no_return_request")
  assertTransition("return", from, to)
  const now = new Date()
  const res = await db
    .orders()
    .updateOne({ _id: order._id, "returnRequest.status": from }, { $set: { "returnRequest.status": to, "returnRequest.updatedAt": now, updatedAt: now, ...extra } }, { session })
  if (!res.modifiedCount) throw conflict("The return changed meanwhile. Reload and try again.", "stale")
  await recordTransition({ machine: "return", entityId: order._id, orderId: order._id, from, to, actor, ...(reason ? { reason } : {}) }, session)
}

/** For courier-driven changes (the reverse parcel's tracking): applies the move only if it is legal now, else does nothing. */
export async function moveReturnIfAllowed(orderId: string, to: ReturnStatus, actor: ActorRef, reason: string) {
  const from = sourcesOf("return", to) as ReturnStatus[]
  const order = await db.orders().findOne({ _id: orderId, "returnRequest.status": { $in: from } })
  if (!order) return false
  await moveReturn(order, to, actor, reason).catch((e) => {
    if ((e as { code?: string }).code !== "stale") throw e
  })
  return true
}

export type InspectionLine = { itemId: string; quantity: number; condition: "sellable" | "damaged"; notes?: string }

/**
 * The returned parcel is opened at a warehouse. Each unit is received into
 * quarantine and then, by its condition, restocked as sellable or booked as
 * damaged, all on the stock ledger. Units of variants that aren't
 * warehouse-managed go straight back onto the variant's count when sellable.
 */
export async function inspectReturn(orderId: string, warehouseId: string, lines: InspectionLine[], actor: ActorRef) {
  return withTransaction(async (session) => {
    const order = await db.orders().findOne({ _id: orderId }, { session })
    if (!order?.returnRequest) throw notFound("Return")
    const ret: Return = order.returnRequest
    if (!["approved", "pickup_scheduled", "received"].includes(ret.status)) throw conflict(`This return is ${ret.status.replace(/_/g, " ")}; it can't be inspected now.`, "not_inspectable")
    const warehouse = await db.warehouses().findOne({ _id: warehouseId, status: "active" }, { session })
    if (!warehouse) throw notFound("Warehouse")

    for (const want of ret.items) {
      const got = lines.filter((l) => l.itemId === want.itemId).reduce((n, l) => n + l.quantity, 0)
      if (got !== want.quantity) throw badRequest(`Inspect all ${want.quantity} returned unit(s) of each item, no more and no fewer.`)
    }
    if (lines.some((l) => !ret.items.some((w) => w.itemId === l.itemId))) throw badRequest("An inspected item isn't part of this return.")

    const tracked = await trackedVariants(order.items.map((i) => i.variantId), session)
    const ref = { type: "return" as const, id: order._id }
    for (const line of lines) {
      const item = order.items.find((i) => i._id === line.itemId)!
      if (tracked.has(item.variantId)) {
        await moveStock({ warehouseId, variantId: item.variantId, from: "outside", to: "quarantine", quantity: line.quantity, reason: "return_receive", ref, actor, note: `Return of order #${order.displayId}` }, session)
        await moveStock(
          {
            warehouseId,
            variantId: item.variantId,
            from: "quarantine",
            to: line.condition === "sellable" ? "available" : "damaged",
            quantity: line.quantity,
            reason: line.condition === "sellable" ? "return_restock" : "return_reject",
            ref,
            actor,
            note: line.notes,
          },
          session
        )
      } else if (line.condition === "sellable") {
        await db.products().updateOne(
          { _id: item.productId },
          { $inc: { "variants.$[v].stock": line.quantity }, $set: { updatedAt: new Date() } },
          { arrayFilters: [{ "v._id": item.variantId, "v.manageInventory": true }], session }
        )
      }
    }

    const inspection = { warehouseId, at: new Date(), by: actor.id, lines }
    let current = order
    if (ret.status !== "received") {
      await moveReturn(current, "received", actor, `Received at ${warehouse.code}`, {}, session)
      current = (await db.orders().findOne({ _id: orderId }, { session }))!
    }
    await moveReturn(current, "inspected", actor, lines.map((l) => `${l.quantity} ${l.condition}`).join(", "), { "returnRequest.inspection": inspection }, session)
    return (await db.orders().findOne({ _id: orderId }, { session }))!
  })
}
