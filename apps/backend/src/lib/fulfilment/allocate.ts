import type { ClientSession } from "mongodb"
import { db, type ActorRef, type FulfilmentDoc, type FulfilmentLine, type OrderDoc, type WarehouseDoc } from "../../db/schema.js"
import { conflict } from "../errors.js"
import { newId } from "../ids.js"
import { moveStock, skuOf } from "../inventory/stock.js"
import { recordTransition } from "../state/machines.js"

/*
 * Picks the warehouse (or warehouses) an order ships from and reserves its
 * stock, inside the caller's transaction.
 *
 * Eligible: active, accepting orders, serving the delivery PIN code (its
 * serviceAreas list it or a prefix of it, or it has none), not one that
 * already refused this order. Ranked by how close it is by PIN code, then by
 * priority, then by code. Indian PIN codes are hierarchical (first digit:
 * zone, two: postal circle, three: sorting district), so the length of the
 * shared prefix is a real, data-backed measure of distance that needs no
 * geocoding. Courier rates are compared later, when the parcel is booked from
 * the chosen warehouse (lib/shipping/service.ts).
 *
 * One warehouse holding everything wins. Otherwise, if split fulfilment is
 * allowed, warehouses are taken in turn by how many of the remaining units
 * they can cover. Each reserved unit moves available -> reserved through the
 * stock ledger; a concurrent order that took the last unit makes the guarded
 * update fail, and the whole transaction rolls back.
 */

export const proximity = (a: string, b: string) => {
  let n = 0
  while (n < Math.min(a.length, b.length) && a[n] === b[n]) n++
  return n
}

export const serves = (w: WarehouseDoc, pincode: string) => !w.serviceAreas?.length || w.serviceAreas.some((area) => pincode.startsWith(area))

type Want = { itemId: string; quantity: number }

export type AllocateOptions = {
  actor: ActorRef
  method: "auto" | "manual"
  reason: string
  /** Warehouses never to use (they refused this order). */
  exclude?: string[]
  /** Manual override: only this warehouse, whatever its service area. */
  warehouseId?: string
  /** True only during order placement, which has already taken the units off the variant's sellable count. */
  variantAlreadyDecremented?: boolean
}

/**
 * Lines of the order that the warehouse system manages: variants that keep
 * stock levels, count stock and refuse backorders. Others ride along unreserved.
 */
async function classify(order: OrderDoc, wants: Want[], session: ClientSession) {
  const items = wants.map((w) => ({ want: w, item: order.items.find((i) => i._id === w.itemId)! }))
  const products = await db.products().find({ _id: { $in: [...new Set(items.map((x) => x.item.productId))] } }, { session }).toArray()
  const variantOf = (variantId: string) => products.flatMap((p) => p.variants).find((v) => v._id === variantId)
  const leveled = new Set((await db.stockLevels().distinct("variantId", { variantId: { $in: items.map((x) => x.item.variantId) } }, { session })) as string[])
  return items.map(({ want, item }) => {
    const v = variantOf(item.variantId)
    return { want, item, options: v?.options ?? {}, sku: v ? skuOf(v) : `SKU-${item.variantId.slice(-6)}`, tracked: !!v && v.manageInventory && !v.allowBackorder && leveled.has(item.variantId) }
  })
}

/** Whether any line of the order is managed by the warehouse system. */
export async function usesWarehouses(order: OrderDoc, session: ClientSession) {
  const lines = await classify(order, order.items.map((i) => ({ itemId: i._id, quantity: i.quantity })), session)
  return lines.some((l) => l.tracked)
}

/**
 * Allocates `wants` (lines of `order`) and returns the fulfilments created.
 * Returns [] when no line is warehouse-managed: such orders ship straight from
 * the order as before.
 */
