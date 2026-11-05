import { randomBytes } from "node:crypto"
import { withTransaction } from "../../db/client.js"
import { db, type ActorRef, type InboundShipmentDoc, type SellerDoc } from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { moveStock } from "../inventory/stock.js"
import { newId } from "../ids.js"

/*
 * Platform-fulfilled sellers send stock to a store warehouse. They announce it
 * first (an advance shipping notice, ASN, with what's in it); the warehouse
 * receives against it, and only what the warehouse counts becomes stock,
 * through the stock ledger.
 */

export async function createInbound(seller: SellerDoc, input: { warehouseId: string; lines: { variantId: string; quantity: number }[] }) {
  if (seller.status !== "approved") throw conflict("Your seller account must be approved first.", "seller_not_approved")
  if (seller.fulfilmentModel !== "platform") throw conflict("You ship your own orders; stock stays at your location.", "seller_fulfilled")
  const wh = await db.warehouses().findOne({ _id: input.warehouseId, status: "active", sellerId: { $in: [null] } })
  if (!wh) throw badRequest("Choose one of the store's warehouses")
  const products = await db.products().find({ sellerId: seller._id, "variants._id": { $in: input.lines.map((l) => l.variantId) } }).toArray()
  const lines: InboundShipmentDoc["lines"] = input.lines.map((l) => {
    const p = products.find((x) => x.variants.some((v) => v._id === l.variantId))
    const v = p?.variants.find((x) => x._id === l.variantId)
    if (!p || !v) throw badRequest("That item isn't one of your listings.")
    return { variantId: v._id, productId: p._id, sku: v.sku ?? "", title: `${p.title} · ${v.title}`, expected: l.quantity, received: 0 }
  })
  if (new Set(lines.map((l) => l.variantId)).size !== lines.length) throw badRequest("List each item once.")
  const now = new Date()
  const doc: InboundShipmentDoc = { _id: newId("asn"), code: `ASN-${seller.code}-${randomBytes(3).toString("hex").toUpperCase()}`, sellerId: seller._id, warehouseId: wh._id, lines, status: "created", createdAt: now, updatedAt: now }
  await db.inboundShipments().insertOne(doc)
  return doc
}

export async function markInboundShipped(seller: SellerDoc, id: string, input: { carrier: string; awb: string }) {
  const r = await db.inboundShipments().findOneAndUpdate({ _id: id, sellerId: seller._id, status: "created" }, { $set: { status: "in_transit", carrier: input.carrier, awb: input.awb.toUpperCase(), updatedAt: new Date() } }, { returnDocument: "after" })
  if (!r) throw conflict("This shipment can't be marked as sent now.", "invalid_transition")
  return r
}

/**
 * The warehouse counts what arrived, line by line. Receiving more than
 * announced is refused (the seller files another ASN); the ASN closes when
 * every line is fully received, or when the warehouse closes it short.
 */
export async function receiveInbound(code: string, warehouseIds: string[], counts: { variantId: string; quantity: number }[], actor: ActorRef, close = false) {
  return withTransaction(async (session) => {
    const asn = await db.inboundShipments().findOne({ code: code.toUpperCase() }, { session })
    if (!asn || !warehouseIds.includes(asn.warehouseId)) throw notFound("Inbound shipment")
    if (asn.status === "closed") throw conflict("This shipment is already closed.", "closed")
    const lines = asn.lines.map((l) => ({ ...l }))
    for (const c of counts) {
      const line = lines.find((l) => l.variantId === c.variantId)
      if (!line) throw badRequest("That item isn't on this shipment.")
      if (line.received + c.quantity > line.expected) throw badRequest(`${line.sku}: only ${line.expected - line.received} more announced.`)
      await moveStock({ warehouseId: asn.warehouseId, variantId: c.variantId, from: "outside", to: "available", quantity: c.quantity, reason: "receive", ref: { type: "receipt", id: asn.code }, actor, note: `From seller (${asn.code})` }, session)
      line.received += c.quantity
    }
    const done = close || lines.every((l) => l.received >= l.expected)
    const now = new Date()
    const r = await db.inboundShipments().updateOne({ _id: asn._id, updatedAt: asn.updatedAt }, { $set: { lines, status: done ? "closed" : "receiving", updatedAt: now, ...(done ? { closedAt: now } : {}) } }, { session })
    if (!r.modifiedCount) throw conflict("Someone else is receiving this shipment. Reload and try again.", "stale")
    return (await db.inboundShipments().findOne({ _id: asn._id }, { session }))!
  })
}
