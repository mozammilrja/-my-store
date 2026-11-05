import { MongoBulkWriteError } from "mongodb"
import { db, type NotificationChannel, type NotificationDeliveryDoc, type NotificationEvent, type OrderDoc } from "../../db/schema.js"
import { openOtp } from "../fleet/support.js"
import { newId } from "../ids.js"
import { log } from "../log.js"
import { indianMobile, SendError, type SendResult } from "./providers/common.js"
import { emailProvider, sendEmail } from "./providers/email.js"
import { fcmReady, sendFcm, sendWebPush, webPushReady } from "./providers/push.js"
import { sendSms, smsProvider, smsTemplateMissing } from "./providers/sms.js"
import { sendWhatsApp, whatsappProvider, whatsappTemplateMissing } from "./providers/whatsapp.js"
import { CHANNELS, FEED_WRITTEN_ELSEWHERE, render, type EventData, type Rendered } from "./templates.js"

/*
 * Outbound notifications. Something happens -> `notify*` decides who hears
 * about it and on which channels, renders the message and queues one
 * delivery per recipient and channel under a unique key (so a repeated
 * webhook or retry never sends twice). The worker (`deliverDue`, every few
 * seconds in the API process) sends them, retries failures with backoff and
 * moves a message that keeps failing to the dead-letter state for an admin.
 */

const BACKOFF_MIN = [1, 5, 30, 120, 360]
const MAX_ATTEMPTS = BACKOFF_MIN.length

type Recipient = NotificationDeliveryDoc["recipient"]
type Target = { channel: NotificationChannel; recipient: Recipient }

async function enqueue(event: NotificationEvent, key: string, targets: Target[], r: Rendered, extra: Pick<NotificationDeliveryDoc, "orderId" | "secret"> = {}) {
  if (!targets.length) return 0
  const now = new Date()
  const docs: NotificationDeliveryDoc[] = targets.map((t) => ({
    _id: newId("ntf"),
    key: `${key}:${t.channel}:${t.recipient.type}:${t.recipient.id}`,
    event,
    channel: t.channel,
    recipient: t.recipient,
    content: {
      ...(t.channel === "email" ? { subject: r.subject, html: r.html } : {}),
      ...(t.channel === "push" ? { title: r.title, url: r.url } : {}),
      text: t.channel === "email" ? r.text : t.channel === "push" ? r.body : r.sms,
      params: r.params,
    },
    ...(extra.secret ? { secret: extra.secret } : {}),
    ...(extra.orderId ? { orderId: extra.orderId } : {}),
    status: "queued",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  }))
  try {
    const res = await db.notificationDeliveries().insertMany(docs, { ordered: false })
    return res.insertedCount
  } catch (e) {
    // Already queued under the same key: that's the duplicate guard working.
    if (e instanceof MongoBulkWriteError && [e.writeErrors].flat().every((w) => w.code === 11000)) return e.insertedCount
    throw e
  }
}

const hasPush = async (ownerType: "customer" | "rider" | "warehouse", ownerId: string) => (webPushReady() || fcmReady()) && (await db.pushSubscriptions().countDocuments({ ownerType, ownerId })) > 0

