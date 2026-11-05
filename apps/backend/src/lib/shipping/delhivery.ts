import { env } from "../../env.js"
import { ProviderError, providerJson } from "../providers/http.js"
import type { CourierQuote, ShiprocketOrderInput, ShiprocketParty, TrackingScan } from "./shiprocket.js"

/*
 * Delhivery B2C ("Delhivery One" express) API, used directly with the store's
 * own Delhivery account rather than through an aggregator.
 *
 *   Base URL     production https://track.delhivery.com,
 *                staging    https://staging-express.delhivery.com
 *   Auth         header "Authorization: Token <API token>" (Delhivery One >
 *                Settings > API setup)
 *   Pickup       a warehouse registered on Delhivery, referred to by its exact
 *                registered name (DELHIVERY_PICKUP_LOCATION, or per warehouse)
 *
 * Delhivery assigns the waybill (AWB) when the shipment is created, so there
 * is no separate courier-assignment step. Weights go in grams, money in rupees.
 * Delhivery has no manifest document of its own: a parcel is "Manifested"
 * from creation, and the warehouse's own manifest is used for handover.
 */

export const isDelhiveryConfigured = () => env.SHIPPING_PROVIDER !== "none" && !!(env.DELHIVERY_API_TOKEN && env.DELHIVERY_PICKUP_LOCATION)

const base = () => env.DELHIVERY_API_BASE.replace(/\/$/, "")

async function call<T>(path: string, options: Parameters<typeof providerJson>[2] = {}): Promise<T> {
  if (!isDelhiveryConfigured()) throw new Error("Delhivery is not configured (DELHIVERY_API_TOKEN, DELHIVERY_PICKUP_LOCATION).")
  return providerJson<T>("Delhivery", `${base()}${path}`, { ...options, headers: { authorization: `Token ${env.DELHIVERY_API_TOKEN}`, ...options.headers } })
}

const rupees = (p: number) => Math.round(p) / 100
const paise = (r: number | string | null | undefined) => Math.round(Number(r ?? 0) * 100)
const digits = (phone: string) => phone.replace(/\D/g, "").slice(-10)

/** Delivery modes, offered as two "couriers" so they can be chosen like Shiprocket's. */
export const DELHIVERY_MODES = { 1: { mode: "Surface", code: "S" }, 2: { mode: "Express", code: "E" } } as const
export type DelhiveryModeId = keyof typeof DELHIVERY_MODES
export const delhiveryMode = (courierId?: number | null) => DELHIVERY_MODES[(courierId === 2 ? 2 : 1) as DelhiveryModeId]

type PinInfo = { pin: number; pre_paid?: string; cash?: string; cod?: string; pickup?: string; repl?: string; is_oda?: string; remarks?: string; state_code?: string; district?: string }

/** Whether Delhivery delivers to a pincode, and with which payment modes. Null when it doesn't. */
export async function delhiveryPincode(pincode: string) {
  const res = await call<{ delivery_codes?: { postal_code: PinInfo }[] }>(`/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`)
  const p = res.delivery_codes?.[0]?.postal_code
  // An embargoed pincode is listed with remarks "Embargo": not serviceable now.
  if (!p || /embargo/i.test(p.remarks ?? "")) return null
  return { prepaid: p.pre_paid === "Y", cod: p.cod === "Y" || p.cash === "Y", pickup: p.pickup === "Y", oda: p.is_oda === "Y" }
}

/** Delhivery's shipping charge for a parcel (rupees in, paise out). */
async function delhiveryCharge(params: { mode: "S" | "E"; origin: string; destination: string; grams: number; cod: boolean; codAmount: number }) {
  const q = new URLSearchParams({
    md: params.mode,
    ss: "Delivered",
    o_pin: params.origin,
    d_pin: params.destination,
    cgm: String(Math.max(1, Math.round(params.grams))),
    pt: params.cod ? "COD" : "Pre-paid",
    cod: String(params.cod ? rupees(params.codAmount) : 0),
  })
  const res = await call<{ total_amount?: number | string }[] | { total_amount?: number | string }>(`/api/kinko/v1/invoice/charges/.json?${q}`)
  const row = Array.isArray(res) ? res[0] : res
  return row?.total_amount != null ? paise(row.total_amount) : null
}

