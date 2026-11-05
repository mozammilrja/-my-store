import { randomBytes } from "node:crypto"
import { withTransaction } from "../../db/client.js"
import { db, type ActorRef, type CodRemittanceDoc, type RiderDoc } from "../../db/schema.js"
import { conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { assertTransition, recordTransition } from "../state/machines.js"

/*
 * Cash on delivery collected by our riders. A rider's cash in hand is the
 * sum of what they collected and haven't handed over. Handing over creates a
 * remittance of exactly those parcels; finance counts the cash. Only an
 * exact match marks the orders paid (that count is the payment's
 * verification); a difference is flagged as a mismatch and nothing is
 * marked paid until it's recounted.
 */

const unremitted = (riderId: string) => ({ riderId, "cod.collected": { $exists: true }, "cod.remittanceId": null, status: "delivered" as const })

export async function cashInHand(riderId: string) {
  const tasks = await db.deliveryTasks().find(unremitted(riderId), { projection: { code: 1, displayId: 1, cod: 1, pod: 1 } }).toArray()
  return { amount: tasks.reduce((n, t) => n + (t.cod?.collected ?? 0), 0), tasks }
}

export async function submitRemittance(rider: RiderDoc, declared: number) {
  return withTransaction(async (session) => {
    const tasks = await db.deliveryTasks().find(unremitted(rider._id), { session }).toArray()
    if (!tasks.length) throw conflict("You have no cash to hand over.", "nothing_to_remit")
    const expected = tasks.reduce((n, t) => n + (t.cod?.collected ?? 0), 0)
    const now = new Date()
    const r: CodRemittanceDoc = {
      _id: newId("rem"),
      code: `REM-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`,
      riderId: rider._id,
      taskIds: tasks.map((t) => t._id),
      expected,
      declared,
      status: "submitted",
      submittedAt: now,
    }
    await db.codRemittances().insertOne(r, { session })
    // Conditional on still being unremitted, so two submissions can't claim the same parcel.
    const claimed = await db.deliveryTasks().updateMany({ _id: { $in: r.taskIds }, "cod.remittanceId": null }, { $set: { "cod.remittanceId": r._id, updatedAt: now } }, { session })
    if (claimed.modifiedCount !== r.taskIds.length) throw conflict("Your cash changed meanwhile. Try again.", "stale")
    await recordTransition({ machine: "cod", entityId: r._id, from: null, to: "submitted", actor: { type: "rider", id: rider._id, name: rider.name }, reason: `Declared ₹${(declared / 100).toFixed(2)} of ₹${(expected / 100).toFixed(2)}` }, session)
    return r
  })
}

export async function reconcileRemittance(id: string, counted: number, actor: ActorRef, note?: string) {
  return withTransaction(async (session) => {
    const r = await db.codRemittances().findOne({ _id: id }, { session })
    if (!r) throw notFound("Remittance")
    const to = counted === r.expected ? "reconciled" : "mismatch"
    assertTransition("cod", r.status, to)
    const now = new Date()
    const res = await db
      .codRemittances()
      .updateOne({ _id: r._id, status: r.status }, { $set: { status: to, counted, reconciledAt: now, reconciledBy: actor.id, ...(note ? { note } : {}) } }, { session })
    if (!res.modifiedCount) throw conflict("This remittance changed meanwhile. Reload and try again.", "stale")
    const diff = counted - r.expected
    await recordTransition({ machine: "cod", entityId: r._id, from: r.status, to, actor, reason: to === "reconciled" ? `Counted ₹${(counted / 100).toFixed(2)}` : `Counted ₹${(counted / 100).toFixed(2)}, ${diff < 0 ? "short" : "over"} by ₹${(Math.abs(diff) / 100).toFixed(2)}${note ? `: ${note}` : ""}` }, session)
    if (to === "reconciled") {
      const tasks = await db.deliveryTasks().find({ _id: { $in: r.taskIds } }, { session }).toArray()
      for (const t of tasks) {
        const paid = await db.orders().updateOne(
          { _id: t.orderId, paymentMethod: "cod", paymentStatus: "awaiting" },
          { $set: { paymentStatus: "paid", paymentDetails: { provider: "cod", paidAt: t.cod?.collectedAt ?? now, transactionId: r.code }, updatedAt: now } },
          { session }
        )
        if (!paid.modifiedCount) continue
        await recordTransition({ machine: "payment", entityId: t.orderId, orderId: t.orderId, from: "awaiting", to: "paid", actor, reason: `Cash reconciled on ${r.code}` }, session)
        const done = await db.orders().updateOne({ _id: t.orderId, status: "pending", fulfillmentStatus: "delivered" }, { $set: { status: "completed", updatedAt: now } }, { session })
        if (done.modifiedCount) await recordTransition({ machine: "order", entityId: t.orderId, orderId: t.orderId, from: "pending", to: "completed", actor, reason: "Delivered and paid" }, session)
      }
    }
    return (await db.codRemittances().findOne({ _id: r._id }, { session }))!
  })
}
