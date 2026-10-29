import { createApp } from "./app.js"
import { connect, disconnect } from "./db/client.js"
import { ensureIndexes } from "./db/schema.js"
import { env } from "./env.js"

await connect()
await ensureIndexes()

const server = createApp().listen(env.PORT, () => {
  console.log(`Everwear API listening on http://localhost:${env.PORT}`)
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
