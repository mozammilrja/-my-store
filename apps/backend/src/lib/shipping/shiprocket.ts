import { env } from "../../env.js"
import { ProviderError, providerJson } from "../providers/http.js"

/*
 * Shiprocket External API v1 (https://apidocs.shiprocket.in). One account
 * reaches many couriers (Delhivery, Blue Dart, Xpressbees, Ekart, ...).
 * Shiprocket quotes rupees as decimals; this module converts to paise.
 */

export const isShiprocketConfigured = () =>
  env.SHIPPING_PROVIDER !== "none" && !!(env.SHIPROCKET_EMAIL && env.SHIPROCKET_PASSWORD && env.SHIPROCKET_PICKUP_LOCATION)

const base = () => `${env.SHIPROCKET_API_BASE}/v1/external`

/** API token: valid for 10 days; refreshed a day early, or at once when Shiprocket rejects it. */
let token: { value: string; expiresAt: number } | null = null

async function login(): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value
  const res = await providerJson<{ token: string }>("Shiprocket", `${base()}/auth/login`, {
    method: "POST",
    body: { email: env.SHIPROCKET_EMAIL, password: env.SHIPROCKET_PASSWORD },
  })
  token = { value: res.token, expiresAt: Date.now() + 9 * 24 * 3600_000 }
  return token.value
}

async function call<T>(path: string, options: Parameters<typeof providerJson>[2] = {}): Promise<T> {
  if (!isShiprocketConfigured()) throw new Error("Shiprocket is not configured (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_PICKUP_LOCATION).")
  const run = async () => providerJson<T>("Shiprocket", `${base()}${path}`, { ...options, headers: { authorization: `Bearer ${await login()}`, ...options.headers } })
  try {
    return await run()
  } catch (e) {
    if (e instanceof ProviderError && e.status === 401) {
      token = null
      return run()
    }
    throw e
  }
}

/** Test hook: forget the cached token. */
export const resetShiprocketToken = () => {
  token = null
}

const paise = (rupees: number | string | null | undefined) => Math.round(Number(rupees ?? 0) * 100)
const rupees = (p: number) => Math.round(p) / 100

export type CourierQuote = {
  courierId: number
  name: string
  /** Freight charge in paise. */
  rate: number
  /** Days to deliver, as the courier estimates; null when not given. */
  etdDays: number | null
  etd: string | null
  cod: boolean
}

/** Couriers that deliver between two pincodes for this weight, with rates. Empty when not serviceable. */
export async function shiprocketServiceability(params: { pickupPincode: string; deliveryPincode: string; weightKg: number; cod: boolean }) {
  const q = new URLSearchParams({
    pickup_postcode: params.pickupPincode,
    delivery_postcode: params.deliveryPincode,
    weight: String(params.weightKg),
    cod: params.cod ? "1" : "0",
  })
  try {
    const res = await call<{
      data?: {
        available_courier_companies?: {
          courier_company_id: number
          courier_name: string
          rate: number | string
          estimated_delivery_days?: string | number
          etd?: string
          cod?: number
        }[]
        recommended_courier_company_id?: number
      }
    }>(`/courier/serviceability/?${q}`)
    const couriers: CourierQuote[] = (res.data?.available_courier_companies ?? []).map((c) => ({
      courierId: c.courier_company_id,
      name: c.courier_name,
      rate: paise(c.rate),
      etdDays: c.estimated_delivery_days != null && c.estimated_delivery_days !== "" ? Number(c.estimated_delivery_days) : null,
      etd: c.etd ?? null,
      cod: c.cod === 1,
    }))
    return { couriers, recommendedId: res.data?.recommended_courier_company_id ?? null }
  } catch (e) {
    // Shiprocket answers 404 when no courier serves the pincode pair.
    if (e instanceof ProviderError && (e.status === 404 || e.status === 422)) return { couriers: [] as CourierQuote[], recommendedId: null }
    throw e
  }
}

export type ShiprocketParty = {
  name: string
  lastName?: string
  address: string
  address2?: string
  city: string
  state: string
  pincode: string
  country: string
  email: string
  phone: string
}

