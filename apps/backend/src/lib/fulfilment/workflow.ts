import { randomBytes } from "node:crypto"
import type { ClientSession } from "mongodb"
import { withTransaction } from "../../db/client.js"
import { db, type ActorRef, type FulfilmentDoc, type FulfilmentStatus, type ManifestDoc } from "../../db/schema.js"
import { ApiError, badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { moveStock } from "../inventory/stock.js"
import { log } from "../log.js"
import { assignCourier, courierManifest, createFulfilmentShipment, generateLabel, recordManualShipment, schedulePickups, shippingConfigured, type Carrier } from "../shipping/service.js"
import { assertTransition, recordTransition } from "../state/machines.js"
import { allocate } from "./allocate.js"
import { announce, notifyCustomer } from "../notify/index.js"
import { bookOwnFleet } from "../fleet/tasks.js"

/*
 * The warehouse floor: accept, pick, check, pack, label, manifest, hand over.
 * Every step is a guarded status change (the fulfilment state machine) and
 * every unit that moves is a stock-ledger row. Scans are compared with what
 * the order needs, so the wrong size, colour or product can't be picked or
 * packed, and the label can't go on the wrong parcel.
 */

const norm = (code: string) => code.trim().toUpperCase()

export async function loadFulfilment(id: string, session?: ClientSession) {
  const f = await db.fulfilments().findOne({ _id: id }, { session })
  if (!f) throw notFound("Fulfilment")
  return f
}

/**
 * Moves the fulfilment to `to`, only if it is still in the status it was read
 * in. A second, concurrent request for the same step finds nothing to update.
 */
async function advance(f: FulfilmentDoc, to: FulfilmentStatus, actor: ActorRef, reason: string | undefined, set: Partial<FulfilmentDoc>, session?: ClientSession, extra: Record<string, unknown> = {}) {
  assertTransition("fulfilment", f.status, to)
  const res = await db
    .fulfilments()
    .updateOne({ _id: f._id, status: f.status, updatedAt: f.updatedAt }, { $set: { ...set, status: to, updatedAt: new Date() }, ...extra }, { session })
  if (!res.modifiedCount) throw conflict("This order changed meanwhile. Reload and try again.", "stale")
  await recordTransition({ machine: "fulfilment", entityId: f._id, orderId: f.orderId, from: f.status, to, actor, ...(reason ? { reason } : {}) }, session)
  return loadFulfilment(f._id, session)
}

/* ---------- Acceptance ---------- */

export const acceptFulfilment = async (id: string, actor: ActorRef) => advance(await loadFulfilment(id), "picking_pending", actor, "Accepted by the warehouse", {})

/**
 * The warehouse can't fulfil it (stock not physically there, closed dock).
 * Its reservation is released and the order is offered to the next eligible
 * warehouse. If none can take it the order waits for an admin to allocate it.
 */
export async function rejectFulfilment(id: string, actor: ActorRef, reason: string) {
  return withTransaction(async (session) => {
    const f = await loadFulfilment(id, session)
    const rejected = await advance(f, "rejected", actor, reason, { active: false, cancelReason: reason }, session)
    await release(f, actor, reason, session)
    const order = await db.orders().findOne({ _id: f.orderId }, { session })
    if (!order) throw notFound("Order")
    const others = await db.fulfilments().distinct("warehouseId", { orderId: f.orderId, active: true }, { session })
    const exclude = [...new Set([...f.rejectedBy, f.warehouseId, ...(others as string[])])]
    let next: FulfilmentDoc[] = []
    try {
      // allocate checks availability before it reserves anything, so "no stock" leaves nothing half done.
      next = await allocate(order, wantsOf(f), { actor, method: "auto", reason: `Re-allocated after ${f.warehouseCode} declined: ${reason}`, exclude }, session)
    } catch (e) {
      if ((e as { code?: string }).code !== "out_of_stock" && (e as { code?: string }).code !== "unserviceable") throw e
      log.warn("fulfilment.unallocated", { orderId: order._id, fulfilmentId: f._id })
    }
    return { rejected, reallocated: next }
  })
}

const wantsOf = (f: FulfilmentDoc) => f.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity - l.short }))

