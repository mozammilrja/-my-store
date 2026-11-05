import { db, type DeliveryTaskDoc, type FulfilmentDoc, type ReturnDoc, type ShipmentDoc, type ShipmentStatus } from "../../db/schema.js"

/*
 * Logistics analytics over a date range, from the operational records only:
 * shipments and their courier scans, warehouse fulfilments, own-fleet
 * delivery tasks and cash remittances, and returns. Nothing is estimated:
 * a figure the records can't support (freight cost, courier COD remittance)
 * is absent rather than guessed.
 *
 * Windows: a shipment, fulfilment or delivery task counts in the range it
 * was created in; a return in the range it was requested in. Cash on hand is
 * as of now.
 *
 * Definitions (repeated in the admin):
 *   delivered rate     delivered / (delivered + returned to origin), closed parcels only
 *   first attempt      delivered without any failed attempt before it
 *   on time            delivered by the end of the courier's promised day (IST); only parcels with a promise count
 *   transit days       first courier movement (pickup or in-transit scan) to delivery
 *   dispatch hours     fulfilment created to handed to the courier or rider
 */

const DAY = 86_400_000
const HOUR = 3_600_000
const RTO: ShipmentStatus[] = ["rto_initiated", "rto_in_transit", "rto_delivered"]

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return Math.round((s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2) * 10) / 10
}
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 10 : null)
const istDay = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10)
/** The end of a date's day in India, as an instant. */
const endOfIstDay = (d: Date) => new Date(`${istDay(d)}T23:59:59.999+05:30`)

const carrierLabel = (s: Pick<ShipmentDoc, "provider" | "carrier">) =>
  s.provider === "own_fleet" ? "Everwear Fleet" : s.carrier || (s.provider === "manual" ? "Recorded by hand" : s.provider)

const failedBefore = (s: ShipmentDoc) => s.trackingEvents.some((e) => e.internalStatus === "delivery_failed") || !!s.ndr
const movedAt = (s: ShipmentDoc) => s.trackingEvents.find((e) => e.internalStatus === "picked_up" || e.internalStatus === "in_transit" || e.internalStatus === "out_for_delivery")?.timestamp ?? null

function shipmentFigures(list: ShipmentDoc[]) {
  const delivered = list.filter((s) => s.status === "delivered")
  const rto = list.filter((s) => RTO.includes(s.status))
  const promised = delivered.filter((s) => s.estimatedDelivery && s.deliveredAt)
  const transit = delivered.map((s) => (s.deliveredAt && movedAt(s) ? (s.deliveredAt.getTime() - movedAt(s)!.getTime()) / DAY : null)).filter((x): x is number => x != null && x >= 0)
  return {
    booked: list.length,
    delivered: delivered.length,
    returnedToOrigin: rto.length,
    inFlight: list.length - delivered.length - rto.length,
    withFailedAttempt: list.filter(failedBefore).length,
    deliveredRate: pct(delivered.length, delivered.length + rto.length),
    firstAttemptRate: pct(delivered.filter((s) => !failedBefore(s)).length, delivered.length),
    onTime: { promised: promised.length, met: promised.filter((s) => s.deliveredAt! <= endOfIstDay(s.estimatedDelivery!)).length },
    onTimeRate: pct(promised.filter((s) => s.deliveredAt! <= endOfIstDay(s.estimatedDelivery!)).length, promised.length),
    medianTransitDays: median(transit),
  }
}

