import { env } from "../../env.js"
import { db, type OrderDoc, type ShipmentDoc, type ShipmentStatus } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { dispatchWarehouse } from "../invoice.js"
import { log } from "../log.js"
import { ProviderError } from "../providers/http.js"
import {
  isShiprocketConfigured,
  shiprocketAssignAwb,
  shiprocketCancel,
  shiprocketCreateOrder,
  shiprocketCreateReturn,
  shiprocketLabel,
  shiprocketNdrAction,
  shiprocketSchedulePickup,
  shiprocketServiceability,
  shiprocketTrack,
  type ShiprocketParty,
  type TrackingScan,
} from "./shiprocket.js"
import { fulfillmentFor, mapShiprocketStatus, shouldAdvance } from "./status.js"

/*
 * Shipments end to end. With Shiprocket configured every AWB, label, pickup
 * and tracking scan comes from Shiprocket. Without it, a shipment can only be
 * recorded by hand with details from wherever it was booked; nothing is invented.
 */

export const shippingConfigured = () => isShiprocketConfigured()

const TERMINAL: ShipmentStatus[] = ["delivered", "rto_delivered", "cancelled"]

/** Parcel size: product weights (grams) when known, else the configured default. */
async function parcelFor(order: OrderDoc, items = order.items): Promise<ShipmentDoc["parcel"]> {
  const [l, b, h] = env.SHIPPING_DEFAULT_DIMENSIONS_CM.split("x").map(Number) as [number, number, number]
  const products = await db.products().find({ _id: { $in: items.map((i) => i.productId) } }, { projection: { weight: 1 } }).toArray()
  const grams = new Map(products.map((p) => [p._id, p.weight ?? 0]))
  const known = items.every((i) => (grams.get(i.productId) ?? 0) > 0)
  const weightKg = known
    ? Math.max(0.1, items.reduce((s, i) => s + (grams.get(i.productId) ?? 0) * i.quantity, 0) / 1000)
    : env.SHIPPING_DEFAULT_WEIGHT_KG * Math.max(1, items.reduce((s, i) => s + i.quantity, 0))
  return { weightKg: Math.round(weightKg * 100) / 100, lengthCm: l, breadthCm: b, heightCm: h }
}

const customerParty = (order: OrderDoc): ShiprocketParty => {
  const a = order.shippingAddress
  if (!a.phone) throw badRequest("The delivery address has no phone number; couriers require one.", "missing_phone")
  return {
    name: a.firstName,
    lastName: a.lastName,
    address: [a.company, a.address1].filter(Boolean).join(", "),
    address2: a.address2,
    city: a.city,
    state: a.province ?? "",
    pincode: a.postalCode,
    country: a.countryCode.toUpperCase() === "IN" ? "India" : a.countryCode.toUpperCase(),
    email: order.email,
    phone: a.phone.replace(/\D/g, "").slice(-10),
  }
}

const shipmentItems = (order: OrderDoc, lines: { itemId: string; quantity: number }[]) =>
  lines.map((l) => {
    const item = order.items.find((i) => i._id === l.itemId)
    if (!item) throw badRequest("That item isn't on this order.")
    return { name: `${item.productTitle}${item.variantTitle ? ` (${item.variantTitle})` : ""}`, sku: `SKU-${item.variantId.slice(-6)}`, units: l.quantity, sellingPrice: item.unitPrice }
  })

