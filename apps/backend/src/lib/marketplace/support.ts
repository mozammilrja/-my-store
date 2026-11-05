import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { db, type MarketplaceSettings } from "../../db/schema.js"
import { env } from "../../env.js"

/* ---------- Settings ---------- */

/**
 * Starting values; the owner sets them in PATCH /admin/marketplace/settings.
 * Commission and the fulfilment fee are placeholders for the store's own rate
 * card. TCS (GST s.52, 0.5% since 10 Jul 2024) and TDS (IT s.194-O, 0.1% since
 * 1 Oct 2024) follow the rates in force when this was written; confirm them
 * with the store's tax adviser.
 */
export const MARKETPLACE_DEFAULTS: MarketplaceSettings = {
  commissionPct: 15,
  fulfilmentFeePerUnit: 3000,
  feeGstPct: 18,
  tcsPct: 0.5,
  tdsPct: 0.1,
  acceptSlaHours: 24,
  dispatchSlaHours: 48,
}

export async function marketplaceSettings(): Promise<MarketplaceSettings> {
  const s = await db.settings().findOne({ _id: "store" }, { projection: { marketplace: 1 } })
  return { ...MARKETPLACE_DEFAULTS, ...(s?.marketplace ?? {}) }
}

/* ---------- KYC formats ---------- */

/** PAN: five letters, four digits, a letter; the 4th letter is the holder type. */
export const isPan = (pan: string) => /^[A-Z]{3}[ABCFGHJLPT][A-Z]\d{4}[A-Z]$/.test(pan)

const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** The GSTIN check character (mod 36, alternate weights 1 and 2) over the first 14 characters. */
export function gstinCheckChar(first14: string) {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const product = GST_CHARS.indexOf(first14[i]!) * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return GST_CHARS[(36 - (sum % 36)) % 36]!
}

/** A well-formed GSTIN: state code 01-38, the holder's PAN, entity number, Z, a valid check character. */
export function isGstin(gstin: string) {
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return false
  const state = Number(gstin.slice(0, 2))
  if (state < 1 || state > 38) return false
  return gstinCheckChar(gstin.slice(0, 14)) === gstin[14]
}

export const panOfGstin = (gstin: string) => gstin.slice(2, 12)

/** IFSC: bank code, a zero, branch code. */
export const isIfsc = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)

/* ---------- Bank account numbers, encrypted at rest ---------- */

const key = () => createHash("sha256").update(`everwear:seller-bank:${env.JWT_SECRET}`).digest()

export function seal(plain: string) {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", key(), iv)
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".")
}

export function unseal(sealed: string) {
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64"))
  const d = createDecipheriv("aes-256-gcm", key(), new Uint8Array(iv!))
  d.setAuthTag(new Uint8Array(tag!))
  return Buffer.concat([d.update(new Uint8Array(enc!)), d.final()].map((b) => new Uint8Array(b))).toString("utf8")
}

/** Rounds minor units half away from zero. */
export const round = (n: number) => Math.sign(n) * Math.round(Math.abs(n))
