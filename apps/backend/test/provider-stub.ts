import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

/*
 * A local stand-in for the Razorpay, Shiprocket and Delhivery REST APIs, so the payment
 * and shipping code paths run end to end in tests without network access or
 * provider accounts. It implements only the endpoints this codebase calls,
 * with the request/response shapes from the providers' API docs. It does not
 * prove the real providers behave the same; sandbox runs do that.
 */

export type StubPayment = {
  id: string
  order_id: string
  amount: number
  currency: string
  status: "created" | "authorized" | "captured" | "refunded" | "failed"
  method: string
  captured: boolean
  amount_refunded: number
  error_description?: string
  created_at: number
}

export function createProviderStub() {
  const state = {
    rzpOrders: new Map<string, { id: string; amount: number; currency: string; receipt: string; notes: Record<string, string> }>(),
    payments: new Map<string, StubPayment>(),
    refunds: new Map<string, { id: string; payment_id: string; amount: number; status: string; notes: Record<string, string>; receipt?: string }>(),
    /** Next refund call: "ok" | "pending" (accepted, settles later) | "reject" (400) | "timeout" (500, outcome unknown). */
    refundMode: "ok" as "ok" | "pending" | "reject" | "timeout",
    srOrders: new Map<string, { order_id: number; shipment_id: number; ref: string }>(),
    tracking: new Map<string, { shipment_status: number; current_status: string; activities: { date: string; status: string; activity: string; location: string; "sr-status": number; "sr-status-label": string }[] }>(),
    /** Pincodes Shiprocket says no courier serves. */
    unserviceable: new Set<string>(),
    cancelled: new Set<string>(),
    ndrActions: [] as { awb: string; action: string }[],
    /** pickup_location of each order created, by order_id (reference). */
    pickupLocations: new Map<string, string>(),
    manifests: [] as number[][],
    calls: [] as string[],
    /* Delhivery */
    dlv: {
      /** Shipments created, by waybill: the decoded create payload. */
      shipments: new Map<string, { order: string; payment_mode: string; shipping_mode: string; pin: string; weight: string; cod_amount: string; pickup: string; seller_gst_tin?: string }>(),
      /** Tracking per waybill, in Delhivery's ShipmentData shape. */
      tracking: new Map<string, { Status: { Status: string; StatusType: string; StatusDateTime: string; StatusLocation: string; Instructions: string; StatusCode?: string }; Scans: { ScanDetail: Record<string, string> }[] }>(),
      unserviceable: new Set<string>(),
      /** Pincodes Delhivery serves for prepaid only. */
      noCod: new Set<string>(),
      /** When true, the Express charge is refused (lane not offered). */
      noExpress: false,
      cancelled: new Set<string>(),
      pickups: [] as { pickup_location: string; pickup_date: string; expected_package_count: number }[],
      reattempts: [] as string[],
      /** Next create call fails with this remark. */
      failCreate: "" as string,
    },
  }
  let seq = 1000

  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" })
    res.end(JSON.stringify(body))
  }
  const readBody = (req: IncomingMessage) =>
    new Promise<Record<string, any>>((resolve) => {
      let data = ""
      req.on("data", (c) => (data += c))
      req.on("end", () => {
        if (!data) return resolve({})
        if ((req.headers["content-type"] ?? "").includes("application/x-www-form-urlencoded")) return resolve(Object.fromEntries(new URLSearchParams(data)))
        resolve(JSON.parse(data))
      })
    })

  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://stub")
    const path = url.pathname
    const body = req.method === "POST" ? await readBody(req) : {}
    state.calls.push(`${req.method} ${path}`)

    /* ----- Razorpay ----- */
    if (path.startsWith("/v1/") && !path.startsWith("/v1/external")) {
      if (!req.headers.authorization?.startsWith("Basic ")) return json(res, 401, { error: { description: "Authentication failed" } })
      if (req.method === "POST" && path === "/v1/orders") {
        const order = { id: `order_${(seq++).toString(36)}stub`, amount: body.amount, currency: body.currency, receipt: body.receipt, notes: body.notes ?? {} }
        state.rzpOrders.set(order.id, order)
        return json(res, 200, { ...order, entity: "order", amount_paid: 0, amount_due: order.amount, status: "created", attempts: 0, created_at: Math.floor(Date.now() / 1000) })
      }
      let m = path.match(/^\/v1\/orders\/([^/]+)\/payments$/)
      if (m) return json(res, 200, { items: [...state.payments.values()].filter((p) => p.order_id === m![1]) })
      m = path.match(/^\/v1\/payments\/([^/]+)\/capture$/)
      if (m) {
        const p = state.payments.get(m[1]!)
        if (!p) return json(res, 400, { error: { description: "The id provided does not exist" } })
        if (p.status !== "authorized") return json(res, 400, { error: { description: "This payment has already been captured" } })
        p.status = "captured"
        p.captured = true
        return json(res, 200, p)
      }
      m = path.match(/^\/v1\/payments\/([^/]+)\/refunds?$/)
      if (m && req.method === "POST") {
        const p = state.payments.get(m[1]!)
        if (state.refundMode === "timeout") return json(res, 500, { error: { description: "Gateway timeout" } })
        if (state.refundMode === "reject" || !p || p.status !== "captured") return json(res, 400, { error: { description: "The payment has been fully refunded already" } })
        if (p.amount_refunded + body.amount > p.amount) return json(res, 400, { error: { description: "The refund amount provided is greater than amount captured" } })
        p.amount_refunded += body.amount
        const r = { id: `rfnd_${(seq++).toString(36)}`, payment_id: p.id, amount: body.amount, status: state.refundMode === "pending" ? "pending" : "processed", notes: body.notes ?? {}, receipt: body.receipt }
        state.refunds.set(r.id, r)
        return json(res, 200, { ...r, currency: "INR", created_at: Math.floor(Date.now() / 1000) })
      }
      if (m && req.method === "GET") return json(res, 200, { items: [...state.refunds.values()].filter((r) => r.payment_id === m![1]) })
      m = path.match(/^\/v1\/payments\/([^/]+)\/refunds\/([^/]+)$/)
      if (m) {
        const r = state.refunds.get(m[2]!)
        return r ? json(res, 200, r) : json(res, 400, { error: { description: "The id provided does not exist" } })
      }
      m = path.match(/^\/v1\/payments\/([^/]+)$/)
      if (m) {
        const p = state.payments.get(m[1]!)
        return p ? json(res, 200, p) : json(res, 400, { error: { description: "The id provided does not exist" } })
      }
      return json(res, 404, { error: { description: "Not found" } })
    }

    /* ----- Delhivery (every path outside Shiprocket's /v1/external and Razorpay's /v1) ----- */
    if (!path.startsWith("/v1/")) {
      const d = state.dlv
      if (req.headers.authorization !== "Token dlv_stub_token") return json(res, 401, { detail: "Authentication credentials were not provided." })
      if (path === "/c/api/pin-codes/json/") {
        const pin = url.searchParams.get("filter_codes")!
        if (d.unserviceable.has(pin)) return json(res, 200, { delivery_codes: [] })
        const cod = d.noCod.has(pin) ? "N" : "Y"
        return json(res, 200, { delivery_codes: [{ postal_code: { pin: Number(pin), pre_paid: "Y", cash: cod, cod, pickup: "Y", repl: "Y", is_oda: "N", remarks: "", district: "Stub", state_code: "KA" } }] })
      }
      if (path === "/api/kinko/v1/invoice/charges/.json") {
        const md = url.searchParams.get("md")
        if (md === "E" && d.noExpress) return json(res, 400, { error: "Express not available on this lane" })
        const grams = Number(url.searchParams.get("cgm"))
        const base = md === "E" ? 95 : 58
        const total = base + Math.ceil(grams / 500) * 12 + (url.searchParams.get("pt") === "COD" ? 35 : 0)
        return json(res, 200, [{ total_amount: total, gross_amount: total, charge_DL: base }])
      }
      if (path === "/api/cmu/create.json") {
        if (body.format !== "json" || !body.data) return json(res, 400, { rmk: "format=json&data= required" })
        const data = JSON.parse(body.data)
        const sh = data.shipments[0]
        if (d.failCreate) {
          const rmk = d.failCreate
          d.failCreate = ""
          return json(res, 200, { success: false, packages: [{ status: "Fail", waybill: "", refnum: sh.order, remarks: [rmk] }], rmk })
        }
        if ([...d.shipments.values()].some((x) => x.order === sh.order)) return json(res, 200, { success: false, packages: [{ status: "Fail", waybill: "", refnum: sh.order, remarks: ["Duplicate order id"] }] })
        const waybill = String(1234500000000 + seq++)
        d.shipments.set(waybill, { order: sh.order, payment_mode: sh.payment_mode, shipping_mode: sh.shipping_mode, pin: sh.pin, weight: sh.weight, cod_amount: sh.cod_amount, pickup: data.pickup_location.name, ...(sh.seller_gst_tin ? { seller_gst_tin: sh.seller_gst_tin } : {}) })
        const at = "2026-11-05T10:00:00"
        d.tracking.set(waybill, {
          Status: { Status: "Manifested", StatusType: sh.payment_mode === "Pickup" ? "PP" : "UD", StatusDateTime: at, StatusLocation: "Bengaluru_Hub (Karnataka)", Instructions: "Manifest uploaded" },
          Scans: [{ ScanDetail: { Scan: "Manifested", ScanType: sh.payment_mode === "Pickup" ? "PP" : "UD", ScanDateTime: at, ScannedLocation: "Bengaluru_Hub (Karnataka)", Instructions: "Manifest uploaded", StatusCode: "X-UCI" } }],
        })
        return json(res, 200, { success: true, package_count: 1, upload_wbn: `UPL${seq}`, packages: [{ status: "Success", waybill, refnum: sh.order, remarks: [""], serviceable: true }] })
      }
      if (path === "/api/p/packing_slip") {
        const wbn = url.searchParams.get("wbns")!
        if (!d.shipments.has(wbn)) return json(res, 200, { packages: [], packages_found: 0 })
        return json(res, 200, { packages_found: 1, packages: [{ wbn, pdf_download_link: `https://dlv-labels.example/${wbn}.pdf` }] })
      }
      if (path === "/fm/request/new/") {
        const dup = d.pickups.find((p) => p.pickup_location === body.pickup_location && p.pickup_date === body.pickup_date)
        if (dup) return json(res, 400, { pr_exist: true, error: { message: "Pickup request already exists for this date" } })
        d.pickups.push({ pickup_location: body.pickup_location, pickup_date: body.pickup_date, expected_package_count: body.expected_package_count })
        return json(res, 200, { pickup_id: 9000 + d.pickups.length, pickup_date: body.pickup_date, pickup_time: body.pickup_time, incoming_center_name: "Bengaluru_Hub", expected_package_count: body.expected_package_count })
      }
      if (path === "/api/v1/packages/json/") {
        const wbn = url.searchParams.get("waybill")!
        const t = d.tracking.get(wbn)
        if (!t) return json(res, 200, { ShipmentData: [], Error: "No such waybill or Order Id found" })
        const sh = d.shipments.get(wbn)!
        return json(res, 200, { ShipmentData: [{ Shipment: { AWB: wbn, ReferenceNo: sh.order, Status: t.Status, Scans: t.Scans, ExpectedDeliveryDate: "2026-11-10T23:59:59", ...(t.Status.StatusType === "DL" ? { DeliveryDate: t.Status.StatusDateTime } : {}) } }] })
      }
      if (path === "/api/p/edit") {
        const t = d.tracking.get(body.waybill)
        if (!t) return json(res, 200, { status: false, remark: "Waybill not found" })
        if (t.Status.StatusType !== "UD" && t.Status.StatusType !== "PP") return json(res, 200, { status: false, remark: "Shipment cannot be cancelled now" })
        d.cancelled.add(body.waybill)
        t.Status = { ...t.Status, Status: "Canceled", StatusType: "CN" }
        return json(res, 200, { status: true, waybill: body.waybill, remark: "Shipment has been cancelled" })
      }
      if (path === "/api/p/update") {
        for (const x of body.data) d.reattempts.push(x.waybill)
        return json(res, 200, { request_id: `req-${d.reattempts.length}` })
      }
      return json(res, 404, { detail: "Not found" })
    }

    /* ----- Shiprocket ----- */
    if (path === "/v1/external/auth/login") return json(res, 200, { token: "sr_stub_token" })
    if (req.headers.authorization !== "Bearer sr_stub_token") return json(res, 401, { message: "Token has expired" })
    if (path === "/v1/external/courier/serviceability/") {
      const pin = url.searchParams.get("delivery_postcode")!
      if (state.unserviceable.has(pin)) return json(res, 404, { message: "No courier serviceable" })
      return json(res, 200, {
        status: 200,
        data: {
          available_courier_companies: [
            { courier_company_id: 10, courier_name: "Delhivery Surface", rate: 79.5, estimated_delivery_days: "4", etd: "Nov 12, 2026", cod: 1 },
            { courier_company_id: 33, courier_name: "Blue Dart Air", rate: 142, estimated_delivery_days: "2", etd: "Nov 10, 2026", cod: 0 },
          ],
          recommended_courier_company_id: 10,
        },
      })
    }
    if (path === "/v1/external/orders/create/adhoc" || path === "/v1/external/orders/create/return") {
      if ([...state.srOrders.values()].some((o) => o.ref === body.order_id)) return json(res, 422, { message: "Order Id already exists" })
      const o = { order_id: seq++, shipment_id: seq++, ref: body.order_id }
      if (body.pickup_location) state.pickupLocations.set(body.order_id, body.pickup_location)
      state.srOrders.set(String(o.shipment_id), o)
      return json(res, 200, { order_id: o.order_id, shipment_id: o.shipment_id, status: "NEW", status_code: 1 })
    }
    if (path === "/v1/external/courier/assign/awb") {
      const o = state.srOrders.get(String(body.shipment_id))
      if (!o) return json(res, 400, { message: "Invalid shipment" })
      const awb = `AWB${o.shipment_id}`
      const courier = body.courier_id === 33 ? { id: 33, name: "Blue Dart Air" } : { id: 10, name: "Delhivery Surface" }
      state.tracking.set(awb, { shipment_status: 52, current_status: "SHIPMENT BOOKED", activities: [] })
      return json(res, 200, { awb_assign_status: 1, response: { data: { awb_code: awb, courier_company_id: courier.id, courier_name: courier.name } } })
    }
    if (path === "/v1/external/courier/generate/pickup")
      return json(res, 200, { pickup_status: 1, response: { pickup_scheduled_date: "2026-11-07 10:00:00", pickup_token_number: "PKT-77" } })
    if (path === "/v1/external/courier/generate/label") return json(res, 200, { label_created: 1, label_url: `https://labels.example/${body.shipment_id[0]}.pdf` })
    if (path === "/v1/external/manifests/generate") {
      state.manifests.push(body.shipment_id)
      return json(res, 200, { status: 1, manifest_url: `https://manifests.example/${body.shipment_id.join("-")}.pdf` })
    }
    if (path === "/v1/external/orders/cancel") {
      for (const id of body.ids) state.cancelled.add(String(id))
      return json(res, 200, { status: 200, message: "Order cancelled" })
    }
    let m = path.match(/^\/v1\/external\/courier\/track\/awb\/(.+)$/)
    if (m) {
      const t = state.tracking.get(decodeURIComponent(m[1]!))
      if (!t) return json(res, 404, { message: "AWB not found" })
      return json(res, 200, {
        tracking_data: {
          track_status: 1,
          shipment_status: t.shipment_status,
          shipment_track: [{ current_status: t.current_status, edd: "2026-11-11 18:00:00" }],
          shipment_track_activities: t.activities,
          track_url: `https://shiprocket.co/tracking/${m[1]}`,
        },
      })
    }
    m = path.match(/^\/v1\/external\/ndr\/(.+)\/action$/)
    if (m) {
      state.ndrActions.push({ awb: decodeURIComponent(m[1]!), action: body.action })
      return json(res, 200, { status: true })
    }
    return json(res, 404, { message: "Not found" })
  })

  return {
    state,
    async start() {
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", r))
      return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
    /** A Delhivery scan on a waybill, as its hub would record it; returns the scan-push body Delhivery would send. */
    dlvScan(waybill: string, scan: { Status: string; StatusType: string; at: string; location?: string; instructions?: string; code?: string }) {
      const t = state.dlv.tracking.get(waybill)!
      const detail = { Scan: scan.Status, ScanType: scan.StatusType, ScanDateTime: scan.at, ScannedLocation: scan.location ?? "Bengaluru_Hub (Karnataka)", Instructions: scan.instructions ?? "", ...(scan.code ? { StatusCode: scan.code } : {}) }
      t.Scans.push({ ScanDetail: detail })
      t.Status = { Status: scan.Status, StatusType: scan.StatusType, StatusDateTime: scan.at, StatusLocation: detail.ScannedLocation, Instructions: detail.Instructions, ...(scan.code ? { StatusCode: scan.code } : {}) }
      return { Shipment: { AWB: waybill, ReferenceNo: state.dlv.shipments.get(waybill)!.order, Status: t.Status, NSLCode: scan.code ?? "", PickUpDate: "2026-11-05T14:00:00" } }
    },
    /** What the checkout window does when a shopper pays: a payment on the Razorpay order. */
    pay(orderId: string, opts: { status?: StubPayment["status"]; amount?: number } = {}) {
      const order = state.rzpOrders.get(orderId)!
      const p: StubPayment = {
        id: `pay_${(seq++).toString(36)}stub`,
        order_id: orderId,
        amount: opts.amount ?? order.amount,
        currency: order.currency,
        status: opts.status ?? "captured",
        method: "upi",
        captured: (opts.status ?? "captured") === "captured",
        amount_refunded: 0,
        ...(opts.status === "failed" ? { error_description: "Payment declined by bank" } : {}),
        created_at: Math.floor(Date.now() / 1000),
      }
      state.payments.set(p.id, p)
      return p
    },
  }
}