/** Copies the outbound shipment onto the order and moves its fulfillment status with it. Payment status is untouched. */
async function syncOrder(shipment: ShipmentDoc) {
  if (shipment.isReturn) {
    if (shipment.status === "delivered") {
      await db.orders().updateOne(
        { _id: shipment.orderId, "returnRequest.status": { $in: ["approved", "pickup_scheduled"] } },
        { $set: { "returnRequest.status": "received", "returnRequest.updatedAt": new Date(), updatedAt: new Date() } }
      )
    } else if (shipment.status === "pickup_scheduled" || shipment.status === "picked_up" || shipment.status === "in_transit") {
      await db.orders().updateOne(
        { _id: shipment.orderId, "returnRequest.status": "approved" },
        { $set: { "returnRequest.status": "pickup_scheduled", "returnRequest.updatedAt": new Date(), updatedAt: new Date() } }
      )
    }
    return
  }
  const order = await db.orders().findOne({ _id: shipment.orderId })
  if (!order) return
  const fulfillment = fulfillmentFor(shipment.status)
  const set: Record<string, unknown> = {
    shipment: {
      carrier: shipment.carrier,
      awb: shipment.awb,
      status: shipment.status,
      ...(shipment.labelUrl ? { labelUrl: shipment.labelUrl } : {}),
      ...(shipment.trackingUrl ? { trackingUrl: shipment.trackingUrl } : {}),
      ...(shipment.pickup?.scheduledFor ? { pickupScheduledAt: shipment.pickup.scheduledFor } : {}),
      ...(shipment.estimatedDelivery ? { estimatedDelivery: shipment.estimatedDelivery } : {}),
      ...(order.shipment?.shippedAt ? { shippedAt: order.shipment.shippedAt } : fulfillment === "shipped" ? { shippedAt: new Date() } : {}),
      ...(shipment.deliveredAt ? { deliveredAt: shipment.deliveredAt } : {}),
    },
    updatedAt: new Date(),
  }
  if (shipment.status === "cancelled") {
    await db.orders().updateOne({ _id: order._id }, { $unset: { shipment: "" }, $set: { fulfillmentStatus: "unfulfilled", updatedAt: new Date() } })
    return
  }
  if (fulfillment && fulfillment !== order.fulfillmentStatus) set.fulfillmentStatus = fulfillment
  // Delivered completes the order only once it is also paid (a COD order waits for its cash).
  if (fulfillment === "delivered" && order.paymentStatus === "paid") set.status = "completed"
  await db.orders().updateOne({ _id: order._id }, { $set: set })
}

/** Serviceable couriers and their rates for a delivery pincode. `configured: false` when no courier API is set up. */
export async function serviceability(pincode: string, opts: { cod: boolean; weightKg?: number }) {
  if (!shippingConfigured() || !env.SHIPPING_ORIGIN_PINCODE) return { configured: false as const }
  const result = await shiprocketServiceability({
    pickupPincode: env.SHIPPING_ORIGIN_PINCODE,
    deliveryPincode: pincode,
    weightKg: opts.weightKg ?? env.SHIPPING_DEFAULT_WEIGHT_KG,
    cod: opts.cod,
  })
  return { configured: true as const, serviceable: result.couriers.length > 0, ...result }
}

/**
 * Books the order with the courier provider: one live outbound parcel per
 * order (a unique index refuses a second). Online orders must be paid first.
 */
export async function createShipment(order: OrderDoc, opts: { parcel?: Partial<ShipmentDoc["parcel"]> } = {}): Promise<ShipmentDoc> {
  if (!shippingConfigured()) throw badRequest("No courier integration is configured. Record the shipment by hand instead.", "shipping_unconfigured")
  if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
  if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") throw conflict("Online orders ship only once payment is verified.", "not_paid")
  if (order.fulfillmentStatus !== "unfulfilled") throw conflict("This order has already shipped.", "already_shipped")

  const lines = order.items.map((i) => ({ itemId: i._id, quantity: i.quantity }))
  const now = new Date()
  const shipment: ShipmentDoc = {
    _id: newId("ship"),
    orderId: order._id,
    displayId: order.displayId,
    provider: "shiprocket",
    carrier: "",
    awb: "",
    status: "pending",
    items: lines,
    parcel: { ...(await parcelFor(order)), ...opts.parcel },
    trackingEvents: [],
    isReturn: false,
    active: true,
    customer: {
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      phone: order.shippingAddress.phone,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
    },
    itemsCount: lines.reduce((s, l) => s + l.quantity, 0),
    createdAt: now,
    updatedAt: now,
  }
  try {
    await db.shipments().insertOne(shipment)
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("This order already has a live shipment.", "shipment_exists")
    throw e
  }

  try {
    // Shiprocket never accepts an order reference twice, even after a cancel: re-bookings get "-2", "-3"...
    const previous = await db.shipments().countDocuments({ orderId: order._id, isReturn: false, _id: { $ne: shipment._id } })
    const created = await shiprocketCreateOrder({
      orderRef: previous ? `${order.displayId}-${previous + 1}` : String(order.displayId),
      orderDate: order.createdAt,
      customer: customerParty(order),
      items: shipmentItems(order, lines),
      paymentMethod: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      subTotal: order.totals.total,
      parcel: shipment.parcel,
    })
    Object.assign(shipment, { ...created, status: "ready_to_ship" as const, updatedAt: new Date() })
    await db.shipments().updateOne({ _id: shipment._id }, { $set: { ...created, status: "ready_to_ship", updatedAt: shipment.updatedAt } })
    log.info("shipment.created", { shipmentId: shipment._id, orderId: order._id, providerShipmentId: created.providerShipmentId })
    return shipment
  } catch (e) {
    // A definite refusal frees the order to try again; an unknown outcome stays pending for a person to check on Shiprocket.
    if (!(e instanceof ProviderError && e.uncertain)) await db.shipments().deleteOne({ _id: shipment._id })
    log.error("shipment.create_failed", { orderId: order._id, error: (e as Error).message })
    throw e instanceof ProviderError ? badRequest(e.message, "courier_error") : e
  }
}

