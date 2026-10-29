import { serve } from "@hono/node-server"
import { createApp } from "./app.js"
import { connect, disconnect } from "./db/client.js"
import { ensureIndexes } from "./db/schema.js"
import { env } from "./env.js"

await connect()
await ensureIndexes()

const server = serve({ fetch: createApp().fetch, port: env.PORT }, (info) => {
  console.log(`Everwear API listening on http://localhost:${info.port}`)
})

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`)
  server.close(async () => {
    await disconnect()
    process.exit(0)
  })
}
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
