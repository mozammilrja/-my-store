import { withTransaction } from "../../db/client.js"
import { db, type ActorRef } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { moveStock } from "../inventory/stock.js"
import { applyOwnFleetStatus } from "../shipping/service.js"
import { recordTransition } from "../state/machines.js"
import { moveTask } from "./dispatch.js"

/*
 * Return to origin: an undelivered parcel back at the warehouse it left from,
 * whether our rider or a courier brought it. The warehouse opens it and
 * grades every unit; sellable units become available again, damaged ones
 * are held as damaged, all on the stock ledger. An unpaid COD order is then
 * cancelled; a prepaid one stays for the admin to refund.
 */

const RTO_STATUSES = ["rto_initiated", "rto_in_transit", "rto_delivered"]

export async function findRto(awb: string) {
  const s = await db.shipments().findOne({ awb: awb.trim().toUpperCase(), isReturn: false })
  if (!s || !s.fulfilmentId) return null
  const task = s.provider === "own_fleet" ? await db.deliveryTasks().findOne({ shipmentId: s._id }) : null
  const isRto = task ? task.status === "rto" : RTO_STATUSES.includes(s.status)
  if (!isRto) return null
  const f = await db.fulfilments().findOne({ _id: s.fulfilmentId })
  return f ? { shipment: s, fulfilment: f, task } : null
}

export type RtoGrade = { itemId: string; sellable: number; damaged: number }

export async function receiveRto(awb: string, warehouseId: string, grades: RtoGrade[], actor: ActorRef) {
  const found = await findRto(awb)
  if (!found) throw notFound("Returning parcel")
  const { shipment, fulfilment: f, task } = found
  if (f.warehouseId !== warehouseId) throw conflict(`This parcel left from ${f.warehouseCode}; receive it there.`, "wrong_warehouse")
  if (shipment.rtoReceivedAt) throw conflict("This parcel was already received back.", "already_received")
  for (const l of f.lines) {
    const g = grades.filter((x) => x.itemId === l.itemId).reduce((n, x) => n + x.sellable + x.damaged, 0)
    const want = f.lines.filter((x) => x.itemId === l.itemId).reduce((n, x) => n + x.quantity, 0)
    if (g !== want) throw badRequest("Grade every unit in the parcel, no more and no fewer.")
  }

  const order = await withTransaction(async (session) => {
    const claimed = await db.shipments().updateOne({ _id: shipment._id, rtoReceivedAt: { $exists: false } }, { $set: { rtoReceivedAt: new Date() } }, { session })
    if (!claimed.modifiedCount) throw conflict("This parcel was already received back.", "already_received")
    const ref = { type: "return" as const, id: shipment._id }
    for (const g of grades) {
      const line = f.lines.find((l) => l.itemId === g.itemId)
      if (!line) throw badRequest("That item isn't in this parcel.")
      if (line.reserved) {
        const qty = g.sellable + g.damaged
        if (qty) await moveStock({ warehouseId, variantId: line.variantId, from: "outside", to: "quarantine", quantity: qty, reason: "return_receive", ref, actor, note: `RTO ${shipment.awb}` }, session)
        if (g.sellable) await moveStock({ warehouseId, variantId: line.variantId, from: "quarantine", to: "available", quantity: g.sellable, reason: "return_restock", ref, actor }, session)
        if (g.damaged) await moveStock({ warehouseId, variantId: line.variantId, from: "quarantine", to: "damaged", quantity: g.damaged, reason: "return_reject", ref, actor }, session)
      } else if (g.sellable) {
        await db.products().updateOne({ _id: line.productId }, { $inc: { "variants.$[v].stock": g.sellable } }, { arrayFilters: [{ "v._id": line.variantId, "v.manageInventory": true }], session })
      }
    }
    const o = await db.orders().findOne({ _id: f.orderId }, { session })
    if (o && o.paymentMethod === "cod" && o.paymentStatus === "awaiting" && o.status === "pending") {
      await db.orders().updateOne({ _id: o._id, status: "pending" }, { $set: { status: "canceled", updatedAt: new Date() } }, { session })
      await recordTransition({ machine: "order", entityId: o._id, orderId: o._id, from: "pending", to: "canceled", actor, reason: `Undelivered COD parcel ${shipment.awb} returned` }, session)
    }
    return o
  })

  if (task) {
    await moveTask(task, "returned", actor, `Received at ${f.warehouseCode}`)
    await applyOwnFleetStatus(shipment._id, "rto_delivered", "Returned to warehouse", "", f.warehouseCode)
  }
  return { orderId: f.orderId, displayId: f.displayId, prepaidNeedsRefund: !!order && order.paymentMethod !== "cod" && order.paymentStatus === "paid" }
}