/** Surface and Express quotes to a pincode; empty when Delhivery doesn't serve it for this payment mode. */
export async function delhiveryServiceability(params: { pickupPincode: string; deliveryPincode: string; weightKg: number; cod: boolean; codAmount?: number }) {
  const pin = await delhiveryPincode(params.deliveryPincode)
  if (!pin || (params.cod ? !pin.cod : !pin.prepaid)) return { couriers: [] as CourierQuote[], recommendedId: null }
  const couriers: CourierQuote[] = []
  for (const [id, m] of Object.entries(DELHIVERY_MODES)) {
    let rate: number | null = null
    try {
      rate = await delhiveryCharge({ mode: m.code, origin: params.pickupPincode, destination: params.deliveryPincode, grams: params.weightKg * 1000, cod: params.cod, codAmount: params.codAmount ?? 0 })
    } catch (e) {
      // Express isn't offered on every lane; a refused quote just leaves it out.
      if (!(e instanceof ProviderError) || e.uncertain) throw e
    }
    if (rate == null) continue
    couriers.push({ courierId: Number(id), name: `Delhivery ${m.mode}`, rate, etdDays: null, etd: null, cod: pin.cod })
  }
  const cheapest = [...couriers].sort((a, b) => a.rate - b.rate)[0]
  return { couriers, recommendedId: cheapest?.courierId ?? null }
}

type CreateResponse = {
  success?: boolean
  error?: boolean
  rmk?: string
  packages?: { status?: string; waybill?: string; refnum?: string; remarks?: string[] | string; serviceable?: boolean }[]
}

const remark = (r: CreateResponse) => {
  const p = r.packages?.[0]
  const text = Array.isArray(p?.remarks) ? p!.remarks.join("; ") : (p?.remarks ?? "")
  return text || r.rmk || "unknown reason"
}

export type DelhiveryShipmentInput = ShiprocketOrderInput & {
  mode: "Surface" | "Express"
  /** "Pickup" books a reverse pickup from `customer` to the pickup location. */
  kind: "forward" | "reverse"
  seller?: { name: string; address: string; gstin?: string }
  /** Where an undelivered parcel goes back to; defaults to the pickup location. */
  returnTo?: ShiprocketParty
}

/**
 * Creates the shipment; Delhivery assigns the waybill in the same call.
 * Delhivery refuses a repeated order reference, so a retry can't book twice.
 */
export async function delhiveryCreateShipment(input: DelhiveryShipmentInput) {
  const c = input.customer
  const shipment: Record<string, unknown> = {
    name: [c.name, c.lastName].filter(Boolean).join(" "),
    add: [c.address, c.address2].filter(Boolean).join(", "),
    pin: c.pincode,
    city: c.city,
    state: c.state,
    country: c.country,
    phone: digits(c.phone),
    order: input.orderRef,
    payment_mode: input.kind === "reverse" ? "Pickup" : input.paymentMethod === "COD" ? "COD" : "Prepaid",
    products_desc: input.items.map((i) => `${i.name} x${i.units}`).join(", ").slice(0, 200),
    cod_amount: input.kind === "forward" && input.paymentMethod === "COD" ? String(rupees(input.subTotal)) : "0",
    order_date: input.orderDate.toISOString(),
    total_amount: String(rupees(input.subTotal)),
    quantity: String(input.items.reduce((n, i) => n + i.units, 0)),
    waybill: "",
    shipment_length: String(input.parcel.lengthCm),
    shipment_width: String(input.parcel.breadthCm),
    shipment_height: String(input.parcel.heightCm),
    weight: String(Math.round(input.parcel.weightKg * 1000)),
    shipping_mode: input.mode,
    address_type: "home",
    ...(input.seller ? { seller_name: input.seller.name, seller_add: input.seller.address, ...(input.seller.gstin ? { seller_gst_tin: input.seller.gstin } : {}) } : {}),
    ...(input.returnTo
      ? { return_name: input.returnTo.name, return_add: input.returnTo.address, return_pin: input.returnTo.pincode, return_city: input.returnTo.city, return_state: input.returnTo.state, return_country: input.returnTo.country, return_phone: digits(input.returnTo.phone) }
      : {}),
  }
  const data = { shipments: [shipment], pickup_location: { name: input.pickupLocation || env.DELHIVERY_PICKUP_LOCATION } }
  // The create API takes a form body: format=json&data=<JSON>.
  const res = await call<CreateResponse>("/api/cmu/create.json", { method: "POST", form: { format: "json", data: JSON.stringify(data) } })
  const p = res.packages?.[0]
  if (!p?.waybill || (p.status && p.status.toLowerCase() !== "success")) {
    throw new ProviderError("Delhivery", 422, `Delhivery could not create the shipment: ${remark(res)}`, res)
  }
  return { awb: p.waybill, mode: input.mode }
}

/** The packing slip (label) as a PDF link. */
export async function delhiveryLabel(waybill: string) {
  const res = await call<{ packages?: { pdf_download_link?: string; wbn?: string }[] }>(`/api/p/packing_slip?wbns=${encodeURIComponent(waybill)}&pdf=true`)
  const url = res.packages?.[0]?.pdf_download_link
  if (!url) throw new ProviderError("Delhivery", 422, "Delhivery did not return a label for this waybill", res)
  return { labelUrl: url }
}