const loadLive = async (id: string) => {
  const s = await db.shipments().findOne({ _id: id })
  if (!s) throw notFound("Shipment")
  if (s.status === "cancelled") throw conflict("This shipment is cancelled", "shipment_cancelled")
  return s
}

const asCourierError = (e: unknown) => (e instanceof ProviderError ? badRequest(e.message, "courier_error") : e)

/** Assigns a courier (the cheapest-recommended one when none is given) and records the AWB. */
export async function assignCourier(id: string, courierId?: number) {
  const s = await loadLive(id)
  if (s.provider !== "shiprocket" || !s.providerShipmentId) throw conflict("This shipment wasn't booked through the courier integration.", "manual_shipment")
  if (s.awb) throw conflict("A courier is already assigned.", "awb_assigned")
  try {
    const r = await shiprocketAssignAwb(s.providerShipmentId, courierId)
    const set = { awb: r.awb, carrier: r.courierName, ...(r.courierId ? { courierId: r.courierId } : {}), status: "shipment_created" as const, updatedAt: new Date() }
    await db.shipments().updateOne({ _id: s._id }, { $set: set })
    const next = { ...s, ...set }
    await syncOrder(next)
    return next
  } catch (e) {
    throw asCourierError(e)
  }
}

export async function generateLabel(id: string) {
  const s = await loadLive(id)
  if (!s.providerShipmentId || !s.awb) throw conflict("Assign a courier before generating the label.", "no_awb")
  try {
    const { labelUrl } = await shiprocketLabel(s.providerShipmentId)
    await db.shipments().updateOne({ _id: s._id }, { $set: { labelUrl, updatedAt: new Date() } })
    const next = { ...s, labelUrl }
    await syncOrder(next)
    return next
  } catch (e) {
    throw asCourierError(e)
  }
}

export async function schedulePickup(id: string) {
  const s = await loadLive(id)
  if (!s.providerShipmentId || !s.awb) throw conflict("Assign a courier before requesting a pickup.", "no_awb")
  if (s.pickup) throw conflict("A pickup is already requested.", "pickup_exists")
  try {
    const r = await shiprocketSchedulePickup(s.providerShipmentId)
    const pickup = { requestedAt: new Date(), ...(r.scheduledFor ? { scheduledFor: r.scheduledFor } : {}), ...(r.token ? { token: r.token } : {}) }
    const status: ShipmentStatus = shouldAdvance(s.status, "pickup_scheduled") ? "pickup_scheduled" : s.status
    await db.shipments().updateOne({ _id: s._id }, { $set: { pickup, status, updatedAt: new Date() } })
    const next = { ...s, pickup, status }
    await syncOrder(next)
    return next
  } catch (e) {
    throw asCourierError(e)
  }
}

