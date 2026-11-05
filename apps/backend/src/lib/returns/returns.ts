import type { ClientSession } from "mongodb"
import { db, migrateEmbeddedReturns, RETURN_REASONS, type ActorRef, type OrderDoc, type ProductDoc, type ReturnDoc, type ReturnReason, type ReturnStatus } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { assertTransition, recordTransition, sourcesOf } from "../state/machines.js"

/*
 * Returns and exchanges. A ReturnDoc is the record of one return; the
 * order's `returnRequest` mirrors the latest one for the screens and rules
 * that read the order. Every status change is a guarded state-machine move
 * with history, and the customer gets an in-app notice of the steps that
 * matter to them.
 */

export const OPEN: ReturnStatus[] = ["requested", "approved", "pickup_scheduled", "in_transit", "received", "inspected", "refund_pending"]
/** Returns that still count against what can be returned (everything but cancelled and rejected). */
const COUNTED: ReturnStatus[] = [...OPEN, "refunded", "exchanged"]

export const REASON_TEXT: Record<ReturnReason, string> = {
  too_small: "Too small",
  too_large: "Too large",
  not_as_pictured: "Colour or fabric differs from the photos",
  damaged: "Arrived damaged or faulty",
  wrong_item: "Received the wrong item",
  quality: "Quality not as expected",
  changed_mind: "No longer needed",
  other: "Other",
}

/**
 * What the customer paid for `quantity` units of a line: its share of the
 * order total less delivery charges, in proportion to the line's value. A
 * discount is spread across lines the same way. Rounded down, so the shares
 * never add up to more than was paid.
 */
export function paidShare(order: OrderDoc, itemId: string, quantity: number) {
  const item = order.items.find((i) => i._id === itemId)
  if (!item || !order.totals.itemSubtotal) return 0
  const goods = Math.max(0, order.totals.total - order.totals.shippingTotal)
  return Math.floor((item.unitPrice * quantity * goods) / order.totals.itemSubtotal)
}

/** Units of each line already in a return (open or completed). */
async function alreadyReturned(orderId: string, session?: ClientSession) {
  const past = await db.returns().find({ orderId, status: { $in: COUNTED } }, { session }).toArray()
  const used = new Map<string, number>()
  for (const r of past) for (const l of r.items) used.set(l.itemId, (used.get(l.itemId) ?? 0) + l.quantity)
  return used
}

/** Throws unless the order can take a new return now: delivered, not cancelled, inside the window, none open. */
export async function assertReturnable(order: OrderDoc, now = new Date()) {
  await migrateEmbeddedReturns(order._id)
  if (order.status === "canceled") throw badRequest("A canceled order can't be returned.", "not_returnable")
  if (order.fulfillmentStatus !== "delivered") throw badRequest("Returns open once the order has been delivered.", "not_returnable")
  if (order.exchangeOf) throw badRequest("An exchanged item can't be exchanged or returned again. Contact us if there's a problem with it.", "not_returnable")
  if (await db.returns().countDocuments({ orderId: order._id, status: { $in: OPEN } })) throw conflict("A return has already been requested for this order.", "return_exists")
  const region = await db.regions().findOne({ _id: order.regionId })
  const windowDays = region?.policies?.returnWindowDays
  const deliveredAt = order.shipment?.deliveredAt
  if (windowDays !== undefined && deliveredAt && now.getTime() - deliveredAt.getTime() > windowDays * 86_400_000) {
    throw badRequest(`The ${windowDays}-day return window for this order has closed.`, "return_window_closed")
  }
  return { windowDays: windowDays ?? null, closesAt: windowDays !== undefined && deliveredAt ? new Date(deliveredAt.getTime() + windowDays * 86_400_000) : null }
}

/** Other variants of the same product at the same price, in stock: what an item may be exchanged for. */
function exchangeVariants(product: ProductDoc | undefined, item: OrderDoc["items"][number], currency: string) {
  if (!product || product.status !== "published") return []
  return product.variants
    .filter((v) => v._id !== item.variantId && v.prices[currency] === item.unitPrice && (!v.manageInventory || v.allowBackorder || v.stock > 0))
    .map((v) => ({ variantId: v._id, title: v.title, options: v.options }))
}

