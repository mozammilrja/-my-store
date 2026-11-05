import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

/*
 * A local stand-in for the Razorpay and Shiprocket REST APIs, so the payment
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
    /** Next refund call: "ok" | "reject" (400) | "timeout" (500, outcome unknown). */
    refundMode: "ok" as "ok" | "reject" | "timeout",
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
      req.on("end", () => resolve(data ? JSON.parse(data) : {}))
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
        const r = { id: `rfnd_${(seq++).toString(36)}`, payment_id: p.id, amount: body.amount, status: "processed", notes: body.notes ?? {}, receipt: body.receipt }
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