/** Cancels with the courier (before pickup) and frees the order to be shipped again. */
export async function cancelShipment(id: string) {
  const s = await loadLive(id)
  if (["picked_up", "in_transit", "out_for_delivery", "delivered", "rto_initiated", "rto_in_transit", "rto_delivered"].includes(s.status)) {
    throw conflict("The courier already has this parcel; it can't be cancelled now.", "already_picked_up")
  }
  try {
    if (s.provider === "shiprocket" && s.providerOrderId) await shiprocketCancel(s.providerOrderId)
  } catch (e) {
    throw asCourierError(e)
  }
  const event = { timestamp: new Date(), status: "Cancelled", internalStatus: "cancelled" as const, location: "", note: "Cancelled from the admin" }
  await db.shipments().updateOne({ _id: s._id }, { $set: { status: "cancelled", active: false, updatedAt: new Date() }, $push: { trackingEvents: event } })
  const next = { ...s, status: "cancelled" as const, active: false }
  await syncOrder(next)
  return next
}

/** Answers a failed delivery: ask the courier to try again, or send it back (RTO). */
export async function ndrAction(id: string, action: "reattempt" | "return", comment: string) {
  const s = await loadLive(id)
  if (s.status !== "delivery_failed") throw conflict("Only a failed delivery can be re-attempted or returned.", "not_failed")
  try {
    if (s.provider === "shiprocket") await shiprocketNdrAction(s.awb, action, comment)
  } catch (e) {
    throw asCourierError(e)
  }
  const ndr = { reason: s.ndr?.reason ?? "", attempts: s.ndr?.attempts ?? 1, action, actionAt: new Date(), updatedAt: new Date() }
  await db.shipments().updateOne({ _id: s._id }, { $set: { ndr, updatedAt: new Date() } })
  return { ...s, ndr }
}

/**
 * Merges courier scans into the shipment and moves its status forward (never
 * back). Scans already recorded are skipped, so webhooks and polling can
 * deliver the same scan any number of times.
 */
export async function applyTracking(
  s: ShipmentDoc,
  t: { statusId?: number | string | null; statusLabel?: string | null; scans: TrackingScan[]; edd?: Date | null; deliveredAt?: Date | null; trackingUrl?: string | null }
) {
  const seen = new Set(s.trackingEvents.map((e) => `${e.timestamp.toISOString()}|${e.status}|${e.location}`))
  const fresh = t.scans
    .map((scan) => {
      const timestamp = new Date(scan.date.includes("T") ? scan.date : scan.date.replace(" ", "T") + "+05:30")
      if (Number.isNaN(timestamp.getTime())) return null
      const internal = mapShiprocketStatus(scan.statusId, scan.status)
      return { timestamp, status: scan.status, ...(internal ? { internalStatus: internal } : {}), location: scan.location ?? "", note: scan.activity ?? "" }
    })
    .filter((e): e is NonNullable<typeof e> => !!e && !seen.has(`${e.timestamp.toISOString()}|${e.status}|${e.location}`))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const mapped = mapShiprocketStatus(t.statusId, t.statusLabel) ?? fresh.at(-1)?.internalStatus ?? null
  const status = mapped && shouldAdvance(s.status, mapped) ? mapped : s.status
  const set: Partial<ShipmentDoc> = { status, lastSyncedAt: new Date(), updatedAt: new Date() }
  if (t.statusLabel) set.providerStatus = t.statusLabel
  if (t.edd) set.estimatedDelivery = t.edd
  if (t.trackingUrl) set.trackingUrl = t.trackingUrl
  if (status === "delivered") set.deliveredAt = t.deliveredAt ?? fresh.at(-1)?.timestamp ?? new Date()
  if (status === "delivery_failed" && s.status !== "delivery_failed") {
    const last = fresh.at(-1)
    set.ndr = { reason: last?.note || last?.status || t.statusLabel || "Delivery attempt failed", attempts: (s.ndr?.attempts ?? 0) + 1, updatedAt: new Date() }
  }
  await db.shipments().updateOne({ _id: s._id }, { $set: set, ...(fresh.length ? { $push: { trackingEvents: { $each: fresh } } } : {}) })
  const next = { ...s, ...set, trackingEvents: [...s.trackingEvents, ...fresh] } as ShipmentDoc
  if (next.status !== s.status || fresh.length) await syncOrder(next)
  if (next.status !== s.status) log.info("shipment.status", { shipmentId: s._id, awb: s.awb, from: s.status, to: next.status })
  return next
}

