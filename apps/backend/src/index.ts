import { createApp } from "./app.js"
import { connect, disconnect } from "./db/client.js"
import { ensureIndexes, syncOrderCounter } from "./db/schema.js"
import { env } from "./env.js"
import { ensureSiteMedia } from "./lib/site-media.js"
import { processOutboxEvents, expireStaleReservations } from "./lib/outbox-worker.js"
import { log } from "./lib/log.js"
import { reconcileRefunds } from "./lib/payments/refunds.js"
import { reconcilePaymentAttempts } from "./lib/payments/settle.js"
import { syncStaleShipments } from "./lib/shipping/service.js"

await connect()
await ensureIndexes()
await syncOrderCounter()
await ensureSiteMedia()

const outboxTimer = setInterval(async () => {
  try {
    await processOutboxEvents()
    await expireStaleReservations()
  } catch {
    // quiet catch in background timer
  }
}, 10000)
outboxTimer.unref()

// Payments and parcels whose outcome we may have missed (closed browser, lost
// webhook): settled, expired or refreshed from the provider every 2 minutes.
let sweeping = false
const providerTimer = setInterval(async () => {
  if (sweeping) return
  sweeping = true
  try {
    await reconcilePaymentAttempts()
    await reconcileRefunds()
    await syncStaleShipments()
  } catch (e) {
    log.error("sweep.failed", { error: (e as Error).message })
  } finally {
    sweeping = false
  }
}, 120_000)
providerTimer.unref()

const server = createApp().listen(env.PORT, () => {
  console.log(`Everwear API listening on http://localhost:${env.PORT}`)
})

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`)
  clearInterval(outboxTimer)
  clearInterval(providerTimer)
  server.close(async () => {
    await disconnect()
    process.exit(0)
  })
}
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
