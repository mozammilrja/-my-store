import type { ClientSession } from "mongodb"
import { db, type ActorRef, type CodRemittanceDoc, type DeliveryStatus, type FulfilmentStatus, type OrderDoc, type ReturnStatus, type StatusEventDoc } from "../../db/schema.js"
import { conflict } from "../errors.js"
import { newId } from "../ids.js"

/*
 * One state machine per lifecycle. Each lists, for every status, the statuses
 * it may move to. A move not listed is refused, and so is a move to the
 * status the record is already in, so a retried request or a duplicate
 * webhook can never record the same change twice.
 *
 * The shipment machine lives in lib/shipping/status.ts (shouldAdvance),
 * because courier scans arrive out of order and need ranking rather than a
 * fixed table; its changes are still recorded here with recordTransition.
 */

type Table<S extends string> = Record<S, readonly S[]>

export const ORDER_MACHINE: Table<OrderDoc["status"]> = {
  pending: ["completed", "canceled"],
  completed: [],
  canceled: [],
}

export const PAYMENT_MACHINE: Table<OrderDoc["paymentStatus"]> = {
  awaiting: ["paid"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["partially_refunded", "refunded"],
  refunded: [],
}

export const FULFILMENT_MACHINE: Table<FulfilmentStatus> = {
  assigned: ["picking_pending", "rejected", "cancelled"],
  picking_pending: ["picking", "cancelled"],
  picking: ["picked", "cancelled"],
  // A failed quality check sends the order back to be picked again.
  picked: ["qc_passed", "picking_pending", "cancelled"],
  qc_passed: ["packed", "cancelled"],
  packed: ["label_generated", "cancelled"],
  // A cancelled courier booking returns the parcel to the packed shelf.
  label_generated: ["ready_to_dispatch", "packed", "cancelled"],
  ready_to_dispatch: ["manifested", "packed", "cancelled"],
  manifested: ["handed_over", "ready_to_dispatch"],
  handed_over: ["dispatched"],
  dispatched: [],
  rejected: [],
  cancelled: [],
}

export type { ReturnStatus }

export const RETURN_MACHINE: Table<ReturnStatus> = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["pickup_scheduled", "in_transit", "received", "rejected", "cancelled"],
  // The customer can still call it off until the courier has it.
  pickup_scheduled: ["in_transit", "received", "cancelled"],
  in_transit: ["received"],
  // Refunding straight from received is the admin's existing quick path.
  received: ["inspected", "refunded"],
  inspected: ["refund_pending", "refunded", "exchanged", "rejected"],
  // A refund the gateway refused goes back to be resolved again.
  refund_pending: ["refunded", "inspected"],
  // A rejected request may be reconsidered.
  rejected: ["approved"],
  refunded: [],
  exchanged: [],
  cancelled: [],
}

/** Own-fleet delivery of one parcel. */
export const DELIVERY_MACHINE: Table<DeliveryStatus> = {
  unassigned: ["offered", "assigned", "cancelled"],
  // Declined or lapsed offers go back to the pool.
  offered: ["assigned", "unassigned", "cancelled"],
  assigned: ["picked_up", "unassigned", "cancelled"],
  picked_up: ["out_for_delivery", "rto"],
  out_for_delivery: ["delivered", "attempt_failed"],
  // After a failed attempt the rider tries again, or the parcel goes back.
  attempt_failed: ["out_for_delivery", "rto"],
  rto: ["returned"],
  delivered: [],
  returned: [],
  cancelled: [],
}

/** Cash a rider hands over: counted by finance, matched or flagged. */
export const COD_MACHINE: Table<CodRemittanceDoc["status"]> = {
  submitted: ["reconciled", "mismatch"],
  // A mismatch is recounted once the difference is found.
  mismatch: ["reconciled", "mismatch"],
  reconciled: [],
}

export const MACHINES = { order: ORDER_MACHINE, payment: PAYMENT_MACHINE, fulfilment: FULFILMENT_MACHINE, return: RETURN_MACHINE, delivery: DELIVERY_MACHINE, cod: COD_MACHINE }
export type MachineName = keyof typeof MACHINES

export function canTransition<M extends MachineName>(machine: M, from: string, to: string) {
  const next = (MACHINES[machine] as Record<string, readonly string[]>)[from]
  return !!next && next.includes(to)
}

/** Throws a 409 unless `from -> to` is a legal move in `machine`. */
export function assertTransition(machine: MachineName, from: string, to: string) {
  if (!canTransition(machine, from, to)) {
    throw conflict(`Can't move ${machine} from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`, "invalid_transition")
  }
}

/** Statuses that may move to `to`: the guard for a conditional update. */
export function sourcesOf(machine: MachineName, to: string) {
  return Object.entries(MACHINES[machine] as Record<string, readonly string[]>)
    .filter(([, next]) => next.includes(to))
    .map(([from]) => from)
}

/** Appends to the immutable status history. Call inside the transaction that made the change. */
export async function recordTransition(
  e: { machine: StatusEventDoc["machine"]; entityId: string; orderId?: string; from: string | null; to: string; actor: ActorRef; reason?: string },
  session?: ClientSession
) {
  await db.statusEvents().insertOne({ _id: newId("sev"), ...e, at: new Date() }, { session })
}

export const SYSTEM: ActorRef = { type: "system", id: "system" }
