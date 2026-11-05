import { db, FAILED_DELIVERY_REASONS, type DeliveryTaskDoc, type DeliveryZoneDoc, type FulfilmentDoc, type RiderDoc, type ShipmentDoc } from "../../db/schema.js"
import { ApiError, badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { log } from "../log.js"
import { applyOwnFleetStatus, syncOrderFromShipment } from "../shipping/service.js"
import { offerTask, moveTask } from "./dispatch.js"
import { announce, notifyCustomer } from "../notify/index.js"
import { fleetSettings, newOtp, OTP_MAX_FAILURES, otpMatches } from "./support.js"

/*
 * A parcel's life with our own riders, from booking at the packing station
 * to the doorstep (OTP, proof, cash) or back to the warehouse. The shipment
 * the customer tracks moves with it through applyOwnFleetStatus.
 */

export const OWN_FLEET_CARRIER = "Everwear Fleet"

/** The active zone of `warehouseId` that covers `pincode`, if any. */
export const zoneFor = (warehouseId: string, pincode: string) => db.deliveryZones().findOne({ warehouseId, pincodes: pincode, active: true })

/**
 * Books a packed fulfilment onto our own fleet: a shipment with our own
 * tracking number (EWF + a sequence, the same kind of identifier a courier
 * issues), and a delivery task that is offered to a rider straight away.
 */
export async function bookOwnFleet(f: FulfilmentDoc): Promise<ShipmentDoc> {
  if (!f.package) throw conflict("Pack the parcel before booking it.", "not_packed")
  const order = await db.orders().findOne({ _id: f.orderId })
  if (!order) throw notFound("Order")
  if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
  if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") throw conflict("Online orders ship only once payment is verified.", "not_paid")
  const zone: DeliveryZoneDoc | null = await zoneFor(f.warehouseId, f.destination.postalCode)
  if (!zone) throw badRequest(`Our riders don't deliver to ${f.destination.postalCode} from this warehouse. Book a courier instead.`, "not_in_zone")
  const cod = order.paymentMethod === "cod" && order.paymentStatus !== "paid"
  if (cod && !zone.codAllowed) throw badRequest("Cash on delivery isn't collected by riders in this zone. Book a courier instead.", "cod_not_allowed")
  const phone = order.shippingAddress.phone?.replace(/\D/g, "").slice(-10)
  if (!phone) throw badRequest("The delivery address has no phone number; riders need one.", "missing_phone")

  const counter = await db.counters().findOneAndUpdate({ _id: "own_fleet_awb" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })
  const awb = `EWF${String(100_000_000 + (counter?.seq ?? 1))}`
  const now = new Date()
  const lines = new Map<string, number>()
  for (const l of f.lines) lines.set(l.itemId, (lines.get(l.itemId) ?? 0) + l.quantity)
  const a = order.shippingAddress
  const shipment: ShipmentDoc = {
    _id: newId("ship"),
    orderId: order._id,
    displayId: order.displayId,
    provider: "own_fleet",
    carrier: OWN_FLEET_CARRIER,
    awb,
    status: "shipment_created",
    items: [...lines].map(([itemId, quantity]) => ({ itemId, quantity })),
    parcel: { weightKg: f.package.weightKg, lengthCm: f.package.lengthCm, breadthCm: f.package.breadthCm, heightCm: f.package.heightCm },
    trackingEvents: [{ timestamp: now, status: "Booked with Everwear Fleet", internalStatus: "shipment_created", location: f.warehouseCode, note: "" }],
    isReturn: false,
    fulfilmentId: f._id,
    active: true,
    customer: { name: `${a.firstName} ${a.lastName}`, phone: a.phone, city: a.city, postalCode: a.postalCode },
    itemsCount: [...lines.values()].reduce((x, y) => x + y, 0),
    createdAt: now,
    updatedAt: now,
  }
  try {
    await db.shipments().insertOne(shipment)
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("This parcel already has a live booking.", "shipment_exists")
    throw e
  }
  const task: DeliveryTaskDoc = {
    _id: newId("dlv"),
    code: awb,
    shipmentId: shipment._id,
    fulfilmentId: f._id,
    orderId: order._id,
    displayId: order.displayId,
    warehouseId: f.warehouseId,
    zoneId: zone._id,
    status: "unassigned",
    riderId: null,
    offer: null,
    declinedBy: [],
    stop: {
      name: `${a.firstName} ${a.lastName}`.trim(),
      phone,
      address1: [a.company, a.address1].filter(Boolean).join(", "),
      ...(a.address2 ? { address2: a.address2 } : {}),
      city: a.city,
      postalCode: a.postalCode,
      ...(order.deliveryInstructions ? { instructions: order.deliveryInstructions } : {}),
    },
    cod: cod ? { due: order.totals.total, currency: order.currency, remittanceId: null } : null,
    attempts: [],
    earnings: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.deliveryTasks().insertOne(task)
  await syncOrderFromShipment(shipment)
  await offerTask(task._id).catch((e) => log.warn("delivery.offer_failed", { taskId: task._id, error: (e as Error).message }))
  return shipment
}

const riderActor = (r: RiderDoc) => ({ type: "rider" as const, id: r._id, name: r.name })

async function riderTask(rider: RiderDoc, taskId: string) {
  const task = await db.deliveryTasks().findOne({ _id: taskId, riderId: rider._id })
  if (!task) throw notFound("Delivery")
  return task
}

/**
 * At the warehouse dock: the rider scans the parcel's AWB to take it. Only a
 * parcel assigned to this rider, and handed over by the warehouse.
 */
export async function pickupScan(rider: RiderDoc, awb: string) {
  const task = await db.deliveryTasks().findOne({ code: awb.trim().toUpperCase() })
  if (!task || task.riderId !== rider._id) throw new ScanRefused("not_yours", `${awb} isn't one of your deliveries.`)
  if (task.status !== "assigned") throw new ScanRefused("already_scanned", `${awb} is already ${task.status.replace(/_/g, " ")}.`)
  const f = await db.fulfilments().findOne({ _id: task.fulfilmentId })
  if (!f || !["handed_over", "dispatched"].includes(f.status)) throw new ScanRefused("not_handed_over", "The warehouse hasn't handed this parcel over yet. Ask them to scan it out on their manifest.")
  const next = await moveTask(task, "picked_up", riderActor(rider), "Picked up at the warehouse")
  await applyOwnFleetStatus(task.shipmentId, "picked_up", "Picked up by Everwear Fleet rider", "", f.warehouseCode)
  return next
}

/**
 * Leaves for the doorstep: each parcel goes out for delivery and its
 * customer gets a fresh OTP (shown on their order page).
 */
export async function startDelivery(rider: RiderDoc, taskIds: string[]) {
  if (rider.status !== "approved") throw conflict("Your account isn't approved for deliveries.", "not_approved")
  const tasks = await db.deliveryTasks().find({ _id: { $in: taskIds }, riderId: rider._id }).toArray()
  if (tasks.length !== new Set(taskIds).size) throw notFound("Delivery")
  const out: DeliveryTaskDoc[] = []
  for (const t of tasks) {
    if (!["picked_up", "attempt_failed"].includes(t.status)) throw conflict(`${t.code} can't go out for delivery from ${t.status.replace(/_/g, " ")}.`, "invalid_transition")
    const { sealed } = newOtp()
    out.push(await moveTask(t, "out_for_delivery", riderActor(rider), undefined, { otp: sealed }))
    await applyOwnFleetStatus(t.shipmentId, "out_for_delivery", "Out for delivery", `With ${rider.name.split(" ")[0]}`)
    await announce("delivery otp", () => sendOtp(t.orderId, t._id, sealed.issuedAt))
  }
  return out
}

/** A new OTP when the customer can't find theirs or too many wrong codes were tried. */
export async function reissueOtp(rider: RiderDoc, taskId: string) {
  const task = await riderTask(rider, taskId)
  if (task.status !== "out_for_delivery") throw conflict("Only a parcel out for delivery has an OTP.", "not_out_for_delivery")
  const { sealed } = newOtp()
  await db.deliveryTasks().updateOne({ _id: task._id, status: "out_for_delivery" }, { $set: { otp: sealed, updatedAt: new Date() } })
  await announce("delivery otp", () => sendOtp(task.orderId, task._id, sealed.issuedAt))
  return { reissued: true }
}

export type DeliverInput = { otp: string; receiverName: string; codCollected?: number; lat?: number; lng?: number; photo?: string }

/**
 * Handed over at the door. The customer's OTP must match. For cash on
 * delivery the rider confirms collecting exactly the amount due: the rider
 * can't change what the customer owes.
 */
export async function deliver(rider: RiderDoc, taskId: string, input: DeliverInput) {
  const task = await riderTask(rider, taskId)
  if (task.status !== "out_for_delivery" || !task.otp) throw conflict("This parcel isn't out for delivery.", "not_out_for_delivery")
  if (task.otp.failures >= OTP_MAX_FAILURES) throw conflict("Too many wrong codes. Send the customer a new OTP.", "otp_locked")
  if (!otpMatches(task.otp, input.otp)) {
    await db.deliveryTasks().updateOne({ _id: task._id }, { $inc: { "otp.failures": 1 } })
    throw new ScanRefused("wrong_otp", `That OTP doesn't match. ${OTP_MAX_FAILURES - task.otp.failures - 1} tries left.`)
  }
  if (task.cod) {
    if (input.codCollected === undefined) throw badRequest(`Collect ₹${(task.cod.due / 100).toFixed(2)} in cash first.`, "cod_required")
    if (input.codCollected !== task.cod.due) throw conflict(`The amount due is ₹${(task.cod.due / 100).toFixed(2)}. Collect exactly that; it can't be changed at the door.`, "cod_amount")
  } else if (input.codCollected) {
    throw badRequest("Nothing is due on this parcel; it's prepaid.", "prepaid")
  }
  const now = new Date()
  const { payoutPerDelivery } = await fleetSettings()
  const done = await moveTask(
    task,
    "delivered",
    riderActor(rider),
    `Received by ${input.receiverName}`,
    {
      otp: null,
      pod: { at: now, riderId: rider._id, receiverName: input.receiverName, otpVerified: true, ...(input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : {}), ...(input.photo ? { photo: input.photo } : {}) },
      ...(task.cod ? { "cod.collected": task.cod.due, "cod.collectedAt": now } : {}),
    },
    { $push: { earnings: { kind: "delivery", amount: payoutPerDelivery, at: now, riderId: rider._id } } }
  )
  await applyOwnFleetStatus(task.shipmentId, "delivered", "Delivered", `Received by ${input.receiverName}; OTP verified`)
  return done
}

export type FailInput = { reason: (typeof FAILED_DELIVERY_REASONS)[number]; note?: string; rescheduledFor?: Date; lat?: number; lng?: number }

/**
 * The door didn't work out. The attempt is recorded with its reason; after
 * the last allowed attempt the parcel goes back to the warehouse (RTO).
 */
export async function failAttempt(rider: RiderDoc, taskId: string, input: FailInput) {
  const task = await riderTask(rider, taskId)
  if (task.status !== "out_for_delivery") throw conflict("This parcel isn't out for delivery.", "not_out_for_delivery")
  if (input.reason === "other" && !input.note) throw badRequest("Say what happened.")
  const now = new Date()
  const { maxAttempts, payoutPerFailedAttempt } = await fleetSettings()
  const attempt = { at: now, reason: input.reason, riderId: rider._id, ...(input.note ? { note: input.note } : {}), ...(input.rescheduledFor ? { rescheduledFor: input.rescheduledFor } : {}), ...(input.lat !== undefined && input.lng !== undefined ? { lat: input.lat, lng: input.lng } : {}) }
  const label = input.reason.replace(/_/g, " ")
  let next = await moveTask(task, "attempt_failed", riderActor(rider), label, { otp: null }, { $push: { attempts: attempt, earnings: { kind: "failed_attempt", amount: payoutPerFailedAttempt, at: now, riderId: rider._id } } })
  await applyOwnFleetStatus(task.shipmentId, "delivery_failed", "Delivery attempt failed", `${label}${input.rescheduledFor ? `; rescheduled for ${input.rescheduledFor.toDateString()}` : ""}`)
  if (next.attempts.length >= maxAttempts) {
    next = await moveTask(next, "rto", { type: "system", id: "system" }, `${maxAttempts} attempts failed`)
    await applyOwnFleetStatus(task.shipmentId, "rto_initiated", "Returning to warehouse", `${maxAttempts} delivery attempts failed`)
  }
  return next
}

/** Admin: send a parcel back after a failed attempt without waiting for the last attempt (customer asked, address wrong). */
export async function startRto(taskId: string, actor: { type: "admin"; id: string; name?: string }, reason: string) {
  const task = await db.deliveryTasks().findOne({ _id: taskId })
  if (!task) throw notFound("Delivery")
  const next = await moveTask(task, "rto", actor, reason)
  await applyOwnFleetStatus(task.shipmentId, "rto_initiated", "Returning to warehouse", reason)
  return next
}

/** Sends the customer their delivery code. The message holds only a reference; the code is decrypted when it's sent. */
async function sendOtp(orderId: string, taskId: string, issuedAt: Date) {
  const order = await db.orders().findOne({ _id: orderId })
  if (order) await notifyCustomer(order, "delivery_otp", `otp:${taskId}:${issuedAt.getTime()}`, {}, { secret: { otpTaskId: taskId } })
}

/** A scan the rider must act on (wrong parcel, wrong OTP), shown as is. */
export class ScanRefused extends ApiError {
  constructor(code: string, message: string) {
    super(422, code, message)
  }
}
