import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"
import { db, type DeliveryTaskDoc, type FleetSettings, type RiderDoc } from "../../db/schema.js"
import { env } from "../../env.js"

/* ---------- Settings ---------- */

/**
 * Starting values; the owner changes them in Settings (PATCH /admin/fleet/settings).
 * The payout figures are placeholders for the store's own rider rate card.
 */
export const FLEET_DEFAULTS: FleetSettings = {
  payoutPerDelivery: 4000,
  payoutPerFailedAttempt: 1500,
  offerTimeoutMinutes: 10,
  maxAttempts: 3,
  maxActiveTasks: 25,
}

export async function fleetSettings(): Promise<FleetSettings> {
  const s = await db.settings().findOne({ _id: "store" }, { projection: { fleet: 1 } })
  return { ...FLEET_DEFAULTS, ...(s?.fleet ?? {}) }
}

/* ---------- Delivery OTP ---------- */

/*
 * A 6-digit code the customer reads out at the door. It must be shown to the
 * customer (tracking page) and checked for the rider, so it's stored
 * encrypted (AES-256-GCM, key derived from JWT_SECRET), never in clear.
 */
const otpKey = () => createHash("sha256").update(`everwear:delivery-otp:${env.JWT_SECRET}`).digest()

export function newOtp(): { code: string; sealed: NonNullable<DeliveryTaskDoc["otp"]> } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", otpKey(), iv)
  const enc = Buffer.concat([cipher.update(code, "utf8"), cipher.final()])
  return { code, sealed: { cipher: enc.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), issuedAt: new Date(), failures: 0 } }
}

export function openOtp(sealed: NonNullable<DeliveryTaskDoc["otp"]>) {
  const decipher = createDecipheriv("aes-256-gcm", otpKey(), Buffer.from(sealed.iv, "base64"))
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(sealed.cipher, "base64")), decipher.final()]).toString("utf8")
}

export function otpMatches(sealed: NonNullable<DeliveryTaskDoc["otp"]>, attempt: string) {
  const a = Buffer.from(openOtp(sealed))
  const b = Buffer.from(attempt.trim())
  return a.length === b.length && timingSafeEqual(new Uint8Array(a), new Uint8Array(b))
}

/** Wrong OTPs allowed before the rider must ask for a new one. */
export const OTP_MAX_FAILURES = 5

/* ---------- Shifts ---------- */

/** India has one time zone and no daylight saving: IST = UTC+5:30. */
export function istNow(now = new Date()) {
  const ist = new Date(now.getTime() + 330 * 60_000)
  return { day: ist.getUTCDay(), minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes() }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h! * 60 + m!
}

/** On shift now. A rider with no shifts set works whenever they're online. */
export function onShift(rider: Pick<RiderDoc, "shifts">, now = new Date()) {
  if (!rider.shifts.length) return true
  const { day, minutes } = istNow(now)
  return rider.shifts.some((s) => {
    const start = toMinutes(s.start)
    const end = toMinutes(s.end)
    // An overnight shift (22:00-06:00) belongs to the day it starts.
    if (end > start) return s.day === day && minutes >= start && minutes < end
    return (s.day === day && minutes >= start) || ((s.day + 1) % 7 === day && minutes < end)
  })
}

/* ---------- Routes ---------- */

const R = 6371
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Stop order for a rider's run. With coordinates for the warehouse and every
 * stop: nearest neighbour from the warehouse (each next stop is the closest
 * unvisited one). Without them: grouped by PIN code, nearest PIN to the
 * warehouse first (shared prefix, then numeric distance), so a run works
 * through one locality at a time. Addresses are not geocoded here.
 */
export function orderStops<T extends { _id: string; stop: { postalCode: string; lat?: number; lng?: number } }>(origin: { pincode: string; lat?: number | null; lng?: number | null }, tasks: T[]): T[] {
  const coords = typeof origin.lat === "number" && typeof origin.lng === "number" && tasks.every((t) => typeof t.stop.lat === "number" && typeof t.stop.lng === "number")
  if (coords) {
    const left = [...tasks]
    const out: T[] = []
    let at = { lat: origin.lat as number, lng: origin.lng as number }
    while (left.length) {
      let best = 0
      for (let i = 1; i < left.length; i++) if (haversineKm(at, left[i]!.stop as { lat: number; lng: number }) < haversineKm(at, left[best]!.stop as { lat: number; lng: number })) best = i
      const [next] = left.splice(best, 1)
      out.push(next!)
      at = next!.stop as { lat: number; lng: number }
    }
    return out
  }
  const shared = (a: string, b: string) => {
    let n = 0
    while (n < 6 && a[n] === b[n]) n++
    return n
  }
  return [...tasks].sort(
    (a, b) =>
      shared(b.stop.postalCode, origin.pincode) - shared(a.stop.postalCode, origin.pincode) ||
      Math.abs(Number(a.stop.postalCode) - Number(origin.pincode)) - Math.abs(Number(b.stop.postalCode) - Number(origin.pincode)) ||
      a.stop.postalCode.localeCompare(b.stop.postalCode) ||
      a._id.localeCompare(b._id)
  )
}
