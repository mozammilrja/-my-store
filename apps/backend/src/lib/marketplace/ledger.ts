import { randomBytes } from "node:crypto"
import { withTransaction } from "../../db/client.js"
import { db, SELLER_LEDGER_KINDS, type ActorRef, type ReturnDoc, type SellerLedgerDoc, type SellerSettlementDoc, type ShipmentDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { log } from "../log.js"
import { paidShare } from "../returns/returns.js"
import { marketplaceSettings, round } from "./support.js"

/*
 * Money between the store and its sellers, as immutable lines. When a
 * seller's item is delivered: the sale (what the customer paid for it) is
 * credited, and commission, GST on the commission, the fulfilment fee (if the
 * store ships for them) and the statutory TCS and TDS are debited. A refunded
 * return reverses those lines for the returned units (the fulfilment fee
 * stays: the work was done). Lines become payable when the return window has
 * closed and the order is paid; settlements batch them.
 */

type Kind = SellerLedgerDoc["kind"]

async function insertLines(lines: SellerLedgerDoc[]) {
  if (!lines.length) return 0
  try {
    return (await db.sellerLedger().insertMany(lines, { ordered: false })).insertedCount
  } catch (e) {
    // Posted already (same key): a repeated delivery scan or refund posts nothing.
    if ((e as { code?: number; writeErrors?: { code: number }[] }).writeErrors?.every((w) => w.code === 11000) || (e as { code?: number }).code === 11000) return 0
    throw e
  }
}

/** Posts the sale lines for a delivered outbound parcel's marketplace items. Safe to call again. */
export async function postDeliveredSales(shipment: ShipmentDoc) {
  if (shipment.isReturn || shipment.status !== "delivered") return 0
  const order = await db.orders().findOne({ _id: shipment.orderId })
  if (!order || order.exchangeOf) return 0
  const items = shipment.items.map((l) => ({ ...l, item: order.items.find((i) => i._id === l.itemId)! })).filter((l) => l.item)
  const products = await db.products().find({ _id: { $in: items.map((l) => l.item.productId) }, sellerId: { $type: "string" } }, { projection: { sellerId: 1 } }).toArray()
  if (!products.length) return 0
  const sellers = await db.sellers().find({ _id: { $in: products.map((p) => p.sellerId!) } }).toArray()
  const region = await db.regions().findOne({ _id: order.regionId })
  const settings = await marketplaceSettings()
  const deliveredAt = shipment.deliveredAt ?? new Date()
  const payableFrom = new Date(deliveredAt.getTime() + (region?.policies?.returnWindowDays ?? 7) * 86_400_000)
  const taxRate = region?.taxRate ?? 0
  const lines: SellerLedgerDoc[] = []
  for (const l of items) {
    const p = products.find((x) => x._id === l.item.productId)
    const seller = p && sellers.find((s) => s._id === p.sellerId)
    if (!seller) continue
    const sale = paidShare(order, l.itemId, l.quantity)
    const commission = round((sale * (seller.commissionPct ?? settings.commissionPct)) / 100)
    const fee = seller.fulfilmentModel === "platform" ? settings.fulfilmentFeePerUnit * l.quantity : 0
    const taxable = round((sale * 100) / (100 + taxRate))
    const amounts: [Kind, number, string][] = [
      ["sale", sale, `${l.quantity} x ${l.item.productTitle} (${l.item.variantTitle})`],
      ["commission", -commission, `${seller.commissionPct ?? settings.commissionPct}% of ${sale}`],
      ["commission_gst", -round((commission * settings.feeGstPct) / 100), `${settings.feeGstPct}% GST on commission`],
      ["fulfilment_fee", -fee, `${l.quantity} unit(s) stored and shipped by the store`],
      ["fulfilment_fee_gst", -round((fee * settings.feeGstPct) / 100), `${settings.feeGstPct}% GST on the fulfilment fee`],
      ["tcs", -round((taxable * settings.tcsPct) / 100), `TCS ${settings.tcsPct}% of taxable ${taxable} (GST s.52)`],
      ["tds", -round((sale * settings.tdsPct) / 100), `TDS ${settings.tdsPct}% of ${sale} (IT s.194-O)`],
    ]
    for (const [kind, amount, note] of amounts) {
      if (!amount) continue
      lines.push({ _id: newId("sld"), key: `${shipment._id}:${l.itemId}:${kind}`, sellerId: seller._id, orderId: order._id, displayId: order.displayId, itemId: l.itemId, kind, reversal: false, amount, currency: order.currency, quantity: l.quantity, status: "pending", payableFrom, settlementId: null, note, createdAt: new Date() })
    }
  }
  return insertLines(lines)
}

/** Reverses a refunded return's marketplace lines, in proportion to the units returned. Safe to call again. */
export async function reverseReturnedSales(ret: ReturnDoc) {
  if (ret.status !== "refunded") return 0
  const out: SellerLedgerDoc[] = []
  for (const r of ret.items) {
    const original = await db.sellerLedger().find({ orderId: ret.orderId, itemId: r.itemId, reversal: false, kind: { $nin: ["fulfilment_fee", "fulfilment_fee_gst"] } }).toArray()
    for (const o of original) {
      const amount = -round((o.amount * Math.min(r.quantity, o.quantity)) / o.quantity)
      if (!amount) continue
      out.push({ ...o, _id: newId("sld"), key: `${ret._id}:${o.key}:reversal`, reversal: true, amount, quantity: Math.min(r.quantity, o.quantity), status: "pending", payableFrom: new Date(), settlementId: null, note: `Return ${ret.code}`, createdAt: new Date() })
    }
  }
  return insertLines(out)
}

/** Lines that can be paid out now: past the return window, and for sales, the order paid. Reversals always count. */
async function payable(sellerId: string, asOf: Date) {
  const pending = await db.sellerLedger().find({ sellerId, status: "pending", payableFrom: { $lte: asOf } }).toArray()
  const orders = await db.orders().find({ _id: { $in: [...new Set(pending.map((l) => l.orderId))] } }, { projection: { paymentStatus: 1 } }).toArray()
  const paid = new Set(orders.filter((o) => o.paymentStatus !== "awaiting").map((o) => o._id))
  return pending.filter((l) => l.reversal || paid.has(l.orderId))
}

/**
 * Settles every seller's payable lines up to `asOf`. A seller whose payable
 * total is zero or less gets nothing now; the lines wait for the next run.
 */
export async function runSettlements(asOf: Date, actor: ActorRef) {
  const sellers = await db.sellers().find({ status: { $in: ["approved", "suspended"] } }).toArray()
  const created: SellerSettlementDoc[] = []
  for (const s of sellers) {
    const lines = await payable(s._id, asOf)
    const net = lines.reduce((n, l) => n + l.amount, 0)
    if (!lines.length || net <= 0) continue
    const totals = Object.fromEntries(SELLER_LEDGER_KINDS.map((k) => [k, lines.filter((l) => l.kind === k).reduce((n, l) => n + l.amount, 0)])) as SellerSettlementDoc["totals"]
    const settlement: SellerSettlementDoc = {
      _id: newId("stl"),
      code: `STL-${s.code}-${asOf.toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(2).toString("hex").toUpperCase()}`,
      sellerId: s._id,
      periodEnd: asOf,
      entryIds: lines.map((l) => l._id),
      totals,
      net,
      currency: lines[0]!.currency,
      status: "pending",
      createdAt: new Date(),
    }
    try {
      await withTransaction(async (session) => {
        // Claim the lines; if another run took any of them meanwhile, this settlement is abandoned.
        const r = await db.sellerLedger().updateMany({ _id: { $in: settlement.entryIds }, status: "pending" }, { $set: { status: "settled", settlementId: settlement._id } }, { session })
        if (r.modifiedCount !== settlement.entryIds.length) throw conflict("Ledger changed during settlement", "stale")
        await db.sellerSettlements().insertOne(settlement, { session })
        await db.auditLogs().insertOne({ _id: newId("audit"), adminId: actor.id, adminEmail: actor.name ?? "", action: "settlement.create", targetCollection: "seller_settlements", targetId: settlement._id, diff: { net, lines: lines.length }, createdAt: new Date() }, { session })
      })
      created.push(settlement)
    } catch (e) {
      log.warn("settlement.skipped", { sellerId: s._id, error: (e as Error).message })
    }
  }
  return created
}

/** Finance records the bank transfer (UTR) that paid a settlement. */
export async function markSettlementPaid(id: string, utr: string, actor: ActorRef) {
  if (!/^[A-Z0-9]{12,22}$/.test(utr)) throw badRequest("Enter the UTR from the bank transfer (12-22 letters and digits).")
  const r = await db.sellerSettlements().findOneAndUpdate({ _id: id, status: "pending" }, { $set: { status: "paid", payout: { utr, paidAt: new Date(), by: actor.id } } }, { returnDocument: "after" })
  if (!r) {
    if (await db.sellerSettlements().countDocuments({ _id: id })) throw conflict("Already marked paid.", "already_paid")
    throw notFound("Settlement")
  }
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: actor.id, adminEmail: actor.name ?? "", action: "settlement.paid", targetCollection: "seller_settlements", targetId: id, diff: { utr }, createdAt: new Date() })
  return r
}

