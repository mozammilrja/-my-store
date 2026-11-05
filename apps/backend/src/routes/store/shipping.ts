import { createHash, timingSafeEqual } from "node:crypto"
import { Router } from "express"
import { z } from "zod"
import { db } from "../../db/schema.js"
import { env } from "../../env.js"
import { log } from "../../lib/log.js"
import { claimWebhookEvent } from "../../lib/providers/webhook-events.js"
import { applyShiprocketWebhook, serviceability, type ShiprocketWebhook } from "../../lib/shipping/service.js"
import { clientKey, rateLimit } from "../../lib/auth.js"
import { ApiError } from "../../lib/errors.js"

export const storeShippingRoutes = Router()

/**
 * Can couriers deliver to this pincode, how fast and for how much. Answers
 * `configured: false` when no courier integration is set up, so checkout falls
 * back to the region's own delivery options instead of quoting invented times.
 */
storeShippingRoutes.get("/shipping/serviceability", async (req, res) => {
  if (!rateLimit(clientKey(req, "serviceability"), 60, 60_000)) throw new ApiError(429, "rate_limited", "Too many checks. Try again in a minute.")
  const q = z.object({ pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit pincode"), cod: z.enum(["true", "false"]).default("false") }).parse(req.query)
  const result = await serviceability(q.pincode, { cod: q.cod === "true" })
  if (!result.configured) {
    res.json({ configured: false })
    return
  }
  const fastest = result.couriers.reduce<number | null>((m, c) => (c.etdDays != null && (m == null || c.etdDays < m) ? c.etdDays : m), null)
  res.json({
    configured: true,
    serviceable: result.serviceable,
    codAvailable: result.couriers.some((c) => c.cod),
    // Shoppers see the delivery window, not each courier's freight rate.
    fastestDays: fastest,
    slowestDays: result.couriers.reduce<number | null>((m, c) => (c.etdDays != null && (m == null || c.etdDays > m) ? c.etdDays : m), null),
  })
})

const tokenMatches = (given: string | undefined) => {
  const expected = env.SHIPROCKET_WEBHOOK_TOKEN
  if (!expected || !given) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Shiprocket tracking webhook (Settings > API > Webhooks; the URL may not
 * contain "shiprocket"). Authenticated by the x-api-key token configured there.
 * Each status update is applied once.
 */
storeShippingRoutes.post("/webhooks/courier-tracking", async (req, res) => {
  if (!env.SHIPROCKET_WEBHOOK_TOKEN) {
    res.status(503).json({ error: { code: "webhook_unconfigured", message: "Webhook token not configured" } })
    return
  }
  if (!tokenMatches(req.header("x-api-key"))) {
    log.warn("webhook.courier_bad_token", {})
    res.status(401).json({ error: { code: "unauthorized", message: "Invalid token" } })
    return
  }
  const body = req.body as ShiprocketWebhook
  const rawBody = (req as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(body))
  const eventId = createHash("sha256").update(rawBody).digest("hex")
  const claim = await claimWebhookEvent("shiprocket", eventId, body.shipment_status ?? body.current_status ?? "tracking", body, "")
  if (claim !== "new") {
    res.json({ status: "ok", duplicate: claim === "done" })
    return
  }
  try {
    const outcome = await applyShiprocketWebhook(body)
    await db.paymentWebhookEvents().updateOne({ provider: "shiprocket", eventId }, { $set: { status: outcome, processedAt: new Date() } })
  } catch (e) {
    const message = (e as Error).message
    await db.paymentWebhookEvents().updateOne({ provider: "shiprocket", eventId }, { $set: { status: "failed", error: message.slice(0, 500) } })
    log.error("webhook.courier_failed", { awb: String(body.awb ?? ""), error: message })
  }
  // Shiprocket expects a 200; a failed update is retried by the tracking sweep.
  res.json({ status: "ok" })
})
