import { db, type ActorRef, type SellerDoc } from "../../db/schema.js"
import { conflict, notFound } from "../errors.js"
import { closeManifest, completePicking, createManifest, generateFulfilmentLabel, pack, qualityCheck, scanHandover, scanPick, startPicking, verifyLabel } from "../fulfilment/workflow.js"

/*
 * Seller-fulfilled orders, from the seller portal. Sellers don't run a
 * barcode floor, so packing is one declared step that walks the same guarded
 * workflow (pick each unit, check, pack with the parcel's weight and size);
 * every step is recorded in the order's history as done by the seller. Sellers
 * who want to scan can be given warehouse-app accounts for their location.
 */

export const sellerActor = (s: SellerDoc): ActorRef => ({ type: "seller", id: s._id, name: s.displayName })

export async function ownFulfilment(seller: SellerDoc, id: string) {
  const f = seller.warehouseId ? await db.fulfilments().findOne({ _id: id, warehouseId: seller.warehouseId }) : null
  if (!f) throw notFound("Order")
  return f
}

export async function packAsSeller(seller: SellerDoc, id: string, parcel: { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number }) {
  let f = await ownFulfilment(seller, id)
  const actor = sellerActor(seller)
  if (f.status === "assigned") throw conflict("Accept the order first.", "not_accepted")
  if (f.status === "picking_pending") f = await startPicking(f._id, actor)
  if (f.status === "picking") {
    for (const l of f.lines) {
      const left = l.quantity - l.short - l.picked
      if (left > 0) f = await scanPick(f._id, l.sku, left, actor)
    }
    f = await completePicking(f._id, actor)
  }
  if (f.status === "picked") f = await qualityCheck(f._id, { result: "passed", notes: "Checked by the seller" }, actor)
  if (f.status !== "qc_passed") throw conflict(`This order is already ${f.status.replace(/_/g, " ")}.`, "invalid_transition")
  return pack(f._id, { orderCode: f.code, scans: f.lines.flatMap((l) => Array<string>(l.quantity).fill(l.sku)), ...parcel }, actor)
}

/** Books the courier (or records the AWB of a parcel booked elsewhere) and confirms the label against the AWB. */
export async function labelAsSeller(seller: SellerDoc, id: string, input: { courierId?: number; ownFleet?: boolean; manual?: { carrier: string; awb: string; trackingUrl?: string } }) {
  const f = await ownFulfilment(seller, id)
  if (f.status !== "packed") throw conflict("Pack the order first.", "not_packed")
  const actor = sellerActor(seller)
  const labelled = await generateFulfilmentLabel(f._id, { packageCode: f.package!.code, ...input }, actor)
  return verifyLabel(labelled._id, labelled.awb!, actor)
}

/** Hands parcels to the courier's pickup person: manifest, each AWB, closed with their name. */
export async function handoverAsSeller(seller: SellerDoc, carrier: string, courierExecutive: string) {
  if (!seller.warehouseId) throw conflict("You don't ship your own orders.", "platform_fulfilled")
  const actor = sellerActor(seller)
  const manifest = await createManifest(seller.warehouseId, carrier, actor)
  for (const awb of manifest.awbs) await scanHandover(manifest._id, awb, actor)
  return closeManifest(manifest._id, courierExecutive, actor)
}