/** Puts every unit the fulfilment holds back on the shelf as sellable stock. */
async function release(f: FulfilmentDoc, actor: ActorRef, note: string, session: ClientSession) {
  for (const l of f.lines.filter((x) => x.reserved)) {
    const ref = { type: "fulfilment" as const, id: f._id }
    const packed = l.packed
    const picked = l.picked - l.packed
    const reserved = l.quantity - l.picked - l.short
    if (packed > 0) await moveStock({ warehouseId: f.warehouseId, variantId: l.variantId, from: "packed", to: "available", quantity: packed, reason: "release", ref, actor, note }, session)
    if (picked > 0) await moveStock({ warehouseId: f.warehouseId, variantId: l.variantId, from: "picked", to: "available", quantity: picked, reason: "unpick", ref, actor, note }, session)
    if (reserved > 0) await moveStock({ warehouseId: f.warehouseId, variantId: l.variantId, from: "reserved", to: "available", quantity: reserved, reason: "release", ref, actor, note }, session)
  }
}

/** Cancels every live fulfilment of an order (order cancellation), releasing stock. Refused once a parcel is booked. */
export async function cancelOrderFulfilments(orderId: string, actor: ActorRef, reason: string, session: ClientSession) {
  const live = await db.fulfilments().find({ orderId, active: true }, { session }).toArray()
  for (const f of live) {
    if (!["assigned", "picking_pending", "picking", "picked", "qc_passed", "packed"].includes(f.status)) {
      throw conflict(`Parcel ${f.code} is already booked with the courier. Cancel the booking first.`, "fulfilment_booked")
    }
    await advance(f, "cancelled", actor, reason, { active: false, cancelReason: reason }, session)
    await release(f, actor, reason, session)
  }
  return live
}

/**
 * Admin override: moves an unstarted fulfilment to another warehouse (stock
 * released here, reserved there), recorded with who did it and why.
 */
export async function reassignFulfilment(id: string, warehouseId: string, actor: ActorRef, reason: string) {
  return withTransaction(async (session) => {
    const f = await loadFulfilment(id, session)
    if (!["assigned", "picking_pending"].includes(f.status)) throw conflict("Picking has started; this order can no longer move warehouse.", "picking_started")
    if (f.warehouseId === warehouseId) throw badRequest("That's the warehouse it's already at.")
    await advance(f, "cancelled", actor, `Reassigned: ${reason}`, { active: false, cancelReason: `Reassigned: ${reason}` }, session)
    await release(f, actor, `Reassigned: ${reason}`, session)
    const order = await db.orders().findOne({ _id: f.orderId }, { session })
    if (!order) throw notFound("Order")
    const [next] = await allocate(order, wantsOf(f), { actor, method: "manual", reason, warehouseId }, session)
    await db.auditLogs().insertOne(
      { _id: newId("audit"), adminId: actor.id, adminEmail: actor.name ?? "", action: "fulfilment.reassign", targetCollection: "fulfilments", targetId: f._id, diff: { from: f.warehouseCode, to: next?.warehouseCode, reason, newFulfilmentId: next?._id }, createdAt: new Date() },
      { session }
    )
    return next!
  })
}

/** Admin: allocates order lines that no warehouse holds a live fulfilment for (every warehouse declined, or stock arrived since). */
export async function allocateOutstanding(orderId: string, actor: ActorRef, warehouseId?: string) {
  return withTransaction(async (session) => {
    const order = await db.orders().findOne({ _id: orderId }, { session })
    if (!order) throw notFound("Order")
    if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
    const live = await db.fulfilments().find({ orderId, active: true }, { session }).toArray()
    const wants = order.items
      .map((i) => ({ itemId: i._id, quantity: i.quantity - live.flatMap((f) => f.lines).filter((l) => l.itemId === i._id).reduce((n, l) => n + l.quantity, 0) }))
      .filter((w) => w.quantity > 0)
    if (!wants.length) throw conflict("Every item of this order is already allocated.", "allocated")
    const declined = (await db.fulfilments().distinct("warehouseId", { orderId, $or: [{ status: "rejected" }, { active: true }] }, { session })) as string[]
    const created = await allocate(order, wants, { actor, method: warehouseId ? "manual" : "auto", reason: "Allocated by an admin", ...(warehouseId ? { warehouseId } : { exclude: declined }) }, session)
    if (!created.length) throw conflict("None of these items are managed by a warehouse.", "untracked")
    return created
  })
}

