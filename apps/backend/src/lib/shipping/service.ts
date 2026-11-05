import { env } from "../../env.js"
import { db, type FulfilmentDoc, type OrderDoc, type ReturnDoc, type ShipmentDoc, type ShipmentStatus, type WarehouseDoc } from "../../db/schema.js"
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
  shiprocketManifest,
  shiprocketNdrAction,
  shiprocketSchedulePickup,
  shiprocketServiceability,
  shiprocketTrack,
  type CourierQuote,
  type ShiprocketParty,
  type TrackingScan,
} from "./shiprocket.js"
import { fulfillmentFor, mapDelhiveryStatus, mapShiprocketStatus, shouldAdvance } from "./status.js"
import {
  delhiveryCancel,
  delhiveryCreateShipment,
  delhiveryLabel,
  delhiveryMode,
  delhiveryPickupRequest,
  delhiveryReattempt,
  delhiveryServiceability,
  delhiveryTrack,
  delhiveryTrackingOf,
  isDelhiveryConfigured,
  type DelhiveryShipmentData,
} from "./delhivery.js"
import { recordTransition, SYSTEM } from "../state/machines.js"
import { moveReturnIfAllowed } from "../returns/returns.js"
import { announce, notifyCustomer } from "../notify/index.js"
import { postDeliveredSales } from "../marketplace/ledger.js"

/*
 * Shipments end to end. Every AWB, label, pickup and tracking scan comes from
 * the courier integration the parcel was booked with: Shiprocket (an
 * aggregator over many couriers) or Delhivery directly. With neither set up,
 * a shipment can only be recorded by hand with details from wherever it was
 * booked; nothing is invented.
 */

export type Carrier = "shiprocket" | "delhivery"
export const CARRIERS: Carrier[] = ["shiprocket", "delhivery"]
const CARRIER_NAMES: Record<Carrier, string> = { shiprocket: "Shiprocket", delhivery: "Delhivery" }
const isCarrier = (p: string): p is Carrier => (CARRIERS as string[]).includes(p)

/** Courier integrations with credentials set, the default one first. */
export function configuredCarriers(): Carrier[] {
  const on = CARRIERS.filter((c) => (c === "shiprocket" ? isShiprocketConfigured() : isDelhiveryConfigured()))
  return on.sort((a, b) => Number(b === env.SHIPPING_PROVIDER) - Number(a === env.SHIPPING_PROVIDER))
}
export const shippingConfigured = () => configuredCarriers().length > 0

/** The integration to book with: the one asked for (which must be set up), else the default. */
function carrierFor(wanted?: Carrier | null): Carrier {
  const on = configuredCarriers()
  if (wanted) {
    if (!on.includes(wanted)) throw badRequest(`${CARRIER_NAMES[wanted]} isn't set up on this store.`, "carrier_unconfigured")
    return wanted
  }
  if (!on[0]) throw badRequest("No courier integration is configured. Record the shipment by hand instead.", "shipping_unconfigured")
  return on[0]
}

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
    const courier = { type: "courier" as const, id: shipment.carrier || shipment.provider }
    const returnId = shipment.returnId ?? (await db.returns().findOne({ orderId: shipment.orderId, shipmentId: shipment._id }))?._id
    if (!returnId) return
    if (shipment.status === "delivered") await moveReturnIfAllowed(returnId, "received", courier, `Return parcel ${shipment.awb} delivered to the warehouse`)
    else if (shipment.status === "picked_up" || shipment.status === "in_transit" || shipment.status === "out_for_delivery") await moveReturnIfAllowed(returnId, "in_transit", courier, `Return parcel ${shipment.awb}: ${shipment.status.replace(/_/g, " ")}`)
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
  const overall = shipment.fulfilmentId ? await splitFulfillment(order._id) : fulfillment
  if (overall && overall !== order.fulfillmentStatus) set.fulfillmentStatus = overall
  // Delivered completes the order only once it is also paid (a COD order waits for its cash).
  if (overall === "delivered" && order.paymentStatus === "paid" && order.status === "pending") set.status = "completed"
  await db.orders().updateOne({ _id: order._id }, { $set: set })
  await announce("shipment status", () => announceShipment(order, shipment))
  if (shipment.status === "delivered") await announce("seller sales", () => postDeliveredSales(shipment))
  if (set.status === "completed") await recordTransition({ machine: "order", entityId: order._id, orderId: order._id, from: "pending", to: "completed", actor: SYSTEM, reason: "Delivered and paid" })
}