/**
 * Asks Delhivery to collect from a registered warehouse. One request covers
 * every parcel at that warehouse that day; asking again for the same day is
 * answered "already exists", which is treated as done.
 */
export async function delhiveryPickupRequest(params: { location: string; date: Date; count: number; time?: string }) {
  const ist = new Date(params.date.getTime() + 330 * 60_000)
  const body = { pickup_location: params.location, pickup_date: ist.toISOString().slice(0, 10), pickup_time: params.time ?? "14:00:00", expected_package_count: params.count }
  try {
    const res = await call<{ pickup_id?: number | string; pickup_date?: string; incoming_center_name?: string; pr_exist?: boolean; error?: unknown }>("/fm/request/new/", { method: "POST", body })
    if (res.pickup_id == null && !res.pr_exist) throw new ProviderError("Delhivery", 422, "Delhivery did not confirm the pickup", res)
    return { token: res.pickup_id != null ? String(res.pickup_id) : undefined, scheduledFor: new Date(`${body.pickup_date}T${body.pickup_time}+05:30`), existing: !!res.pr_exist }
  } catch (e) {
    // Delhivery answers 400 with pr_exist when today's pickup is already booked.
    if (e instanceof ProviderError && (e.body as { pr_exist?: boolean } | undefined)?.pr_exist) {
      return { token: undefined, scheduledFor: new Date(`${body.pickup_date}T${body.pickup_time}+05:30`), existing: true }
    }
    throw e
  }
}

type DelhiveryScan = { ScanDetail: { Scan: string; ScanType: string; ScanDateTime: string; ScannedLocation?: string; Instructions?: string; StatusCode?: string; StatusDateTime?: string } }
export type DelhiveryShipmentData = {
  AWB?: string
  ReferenceNo?: string
  Status?: { Status: string; StatusType: string; StatusDateTime?: string; StatusLocation?: string; Instructions?: string; StatusCode?: string }
  Scans?: DelhiveryScan[]
  ExpectedDeliveryDate?: string | null
  PromisedDeliveryDate?: string | null
  DeliveryDate?: string | null
  NSLCode?: string
}

/** Scans and status in the shape the shipping service merges (Delhivery times are IST without an offset). */
export function delhiveryTrackingOf(s: DelhiveryShipmentData) {
  const scans: TrackingScan[] = (s.Scans ?? []).map(({ ScanDetail: d }) => ({
    date: d.ScanDateTime ?? d.StatusDateTime ?? "",
    status: d.Scan,
    statusId: d.ScanType,
    code: d.StatusCode,
    activity: d.Instructions ?? "",
    location: d.ScannedLocation ?? "",
  }))
  const istDate = (v?: string | null) => (v ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}+05:30`) : null)
  return {
    statusId: s.Status?.StatusType ?? null,
    statusLabel: s.Status?.Status ?? null,
    statusCode: s.Status?.StatusCode ?? s.NSLCode ?? null,
    edd: istDate(s.ExpectedDeliveryDate ?? s.PromisedDeliveryDate),
    deliveredAt: s.Status?.StatusType === "DL" ? istDate(s.DeliveryDate ?? s.Status?.StatusDateTime) : null,
    trackingUrl: s.AWB ? `https://www.delhivery.com/track-v2/package/${encodeURIComponent(s.AWB)}` : null,
    scans,
  }
}

export async function delhiveryTrack(waybill: string) {
  const res = await call<{ ShipmentData?: { Shipment: DelhiveryShipmentData }[]; Error?: string }>(`/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`)
  const s = res.ShipmentData?.[0]?.Shipment
  if (!s) throw new ProviderError("Delhivery", 404, `Delhivery has no tracking for ${waybill}${res.Error ? `: ${res.Error}` : ""}`, res)
  return delhiveryTrackingOf(s)
}

/** Cancels a shipment that hasn't been picked up. */
export async function delhiveryCancel(waybill: string) {
  const res = await call<{ status?: boolean | string; remark?: string; error?: string }>("/api/p/edit", { method: "POST", body: { waybill, cancellation: "true" } })
  if (res.status === false || res.status === "false") throw new ProviderError("Delhivery", 422, `Delhivery could not cancel: ${res.remark ?? res.error ?? "unknown reason"}`, res)
}

/** Asks Delhivery to attempt delivery again (NDR "RE-ATTEMPT"). */
export async function delhiveryReattempt(waybill: string) {
  const res = await call<{ request_id?: string; error?: string }>("/api/p/update", { method: "POST", body: { data: [{ waybill, act: "RE-ATTEMPT" }] } })
  if (!res.request_id) throw new ProviderError("Delhivery", 422, `Delhivery did not accept the re-attempt: ${res.error ?? "unknown reason"}`, res)
  return { requestId: res.request_id }
}