/* ---------- Picking ---------- */

export const startPicking = async (id: string, actor: ActorRef) => advance(await loadFulfilment(id), "picking", actor, undefined, { pick: { startedAt: new Date(), startedBy: actor.id } })

/**
 * One scan at the shelf. The barcode must be the SKU of a line still to be
 * picked; anything else (another size, colour or product) is refused and
 * nothing moves.
 */
export async function scanPick(id: string, barcode: string, quantity: number, actor: ActorRef) {
  return withTransaction(async (session) => {
    const f = await loadFulfilment(id, session)
    if (f.status !== "picking") throw conflict("Start picking this order first.", "not_picking")
    const code = norm(barcode)
    const matching = f.lines.map((l, i) => ({ l, i })).filter(({ l }) => norm(l.sku) === code)
    if (!matching.length) {
      throw new ScanError("wrong_item", `${barcode} isn't on this pick list. Check the size and colour against the list.`)
    }
    const open = matching.find(({ l }) => l.picked < l.quantity - l.short)
    if (!open) throw new ScanError("over_pick", `All units of ${matching[0]!.l.sku} are already picked.`)
    const { l, i } = open
    const room = l.quantity - l.short - l.picked
    if (quantity > room) throw new ScanError("over_pick", `Only ${room} more of ${l.sku} needed.`)
    if (l.reserved) {
      await moveStock({ warehouseId: f.warehouseId, variantId: l.variantId, from: "reserved", to: "picked", quantity, reason: "pick", ref: { type: "fulfilment", id: f._id }, actor }, session)
    }
    const res = await db
      .fulfilments()
      .updateOne({ _id: f._id, status: "picking", [`lines.${i}.picked`]: l.picked }, { $inc: { [`lines.${i}.picked`]: quantity }, $set: { updatedAt: new Date() } }, { session })
    if (!res.modifiedCount) throw conflict("Someone else scanned this order at the same time. Scan again.", "stale")
    return loadFulfilment(f._id, session)
  })
}

export async function completePicking(id: string, actor: ActorRef) {
  const f = await loadFulfilment(id)
  const short = f.lines.find((l) => l.short > 0)
  if (short) throw conflict(`${short.sku} is short by ${short.short}; a supervisor must reassign this order.`, "short")
  const missing = f.lines.find((l) => l.picked < l.quantity)
  if (missing) throw conflict(`${missing.quantity - missing.picked} of ${missing.sku} still to pick.`, "incomplete_pick")
  return advance(f, "picked", actor, undefined, { pick: { ...f.pick, completedAt: new Date() } })
}

/* ---------- Quality check ---------- */

/**
 * Passed: on to packing. Failed: the failed units are booked as damaged, a
 * replacement is reserved from this warehouse's shelf where there is one
 * (else the line is marked short), and the order goes back to be picked again.
 */
