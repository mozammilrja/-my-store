import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"
import { MongoServerError } from "mongodb"
import { ZodError, z } from "zod"
import { getDb } from "./db/client.js"
import { env } from "./env.js"
import { ApiError } from "./lib/errors.js"
import { cartRoutes } from "./routes/store/carts.js"
import { catalogRoutes } from "./routes/store/catalog.js"
import { customerRoutes } from "./routes/store/customers.js"

export function createApp() {
  const app = new Hono()

  app.use("*", secureHeaders())
  app.use("*", bodyLimit({ maxSize: 1024 * 1024 }))
  if (env.NODE_ENV === "development") app.use("*", logger())

  // Each audience only accepts its own browser origins.
  app.use("/store/*", cors({ origin: env.STORE_CORS, credentials: true }))
  app.use("/admin/*", cors({ origin: env.ADMIN_CORS, credentials: true }))

  app.get("/health", async (c) => {
    await getDb().command({ ping: 1 })
    return c.json({ status: "ok" })
  })

  app.route("/store", catalogRoutes)
  app.route("/store", customerRoutes)
  app.route("/store", cartRoutes)

  app.notFound((c) => c.json({ error: { code: "not_found", message: "Route not found" } }, 404))

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: { code: err.code, message: err.message } }, err.status)
    }
    if (err instanceof ZodError) {
      return c.json(
        { error: { code: "invalid_request", message: "Invalid request", issues: z.flattenError(err).fieldErrors } },
        400
      )
    }
    if (err instanceof HTTPException) {
      return c.json({ error: { code: "http_error", message: err.message } }, err.status)
    }
    if (err instanceof MongoServerError && err.code === 11000) {
      return c.json({ error: { code: "duplicate", message: "That value is already in use" } }, 409)
    }
    console.error(err)
    // Never leak internals to clients.
    return c.json({ error: { code: "server_error", message: "Something went wrong" } }, 500)
  })

  return app
}
