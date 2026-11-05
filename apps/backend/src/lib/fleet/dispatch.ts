import { db, type ActorRef, type DeliveryTaskDoc, type RiderDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { log } from "../log.js"
import { assertTransition, recordTransition, SYSTEM } from "../state/machines.js"
import { fleetSettings, onShift, orderStops } from "./support.js"

/*
 * Who delivers what. A new parcel is offered to the best eligible rider; the
 * rider accepts or declines, and an offer not answered in time lapses and
 * goes to the next rider. Admins can assign by hand at any point before
 * pickup. Every move is a guarded delivery-machine transition.
 */

export const ACTIVE: DeliveryTaskDoc["status"][] = ["offered", "assigned", "picked_up", "out_for_delivery", "attempt_failed"]

/** Moves a task if it's still in the status it was read in; records the change. */
export async function moveTask(task: DeliveryTaskDoc, to: DeliveryTaskDoc["status"], actor: ActorRef, reason: string | undefined, set: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  assertTransition("delivery", task.status, to)
  const res = await db.deliveryTasks().updateOne({ _id: task._id, status: task.status, updatedAt: task.updatedAt }, { $set: { ...set, status: to, updatedAt: new Date() }, ...extra })
  if (!res.modifiedCount) throw conflict("This delivery changed meanwhile. Reload and try again.", "stale")
  await recordTransition({ machine: "delivery", entityId: task._id, orderId: task.orderId, from: task.status, to, actor, ...(reason ? { reason } : {}) })
  return (await db.deliveryTasks().findOne({ _id: task._id }))!
}

const activeCount = (riderId: string) => db.deliveryTasks().countDocuments({ riderId, status: { $in: ["assigned", "picked_up", "out_for_delivery", "attempt_failed"] } })

/** Riders who could take this task now: approved, online, on shift, covering its zone, under their load limit, not having declined it. */
export async function eligibleRiders(task: DeliveryTaskDoc, now = new Date()) {
  const { maxActiveTasks } = await fleetSettings()
  const riders = await db.riders().find({ status: "approved", online: true, zoneIds: task.zoneId, _id: { $nin: task.declinedBy } }).toArray()
  const out: { rider: RiderDoc; load: number; samePin: number }[] = []
  for (const rider of riders.filter((r) => onShift(r, now))) {
    const load = await activeCount(rider._id)
    if (load >= maxActiveTasks) continue
    const samePin = await db.deliveryTasks().countDocuments({ riderId: rider._id, status: { $in: ["assigned", "picked_up"] }, "stop.postalCode": task.stop.postalCode })
    out.push({ rider, load, samePin })
  }
  // Batch: riders already going to that PIN code first, then the least loaded, then who has been online longest.
  return out.sort((a, b) => b.samePin - a.samePin || a.load - b.load || (a.rider.onlineSince?.getTime() ?? 0) - (b.rider.onlineSince?.getTime() ?? 0))
}

/** Offers an unassigned task to the best eligible rider. Returns the rider offered, or null if nobody is available now. */
export async function offerTask(taskId: string, actor: ActorRef = SYSTEM) {
  const task = await db.deliveryTasks().findOne({ _id: taskId })
  if (!task || task.status !== "unassigned") return null
  const [best] = await eligibleRiders(task)
  if (!best) return null
  const { offerTimeoutMinutes } = await fleetSettings()
  const now = new Date()
  await moveTask(task, "offered", actor, `Offered to ${best.rider.name}`, { offer: { riderId: best.rider._id, offeredAt: now, expiresAt: new Date(now.getTime() + offerTimeoutMinutes * 60_000) } })
  await db.outboxEvents().insertOne({ _id: newId("outbox"), topic: "delivery.offered", payload: { taskId: task._id, riderId: best.rider._id }, status: "pending", retryCount: 0, createdAt: now })
  return best.rider
}

export async function acceptOffer(taskId: string, rider: RiderDoc) {
  const task = await db.deliveryTasks().findOne({ _id: taskId })
  if (task && task.riderId === rider._id) throw conflict("You've already accepted this delivery.", "invalid_transition")
  if (!task || task.offer?.riderId !== rider._id) throw notFound("Delivery")
  if (task.status !== "offered") throw conflict("This offer is no longer open.", "offer_closed")
  if (task.offer.expiresAt < new Date()) throw conflict("This offer has lapsed.", "offer_expired")
  const { maxActiveTasks } = await fleetSettings()
  if ((await activeCount(rider._id)) >= maxActiveTasks) throw conflict(`You already have ${maxActiveTasks} deliveries.`, "at_capacity")
  return moveTask(task, "assigned", { type: "rider", id: rider._id, name: rider.name }, "Accepted", { riderId: rider._id, offer: null })
}

/** Declined, or lapsed: back to the pool, never offered to that rider again, and offered to the next. */
export async function releaseOffer(task: DeliveryTaskDoc, riderId: string, actor: ActorRef, reason: string) {
  const back = await moveTask(task, "unassigned", actor, reason, { offer: null }, { $addToSet: { declinedBy: riderId } })
  await offerTask(back._id).catch((e) => log.warn("delivery.reoffer_failed", { taskId: task._id, error: (e as Error).message }))
  return back
}

export async function declineOffer(taskId: string, rider: RiderDoc, reason?: string) {
  const task = await db.deliveryTasks().findOne({ _id: taskId })
  if (!task || task.offer?.riderId !== rider._id || task.status !== "offered") throw notFound("Delivery")
  return releaseOffer(task, rider._id, { type: "rider", id: rider._id, name: rider.name }, reason ? `Declined: ${reason}` : "Declined")
}

/**
 * Background sweep: lapses unanswered offers, then offers waiting tasks to
 * riders who have come online. Safe to run concurrently with rider actions:
 * every move is conditional on the status it read.
 */
export async function sweepDispatch(limit = 100) {
  let moved = 0
  const lapsed = await db.deliveryTasks().find({ status: "offered", "offer.expiresAt": { $lt: new Date() } }, { limit }).toArray()
  for (const t of lapsed) {
    try {
      await releaseOffer(t, t.offer!.riderId, SYSTEM, "Offer not answered in time")
      moved++
    } catch (e) {
      if ((e as { code?: string }).code !== "stale") throw e
    }
  }
  const waiting = await db.deliveryTasks().find({ status: "unassigned" }, { sort: { createdAt: 1 }, limit }).toArray()
  for (const t of waiting) if (await offerTask(t._id).catch(() => null)) moved++
  return moved
}

/** Admin override: give the task to a rider directly (no offer), before pickup. */
export async function assignTask(taskId: string, riderId: string, actor: ActorRef, reason: string) {
  const task = await db.deliveryTasks().findOne({ _id: taskId })
  if (!task) throw notFound("Delivery")
  const rider = await db.riders().findOne({ _id: riderId })
  if (!rider || rider.status !== "approved") throw badRequest("Choose an approved rider")
  if (!rider.zoneIds.includes(task.zoneId)) throw badRequest(`${rider.name} doesn't cover this delivery zone`)
  if (task.status === "assigned" && task.riderId === riderId) throw conflict("Already assigned to that rider.", "invalid_transition")
  let current = task
  // From an open offer or another rider, it goes back to the pool first so the history shows both steps.
  if (current.status === "offered" || current.status === "assigned") current = await moveTask(current, "unassigned", actor, `Reassigned: ${reason}`, { offer: null, riderId: null })
  return moveTask(current, "assigned", actor, reason, { riderId, offer: null })
}

export async function unassignTask(taskId: string, actor: ActorRef, reason: string) {
  const task = await db.deliveryTasks().findOne({ _id: taskId })
  if (!task) throw notFound("Delivery")
  return moveTask(task, "unassigned", actor, reason, { offer: null, riderId: null })
}

/** The rider's run in stop order, written back as `sequence`. */
export async function routeFor(riderId: string) {
  const tasks = await db.deliveryTasks().find({ riderId, status: { $in: ["assigned", "picked_up", "out_for_delivery", "attempt_failed"] } }).toArray()
  if (!tasks.length) return []
  const byWarehouse = new Map<string, DeliveryTaskDoc[]>()
  for (const t of tasks) byWarehouse.set(t.warehouseId, [...(byWarehouse.get(t.warehouseId) ?? []), t])
  const ordered: DeliveryTaskDoc[] = []
  for (const [warehouseId, list] of byWarehouse) {
    const w = await db.warehouses().findOne({ _id: warehouseId })
    ordered.push(...orderStops({ pincode: w?.pincode ?? "", lat: w?.lat, lng: w?.lng }, list))
  }
  await Promise.all(ordered.map((t, i) => (t.sequence === i + 1 ? null : db.deliveryTasks().updateOne({ _id: t._id }, { $set: { sequence: i + 1 } }))))
  return ordered.map((t, i) => ({ ...t, sequence: i + 1 }))
}