export async function logisticsReport(from: Date, to: Date) {
  const window = { $gte: from, $lte: to }
  const [shipments, cancelledCount, fulfilments, warehouses, tasks, riders, remittances, onHand, returns] = await Promise.all([
    db
      .shipments()
      .find({ isReturn: false, createdAt: window, status: { $ne: "cancelled" } }, { projection: { provider: 1, carrier: 1, status: 1, createdAt: 1, deliveredAt: 1, estimatedDelivery: 1, ndr: 1, trackingEvents: 1, customer: 1 } })
      .toArray(),
    db.shipments().countDocuments({ isReturn: false, createdAt: window, status: "cancelled" }),
    db
      .fulfilments()
      .find({ createdAt: window }, { projection: { warehouseId: 1, warehouseCode: 1, status: 1, createdAt: 1, package: 1, handedOverAt: 1, dispatchedAt: 1, active: 1 } })
      .toArray() as Promise<FulfilmentDoc[]>,
    db.warehouses().find({}, { projection: { code: 1, name: 1, sellerId: 1 } }).toArray(),
    db.deliveryTasks().find({ createdAt: window }, { projection: { riderId: 1, status: 1, attempts: 1, cod: 1, zoneId: 1 } }).toArray() as Promise<DeliveryTaskDoc[]>,
    db.riders().find({}, { projection: { name: 1 } }).toArray(),
    db.codRemittances().find({ submittedAt: window }).toArray(),
    db
      .deliveryTasks()
      .aggregate<{ _id: string; amount: number; parcels: number }>([
        // As the rider's own cash in hand (lib/fleet/cod.ts): delivered parcels whose cash isn't in a remittance yet.
        { $match: { "cod.collected": { $exists: true }, "cod.remittanceId": null, status: "delivered" } },
        { $group: { _id: "$riderId", amount: { $sum: "$cod.collected" }, parcels: { $sum: 1 } } },
      ])
      .toArray(),
    db.returns().find({ requestedAt: window }, { projection: { status: 1, items: 1, requestedAt: 1, resolution: 1, type: 1, method: 1 } }).toArray() as Promise<ReturnDoc[]>,
  ])

  /* Couriers and our fleet */
  const byCarrier = new Map<string, { provider: string; list: ShipmentDoc[] }>()
  for (const s of shipments as ShipmentDoc[]) {
    const key = `${s.provider}|${carrierLabel(s)}`
    byCarrier.set(key, { provider: s.provider, list: [...(byCarrier.get(key)?.list ?? []), s] })
  }
  const carriers = [...byCarrier].map(([key, g]) => ({ provider: g.provider, carrier: key.split("|")[1]!, ...shipmentFigures(g.list) })).sort((a, b) => b.booked - a.booked)

  /* Destinations: the first three digits of a PIN code are its sorting district. */
  const byZone = new Map<string, ShipmentDoc[]>()
  for (const s of shipments as ShipmentDoc[]) {
    const zone = (s.customer?.postalCode ?? "").slice(0, 3)
    if (zone.length === 3) byZone.set(zone, [...(byZone.get(zone) ?? []), s])
  }
  const destinations = [...byZone]
    .map(([zone, list]) => {
      const f = shipmentFigures(list)
      return { zone, city: list[0]!.customer?.city ?? "", booked: f.booked, delivered: f.delivered, returnedToOrigin: f.returnedToOrigin, rtoRate: pct(f.returnedToOrigin, f.delivered + f.returnedToOrigin), medianTransitDays: f.medianTransitDays }
    })
    .sort((a, b) => b.booked - a.booked)
    .slice(0, 15)

  /* Why deliveries fail: the courier's NDR wording and our riders' recorded reasons. */
  const reasons = new Map<string, number>()
  for (const s of shipments as ShipmentDoc[]) if (s.ndr?.reason && s.provider !== "own_fleet") reasons.set(s.ndr.reason, (reasons.get(s.ndr.reason) ?? 0) + 1)
  for (const t of tasks) for (const a of t.attempts) reasons.set(a.reason.replace(/_/g, " "), (reasons.get(a.reason.replace(/_/g, " ")) ?? 0) + 1)
  const failureReasons = [...reasons].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 10)

  /* Warehouses */
  const names = new Map(warehouses.map((w) => [w._id, { code: w.code, name: w.name, seller: !!w.sellerId }]))
  const byWarehouse = new Map<string, FulfilmentDoc[]>()
  for (const f of fulfilments) byWarehouse.set(f.warehouseId, [...(byWarehouse.get(f.warehouseId) ?? []), f])
  const warehouseRows = [...byWarehouse]
    .map(([id, list]) => {
      const live = list.filter((f) => f.status !== "rejected" && f.status !== "cancelled")
      const left = live.filter((f) => f.handedOverAt || f.dispatchedAt)
      const toPack = live.filter((f) => f.package?.packedAt).map((f) => (f.package!.packedAt.getTime() - f.createdAt.getTime()) / HOUR)
      const toDispatch = left.map((f) => ((f.handedOverAt ?? f.dispatchedAt)!.getTime() - f.createdAt.getTime()) / HOUR)
      return {
        warehouseId: id,
        code: names.get(id)?.code ?? list[0]!.warehouseCode,
        name: names.get(id)?.name ?? "",
        seller: names.get(id)?.seller ?? false,
        orders: list.length,
        rejected: list.filter((f) => f.status === "rejected").length,
        cancelled: list.filter((f) => f.status === "cancelled").length,
        dispatched: left.length,
        open: live.length - left.length,
        medianHoursToPack: median(toPack),
        medianHoursToDispatch: median(toDispatch),
        dispatchedWithin24h: pct(toDispatch.filter((h) => h <= 24).length, toDispatch.length),
      }
    })
    .sort((a, b) => b.orders - a.orders)

  /* Own fleet */
  const riderName = new Map(riders.map((r) => [r._id, r.name]))
  const byRider = new Map<string, DeliveryTaskDoc[]>()
  for (const t of tasks) if (t.riderId) byRider.set(t.riderId, [...(byRider.get(t.riderId) ?? []), t])
  const fleetFigures = (list: DeliveryTaskDoc[]) => {
    const delivered = list.filter((t) => t.status === "delivered")
    const rto = list.filter((t) => t.status === "rto" || t.status === "returned")
    return {
      tasks: list.length,
      delivered: delivered.length,
      returnedToOrigin: rto.length,
      failedAttempts: list.reduce((n, t) => n + t.attempts.length, 0),
      deliveredRate: pct(delivered.length, delivered.length + rto.length),
      firstAttemptRate: pct(delivered.filter((t) => !t.attempts.length).length, delivered.length),
      codDue: delivered.reduce((n, t) => n + (t.cod?.due ?? 0), 0),
      codCollected: list.reduce((n, t) => n + (t.cod?.collected ?? 0), 0),
    }
  }
  const fleet = {
    ...fleetFigures(tasks),
    unassigned: tasks.filter((t) => t.status === "unassigned" || t.status === "offered").length,
    riders: [...byRider].map(([id, list]) => ({ riderId: id, name: riderName.get(id) ?? id, ...fleetFigures(list) })).sort((a, b) => b.tasks - a.tasks),
    cash: {
      /** Collected by riders and not yet handed in, as of now. */
      onHand: onHand.reduce((n, r) => n + r.amount, 0),
      onHandByRider: onHand.map((r) => ({ riderId: r._id, name: riderName.get(r._id) ?? r._id, amount: r.amount, parcels: r.parcels })).sort((a, b) => b.amount - a.amount),
      remittances: remittances.length,
      expected: remittances.reduce((n, r) => n + r.expected, 0),
      counted: remittances.reduce((n, r) => n + (r.counted ?? 0), 0),
      awaitingCount: remittances.filter((r) => r.status === "submitted").length,
      mismatches: remittances.filter((r) => r.status === "mismatch").length,
    },
  }

  /* Returns */
  const returnReasons = new Map<string, number>()
  for (const r of returns) for (const i of r.items) returnReasons.set(i.reason, (returnReasons.get(i.reason) ?? 0) + i.quantity)
  const refundDays = returns.filter((r) => r.resolution?.action === "refund").map((r) => (r.resolution!.at.getTime() - r.requestedAt.getTime()) / DAY)
  const returnsBlock = {
    requested: returns.length,
    exchanges: returns.filter((r) => r.type === "exchange").length,
    units: returns.reduce((n, r) => n + r.items.reduce((m, i) => m + i.quantity, 0), 0),
    byStatus: Object.fromEntries([...returns.reduce((m, r) => m.set(r.status, (m.get(r.status) ?? 0) + 1), new Map<string, number>())]),
    byReason: [...returnReasons].map(([reason, units]) => ({ reason, units })).sort((a, b) => b.units - a.units),
    medianDaysToRefund: median(refundDays),
  }

  /* Day by day */
  const daily = new Map<string, { booked: number; delivered: number; returnedToOrigin: number }>()
  const bump = (day: string, k: "booked" | "delivered" | "returnedToOrigin") => {
    const row = daily.get(day) ?? { booked: 0, delivered: 0, returnedToOrigin: 0 }
    row[k]++
    daily.set(day, row)
  }
  for (const s of shipments as ShipmentDoc[]) {
    bump(istDay(s.createdAt), "booked")
    if (s.status === "delivered" && s.deliveredAt) bump(istDay(s.deliveredAt), "delivered")
    if (RTO.includes(s.status)) bump(istDay(s.createdAt), "returnedToOrigin")
  }

  return {
    from,
    to,
    totals: { ...shipmentFigures(shipments as ShipmentDoc[]), cancelled: cancelledCount },
    carriers,
    destinations,
    failureReasons,
    warehouses: warehouseRows,
    fleet,
    returns: returnsBlock,
    daily: [...daily].map(([day, v]) => ({ day, ...v })).sort((a, b) => a.day.localeCompare(b.day)),
    /** What the records can't tell, so the admin says so instead of showing a number. */
    unavailable: ["freight cost per parcel (courier invoices aren't imported)", "courier COD remittances (settled in the courier's dashboard)"],
  }
}