/** Pulls tracking from the courier now (admin "Refresh", or the background sweep). */
export async function syncTracking(id: string) {
  const s = await db.shipments().findOne({ _id: id })
  if (!s || !s.awb || s.provider !== "shiprocket") throw conflict("This shipment has no courier tracking yet.", "no_tracking")
  try {
    return await applyTracking(s, await shiprocketTrack(s.awb))
  } catch (e) {
    throw asCourierError(e)
  }
}

/** Background fallback for missed webhooks: refreshes live parcels not heard from in 30 minutes. */
export async function syncStaleShipments(limit = 20): Promise<number> {
  if (!shippingConfigured()) return 0
  const cutoff = new Date(Date.now() - 30 * 60_000)
  const stale = await db
    .shipments()
    .find(
      { provider: "shiprocket", awb: { $gt: "" }, status: { $nin: TERMINAL }, $or: [{ lastSyncedAt: { $exists: false } }, { lastSyncedAt: { $lt: cutoff } }] },
      { limit, sort: { lastSyncedAt: 1 } }
    )
    .toArray()
  let n = 0
  for (const s of stale) {
    try {
      await applyTracking(s, await shiprocketTrack(s.awb))
      n++
    } catch (e) {
      log.warn("shipment.sync_failed", { shipmentId: s._id, error: (e as Error).message })
    }
  }
  return n
}

/** A Shiprocket tracking webhook body (Settings > API > Webhooks). */
export type ShiprocketWebhook = {
  awb?: string | number
  current_status?: string
  current_status_id?: number
  shipment_status?: string
  shipment_status_id?: number
  current_timestamp?: string
  etd?: string
  scans?: { date: string; activity: string; location: string; "sr-status"?: number | string; "sr-status-label"?: string }[]
}

export async function applyShiprocketWebhook(body: ShiprocketWebhook): Promise<"processed" | "ignored"> {
  const awb = body.awb != null ? String(body.awb) : ""
  if (!awb) return "ignored"
  const s = await db.shipments().findOne({ awb })
  if (!s) return "ignored"
  await applyTracking(s, {
    statusId: body.shipment_status_id ?? body.current_status_id ?? null,
    statusLabel: body.shipment_status ?? body.current_status ?? null,
    edd: body.etd ? new Date(body.etd) : null,
    scans: (body.scans ?? []).map((x) => ({ date: x.date, status: x["sr-status-label"] || x.activity, statusId: x["sr-status"], activity: x.activity, location: x.location })),
  })
  return "processed"
}

/**
 * Reverse pickup for an approved return: the courier collects from the
 * customer and brings it to the dispatching warehouse.
 */