/** The customer message for an outbound parcel's status, once per parcel and status (repeat scans send nothing). */
async function announceShipment(order: OrderDoc, s: ShipmentDoc) {
  const base = { carrier: s.carrier, awb: s.awb }
  if (s.status === "picked_up" || s.status === "in_transit") return notifyCustomer(order, "order_shipped", `ship:${s._id}:shipped`, base)
  if (s.status === "delivered") return notifyCustomer(order, "delivered", `ship:${s._id}:delivered`, base)
  const round = s.trackingEvents.filter((e) => e.internalStatus === s.status).length
  if (s.status === "out_for_delivery") {
    const task = s.provider === "own_fleet" ? await db.deliveryTasks().findOne({ shipmentId: s._id }) : null
    const rider = task?.riderId ? await db.riders().findOne({ _id: task.riderId }, { projection: { name: 1 } }) : null
    return notifyCustomer(order, "out_for_delivery", `ship:${s._id}:ofd:${round}`, { ...base, riderFirstName: rider?.name.split(" ")[0], cashDue: task?.cod && task.cod.collected === undefined ? task.cod.due : null })
  }
  if (s.status === "delivery_failed") return notifyCustomer(order, "delivery_failed", `ship:${s._id}:failed:${round}`, { ...base, reason: s.ndr?.reason?.toLowerCase() })
}

/**
 * An order shipped from several warehouses: delivered only when every live
 * fulfilment's parcel is delivered, returned when every parcel came back,
 * shipped once any has left.
 */
async function splitFulfillment(orderId: string): Promise<OrderDoc["fulfillmentStatus"] | null> {
  const fulfilments = await db.fulfilments().find({ orderId, active: true }).toArray()
  const parcels = await db.shipments().find({ orderId, isReturn: false, active: true, fulfilmentId: { $in: fulfilments.map((f) => f._id) } }).toArray()
  const states = fulfilments.map((f) => {
    const p = parcels.find((x) => x.fulfilmentId === f._id)
    return p ? fulfillmentFor(p.status) : null
  })
  if (states.length && states.every((x) => x === "delivered")) return "delivered"
  // Every parcel came back undelivered (return to origin).
  if (states.length && states.every((x) => x === "returned")) return "returned"
  if (states.some((x) => x === "shipped" || x === "delivered")) return "shipped"
  return null
}

export type Quote = CourierQuote & { provider: Carrier }

/**
 * Couriers that deliver to a pincode, with live rates, from every configured
 * integration, cheapest first. One integration failing leaves its quotes out
 * (listed in `unavailable`); all failing is an error. `configured: false`
 * when no courier API is set up.
 */
export async function serviceability(pincode: string, opts: { cod: boolean; weightKg?: number; codAmount?: number }) {
  const carriers = configuredCarriers()
  if (!carriers.length || !env.SHIPPING_ORIGIN_PINCODE) return { configured: false as const }
  const params = { pickupPincode: env.SHIPPING_ORIGIN_PINCODE, deliveryPincode: pincode, weightKg: opts.weightKg ?? env.SHIPPING_DEFAULT_WEIGHT_KG, cod: opts.cod, codAmount: opts.codAmount }
  const results = await Promise.allSettled(carriers.map((c) => (c === "shiprocket" ? shiprocketServiceability(params) : delhiveryServiceability(params))))
  const couriers: Quote[] = []
  const unavailable: { provider: Carrier; message: string }[] = []
  let recommended: { provider: Carrier; courierId: number } | null = null
  results.forEach((r, i) => {
    const provider = carriers[i]!
    if (r.status === "rejected") {
      log.warn("shipping.quote_failed", { provider, pincode, error: (r.reason as Error).message })
      unavailable.push({ provider, message: (r.reason as Error).message })
      return
    }
    couriers.push(...r.value.couriers.map((c) => ({ ...c, provider })))
    // The default integration's own recommendation leads.
    if (!recommended && r.value.recommendedId != null) recommended = { provider, courierId: r.value.recommendedId }
  })
  if (unavailable.length === carriers.length) throw badRequest(`Couriers could not be reached: ${unavailable.map((u) => u.message).join("; ")}`, "courier_error")
  couriers.sort((a, b) => a.rate - b.rate)
  const rec = recommended as { provider: Carrier; courierId: number } | null
  return {
    configured: true as const,
    serviceable: couriers.length > 0,
    couriers,
    recommended: rec,
    /** Kept for older clients: the recommended courier when it is the default integration's. */
    recommendedId: rec && rec.provider === carriers[0] ? rec.courierId : null,
    unavailable,
  }
}