/** Tells an order's customer (or guest) through the channels the event uses and their preferences allow. */
export async function notifyCustomer(order: OrderDoc, event: NotificationEvent, key: string, data: EventData = {}, extra: Pick<NotificationDeliveryDoc, "secret"> = {}) {
  const customer = order.customerId ? await db.customers().findOne({ _id: order.customerId }) : null
  const prefs = customer?.notificationPrefs ?? { email: true, sms: true, whatsapp: false, push: true }
  const phone = indianMobile(order.shippingAddress.phone) ?? indianMobile(customer?.phone)
  const email = customer?.email ?? order.email
  const who: Recipient = customer ? { type: "customer", id: customer._id, to: "" } : { type: "guest", id: order.email, to: "" }
  const r = render(event, { firstName: order.shippingAddress.firstName, orderId: order._id, displayId: order.displayId, total: order.totals.total, ...data })
  const targets: Target[] = []
  for (const channel of CHANNELS[event]) {
    if (channel === "email" && prefs.email && email) targets.push({ channel, recipient: { ...who, to: email } })
    if (channel === "sms" && prefs.sms && phone) targets.push({ channel, recipient: { ...who, to: phone } })
    if (channel === "whatsapp" && prefs.whatsapp && phone) targets.push({ channel, recipient: { ...who, to: phone } })
    if (channel === "push" && prefs.push && customer && (await hasPush("customer", customer._id))) targets.push({ channel, recipient: { ...who, to: "" } })
  }
  if (customer && !FEED_WRITTEN_ELSEWHERE.includes(event)) {
    await db.notifications().updateOne(
      { "metadata.key": key },
      {
        $setOnInsert: {
          _id: newId("notif"),
          recipientType: "customer",
          recipientId: customer._id,
          type: event === "refund_processed" ? "refund_processed" : event === "return_update" ? "return_status" : "shipment_update",
          title: r.title,
          message: r.body,
          channel: "in_app",
          status: "unread",
          metadata: { key, orderId: order._id, event },
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )
  }
  return enqueue(event, key, targets, r, { orderId: order._id, ...extra })
}

/** Tells the active staff of a warehouse (push to their devices, and email). */
export async function notifyWarehouse(warehouseId: string, event: NotificationEvent, key: string, data: EventData) {
  const staff = await db.warehouseUsers().find({ warehouseIds: warehouseId, status: "active" }).toArray()
  const r = render(event, data)
  const targets: Target[] = []
  for (const u of staff) {
    if (CHANNELS[event].includes("push") && (await hasPush("warehouse", u._id))) targets.push({ channel: "push", recipient: { type: "warehouse", id: u._id, to: "" } })
    if (CHANNELS[event].includes("email")) targets.push({ channel: "email", recipient: { type: "warehouse", id: u._id, to: u.email } })
  }
  return enqueue(event, key, targets, r, { ...(data.orderId ? { orderId: data.orderId } : {}) })
}

/** Tells a rider (push to their phone, and SMS where the event uses it). */
export async function notifyRider(riderId: string, event: NotificationEvent, key: string, data: EventData) {
  const rider = await db.riders().findOne({ _id: riderId })
  if (!rider) return 0
  const r = render(event, data)
  const targets: Target[] = []
  if (CHANNELS[event].includes("push") && (await hasPush("rider", rider._id))) targets.push({ channel: "push", recipient: { type: "rider", id: rider._id, to: "" } })
  if (CHANNELS[event].includes("sms") && indianMobile(rider.phone)) targets.push({ channel: "sms", recipient: { type: "rider", id: rider._id, to: indianMobile(rider.phone)! } })
  return enqueue(event, key, targets, r)
}

/* ---------- Sending ---------- */

async function templatesFor(event: NotificationEvent) {
  const s = await db.settings().findOne({ _id: "store" }, { projection: { notificationTemplates: 1 } })
  return s?.notificationTemplates?.[event] ?? {}
}

/** The delivery OTP, decrypted now; null when that delivery no longer has a live code. */
async function liveOtp(taskId: string) {
  const task = await db.deliveryTasks().findOne({ _id: taskId })
  return task?.status === "out_for_delivery" && task.otp ? openOtp(task.otp) : null
}

class Skip extends Error {}

async function send(d: NotificationDeliveryDoc): Promise<SendResult> {
  let { text, params } = d.content
  if (d.secret?.otpTaskId && d.channel !== "push") {
    const otp = await liveOtp(d.secret.otpTaskId)
    if (!otp) throw new Skip("The delivery code is no longer valid")
    text = text.replaceAll("{otp}", otp)
    params = params.map((p) => p.replaceAll("{otp}", otp))
  }
  const t = await templatesFor(d.event)
  switch (d.channel) {
    case "email":
      if (!emailProvider()) throw new Skip("No email provider configured")
      return sendEmail({ to: d.recipient.to, subject: d.content.subject ?? "", text, ...(d.content.html ? { html: d.content.html } : {}) })
    case "sms":
      if (!smsProvider()) throw new Skip("No SMS provider configured")
      if (smsTemplateMissing({ msg91FlowId: t.msg91FlowId })) throw new Skip(`No MSG91 flow id set for ${d.event}`)
      return sendSms({ to: d.recipient.to, text, params, ...(t.msg91FlowId ? { msg91FlowId: t.msg91FlowId } : {}) })
    case "whatsapp":
      if (!whatsappProvider()) throw new Skip("No WhatsApp provider configured")
      if (whatsappTemplateMissing({ template: t.whatsapp, gupshupTemplateId: t.gupshupTemplateId })) throw new Skip(`No approved WhatsApp template set for ${d.event}`)
      return sendWhatsApp({ to: d.recipient.to, params, ...(t.whatsapp ? { template: t.whatsapp } : {}), ...(t.gupshupTemplateId ? { gupshupTemplateId: t.gupshupTemplateId } : {}) })
    case "push": {
      const owner = d.recipient.type === "guest" ? null : d.recipient.type
      const subs = owner ? await db.pushSubscriptions().find({ ownerType: owner, ownerId: d.recipient.id }).toArray() : []
      const usable = subs.filter((s) => (s.kind === "webpush" ? webPushReady() : fcmReady()))
      if (!usable.length) throw new Skip("No push devices")
      const message = { title: d.content.title ?? "", body: text, url: d.content.url ?? "", tag: d.event }
      let first: SendResult | null = null
      let lastError: SendError | null = null
      for (const s of usable) {
        try {
          const r = s.kind === "webpush" ? await sendWebPush(s, message) : await sendFcm(s, message)
          first ??= r
          await db.pushSubscriptions().updateOne({ _id: s._id }, { $set: { lastSuccessAt: new Date(), failures: 0 } })
        } catch (e) {
          const err = e instanceof SendError ? e : new SendError((e as Error).message, true)
          // The browser or app unsubscribed: forget the device.
          if (err.gone) await db.pushSubscriptions().deleteOne({ _id: s._id })
          else await db.pushSubscriptions().updateOne({ _id: s._id }, { $inc: { failures: 1 } })
          lastError = err
        }
      }
      if (first) return first
      throw lastError ?? new SendError("Push failed", true)
    }
  }
}

/**
 * Sends what's due. Each message is claimed first (queued -> sending, with
 * a lease) so two API processes never send the same one; a lease left by a
 * crashed process expires and the message is picked up again (at-least-once).
 */
export async function deliverDue(limit = 50) {
  const now = new Date()
  let handled = 0
  for (let i = 0; i < limit; i++) {
    const d = await db.notificationDeliveries().findOneAndUpdate(
      { $or: [{ status: "queued", nextAttemptAt: { $lte: now } }, { status: "sending", lockedUntil: { $lt: now } }] },
      { $set: { status: "sending", lockedUntil: new Date(Date.now() + 2 * 60_000), updatedAt: new Date() } },
      { sort: { nextAttemptAt: 1 }, returnDocument: "after" }
    )
    if (!d) break
    handled++
    try {
      const r = await send(d)
      await db.notificationDeliveries().updateOne({ _id: d._id }, { $set: { status: "sent", provider: r.provider, providerMessageId: r.messageId, sentAt: new Date(), lockedUntil: null, updatedAt: new Date() }, $inc: { attempts: 1 } })
    } catch (e) {
      if (e instanceof Skip) {
        await db.notificationDeliveries().updateOne({ _id: d._id }, { $set: { status: "skipped", skipReason: e.message, sentAt: new Date(), lockedUntil: null, updatedAt: new Date() } })
        continue
      }
      const err = e instanceof SendError ? e : new SendError((e as Error).message, true)
      const attempts = d.attempts + 1
      const dead = !err.retry || attempts >= MAX_ATTEMPTS
      await db.notificationDeliveries().updateOne(
        { _id: d._id },
        { $set: { status: dead ? "dead" : "queued", attempts, lastError: err.message.slice(0, 500), lockedUntil: null, updatedAt: new Date(), ...(dead ? {} : { nextAttemptAt: new Date(Date.now() + BACKOFF_MIN[attempts - 1]! * 60_000) }) } }
      )
      if (dead) log.warn("notification.dead", { id: d._id, event: d.event, channel: d.channel, error: err.message })
    }
  }
  return handled
}

/** Admin: send a dead-letter message again from scratch. */
export async function retryDelivery(id: string) {
  const res = await db.notificationDeliveries().updateOne({ _id: id, status: "dead" }, { $set: { status: "queued", attempts: 0, nextAttemptAt: new Date(), updatedAt: new Date() }, $unset: { lastError: "" } })
  return res.modifiedCount === 1
}

/** Which channels can actually send right now, for the admin and the docs. */
export function channelStatus() {
  return {
    email: emailProvider(),
    sms: smsProvider(),
    whatsapp: whatsappProvider(),
    push: { webPush: webPushReady(), fcm: fcmReady() },
  }
}

/** Runs a notification step without letting its failure affect the business action that triggered it. */
export function announce(what: string, fn: () => Promise<unknown>) {
  return fn().catch((e) => log.error("notification.enqueue_failed", { what, error: (e as Error).message }))
}