/** What the customer can return or exchange on this order, line by line. */
export async function returnOptions(order: OrderDoc) {
  const window = await assertReturnable(order)
  const used = await alreadyReturned(order._id)
  const products = await db.products().find({ _id: { $in: order.items.map((i) => i.productId) } }).toArray()
  const items = order.items.map((i) => {
    const remaining = i.quantity - (used.get(i._id) ?? 0)
    return {
      itemId: i._id,
      productTitle: i.productTitle,
      variantTitle: i.variantTitle,
      thumbnail: i.thumbnail ?? null,
      quantity: i.quantity,
      returnable: Math.max(0, remaining),
      refundPerUnit: paidShare(order, i._id, 1),
      exchangeFor: exchangeVariants(products.find((p) => p._id === i.productId), i, order.currency),
    }
  })
  return { ...window, items, reasons: RETURN_REASONS.map((r) => ({ value: r, label: REASON_TEXT[r] })), methods: ["pickup", "self_ship"] as const }
}

export type ReturnInput = {
  type: "return" | "exchange"
  method: "pickup" | "self_ship"
  items: { itemId: string; quantity: number; reason: ReturnReason; note?: string; exchangeVariantId?: string }[]
}

export async function createReturn(order: OrderDoc, input: ReturnInput, actor: ActorRef) {
  await assertReturnable(order)
  if (!input.items.length) throw badRequest("Choose at least one item to return.")
  const used = await alreadyReturned(order._id)
  const products = input.type === "exchange" ? await db.products().find({ _id: { $in: order.items.map((i) => i.productId) } }).toArray() : []
  const seen = new Set<string>()
  const items: ReturnDoc["items"] = []
  for (const l of input.items) {
    const item = order.items.find((i) => i._id === l.itemId)
    if (!item || seen.has(l.itemId)) throw badRequest("That item isn't on this order.")
    seen.add(l.itemId)
    if (l.quantity > item.quantity - (used.get(item._id) ?? 0)) throw badRequest("You can't return more than you bought.")
    if (l.reason === "other" && !l.note?.trim()) throw badRequest("Tell us a little about the reason.")
    let exchange: { exchangeVariantId: string; exchangeVariantTitle: string } | null = null
    if (input.type === "exchange") {
      const options = exchangeVariants(products.find((p) => p._id === item.productId), item, order.currency)
      const pick = options.find((o) => o.variantId === l.exchangeVariantId)
      if (!pick) throw badRequest(`Choose an available size or colour of ${item.productTitle} at the same price to exchange for.`, "exchange_unavailable")
      exchange = { exchangeVariantId: pick.variantId, exchangeVariantTitle: pick.title }
    }
    items.push({ itemId: item._id, variantId: item.variantId, productId: item.productId, productTitle: item.productTitle, variantTitle: item.variantTitle, quantity: l.quantity, reason: l.reason, ...(l.note?.trim() ? { note: l.note.trim() } : {}), ...(exchange ?? {}) })
  }
  const now = new Date()
  const n = (await db.returns().countDocuments({ orderId: order._id })) + 1
  const ret: ReturnDoc = {
    _id: newId("ret"),
    code: `RET-${order.displayId}-${n}`,
    orderId: order._id,
    displayId: order.displayId,
    customerId: order.customerId ?? null,
    type: input.type,
    status: "requested",
    items,
    method: input.method,
    refundableAmount: items.reduce((s, l) => s + paidShare(order, l.itemId, l.quantity), 0),
    currency: order.currency,
    requestedAt: now,
    updatedAt: now,
  }
  try {
    await db.returns().insertOne(ret)
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("A return is already open for this order.", "return_exists")
    throw e
  }
  await recordTransition({ machine: "return", entityId: ret._id, orderId: order._id, from: null, to: "requested", actor, reason: items.map((l) => REASON_TEXT[l.reason]).join(", ") })
  await mirror(ret)
  await notify(ret, "requested")
  return ret
}

/** Copies the return onto its order (`returnRequest`) for the screens and rules that read the order. */
export async function mirror(ret: ReturnDoc, session?: ClientSession) {
  const shipment = ret.shipmentId ? await db.shipments().findOne({ _id: ret.shipmentId }, { session, projection: { awb: 1, carrier: 1 } }) : null
  const awb = shipment?.awb || ret.selfShip?.awb
  const carrier = shipment?.carrier || ret.selfShip?.carrier
  const first = ret.items[0]
  await db.orders().updateOne(
    { _id: ret.orderId },
    {
      $set: {
        returnRequest: {
          status: ret.status,
          returnId: ret._id,
          type: ret.type,
          reason: first ? (first.note ? `${REASON_TEXT[first.reason]}: ${first.note}` : REASON_TEXT[first.reason]) : "",
          items: ret.items.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
          ...(awb ? { returnAwb: awb } : {}),
          ...(carrier ? { carrier } : {}),
          ...(ret.inspection ? { inspection: ret.inspection } : {}),
          requestedAt: ret.requestedAt,
          updatedAt: ret.updatedAt,
        },
        updatedAt: new Date(),
      },
    },
    { session }
  )
}