/**
 * Books the order with the courier provider: one live outbound parcel per
 * order (a unique index refuses a second). Online orders must be paid first.
 */
export async function createShipment(order: OrderDoc, opts: { parcel?: Partial<ShipmentDoc["parcel"]>; carrier?: Carrier; courierId?: number } = {}): Promise<ShipmentDoc> {
  const carrier = carrierFor(opts.carrier)
  if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
  if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") throw conflict("Online orders ship only once payment is verified.", "not_paid")
  if (order.fulfillmentStatus !== "unfulfilled") throw conflict("This order has already shipped.", "already_shipped")
  if (await db.fulfilments().countDocuments({ orderId: order._id, active: true })) {
    throw conflict("This order is being fulfilled by a warehouse; its parcel is booked at the packing station.", "warehouse_fulfilment")
  }
  const from = await dispatchWarehouse(order._id)
  const warehouse = from ? await db.warehouses().findOne({ code: from.code }) : null
  return book(order, order.items.map((i) => ({ itemId: i._id, quantity: i.quantity })), {
    carrier,
    courierId: opts.courierId,
    warehouse,
    parcel: { ...(await parcelFor(order)), ...opts.parcel },
    orderRef: async (n) => (n ? `${order.displayId}-${n + 1}` : String(order.displayId)),
  })
}

/**
 * Books one warehouse fulfilment with the courier, from that warehouse's
 * pickup address, with the weight and size measured at the packing station.
 * The order is paid (or COD) by construction: fulfilments exist only for placed orders.
 */
export async function createFulfilmentShipment(f: FulfilmentDoc, opts: { carrier?: Carrier; courierId?: number } = {}): Promise<ShipmentDoc> {
  const carrier = carrierFor(opts.carrier)
  if (!f.package) throw conflict("Pack the parcel before booking it.", "not_packed")
  const order = await db.orders().findOne({ _id: f.orderId })
  if (!order) throw notFound("Order")
  if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
  if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") throw conflict("Online orders ship only once payment is verified.", "not_paid")
  const warehouse = await db.warehouses().findOne({ _id: f.warehouseId })
  const { weightKg, lengthCm, breadthCm, heightCm } = f.package
  return book(order, mergeLines(f), {
    carrier,
    courierId: opts.courierId,
    warehouse,
    parcel: { weightKg, lengthCm, breadthCm, heightCm },
    fulfilmentId: f._id,
    orderRef: async (n) => (n ? `${f.code}-${n + 1}` : f.code),
  })
}

/** A fulfilment may carry one order line in two parts; the courier gets one row per order line. */
const mergeLines = (f: FulfilmentDoc) => {
  const m = new Map<string, number>()
  for (const l of f.lines) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.quantity)
  return [...m].map(([itemId, quantity]) => ({ itemId, quantity }))
}