export async function qualityCheck(id: string, input: { result: "passed" | "failed"; notes?: string; failures?: { itemId: string; quantity: number; reason: string }[] }, actor: ActorRef) {
  return withTransaction(async (session) => {
    const f = await loadFulfilment(id, session)
    const qc = { result: input.result, at: new Date(), by: actor.id, ...(input.notes ? { notes: input.notes } : {}), failures: input.failures ?? [] }
    if (input.result === "passed") return advance(f, "qc_passed", actor, input.notes, { qc }, session)
    if (!qc.failures.length) throw badRequest("List the items that failed inspection.")
    const lines = f.lines.map((l) => ({ ...l }))
    for (const fail of qc.failures) {
      const line = lines.find((l) => l.itemId === fail.itemId && l.picked >= fail.quantity)
      if (!line) throw badRequest("A failed item isn't among the picked units.")
      line.picked -= fail.quantity
      if (!line.reserved) continue
      const ref = { type: "fulfilment" as const, id: f._id }
      await moveStock({ warehouseId: f.warehouseId, variantId: line.variantId, from: "picked", to: "damaged", quantity: fail.quantity, reason: "qc_damage", ref, actor, note: fail.reason }, session)
      const level = await db.stockLevels().findOne({ warehouseId: f.warehouseId, variantId: line.variantId }, { session })
      const replace = Math.min(fail.quantity, level?.available ?? 0)
      if (replace > 0) await moveStock({ warehouseId: f.warehouseId, variantId: line.variantId, from: "available", to: "reserved", quantity: replace, reason: "reserve", ref, actor, note: "Replacement for a unit that failed inspection" }, session)
      line.short += fail.quantity - replace
    }
    return advance(f, "picking_pending", actor, `Failed inspection: ${qc.failures.map((x) => x.reason).join("; ")}`, { qc, lines }, session)
  })
}

/* ---------- Packing ---------- */

/**
 * The packer scans the pick slip (fulfilment code), then every unit going in
 * the box. The scans must be exactly the order's units: an extra, a missing
 * one or a different variant is refused and nothing is packed.
 */
export async function pack(id: string, input: { orderCode: string; scans: string[]; weightKg: number; lengthCm: number; breadthCm: number; heightCm: number }, actor: ActorRef) {
  const packed = await packInTransaction(id, input, actor)
  await announce("packed", async () => {
    const order = await db.orders().findOne({ _id: packed.orderId })
    if (order) await notifyCustomer(order, "order_packed", `order:${order._id}:packed`)
  })
  return packed
}

function packInTransaction(id: string, input: { orderCode: string; scans: string[]; weightKg: number; lengthCm: number; breadthCm: number; heightCm: number }, actor: ActorRef) {
  return withTransaction(async (session) => {
    const f = await loadFulfilment(id, session)
    if (norm(input.orderCode) !== norm(f.code)) throw new ScanError("wrong_order", `That slip is for another order; this is ${f.code}.`)
    if (f.status !== "qc_passed") throw conflict("This order hasn't passed inspection.", "not_inspected")
    const expected = new Map<string, number>()
    for (const l of f.lines) expected.set(norm(l.sku), (expected.get(norm(l.sku)) ?? 0) + l.quantity)
    const got = new Map<string, number>()
    for (const s of input.scans) got.set(norm(s), (got.get(norm(s)) ?? 0) + 1)
    for (const [sku, n] of got) {
      if (!expected.has(sku)) throw new ScanError("wrong_item", `${sku} doesn't belong in this parcel.`)
      if (n > expected.get(sku)!) throw new ScanError("over_pack", `${n} of ${sku} scanned; the order has ${expected.get(sku)}.`)
    }
    for (const [sku, n] of expected) if ((got.get(sku) ?? 0) < n) throw new ScanError("missing_item", `${n - (got.get(sku) ?? 0)} of ${sku} not scanned into the parcel.`)

    for (const l of f.lines.filter((x) => x.reserved)) {
      await moveStock({ warehouseId: f.warehouseId, variantId: l.variantId, from: "picked", to: "packed", quantity: l.quantity, reason: "pack", ref: { type: "fulfilment", id: f._id }, actor }, session)
    }
    const pkg = {
      code: `PKG-${randomBytes(5).toString("hex").toUpperCase()}`,
      weightKg: input.weightKg,
      lengthCm: input.lengthCm,
      breadthCm: input.breadthCm,
      heightCm: input.heightCm,
      packedAt: new Date(),
      packedBy: actor.id,
    }
    return advance(f, "packed", actor, undefined, { package: pkg, lines: f.lines.map((l) => ({ ...l, packed: l.quantity })) }, session)
  })
}

