import { createApp } from "./app.js"
import { connect, disconnect } from "./db/client.js"
import { ensureIndexes, syncOrderCounter } from "./db/schema.js"
import { env } from "./env.js"
import { processOutboxEvents, expireStaleReservations } from "./lib/outbox-worker.js"

await connect()
await ensureIndexes()
await syncOrderCounter()

const outboxTimer = setInterval(async () => {
  try {
    await processOutboxEvents()
    await expireStaleReservations()
  } catch {
    // quiet catch in background timer
  }
}, 10000)
outboxTimer.unref()

const server = createApp().listen(env.PORT, () => {
  console.log(`Everwear API listening on http://localhost:${env.PORT}`)
})

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`)
  clearInterval(outboxTimer)
  server.close(async () => {
    await disconnect()
    process.exit(0)
  })
}
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