async function book(
  order: OrderDoc,
  lines: { itemId: string; quantity: number }[],
  o: {
    carrier: Carrier
    courierId?: number
    warehouse: WarehouseDoc | null
    parcel: ShipmentDoc["parcel"]
    fulfilmentId?: string
    orderRef: (previous: number) => Promise<string>
  }
): Promise<ShipmentDoc> {
  const now = new Date()
  const pickupLocation = pickupLocationOf(o.carrier, o.warehouse)
  const shipment: ShipmentDoc = {
    _id: newId("ship"),
    orderId: order._id,
    displayId: order.displayId,
    provider: o.carrier,
    ...(pickupLocation ? { pickupLocation } : {}),
    carrier: "",
    awb: "",
    status: "pending",
    items: lines,
    parcel: o.parcel,
    trackingEvents: [],
    isReturn: false,
    ...(o.fulfilmentId ? { fulfilmentId: o.fulfilmentId } : {}),
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
    const previous = await db.shipments().countDocuments({ orderId: order._id, isReturn: false, _id: { $ne: shipment._id }, ...(o.fulfilmentId ? { fulfilmentId: o.fulfilmentId } : { fulfilmentId: { $exists: false } }) })
    const input = {
      orderRef: await o.orderRef(previous),
      ...(pickupLocation ? { pickupLocation } : {}),
      orderDate: order.createdAt,
      customer: customerParty(order),
      items: shipmentItems(order, lines),
      paymentMethod: order.paymentMethod === "cod" ? ("COD" as const) : ("Prepaid" as const),
      subTotal: order.totals.total,
      parcel: shipment.parcel,
    }
    let set: Partial<ShipmentDoc>
    if (o.carrier === "delhivery") {
      // Delhivery assigns the waybill as it creates the shipment.
      const mode = delhiveryMode(o.courierId)
      const created = await delhiveryCreateShipment({ ...input, mode: mode.mode, kind: "forward", seller: await sellerOf(o.warehouse) })
      set = {
        providerOrderId: input.orderRef,
        providerShipmentId: created.awb,
        awb: created.awb,
        carrier: `Delhivery ${mode.mode}`,
        courierId: o.courierId === 2 ? 2 : 1,
        status: "shipment_created",
        trackingUrl: `https://www.delhivery.com/track-v2/package/${encodeURIComponent(created.awb)}`,
        updatedAt: new Date(),
      }
    } else {
      const created = await shiprocketCreateOrder(input)
      set = { ...created, status: "ready_to_ship", updatedAt: new Date() }
    }
    Object.assign(shipment, set)
    await db.shipments().updateOne({ _id: shipment._id }, { $set: set })
    log.info("shipment.created", { shipmentId: shipment._id, orderId: order._id, provider: o.carrier, providerShipmentId: shipment.providerShipmentId })
    if (shipment.awb) await syncOrder(shipment)
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

/** The courier's name for the building a parcel leaves from; each integration has its own. */
function pickupLocationOf(carrier: Carrier, w: WarehouseDoc | null) {
  if (carrier === "delhivery") return w?.delhiveryPickupLocation || env.DELHIVERY_PICKUP_LOCATION
  return w?.shiprocketPickupLocation || undefined
}

/** Seller of record for the courier's paperwork: a marketplace seller's warehouse, else the store. */
async function sellerOf(w: WarehouseDoc | null) {
  if (w?.sellerId) {
    const seller = await db.sellers().findOne({ _id: w.sellerId })
    if (seller) return { name: seller.legalName || seller.displayName, address: [w.address, w.city, w.state, w.pincode].filter(Boolean).join(", "), ...(seller.gstin ? { gstin: seller.gstin } : {}) }
  }
  const settings = await db.settings().findOne({ _id: "store" })
  const name = settings?.seller?.legalName ?? settings?.storeName
  if (!name) return undefined
  return { name, address: settings?.seller?.address ?? "", ...(w?.gstin || settings?.seller?.gstin ? { gstin: (w?.gstin || settings?.seller?.gstin)! } : {}) }
}

const isCourier = (s: ShipmentDoc) => isCarrier(s.provider)

/** Assigns a courier (the cheapest-recommended one when none is given) and records the AWB. */
export async function assignCourier(id: string, courierId?: number) {
  const s = await loadLive(id)
  if (s.provider === "delhivery") throw conflict("Delhivery assigned the AWB when the parcel was booked.", "awb_assigned")
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
    if (!isCourier(s)) throw conflict("This shipment wasn't booked through a courier integration.", "manual_shipment")
    const { labelUrl } = s.provider === "delhivery" ? await delhiveryLabel(s.awb) : await shiprocketLabel(s.providerShipmentId)
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
  if (!isCourier(s)) throw conflict("This shipment wasn't booked through a courier integration.", "manual_shipment")
  try {
    const r =
      s.provider === "delhivery"
        ? await delhiveryPickupRequest({ location: s.pickupLocation || env.DELHIVERY_PICKUP_LOCATION!, date: new Date(), count: 1 })
        : await shiprocketSchedulePickup(s.providerShipmentId)
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

/**
 * Requests courier collection for a batch of booked parcels (a warehouse
 * manifest). Shiprocket takes one request per parcel; Delhivery one per
 * building and day, sized to the number of parcels.
 */
export async function schedulePickups(shipmentIds: string[]) {
  const parcels = await db.shipments().find({ _id: { $in: shipmentIds }, active: true, pickup: { $exists: false }, awb: { $gt: "" } }).toArray()
  for (const s of parcels.filter((p) => p.provider === "shiprocket")) await schedulePickup(s._id)
  const byLocation = new Map<string, ShipmentDoc[]>()
  for (const s of parcels.filter((p) => p.provider === "delhivery")) {
    const key = s.pickupLocation || env.DELHIVERY_PICKUP_LOCATION || ""
    byLocation.set(key, [...(byLocation.get(key) ?? []), s])
  }
  for (const [location, group] of byLocation) {
    try {
      const r = await delhiveryPickupRequest({ location, date: new Date(), count: group.length })
      const pickup = { requestedAt: new Date(), ...(r.scheduledFor ? { scheduledFor: r.scheduledFor } : {}), ...(r.token ? { token: r.token } : {}) }
      for (const s of group) {
        const status: ShipmentStatus = shouldAdvance(s.status, "pickup_scheduled") ? "pickup_scheduled" : s.status
        await db.shipments().updateOne({ _id: s._id }, { $set: { pickup, status, updatedAt: new Date() } })
        await syncOrder({ ...s, pickup, status })
      }
    } catch (e) {
      throw asCourierError(e)
    }
  }
}

/** Cancels with the courier (before pickup) and frees the order to be shipped again. */
export async function cancelShipment(id: string) {
  const s = await loadLive(id)
  if (["picked_up", "in_transit", "out_for_delivery", "delivered", "rto_initiated", "rto_in_transit", "rto_delivered"].includes(s.status)) {
    throw conflict("The courier already has this parcel; it can't be cancelled now.", "already_picked_up")
  }
  const f = s.fulfilmentId ? await db.fulfilments().findOne({ _id: s.fulfilmentId }) : null
  if (f && ["manifested", "handed_over", "dispatched"].includes(f.status)) {
    throw conflict("This parcel is on a manifest. Take it off the manifest at the warehouse first.", "on_manifest")
  }
  if (s.provider === "own_fleet") {
    // Only while no rider has it in hand.
    const task = await db.deliveryTasks().findOne({ shipmentId: s._id })
    if (task) {
      const done = await db
        .deliveryTasks()
        .updateOne({ _id: task._id, status: { $in: ["unassigned", "offered", "assigned"] } }, { $set: { status: "cancelled", offer: null, updatedAt: new Date() } })
      if (!done.modifiedCount) throw conflict("The rider already has this parcel; it can't be cancelled now.", "already_picked_up")
      await recordTransition({ machine: "delivery", entityId: task._id, orderId: task.orderId, from: task.status, to: "cancelled", actor: SYSTEM, reason: "Booking cancelled" })
    }
  }
  try {
    if (s.provider === "shiprocket" && s.providerOrderId) await shiprocketCancel(s.providerOrderId)
    if (s.provider === "delhivery" && s.awb) await delhiveryCancel(s.awb)
  } catch (e) {
    throw asCourierError(e)
  }
  const event = { timestamp: new Date(), status: "Cancelled", internalStatus: "cancelled" as const, location: "", note: "Cancelled from the admin" }
  await db.shipments().updateOne({ _id: s._id }, { $set: { status: "cancelled", active: false, updatedAt: new Date() }, $push: { trackingEvents: event } })
  const next = { ...s, status: "cancelled" as const, active: false }
  if (f && ["label_generated", "ready_to_dispatch"].includes(f.status)) {
    // The packed parcel goes back on the shelf, to be booked again.
    const back = await db
      .fulfilments()
      .updateOne({ _id: f._id, status: f.status }, { $set: { status: "packed", updatedAt: new Date() }, $unset: { shipmentId: "", awb: "", carrier: "" } })
    if (back.modifiedCount) await recordTransition({ machine: "fulfilment", entityId: f._id, orderId: f.orderId, from: f.status, to: "packed", actor: SYSTEM, reason: "Courier booking cancelled" })
  }
  await syncOrder(next)
  return next
}

/** Copies a shipment written elsewhere (own fleet booking) onto its order. */
export const syncOrderFromShipment = (s: ShipmentDoc) => syncOrder(s)

/**
 * A status from our own fleet (a rider's scan or delivery). Same rules as a
 * courier scan: forward only, recorded as a tracking event, copied to the order.
 */
export async function applyOwnFleetStatus(shipmentId: string, status: ShipmentStatus, label: string, note = "", location = "") {
  const s = await db.shipments().findOne({ _id: shipmentId })
  if (!s || s.provider !== "own_fleet") throw notFound("Shipment")
  if (!shouldAdvance(s.status, status)) return s
  const now = new Date()
  const event = { timestamp: now, status: label, internalStatus: status, location, note }
  const set: Partial<ShipmentDoc> = { status, updatedAt: now, lastSyncedAt: now, ...(status === "delivered" ? { deliveredAt: now } : {}) }
  const res = await db.shipments().updateOne({ _id: s._id, status: s.status }, { $set: set, $push: { trackingEvents: event } })
  if (!res.modifiedCount) return (await db.shipments().findOne({ _id: s._id }))!
  const next = { ...s, ...set, trackingEvents: [...s.trackingEvents, event] } as ShipmentDoc
  await syncOrder(next)
  log.info("shipment.status", { shipmentId: s._id, awb: s.awb, from: s.status, to: status })
  return next
}

/** Generates the courier's manifest document for a set of booked parcels. Null when the courier returns none. */
export async function courierManifest(shipmentIds: string[]) {
  const parcels = await db.shipments().find({ _id: { $in: shipmentIds }, provider: "shiprocket", providerShipmentId: { $type: "string" } }).toArray()
  if (!parcels.length || !shippingConfigured()) return null
  try {
    return (await shiprocketManifest(parcels.map((p) => p.providerShipmentId!))).manifestUrl
  } catch (e) {
    throw asCourierError(e)
  }
}

/** Answers a failed delivery: ask the courier to try again, or send it back (RTO). */
export async function ndrAction(id: string, action: "reattempt" | "return", comment: string) {
  const s = await loadLive(id)
  if (s.status !== "delivery_failed") throw conflict("Only a failed delivery can be re-attempted or returned.", "not_failed")
  try {
    if (s.provider === "shiprocket") await shiprocketNdrAction(s.awb, action, comment)
    if (s.provider === "delhivery") {
      // Delhivery's NDR API takes re-attempts; returning to origin is asked for in its panel, and its scans then show the RTO here.
      if (action === "return") throw conflict("Delhivery takes return-to-origin requests in Delhivery One (NDR). Its tracking will show the return here.", "courier_unsupported")
      await delhiveryReattempt(s.awb)
    }
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
  t: { statusId?: number | string | null; statusLabel?: string | null; statusCode?: string | null; scans: TrackingScan[]; edd?: Date | null; deliveredAt?: Date | null; trackingUrl?: string | null }
) {
  const map = (id: number | string | null | undefined, label: string | null | undefined, code?: string | null) =>
    s.provider === "delhivery" ? mapDelhiveryStatus(id, label, code) : mapShiprocketStatus(id, label)
  const seen = new Set(s.trackingEvents.map((e) => `${e.timestamp.toISOString()}|${e.status}|${e.location}`))
  const fresh = t.scans
    .map((scan) => {
      const timestamp = new Date(scan.date.includes("T") ? scan.date : scan.date.replace(" ", "T") + "+05:30")
      if (Number.isNaN(timestamp.getTime())) return null
      const internal = map(scan.statusId, scan.status, scan.code)
      return { timestamp, status: scan.status, ...(internal ? { internalStatus: internal } : {}), location: scan.location ?? "", note: scan.activity ?? "" }
    })
    .filter((e): e is NonNullable<typeof e> => !!e && !seen.has(`${e.timestamp.toISOString()}|${e.status}|${e.location}`))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const mapped = map(t.statusId, t.statusLabel, t.statusCode) ?? fresh.at(-1)?.internalStatus ?? null
  const status = mapped && shouldAdvance(s.status, mapped) ? mapped : s.status
  const set: Partial<ShipmentDoc> = { status, lastSyncedAt: new Date(), updatedAt: new Date() }
  if (t.statusLabel) set.providerStatus = t.statusLabel
  if (t.edd) set.estimatedDelivery = t.edd
  if (t.trackingUrl) set.trackingUrl = t.trackingUrl
  // Stamped once: a late or repeated scan after delivery mustn't move the delivery time.
  if (status === "delivered" && !s.deliveredAt) set.deliveredAt = t.deliveredAt ?? fresh.at(-1)?.timestamp ?? new Date()
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
  if (!s || !s.awb || !isCourier(s)) throw conflict("This shipment has no courier tracking yet.", "no_tracking")
  try {
    return await applyTracking(s, await trackOf(s))
  } catch (e) {
    throw asCourierError(e)
  }
}

const trackOf = (s: ShipmentDoc) => (s.provider === "delhivery" ? delhiveryTrack(s.awb) : shiprocketTrack(s.awb))

/** Background fallback for missed webhooks: refreshes live parcels not heard from in 30 minutes. */
export async function syncStaleShipments(limit = 20): Promise<number> {
  const carriers = configuredCarriers()
  if (!carriers.length) return 0
  const cutoff = new Date(Date.now() - 30 * 60_000)
  const stale = await db
    .shipments()
    .find(
      { provider: { $in: carriers }, awb: { $gt: "" }, status: { $nin: TERMINAL }, $or: [{ lastSyncedAt: { $exists: false } }, { lastSyncedAt: { $lt: cutoff } }] },
      { limit, sort: { lastSyncedAt: 1 } }
    )
    .toArray()
  let n = 0
  for (const s of stale) {
    try {
      await applyTracking(s, await trackOf(s))
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

/** Delhivery's scan push: one shipment's latest status (and sometimes its scans). */
export type DelhiveryWebhook = { Shipment?: DelhiveryShipmentData & { Status?: DelhiveryShipmentData["Status"] } }

export async function applyDelhiveryWebhook(body: DelhiveryWebhook): Promise<"processed" | "ignored"> {
  const d = body.Shipment
  const awb = d?.AWB != null ? String(d.AWB) : ""
  if (!awb) return "ignored"
  const s = await db.shipments().findOne({ awb, provider: "delhivery" })
  if (!s) return "ignored"
  const t = delhiveryTrackingOf(d!)
  // A push without scans still carries the current status: record it as one.
  if (!t.scans.length && d!.Status) {
    t.scans.push({ date: d!.Status.StatusDateTime ?? new Date().toISOString(), status: d!.Status.Status, statusId: d!.Status.StatusType, code: d!.Status.StatusCode ?? d!.NSLCode, activity: d!.Status.Instructions ?? "", location: d!.Status.StatusLocation ?? "" })
  }
  await applyTracking(s, t)
  return "processed"
}

/**
 * Reverse pickup for an approved return: the courier collects from the
 * customer and brings it to the dispatching warehouse.
 */
export async function createReturnShipment(order: OrderDoc, ret: ReturnDoc, opts: { carrier?: Carrier } = {}): Promise<ShipmentDoc> {
  if (!shippingConfigured()) throw badRequest("No courier integration is configured for return pickups.", "shipping_unconfigured")
  if (order.fulfillmentStatus !== "delivered" && order.fulfillmentStatus !== "returned") throw conflict("Returns are collected only after delivery.", "not_delivered")
  if (ret.status !== "approved") throw conflict("Approve the return request first.", "return_not_approved")
  const warehouse = await dispatchWarehouse(order._id)
  const settings = await db.settings().findOne({ _id: "store" })
  if (!warehouse) throw badRequest("Add a warehouse address before booking return pickups.", "no_warehouse")
  const phone = (settings?.seller?.phone ?? "").replace(/\D/g, "").slice(-10)
  if (!phone) throw badRequest("Add the seller phone number in Settings; couriers require one for returns.", "no_seller_phone")

  const lines = ret.items.map((l) => ({ itemId: l.itemId, quantity: l.quantity }))
  const outbound = await db.shipments().findOne({ orderId: order._id, isReturn: false, status: "delivered" })
  // The courier that delivered it collects it, when that integration is still set up.
  const carrier = carrierFor(opts.carrier ?? (outbound && isCarrier(outbound.provider) && configuredCarriers().includes(outbound.provider) ? outbound.provider : null))
  const pickupLocation = pickupLocationOf(carrier, await db.warehouses().findOne({ code: warehouse.code }))
  const now = new Date()
  const shipment: ShipmentDoc = {
    _id: newId("ship"),
    orderId: order._id,
    displayId: order.displayId,
    provider: carrier,
    ...(pickupLocation ? { pickupLocation } : {}),
    carrier: "",
    awb: "",
    status: "pending",
    items: lines,
    parcel: await parcelFor(order, order.items.filter((i) => lines.some((l) => l.itemId === i._id))),
    trackingEvents: [],
    isReturn: true,
    returnId: ret._id,
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
    const previousReturns = await db.shipments().countDocuments({ orderId: order._id, isReturn: true, returnId: ret._id, _id: { $ne: shipment._id } })
    const input = {
      // The return's own code, so a second return on the same order is a new courier order.
      orderRef: previousReturns ? `${ret.code}-${previousReturns + 1}` : ret.code,
      orderDate: now,
      customer: customerParty(order),
      items,
      paymentMethod: "Prepaid" as const,
      subTotal: items.reduce((s, i) => s + i.sellingPrice * i.units, 0),
      parcel: shipment.parcel,
    }
    const to = {
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      pincode: warehouse.pincode,
      country: "India",
      email: settings?.seller?.email ?? settings?.supportEmail ?? order.email,
      phone,
    }
    let set: Partial<ShipmentDoc>
    if (carrier === "delhivery") {
      // A reverse pickup: collected from the customer, delivered to the registered warehouse.
      const created = await delhiveryCreateShipment({ ...input, ...(pickupLocation ? { pickupLocation } : {}), mode: "Surface", kind: "reverse", returnTo: to })
      set = { providerOrderId: input.orderRef, providerShipmentId: created.awb, awb: created.awb, carrier: "Delhivery Surface", courierId: 1, status: "shipment_created", updatedAt: new Date() }
    } else {
      const created = await shiprocketCreateReturn({ ...input, warehouse: to })
      set = { ...created, status: "ready_to_ship", updatedAt: new Date() }
    }
    await db.shipments().updateOne({ _id: shipment._id }, { $set: set })
    return { ...shipment, ...set }
  } catch (e) {
    if (!(e instanceof ProviderError && e.uncertain)) await db.shipments().deleteOne({ _id: shipment._id })
    throw asCourierError(e)
  }
}

/**
 * Records a parcel booked somewhere else (another courier's portal, a local
 * courier): the AWB and carrier are what the admin typed, never generated.
 */
export async function recordManualShipment(order: OrderDoc, input: { carrier: string; awb: string; trackingUrl?: string }, f?: FulfilmentDoc) {
  if (order.status === "canceled") throw conflict("This order is canceled", "order_canceled")
  if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") throw conflict("Online orders ship only once payment is verified.", "not_paid")
  if (!f && (await db.fulfilments().countDocuments({ orderId: order._id, active: true }))) {
    throw conflict("This order is being fulfilled by a warehouse; record its AWB at the packing station.", "warehouse_fulfilment")
  }
  const lines = f ? mergeLines(f) : order.items.map((i) => ({ itemId: i._id, quantity: i.quantity }))
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
    items: lines,
    parcel: f?.package ? { weightKg: f.package.weightKg, lengthCm: f.package.lengthCm, breadthCm: f.package.breadthCm, heightCm: f.package.heightCm } : await parcelFor(order),
    trackingEvents: [{ timestamp: now, status: "Shipment recorded", internalStatus: "shipment_created", location: "", note: `Booked with ${input.carrier}` }],
    isReturn: false,
    ...(f ? { fulfilmentId: f._id } : {}),
    active: true,
    customer: {
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      phone: order.shippingAddress.phone,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
    },
    itemsCount: lines.reduce((s, i) => s + i.quantity, 0),
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
