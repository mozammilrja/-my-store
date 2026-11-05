import type { NotificationChannel, NotificationEvent } from "../../db/schema.js"
import { env } from "../../env.js"

/*
 * What each event says, per channel. Email and push are written here in
 * full. SMS and WhatsApp in India go through templates registered with the
 * provider (DLT for SMS, Meta approval for WhatsApp): `params` are the
 * template's variables in order, and `text` is the plain SMS for Twilio. The
 * variable order per event is listed in docs/NOTIFICATIONS.md so templates
 * can be registered to match.
 */

/** Email subject/text/html; push title/body/url; `params` for SMS and WhatsApp templates; `sms` the plain text for free-text SMS (Twilio). */
export type Rendered = { subject: string; text: string; html: string; title: string; body: string; url: string; params: string[]; sms: string }

const inr = (paise: number) => `Rs ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export type EventData = {
  firstName?: string
  orderId?: string
  displayId?: number
  total?: number
  amount?: number
  carrier?: string
  awb?: string
  reason?: string
  returnCode?: string
  returnStatus?: string
  fulfilmentCode?: string
  warehouseCode?: string
  area?: string
  cashDue?: number | null
  riderFirstName?: string
}

/** Which channels each event uses (before preferences and provider availability). */
export const CHANNELS: Record<NotificationEvent, NotificationChannel[]> = {
  order_confirmed: ["email", "sms", "whatsapp", "push"],
  payment_received: ["email", "push"],
  order_packed: ["email", "push"],
  order_shipped: ["email", "sms", "whatsapp", "push"],
  out_for_delivery: ["sms", "whatsapp", "push"],
  delivery_otp: ["sms", "whatsapp", "push"],
  delivered: ["email", "sms", "whatsapp", "push"],
  delivery_failed: ["email", "sms", "whatsapp", "push"],
  return_update: ["email", "whatsapp", "push"],
  refund_processed: ["email", "sms", "whatsapp", "push"],
  fulfilment_assigned: ["email", "push"],
  delivery_offered: ["sms", "push"],
  delivery_assigned: ["sms", "push"],
  delivery_unassigned: ["push"],
}

/** Events that don't add a row to the customer's in-app feed (it's written where they happen). */
export const FEED_WRITTEN_ELSEWHERE: NotificationEvent[] = ["order_confirmed", "return_update"]

function html(title: string, lines: string[], cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ec;font-family:Helvetica,Arial,sans-serif;color:#16171b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbfaf6;border:1px solid #e7e2d6">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e7e2d6;font-size:18px;letter-spacing:2px;font-weight:700">EVERWEAR</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#3d3c39">${esc(l)}</p>`).join("\n")}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#16171b;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px;letter-spacing:1px">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e7e2d6;font-size:12px;color:#5e5c57">You're receiving this because of an order with Everwear. Manage notifications in your account.</td></tr>
</table></td></tr></table></body></html>`
}

export function render(event: NotificationEvent, d: EventData): Rendered {
  const order = d.displayId ? `#${d.displayId}` : ""
  const track = d.orderId ? `${env.STOREFRONT_URL}/order/${d.orderId}/track` : env.STOREFRONT_URL
  const returns = `${env.STOREFRONT_URL}/account/returns`
  const hi = d.firstName ? `Hi ${d.firstName},` : "Hello,"
  const make = (title: string, lines: string[], url: string, cta: string, params: string[], sms: string, push = lines[0] ?? title): Rendered => ({
    subject: title,
    text: [hi, ...lines, "", `${cta}: ${url}`].join("\n"),
    html: html(title, [hi, ...lines], { label: cta, url }),
    title,
    body: push,
    url,
    params,
    sms,
  })

  switch (event) {
    case "order_confirmed":
      return make(`Order ${order} confirmed`, [`Thank you for shopping with Everwear. Your order ${order} for ${inr(d.total ?? 0)} is confirmed and is being prepared.`], track, "Track your order", [d.firstName ?? "there", order, inr(d.total ?? 0)], `Your Everwear order ${order} for ${inr(d.total ?? 0)} is confirmed. Track: ${track} - Everwear`)
    case "payment_received":
      return make(`Payment received for ${order}`, [`We've received ${inr(d.amount ?? 0)} for order ${order}. Thank you.`], track, "View your order", [order, inr(d.amount ?? 0)], `Payment of ${inr(d.amount ?? 0)} received for Everwear order ${order}. - Everwear`)
    case "order_packed":
      return make(`Order ${order} is packed`, [`Your order ${order} has been packed and will be handed to the courier shortly.`], track, "Track your order", [order], `Your Everwear order ${order} is packed. - Everwear`)
    case "order_shipped":
      return make(`Order ${order} has shipped`, [`Your order ${order} is on its way with ${d.carrier ?? "our courier"}${d.awb ? ` (AWB ${d.awb})` : ""}.`], track, "Track your order", [order, d.carrier ?? "our courier", d.awb ?? ""], `Your Everwear order ${order} has shipped with ${d.carrier ?? "our courier"}${d.awb ? `, AWB ${d.awb}` : ""}. Track: ${track} - Everwear`)
    case "out_for_delivery":
      return make(`Order ${order} is out for delivery`, [`Your order ${order} is out for delivery today with ${d.riderFirstName ?? d.carrier ?? "our courier"}.${d.cashDue ? ` Please keep ${inr(d.cashDue)} ready in cash.` : ""}`], track, "Track your order", [order, d.riderFirstName ?? d.carrier ?? "our courier"], `Your Everwear order ${order} is out for delivery today.${d.cashDue ? ` Keep ${inr(d.cashDue)} ready.` : ""} - Everwear`)
    case "delivery_otp":
      // `{otp}` is filled in only when the message is sent; push never carries it.
      return make(`Delivery code for ${order}`, [`Share code {otp} with our rider only when you have your order ${order}.`], track, "Open your order", ["{otp}", order], `{otp} is your Everwear delivery code for order ${order}. Share it only with the rider when you receive your parcel. - Everwear`, `Your delivery code for ${order} is on your order page. Share it only when you have the parcel.`)
    case "delivered":
      return make(`Order ${order} delivered`, [`Your order ${order} has been delivered. We hope you love it.`], returns, "Need to return something?", [order], `Your Everwear order ${order} has been delivered. - Everwear`)
    case "delivery_failed":
      return make(`We couldn't deliver ${order}`, [`We tried to deliver your order ${order}${d.reason ? ` but ${d.reason}` : ""}. We'll try again; you can also update your delivery details.`], track, "View your order", [order, d.reason ?? "no one was available"], `We couldn't deliver Everwear order ${order}${d.reason ? ` (${d.reason})` : ""}. We'll try again. - Everwear`)
    case "return_update":
      return make(`${d.returnCode}: ${d.returnStatus}`, [`Your return ${d.returnCode} for order ${order} is now: ${d.returnStatus}.`], returns, "See your return", [d.returnCode ?? "", d.returnStatus ?? ""], `Everwear return ${d.returnCode}: ${d.returnStatus}. - Everwear`)
    case "refund_processed":
      return make(`Refund of ${inr(d.amount ?? 0)} processed`, [`We've refunded ${inr(d.amount ?? 0)} for order ${order} to your original payment method. Banks usually show it within 5-7 working days.`], returns, "See your refunds", [inr(d.amount ?? 0), order], `Refund of ${inr(d.amount ?? 0)} for Everwear order ${order} has been processed. - Everwear`)
    case "fulfilment_assigned":
      return make(`New order ${d.fulfilmentCode} for ${d.warehouseCode}`, [`Order ${order} (${d.fulfilmentCode}) has been allocated to ${d.warehouseCode}. Accept it to start picking.`], `${env.WAREHOUSE_APP_URL}/`, "Open the warehouse app", [d.fulfilmentCode ?? "", d.warehouseCode ?? ""], `New Everwear order ${d.fulfilmentCode} at ${d.warehouseCode}. - Everwear`)
    case "delivery_offered":
      return make(`New delivery offer`, [`A delivery to ${d.area}${d.cashDue ? ` (collect ${inr(d.cashDue)})` : ""} is waiting for you. Accept it in the app.`], `${env.RIDER_APP_URL}/`, "Open the rider app", [d.area ?? "", d.cashDue ? inr(d.cashDue) : "prepaid"], `New Everwear delivery offer to ${d.area}. Open the rider app to accept. - Everwear`)
    case "delivery_assigned":
      return make(`Delivery ${d.awb} assigned to you`, [`Your hub assigned delivery ${d.awb} to you. Collect it from the hub.`], `${env.RIDER_APP_URL}/`, "Open the rider app", [d.awb ?? ""], `Everwear delivery ${d.awb} has been assigned to you. - Everwear`)
    case "delivery_unassigned":
      return make(`Delivery ${d.awb} reassigned`, [`Delivery ${d.awb} is no longer on your route.`], `${env.RIDER_APP_URL}/`, "Open the rider app", [d.awb ?? ""], `Everwear delivery ${d.awb} was reassigned. - Everwear`)
  }
}

