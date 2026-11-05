import { db, type ActorRef, type SellerDoc } from "../../db/schema.js"
import { hashPassword } from "../auth.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { newId } from "../ids.js"
import { isGstin, isIfsc, isPan, panOfGstin, seal } from "./support.js"

/*
 * Seller onboarding: sign up, fill in business, tax, bank and pickup details,
 * submit; the store checks each item and approves. An approved seller who
 * ships themselves gets their pickup address as a seller-owned warehouse, so
 * their orders go through the same allocation, stock ledger and courier
 * booking as the store's own.
 */

const audit = (actor: ActorRef, action: string, sellerId: string, diff?: unknown) =>
  db.auditLogs().insertOne({ _id: newId("audit"), adminId: actor.id, adminEmail: actor.name ?? "", action, targetCollection: "sellers", targetId: sellerId, diff, createdAt: new Date() })

export async function registerSeller(input: { email: string; phone: string; displayName: string; password: string; fulfilmentModel: SellerDoc["fulfilmentModel"] }) {
  if (await db.sellers().findOne({ $or: [{ email: input.email }, { phone: input.phone }] })) throw conflict("An account with that email or phone already exists.", "duplicate")
  const counter = await db.counters().findOneAndUpdate({ _id: "seller" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })
  const now = new Date()
  const seller: SellerDoc = {
    _id: newId("slr"),
    code: `SEL-${String(counter?.seq ?? 1).padStart(4, "0")}`,
    displayName: input.displayName,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    status: "draft",
    verified: { pan: false, gstin: false, bank: false },
    fulfilmentModel: input.fulfilmentModel,
    warehouseId: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.sellers().insertOne(seller)
  return seller
}

export type KycInput = {
  businessType?: SellerDoc["businessType"]
  legalName?: string
  pan?: string
  gstin?: string | null
  registeredAddress?: SellerDoc["registeredAddress"]
  bank?: { accountName: string; accountNumber: string; ifsc: string }
  pickupAddress?: SellerDoc["pickupAddress"]
  fulfilmentModel?: SellerDoc["fulfilmentModel"]
}

/** Business details. Editable while a draft (or rejected); a changed item must be verified again. */
export async function updateKyc(seller: SellerDoc, input: KycInput) {
  if (!["draft", "rejected"].includes(seller.status)) throw conflict("Your details are with us for review or already approved. Contact seller support to change them.", "kyc_locked")
  if (input.pan && !isPan(input.pan)) throw badRequest("Enter a valid PAN (e.g. ABCPE1234F).", "invalid_pan")
  if (input.gstin && !isGstin(input.gstin)) throw badRequest("That GSTIN isn't valid. Check each character.", "invalid_gstin")
  const pan = input.pan ?? seller.pan
  if (input.gstin && pan && panOfGstin(input.gstin) !== pan) throw badRequest("The GSTIN doesn't belong to this PAN.", "gstin_pan_mismatch")
  if (input.bank && !isIfsc(input.bank.ifsc)) throw badRequest("Enter a valid IFSC (e.g. HDFC0001234).", "invalid_ifsc")
  if (input.bank && !/^\d{9,18}$/.test(input.bank.accountNumber)) throw badRequest("Bank account numbers are 9 to 18 digits.", "invalid_account")
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (input.businessType) set.businessType = input.businessType
  if (input.legalName) set.legalName = input.legalName
  if (input.pan && input.pan !== seller.pan) Object.assign(set, { pan: input.pan, "verified.pan": false })
  if (input.gstin !== undefined && input.gstin !== seller.gstin) Object.assign(set, { gstin: input.gstin, "verified.gstin": false })
  if (input.registeredAddress) set.registeredAddress = input.registeredAddress
  if (input.bank) Object.assign(set, { bank: { accountName: input.bank.accountName, ifsc: input.bank.ifsc, last4: input.bank.accountNumber.slice(-4), sealed: seal(input.bank.accountNumber) }, "verified.bank": false })
  if (input.pickupAddress) set.pickupAddress = input.pickupAddress
  if (input.fulfilmentModel) set.fulfilmentModel = input.fulfilmentModel
  try {
    return (await db.sellers().findOneAndUpdate({ _id: seller._id }, { $set: set }, { returnDocument: "after" }))!
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw conflict("That GSTIN is already registered with another seller.", "duplicate_gstin")
    throw e
  }
}

/** Ready for review: legal name, PAN, bank, registered address and, to ship themselves, a pickup address. */
export async function submitKyc(seller: SellerDoc) {
  if (!["draft", "rejected"].includes(seller.status)) throw conflict("Already submitted.", "invalid_transition")
  const missing = [
    !seller.legalName && "legal name",
    !seller.pan && "PAN",
    !seller.bank && "bank account",
    !seller.registeredAddress && "registered address",
    seller.fulfilmentModel === "seller" && !seller.pickupAddress && "pickup address",
  ].filter(Boolean)
  if (missing.length) throw badRequest(`Add your ${missing.join(", ")} first.`, "kyc_incomplete")
  return (await db.sellers().findOneAndUpdate({ _id: seller._id, status: seller.status }, { $set: { status: "submitted", statusReason: "", updatedAt: new Date() } }, { returnDocument: "after" }))!
}

export async function verifyItem(sellerId: string, item: keyof SellerDoc["verified"], actor: ActorRef) {
  const s = await db.sellers().findOne({ _id: sellerId })
  if (!s) throw notFound("Seller")
  if (item === "gstin" && !s.gstin) throw badRequest("This seller has no GSTIN to verify.")
  const r = await db.sellers().findOneAndUpdate({ _id: sellerId }, { $set: { [`verified.${item}`]: true, updatedAt: new Date() } }, { returnDocument: "after" })
  await audit(actor, `seller.verify_${item}`, sellerId)
  return r!
}

/**
 * Approves a submitted seller whose PAN and bank are verified (and GSTIN, if
 * given; selling taxable goods online needs one, but the store decides).
 * A seller who ships themselves gets their pickup address as a warehouse.
 */
export async function approveSeller(sellerId: string, actor: ActorRef, opts: { commissionPct?: number | null; shiprocketPickupLocation?: string } = {}) {
  const s = await db.sellers().findOne({ _id: sellerId })
  if (!s) throw notFound("Seller")
  if (!["submitted", "suspended"].includes(s.status)) throw conflict("Only a submitted or suspended seller can be approved.", "invalid_transition")
  const unverified = (["pan", "bank"] as const).filter((k) => !s.verified[k]).concat(s.gstin && !s.verified.gstin ? ["gstin" as never] : [])
  if (unverified.length) throw conflict(`Verify the seller's ${unverified.join(" and ").toUpperCase()} first.`, "kyc_unverified")
  const now = new Date()
  let warehouseId = s.warehouseId ?? null
  if (s.fulfilmentModel === "seller" && !warehouseId) {
    const a = s.pickupAddress!
    warehouseId = newId("wh")
    await db.warehouses().insertOne({
      _id: warehouseId,
      code: s.code,
      name: `${s.displayName} (seller)`,
      city: a.city,
      state: a.state,
      pincode: a.postalCode,
      address: a.line1,
      gstin: s.gstin ?? null,
      status: "active",
      isDefault: false,
      acceptsOrders: true,
      sellerId: s._id,
      ...(opts.shiprocketPickupLocation ? { shiprocketPickupLocation: opts.shiprocketPickupLocation } : {}),
      createdAt: now,
      updatedAt: now,
    })
  } else if (warehouseId) {
    await db.warehouses().updateOne({ _id: warehouseId }, { $set: { status: "active", acceptsOrders: true, ...(opts.shiprocketPickupLocation ? { shiprocketPickupLocation: opts.shiprocketPickupLocation } : {}), updatedAt: now } })
  }
  const r = await db.sellers().findOneAndUpdate(
    { _id: s._id, status: s.status },
    { $set: { status: "approved", statusReason: "", warehouseId, approvedAt: now, approvedBy: actor.id, ...(opts.commissionPct !== undefined ? { commissionPct: opts.commissionPct } : {}), updatedAt: now } },
    { returnDocument: "after" }
  )
  if (!r) throw conflict("The seller changed meanwhile. Reload and try again.", "stale")
  // Listings they had approved before a suspension go back on sale.
  await db.products().updateMany({ sellerId: s._id, "review.status": "approved" }, { $set: { status: "published", updatedAt: now } })
  await audit(actor, "seller.approve", s._id, opts)
  return r
}

/** Suspended or rejected: off sale at once; their warehouse stops taking orders. */
export async function setSellerStatus(sellerId: string, status: "suspended" | "rejected", reason: string, actor: ActorRef) {
  const s = await db.sellers().findOne({ _id: sellerId })
  if (!s) throw notFound("Seller")
  if (status === "rejected" && s.status !== "submitted") throw conflict("Only a submitted seller can be rejected.", "invalid_transition")
  if (status === "suspended" && s.status !== "approved") throw conflict("Only an approved seller can be suspended.", "invalid_transition")
  const now = new Date()
  await db.sellers().updateOne({ _id: s._id }, { $set: { status, statusReason: reason, updatedAt: now } })
  await db.products().updateMany({ sellerId: s._id, status: "published" }, { $set: { status: "draft", updatedAt: now } })
  if (s.warehouseId) await db.warehouses().updateOne({ _id: s.warehouseId }, { $set: { acceptsOrders: false, updatedAt: now } })
  await audit(actor, `seller.${status}`, s._id, { reason })
  return (await db.sellers().findOne({ _id: s._id }))!
}

/** What a seller sees of themselves: bank number reduced to its last four digits. */
export const publicSeller = ({ passwordHash: _p, bank, ...s }: SellerDoc) => ({ ...s, bank: bank ? { accountName: bank.accountName, ifsc: bank.ifsc, last4: bank.last4 } : null })