/* ---------- Label and AWB ---------- */

/**
 * Books the parcel with the courier and fetches its AWB and label. The packer
 * first scans the parcel's own barcode so the label goes on the right box.
 * Without a courier integration the AWB from wherever it was booked is
 * recorded instead (`manual`); nothing is generated here.
 * Safe to retry: a booking already made is reused, and only missing steps run.
 */
export async function generateFulfilmentLabel(id: string, input: { packageCode: string; carrier?: Carrier; courierId?: number; ownFleet?: boolean; manual?: { carrier: string; awb: string; trackingUrl?: string } }, actor: ActorRef) {
  let f = await loadFulfilment(id)
  if (f.status !== "packed") throw conflict("Pack the parcel before generating its label.", "not_packed")
  if (!f.package || norm(input.packageCode) !== norm(f.package.code)) throw new ScanError("wrong_package", "That parcel barcode isn't this order's parcel.")

  let shipment = f.shipmentId ? await db.shipments().findOne({ _id: f.shipmentId, active: true }) : await db.shipments().findOne({ fulfilmentId: f._id, isReturn: false, active: true })
  if (!shipment) {
    if (input.ownFleet) {
      shipment = await bookOwnFleet(f)
    } else if (input.manual) {
      const order = await db.orders().findOne({ _id: f.orderId })
      if (!order) throw notFound("Order")
      shipment = await recordManualShipment(order, input.manual, f)
    } else {
      if (!shippingConfigured()) throw badRequest("No courier integration is configured. Enter the AWB the courier gave you.", "shipping_unconfigured")
      shipment = await createFulfilmentShipment(f, { carrier: input.carrier, courierId: input.courierId })
    }
    await db.fulfilments().updateOne({ _id: f._id }, { $set: { shipmentId: shipment._id, updatedAt: new Date() } })
  }
  if (shipment.provider === "shiprocket" && !shipment.awb) shipment = await assignCourier(shipment._id, input.courierId)
  if ((shipment.provider === "shiprocket" || shipment.provider === "delhivery") && !shipment.labelUrl) shipment = await generateLabel(shipment._id)
  f = await loadFulfilment(id)
  return advance(f, "label_generated", actor, undefined, { shipmentId: shipment._id, awb: shipment.awb, carrier: shipment.carrier })
}

/** The label is on the box: scanning its AWB confirms it matches this order. */
export async function verifyLabel(id: string, awb: string, actor: ActorRef) {
  const f = await loadFulfilment(id)
  if (!f.awb || norm(awb) !== norm(f.awb)) throw new ScanError("wrong_awb", "That AWB isn't this parcel's label.")
  return advance(f, "ready_to_dispatch", actor, undefined, {})
}

/* ---------- Manifest and handover ---------- */

/**
 * Gathers every labelled parcel at the warehouse for one courier into a
 * manifest, requests the courier pickup for each and fetches the courier's
 * manifest document.
 */
export async function createManifest(warehouseId: string, carrier: string, actor: ActorRef) {
  const ready = await db.fulfilments().find({ warehouseId, status: "ready_to_dispatch", carrier, active: true }).toArray()
  if (!ready.length) throw conflict(`No ${carrier} parcels are ready to dispatch.`, "nothing_ready")
  const now = new Date()
  const manifest: ManifestDoc = {
    _id: newId("man"),
    code: `MAN-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`,
    warehouseId,
    carrier,
    fulfilmentIds: [],
    awbs: [],
    scannedAwbs: [],
    status: "open",
    manifestUrls: [],
    createdBy: actor.id,
    createdAt: now,
  }
  await db.manifests().insertOne(manifest)
  for (const f of ready) {
    try {
      await advance(f, "manifested", actor, manifest.code, { manifestId: manifest._id })
      manifest.fulfilmentIds.push(f._id)
      manifest.awbs.push(f.awb!)
    } catch (e) {
      // Taken by a concurrent manifest; skip it.
      if ((e as { code?: string }).code !== "stale") throw e
    }
  }
  if (!manifest.fulfilmentIds.length) {
    await db.manifests().deleteOne({ _id: manifest._id })
    throw conflict("Those parcels were just put on another manifest.", "nothing_ready")
  }
  const shipmentIds = ready.filter((f) => manifest.fulfilmentIds.includes(f._id)).map((f) => f.shipmentId!)
  await schedulePickups(shipmentIds)
  const url = await courierManifest(shipmentIds)
  if (url) manifest.manifestUrls.push(url)
  await db.manifests().updateOne({ _id: manifest._id }, { $set: { fulfilmentIds: manifest.fulfilmentIds, awbs: manifest.awbs, manifestUrls: manifest.manifestUrls } })
  return manifest
}