export type ShiprocketOrderInput = {
  /** Our reference, unique per Shiprocket order (order display id, or "R<id>" for returns). */
  orderRef: string
  orderDate: Date
  customer: ShiprocketParty
  items: { name: string; sku: string; units: number; sellingPrice: number }[]
  paymentMethod: "Prepaid" | "COD"
  /** Order value in paise (the COD amount for COD orders). */
  subTotal: number
  parcel: { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number }
  /** Pickup address nickname on Shiprocket; defaults to SHIPROCKET_PICKUP_LOCATION. */
  pickupLocation?: string
}

const orderDate = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ")

/** Creates the order on Shiprocket (no courier yet). Shiprocket rejects a repeated order_id, so a retry can't create two. */
export async function shiprocketCreateOrder(input: ShiprocketOrderInput) {
  const c = input.customer
  const res = await call<{ order_id: number; shipment_id: number; status: string; status_code?: number }>("/orders/create/adhoc", {
    method: "POST",
    body: {
      order_id: input.orderRef,
      order_date: orderDate(input.orderDate),
      pickup_location: input.pickupLocation || env.SHIPROCKET_PICKUP_LOCATION,
      billing_customer_name: c.name,
      billing_last_name: c.lastName ?? "",
      billing_address: c.address,
      billing_address_2: c.address2 ?? "",
      billing_city: c.city,
      billing_pincode: c.pincode,
      billing_state: c.state,
      billing_country: c.country,
      billing_email: c.email,
      billing_phone: c.phone,
      shipping_is_billing: true,
      order_items: input.items.map((i) => ({ name: i.name, sku: i.sku, units: i.units, selling_price: rupees(i.sellingPrice) })),
      payment_method: input.paymentMethod,
      sub_total: rupees(input.subTotal),
      length: input.parcel.lengthCm,
      breadth: input.parcel.breadthCm,
      height: input.parcel.heightCm,
      weight: input.parcel.weightKg,
    },
  })
  if (!res.shipment_id) throw new ProviderError("Shiprocket", 422, "Shiprocket did not return a shipment id", res)
  return { providerOrderId: String(res.order_id), providerShipmentId: String(res.shipment_id), status: res.status }
}

/** Assigns a courier and AWB. Without courierId, Shiprocket picks its recommended courier. */
export async function shiprocketAssignAwb(providerShipmentId: string, courierId?: number) {
  const res = await call<{
    awb_assign_status?: number
    response?: { data?: { awb_code?: string; courier_company_id?: number; courier_name?: string } }
    message?: string
  }>("/courier/assign/awb", {
    method: "POST",
    body: { shipment_id: Number(providerShipmentId), ...(courierId ? { courier_id: courierId } : {}) },
  })
  const data = res.response?.data
  if (res.awb_assign_status !== 1 || !data?.awb_code) {
    throw new ProviderError("Shiprocket", 422, `Shiprocket could not assign an AWB: ${res.message ?? "no courier available"}`, res)
  }
  return { awb: data.awb_code, courierId: data.courier_company_id ?? courierId ?? null, courierName: data.courier_name ?? "" }
}

/** Asks the courier to collect the parcel. Returns the date the courier gave. */
export async function shiprocketSchedulePickup(providerShipmentId: string) {
  const res = await call<{ pickup_status?: number; response?: { pickup_scheduled_date?: string; pickup_token_number?: string; data?: string } }>(
    "/courier/generate/pickup",
    { method: "POST", body: { shipment_id: [Number(providerShipmentId)] } }
  )
  if (res.pickup_status !== 1) throw new ProviderError("Shiprocket", 422, `Shiprocket could not schedule the pickup: ${res.response?.data ?? "unknown reason"}`, res)
  const when = res.response?.pickup_scheduled_date
  return { scheduledFor: when ? new Date(when) : undefined, token: res.response?.pickup_token_number }
}

export async function shiprocketLabel(providerShipmentId: string) {
  const res = await call<{ label_created?: number; label_url?: string; response?: string }>("/courier/generate/label", {
    method: "POST",
    body: { shipment_id: [Number(providerShipmentId)] },
  })
  if (!res.label_url) throw new ProviderError("Shiprocket", 422, `Shiprocket could not generate the label: ${res.response ?? "unknown reason"}`, res)
  return { labelUrl: res.label_url }
}