/** Balance for the seller: payable now, waiting (return window or payment), and paid out. */
export async function sellerBalance(sellerId: string) {
  const now = new Date()
  const [payableNow, pendingAll, paid] = await Promise.all([
    payable(sellerId, now),
    db.sellerLedger().find({ sellerId, status: "pending" }, { projection: { amount: 1 } }).toArray(),
    db.sellerSettlements().aggregate<{ n: number }>([{ $match: { sellerId, status: "paid" } }, { $group: { _id: null, n: { $sum: "$net" } } }]).toArray(),
  ])
  const ready = payableNow.reduce((n, l) => n + l.amount, 0)
  return { payableNow: ready, waiting: pendingAll.reduce((n, l) => n + l.amount, 0) - ready, paidOut: paid[0]?.n ?? 0 }
}

/**
 * How a seller is doing over a period, from what's recorded: orders,
 * acceptance and dispatch against the SLAs, declines, deliveries, returns,
 * undelivered parcels, sales and fees.
 */
export async function sellerPerformance(sellerId: string, from: Date, to: Date) {
  const seller = await db.sellers().findOne({ _id: sellerId })
  if (!seller) throw notFound("Seller")
  const settings = await marketplaceSettings()
  const productIds = (await db.products().find({ sellerId }, { projection: { _id: 1 } }).toArray()).map((p) => p._id)
  const ledger = await db.sellerLedger().find({ sellerId, createdAt: { $gte: from, $lte: to } }).toArray()
  const sum = (k: Kind, rev = false) => ledger.filter((l) => l.kind === k && l.reversal === rev).reduce((n, l) => n + l.amount, 0)
  const unitsSold = ledger.filter((l) => l.kind === "sale" && !l.reversal).reduce((n, l) => n + l.quantity, 0)
  const returns = await db.returns().find({ "items.productId": { $in: productIds }, requestedAt: { $gte: from, $lte: to }, status: { $nin: ["cancelled", "rejected"] } }).toArray()
  const unitsReturned = returns.flatMap((r) => r.items).filter((i) => productIds.includes(i.productId)).reduce((n, i) => n + i.quantity, 0)

  let fulfilment = null
  if (seller.warehouseId) {
    const fs = await db.fulfilments().find({ warehouseId: seller.warehouseId, createdAt: { $gte: from, $lte: to } }).toArray()
    const events = await db.statusEvents().find({ entityId: { $in: fs.map((f) => f._id) }, machine: "fulfilment" }).toArray()
    const at = (id: string, to: string) => events.find((e) => e.entityId === id && e.to === to)?.at
    const hours = (a?: Date, b?: Date) => (a && b ? (b.getTime() - a.getTime()) / 3_600_000 : null)
    const acceptHours = fs.map((f) => hours(f.createdAt, at(f._id, "picking_pending"))).filter((h): h is number => h !== null)
    const dispatchHours = fs.map((f) => hours(at(f._id, "picking_pending"), f.dispatchedAt ?? at(f._id, "handed_over"))).filter((h): h is number => h !== null)
    const rto = await db.shipments().countDocuments({ fulfilmentId: { $in: fs.map((f) => f._id) }, status: { $in: ["rto_initiated", "rto_in_transit", "rto_delivered"] } })
    fulfilment = {
      orders: fs.length,
      declined: fs.filter((f) => f.status === "rejected").length,
      accepted: acceptHours.length,
      acceptedLate: acceptHours.filter((h) => h > settings.acceptSlaHours).length,
      medianAcceptHours: median(acceptHours),
      dispatched: dispatchHours.length,
      dispatchedLate: dispatchHours.filter((h) => h > settings.dispatchSlaHours).length,
      medianDispatchHours: median(dispatchHours),
      waitingToAccept: fs.filter((f) => f.status === "assigned").length,
      undelivered: rto,
    }
  }
  return {
    from,
    to,
    sla: { acceptHours: settings.acceptSlaHours, dispatchHours: settings.dispatchSlaHours },
    sales: { gross: sum("sale"), refunded: -sum("sale", true), unitsSold, unitsReturned, returnRate: unitsSold ? Math.round((unitsReturned / unitsSold) * 1000) / 10 : 0 },
    fees: { commission: -(sum("commission") + sum("commission", true)), commissionGst: -(sum("commission_gst") + sum("commission_gst", true)), fulfilment: -(sum("fulfilment_fee") + sum("fulfilment_fee_gst")), tcs: -(sum("tcs") + sum("tcs", true)), tds: -(sum("tds") + sum("tds", true)) },
    net: ledger.reduce((n, l) => n + l.amount, 0),
    fulfilment,
  }
}

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return Math.round((s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2) * 10) / 10
}