/** At the dock: each parcel's AWB is scanned as the courier's executive takes it. */
export async function scanHandover(manifestId: string, awb: string, actor: ActorRef) {
  const m = await db.manifests().findOne({ _id: manifestId })
  if (!m) throw notFound("Manifest")
  if (m.status !== "open") throw conflict("This manifest is closed.", "manifest_closed")
  const code = norm(awb)
  const match = m.awbs.find((a) => norm(a) === code)
  if (!match) throw new ScanError("not_on_manifest", `${awb} isn't on manifest ${m.code}.`)
  if (m.scannedAwbs.includes(match)) throw new ScanError("already_scanned", `${awb} was already handed over.`)
  const f = await db.fulfilments().findOne({ manifestId, awb: match })
  if (!f) throw notFound("Fulfilment")
  await advance(f, "handed_over", actor, undefined, { handedOverAt: new Date() })
  await db.manifests().updateOne({ _id: m._id, scannedAwbs: { $ne: match } }, { $push: { scannedAwbs: match } })
  return (await db.manifests().findOne({ _id: m._id }))!
}

/**
 * Closes the manifest with the courier executive's name. Handed-over parcels
 * are dispatched: their units leave the building. Parcels not scanned stay
 * behind, ready for the next manifest.
 */
export async function closeManifest(manifestId: string, courierExecutive: string, actor: ActorRef) {
  return withTransaction(async (session) => {
    const m = await db.manifests().findOne({ _id: manifestId }, { session })
    if (!m) throw notFound("Manifest")
    if (m.status !== "open") throw conflict("This manifest is already closed.", "manifest_closed")
    if (!m.scannedAwbs.length) throw conflict("Scan at least one parcel before closing the manifest.", "nothing_scanned")
    const fulfilments = await db.fulfilments().find({ _id: { $in: m.fulfilmentIds } }, { session }).toArray()
    for (const f of fulfilments) {
      if (f.status === "handed_over") {
        for (const l of f.lines.filter((x) => x.reserved)) {
          await moveStock({ warehouseId: f.warehouseId, variantId: l.variantId, from: "packed", to: "outside", quantity: l.quantity, reason: "dispatch", ref: { type: "fulfilment", id: f._id }, actor, note: m.code }, session)
        }
        await advance(f, "dispatched", actor, `Handed to ${courierExecutive}`, { dispatchedAt: new Date() }, session)
      } else if (f.status === "manifested") {
        await advance(f, "ready_to_dispatch", actor, `Not handed over on ${m.code}`, {}, session, { $unset: { manifestId: "" } })
      }
    }
    const kept = fulfilments.filter((f) => f.status === "handed_over")
    await db.manifests().updateOne(
      { _id: m._id, status: "open" },
      { $set: { status: "closed", closedAt: new Date(), closedBy: actor.id, courierExecutive, fulfilmentIds: kept.map((f) => f._id), awbs: kept.map((f) => f.awb!) } },
      { session }
    )
    return (await db.manifests().findOne({ _id: m._id }, { session }))!
  })
}

/** A scan that doesn't match: shown to the operator as is, so they can fix it at the station. */
export class ScanError extends ApiError {
  constructor(code: string, message: string) {
    super(422, code, message)
  }
}