/**
 * Moves a return to `to` if the machine allows it from its current status
 * and nobody changed it meanwhile; records the move, mirrors it onto the
 * order and tells the customer.
 */
export async function moveReturn(ret: ReturnDoc, to: ReturnStatus, actor: ActorRef, reason?: string, set: Record<string, unknown> = {}, session?: ClientSession) {
  assertTransition("return", ret.status, to)
  const now = new Date()
  const res = await db.returns().updateOne({ _id: ret._id, status: ret.status, updatedAt: ret.updatedAt }, { $set: { ...set, status: to, updatedAt: now } }, { session })
  if (!res.modifiedCount) throw conflict("The return changed meanwhile. Reload and try again.", "stale")
  await recordTransition({ machine: "return", entityId: ret._id, orderId: ret.orderId, from: ret.status, to, actor, ...(reason ? { reason } : {}) }, session)
  const next = (await db.returns().findOne({ _id: ret._id }, { session }))!
  await mirror(next, session)
  await notify(next, to, session)
  return next
}

/** For courier-driven changes: applies the move only if it's legal now, else does nothing. */
export async function moveReturnIfAllowed(returnId: string, to: ReturnStatus, actor: ActorRef, reason: string) {
  const ret = await db.returns().findOne({ _id: returnId, status: { $in: sourcesOf("return", to) as ReturnStatus[] } })
  if (!ret) return false
  await moveReturn(ret, to, actor, reason).catch((e) => {
    if ((e as { code?: string }).code !== "stale") throw e
  })
  return true
}

export async function loadReturn(id: string) {
  const ret = await db.returns().findOne({ _id: id })
  if (!ret) throw notFound("Return")
  return ret
}

/** The return the order's legacy routes act on: the open one, else the latest. */
export async function currentReturn(orderId: string) {
  // A return written onto the order by older code is brought into the returns collection first.
  await migrateEmbeddedReturns(orderId)
  return (await db.returns().findOne({ orderId, status: { $in: OPEN } })) ?? (await db.returns().findOne({ orderId }, { sort: { requestedAt: -1 } }))
}

/** The customer ships it back themselves and tells us the courier and AWB. */
export async function recordSelfShip(ret: ReturnDoc, input: { carrier: string; awb: string }, actor: ActorRef) {
  if (ret.method !== "self_ship") throw conflict("We're collecting this return from your door.", "pickup_return")
  if (ret.status !== "approved") throw conflict(ret.status === "requested" ? "Wait for us to approve the return before sending it." : "This return is already on its way.", "invalid_transition")
  return moveReturn(ret, "in_transit", actor, `Sent with ${input.carrier} (${input.awb})`, { selfShip: { carrier: input.carrier, awb: input.awb.toUpperCase(), at: new Date() } })
}

const NOTICE: Partial<Record<ReturnStatus, (r: ReturnDoc) => { title: string; message: string }>> = {
  requested: (r) => ({ title: `${r.type === "exchange" ? "Exchange" : "Return"} ${r.code} requested`, message: "We'll review it shortly." }),
  approved: (r) => ({ title: `${r.code} approved`, message: r.method === "pickup" ? "We'll book a pickup from your address." : "Pack the items and send them to us; then add the courier and AWB on your returns page." }),
  pickup_scheduled: (r) => ({ title: `Pickup booked for ${r.code}`, message: "Keep the items packed; the courier will collect them." }),
  received: (r) => ({ title: `${r.code} received`, message: "Your items reached our warehouse and will be inspected." }),
  refund_pending: (r) => ({ title: `Refund started for ${r.code}`, message: "Your bank usually shows it within 5-7 working days." }),
  refunded: (r) => ({ title: `${r.code} refunded`, message: "Your refund has been processed." }),
  exchanged: (r) => ({ title: `Exchange for ${r.code} on its way`, message: "We've sent your replacement as a new order." }),
  rejected: (r) => ({ title: `${r.code} wasn't accepted`, message: r.rejectionReason ?? "Contact us if you have questions." }),
}

async function notify(ret: ReturnDoc, status: ReturnStatus, session?: ClientSession) {
  const make = NOTICE[status]
  if (!make || !ret.customerId) return
  const { title, message } = make(ret)
  await db.notifications().insertOne(
    { _id: newId("notif"), recipientType: "customer", recipientId: ret.customerId, type: status === "refunded" || status === "refund_pending" ? "refund_processed" : "return_status", title, message, channel: "in_app", status: "unread", metadata: { returnId: ret._id, orderId: ret.orderId, status }, createdAt: new Date() },
    { session }
  )
}