export async function createReturnShipment(order: OrderDoc): Promise<ShipmentDoc> {
  if (!shippingConfigured()) throw badRequest("No courier integration is configured for return pickups.", "shipping_unconfigured")
  if (order.fulfillmentStatus !== "delivered") throw conflict("Returns are collected only after delivery.", "not_delivered")
  if (!order.returnRequest || order.returnRequest.status !== "approved") throw conflict("Approve the return request first.", "return_not_approved")
  const warehouse = await dispatchWarehouse(order._id)
  const settings = await db.settings().findOne({ _id: "store" })
  if (!warehouse) throw badRequest("Add a warehouse address before booking return pickups.", "no_warehouse")
  const phone = (settings?.seller?.phone ?? "").replace(/\D/g, "").slice(-10)
  if (!phone) throw badRequest("Add the seller phone number in Settings; couriers require one for returns.", "no_seller_phone")

  const lines = order.returnRequest.items
  const outbound = await db.shipments().findOne({ orderId: order._id, isReturn: false, status: "delivered" })
  const now = new Date()
  const shipment: ShipmentDoc = {
    _id: newId("ship"),
    orderId: order._id,
    displayId: order.displayId,
    provider: "shiprocket",
    carrier: "",
    awb: "",
    status: "pending",
    items: lines,
    parcel: await parcelFor(order, order.items.filter((i) => lines.some((l) => l.itemId === i._id))),
    trackingEvents: [],
    isReturn: true,
    ...(outbound ? { returnOf: outbound._id } : {}),
    active: true,
    customer: {
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      phone: order.shippingAddress.phone,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
    },
    itemsCount: lines.reduce((s, l) => s + l.quantity, 0),
    createdAt: now,
    updatedAt: now,
  }
  try {
    await db.shipments().insertOne(shipment)
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("This order already has a live return pickup.", "shipment_exists")
    throw e
  }
  try {
    const items = shipmentItems(order, lines)
    const previousReturns = await db.shipments().countDocuments({ orderId: order._id, isReturn: true, _id: { $ne: shipment._id } })
    const created = await shiprocketCreateReturn({
      orderRef: previousReturns ? `R${order.displayId}-${previousReturns + 1}` : `R${order.displayId}`,
      orderDate: now,
      customer: customerParty(order),
      warehouse: {
        name: warehouse.name,
        address: warehouse.address,
        city: warehouse.city,
        state: warehouse.state,
        pincode: warehouse.pincode,
        country: "India",
        email: settings?.seller?.email ?? settings?.supportEmail ?? order.email,
        phone,
      },
      items,
      paymentMethod: "Prepaid",
      subTotal: items.reduce((s, i) => s + i.sellingPrice * i.units, 0),
      parcel: shipment.parcel,
    })
    await db.shipments().updateOne({ _id: shipment._id }, { $set: { ...created, status: "ready_to_ship", updatedAt: new Date() } })
    return { ...shipment, ...created, status: "ready_to_ship" }
  } catch (e) {
    if (!(e instanceof ProviderError && e.uncertain)) await db.shipments().deleteOne({ _id: shipment._id })
    throw asCourierError(e)
  }
}

/**
 * Records a parcel booked somewhere else (another courier's portal, a local
 * courier): the AWB and carrier are what the admin typed, never generated.
 */
export async function recordManualShipment(order: OrderDoc, input: { carrier: string; awb: string; trackingUrl?: string }) {
  if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
  if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") throw conflict("Online orders ship only once payment is verified.", "not_paid")
  const now = new Date()
  const shipment: ShipmentDoc = {
    _id: newId("ship"),
    orderId: order._id,
    displayId: order.displayId,
    provider: "manual",
    carrier: input.carrier,
    awb: input.awb,
    status: "shipment_created",
    ...(input.trackingUrl ? { trackingUrl: input.trackingUrl } : {}),
    items: order.items.map((i) => ({ itemId: i._id, quantity: i.quantity })),
    parcel: await parcelFor(order),
    trackingEvents: [{ timestamp: now, status: "Shipment recorded", internalStatus: "shipment_created", location: "", note: `Booked with ${input.carrier}` }],
    isReturn: false,
    active: true,
    customer: {
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      phone: order.shippingAddress.phone,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
    },
    itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
    createdAt: now,
    updatedAt: now,
  }
  try {
    await db.shipments().insertOne(shipment)
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("This order already has a live shipment, or that AWB is already used.", "shipment_exists")
    throw e
  }
  await syncOrder(shipment)
  return shipment
}

/** Status updates for a hand-recorded shipment, as reported by its courier; each is stamped as admin-entered. */
export async function updateManualShipment(id: string, status: ShipmentStatus, note: string) {
  const s = await loadLive(id)
  if (s.provider !== "manual") throw conflict("This shipment's status comes from the courier; refresh tracking instead.", "courier_managed")
  if (!shouldAdvance(s.status, status)) throw badRequest(`Can't go from ${s.status} to ${status}`, "invalid_transition")
  const now = new Date()
  const set: Partial<ShipmentDoc> = { status, updatedAt: now, ...(status === "delivered" ? { deliveredAt: now } : {}), ...(status === "cancelled" ? { active: false } : {}) }
  const event = { timestamp: now, status: `Updated by admin: ${status.replace(/_/g, " ")}`, internalStatus: status, location: "", note }
  await db.shipments().updateOne({ _id: s._id }, { $set: set, $push: { trackingEvents: event } })
  const next = { ...s, ...set, trackingEvents: [...s.trackingEvents, event] } as ShipmentDoc
  await syncOrder(next)
  return next
}