export async function allocate(order: OrderDoc, wants: Want[], opts: AllocateOptions, session: ClientSession): Promise<FulfilmentDoc[]> {
  const lines = await classify(order, wants, session)
  const tracked = lines.filter((l) => l.tracked)
  if (!tracked.length) return []

  const pincode = order.shippingAddress.postalCode.replace(/\s/g, "")
  let candidates = await db
    .warehouses()
    .find(opts.warehouseId ? { _id: opts.warehouseId, status: "active" } : { status: "active", acceptsOrders: { $ne: false }, _id: { $nin: opts.exclude ?? [] } }, { session })
    .toArray()
  if (!opts.warehouseId) candidates = candidates.filter((w) => serves(w, pincode))
  if (!candidates.length) throw conflict(`No warehouse delivers to PIN code ${pincode}.`, "unserviceable")
  candidates.sort((a, b) => proximity(b.pincode, pincode) - proximity(a.pincode, pincode) || (a.priority ?? 100) - (b.priority ?? 100) || a.code.localeCompare(b.code))

  const levels = await db
    .stockLevels()
    .find({ warehouseId: { $in: candidates.map((w) => w._id) }, variantId: { $in: tracked.map((l) => l.item.variantId) } }, { session })
    .toArray()
  const avail = new Map(levels.map((l) => [`${l.warehouseId}|${l.variantId}`, l.available]))
  const binOf = new Map(levels.map((l) => [`${l.warehouseId}|${l.variantId}`, l.binCode ?? null]))
  const has = (w: WarehouseDoc, variantId: string) => avail.get(`${w._id}|${variantId}`) ?? 0

  // Units each variant needs (an order may hold one variant on two lines).
  const needOf = (variantId: string) => tracked.filter((l) => l.item.variantId === variantId).reduce((n, l) => n + l.want.quantity, 0)

  type Plan = { warehouse: WarehouseDoc; take: Map<string, number> }
  const plans: Plan[] = []
  const whole = candidates.find((w) => tracked.every((l) => has(w, l.item.variantId) >= needOf(l.item.variantId)))
  if (whole) {
    plans.push({ warehouse: whole, take: new Map(tracked.map((l) => [l.want.itemId, l.want.quantity])) })
  } else {
    const settings = await db.settings().findOne({ _id: "store" }, { session })
    const remaining = new Map(tracked.map((l) => [l.want.itemId, l.want.quantity]))
    const left = new Map(avail)
    const units = () => [...remaining.values()].reduce((a, b) => a + b, 0)
    if (settings?.allowSplitFulfilment !== false) {
      while (units() > 0) {
        let best: { w: WarehouseDoc; take: Map<string, number>; n: number } | null = null
        for (const w of candidates) {
          if (plans.some((p) => p.warehouse._id === w._id)) continue
          const take = new Map<string, number>()
          const local = new Map(left)
          for (const l of tracked) {
            const want = remaining.get(l.want.itemId) ?? 0
            const key = `${w._id}|${l.item.variantId}`
            const q = Math.min(want, local.get(key) ?? 0)
            if (q > 0) {
              take.set(l.want.itemId, q)
              local.set(key, (local.get(key) ?? 0) - q)
            }
          }
          const n = [...take.values()].reduce((a, b) => a + b, 0)
          if (n > 0 && (!best || n > best.n)) best = { w, take, n }
        }
        if (!best) break
        for (const [itemId, q] of best.take) {
          remaining.set(itemId, (remaining.get(itemId) ?? 0) - q)
          const variantId = tracked.find((l) => l.want.itemId === itemId)!.item.variantId
          left.set(`${best.w._id}|${variantId}`, (left.get(`${best.w._id}|${variantId}`) ?? 0) - q)
        }
        plans.push({ warehouse: best.w, take: best.take })
      }
    }
    if (!plans.length || units() > 0) {
      const short = tracked.find((l) => (remaining.get(l.want.itemId) ?? 0) > 0) ?? tracked[0]!
      throw conflict(`${short.item.productTitle} (${short.item.variantTitle}) isn't in stock at a warehouse that delivers to ${pincode}.`, "out_of_stock")
    }
  }

  const existing = await db.fulfilments().countDocuments({ orderId: order._id }, { session })
  const now = new Date()
  const created: FulfilmentDoc[] = []
  for (const [index, plan] of plans.entries()) {
    const w = plan.warehouse
    const fLines: FulfilmentLine[] = []
    for (const l of tracked) {
      const q = plan.take.get(l.want.itemId)
      if (!q) continue
      fLines.push(lineOf(l.item, l.sku, l.options, q, true, binOf.get(`${w._id}|${l.item.variantId}`) ?? null))
    }
    // Unmanaged lines go in the first parcel, unreserved.
    if (index === 0) for (const l of lines.filter((x) => !x.tracked)) fLines.push(lineOf(l.item, l.sku, l.options, l.want.quantity, false, null))

    const f: FulfilmentDoc = {
      _id: newId("ful"),
      code: `FUL-${order.displayId}-${existing + index + 1}`,
      orderId: order._id,
      displayId: order.displayId,
      warehouseId: w._id,
      warehouseCode: w.code,
      status: "assigned",
      lines: fLines,
      paymentMethod: order.paymentMethod,
      destination: { city: order.shippingAddress.city, state: order.shippingAddress.province ?? "", postalCode: pincode },
      assignment: { method: opts.method, reason: opts.reason, proximity: proximity(w.pincode, pincode), at: now, actor: opts.actor },
      rejectedBy: opts.exclude ?? [],
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    for (const line of fLines.filter((x) => x.reserved)) {
      await moveStock(
        {
          warehouseId: w._id,
          variantId: line.variantId,
          from: "available",
          to: "reserved",
          quantity: line.quantity,
          reason: "reserve",
          ref: { type: "fulfilment", id: f._id },
          actor: opts.actor,
          note: `Order #${order.displayId}`,
          syncVariant: !opts.variantAlreadyDecremented,
        },
        session
      )
    }
    try {
      await db.fulfilments().insertOne(f, { session })
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw conflict("This order already has a live fulfilment at that warehouse.", "duplicate_fulfilment")
      throw e
    }
    await recordTransition({ machine: "fulfilment", entityId: f._id, orderId: order._id, from: null, to: "assigned", actor: opts.actor, reason: opts.reason }, session)
    await db.outboxEvents().insertOne(
      { _id: newId("outbox"), topic: "fulfilment.assigned", payload: { fulfilmentId: f._id, warehouseId: w._id, orderId: order._id, displayId: order.displayId }, status: "pending", retryCount: 0, createdAt: now },
      { session }
    )
    created.push(f)
  }
  return created
}

function lineOf(item: OrderDoc["items"][number], sku: string, options: Record<string, string>, quantity: number, reserved: boolean, binCode: string | null): FulfilmentLine {
  return {
    itemId: item._id,
    productId: item.productId,
    variantId: item.variantId,
    sku,
    productTitle: item.productTitle,
    variantTitle: item.variantTitle,
    options,
    quantity,
    reserved,
    picked: 0,
    packed: 0,
    short: 0,
    binCode,
  }
}
