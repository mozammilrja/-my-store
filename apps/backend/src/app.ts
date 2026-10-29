import cors from "cors"
import express, { type ErrorRequestHandler, type Express } from "express"
import helmet from "helmet"
import morgan from "morgan"
import { MongoServerError } from "mongodb"
import { ZodError, z } from "zod"
import { getDb } from "./db/client.js"
import { env } from "./env.js"
import { ApiError } from "./lib/errors.js"
import { cartRoutes } from "./routes/store/carts.js"
import { catalogRoutes } from "./routes/store/catalog.js"
import { customerRoutes } from "./routes/store/customers.js"
import { adminAuthRoutes, requireAdmin } from "./routes/admin/auth.js"
import { adminOrderRoutes } from "./routes/admin/orders.js"
import { adminProductRoutes } from "./routes/admin/products.js"
import { adminStoreRoutes } from "./routes/admin/store.js"

/** Turns anything thrown by a route into the API's error shape. */
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: "invalid_request", message: "Invalid request", issues: z.flattenError(err).fieldErrors } })
    return
  }
  if (err instanceof MongoServerError && err.code === 11000) {
    res.status(409).json({ error: { code: "duplicate", message: "That value is already in use" } })
    return
  }
  // Raised by the JSON body parser.
  const type = (err as { type?: string }).type
  if (type === "entity.too.large") {
    res.status(413).json({ error: { code: "payload_too_large", message: "That request is too large" } })
    return
  }
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "invalid_json", message: "The request body isn't valid JSON" } })
    return
  }
  console.error(err)
  // Never leak internals to clients.
  res.status(500).json({ error: { code: "server_error", message: "Something went wrong" } })
}

export function createApp(): Express {
  const app = express()

  app.disable("x-powered-by")
  // Repeated values become arrays (`?tag=a&tag=b`) and nothing is read as a nested object.
  app.set("query parser", "simple")

  app.use(helmet())
  if (env.NODE_ENV === "development") app.use(morgan("dev"))

  // Each audience only accepts its own browser origins.
  app.use("/store", cors({ origin: env.STORE_CORS, credentials: true }))
  app.use("/admin", cors({ origin: env.ADMIN_CORS, credentials: true }))

  // 1 MB for JSON; image uploads are multipart and carry their own limit.
  app.use(express.json({ limit: "1mb" }))

  // Uploaded product images. Long cache: file names change when content does.
  app.use(
    "/uploads",
    express.static(env.UPLOADS_DIR, {
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin")
      },
    })
  )

  app.get("/health", async (_req, res) => {
    await getDb().command({ ping: 1 })
    res.json({ status: "ok" })
  })

  app.use("/store", catalogRoutes, customerRoutes, cartRoutes)

  app.use("/admin", adminAuthRoutes)
  // Everything past the login route needs a signed-in admin.
  app.use("/admin", ...requireAdmin, adminOrderRoutes, adminProductRoutes, adminStoreRoutes)

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Route not found" } })
  })

  app.use(errorHandler)

  return app
}