export async function shiprocketManifest(providerShipmentIds: string | string[]) {
  const ids = (Array.isArray(providerShipmentIds) ? providerShipmentIds : [providerShipmentIds]).map(Number)
  const res = await call<{ manifest_url?: string }>("/manifests/generate", { method: "POST", body: { shipment_id: ids } })
  return { manifestUrl: res.manifest_url ?? null }
}

export type TrackingScan = { date: string; status: string; statusId?: number | string; code?: string; activity: string; location: string }

export async function shiprocketTrack(awb: string) {
  const res = await call<{
    tracking_data?: {
      track_status?: number
      shipment_status?: number
      shipment_track?: { current_status?: string; edd?: string | null; delivered_date?: string | null }[]
      shipment_track_activities?: { date: string; status: string; activity: string; location: string; "sr-status"?: number | string; "sr-status-label"?: string }[]
      track_url?: string
      error?: string
    }
  }>(`/courier/track/awb/${encodeURIComponent(awb)}`)
  const t = res.tracking_data ?? {}
  const head = t.shipment_track?.[0]
  const scans: TrackingScan[] = (t.shipment_track_activities ?? []).map((a) => ({
    date: a.date,
    status: a["sr-status-label"] || a.status,
    statusId: a["sr-status"],
    activity: a.activity,
    location: a.location,
  }))
  return {
    statusId: t.shipment_status ?? null,
    statusLabel: head?.current_status ?? null,
    edd: head?.edd ? new Date(head.edd) : null,
    deliveredAt: head?.delivered_date ? new Date(head.delivered_date) : null,
    trackingUrl: t.track_url ?? null,
    scans,
  }
}

/** Cancels a Shiprocket order (and its AWB) before pickup. */
export async function shiprocketCancel(providerOrderId: string) {
  await call("/orders/cancel", { method: "POST", body: { ids: [Number(providerOrderId)] } })
}

/** A reverse pickup from the customer back to the pickup location. */
export async function shiprocketCreateReturn(input: ShiprocketOrderInput & { warehouse: ShiprocketParty }) {
  const c = input.customer
  const w = input.warehouse
  const res = await call<{ order_id: number; shipment_id: number; status: string }>("/orders/create/return", {
    method: "POST",
    body: {
      order_id: input.orderRef,
      order_date: orderDate(input.orderDate),
      pickup_customer_name: c.name,
      pickup_last_name: c.lastName ?? "",
      pickup_address: c.address,
      pickup_address_2: c.address2 ?? "",
      pickup_city: c.city,
      pickup_state: c.state,
      pickup_country: c.country,
      pickup_pincode: c.pincode,
      pickup_email: c.email,
      pickup_phone: c.phone,
      shipping_customer_name: w.name,
      shipping_address: w.address,
      shipping_city: w.city,
      shipping_state: w.state,
      shipping_country: w.country,
      shipping_pincode: w.pincode,
      shipping_email: w.email,
      shipping_phone: w.phone,
      order_items: input.items.map((i) => ({ name: i.name, sku: i.sku, units: i.units, selling_price: rupees(i.sellingPrice) })),
      payment_method: "Prepaid",
      sub_total: rupees(input.subTotal),
      length: input.parcel.lengthCm,
      breadth: input.parcel.breadthCm,
      height: input.parcel.heightCm,
      weight: input.parcel.weightKg,
    },
  })
  if (!res.shipment_id) throw new ProviderError("Shiprocket", 422, "Shiprocket did not return a return shipment id", res)
  return { providerOrderId: String(res.order_id), providerShipmentId: String(res.shipment_id) }
}

/** Answers a non-delivery report: try again, or send the parcel back. */
export async function shiprocketNdrAction(awb: string, action: "reattempt" | "return", comment: string) {
  await call(`/ndr/${encodeURIComponent(awb)}/action`, {
    method: "POST",
    body: { action: action === "reattempt" ? "re-attempt" : "return", comments: comment },
  })
}
