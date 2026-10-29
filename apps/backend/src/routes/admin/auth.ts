import { Router, type RequestHandler } from "express"
import { z } from "zod"
import { db } from "../../db/schema.js"
import { clientKey, issueToken, rateLimit, requireAuth, verifyPassword } from "../../lib/auth.js"
import { ApiError, unauthorized } from "../../lib/errors.js"
import { email } from "../../lib/validation.js"

export const adminAuthRoutes = Router()

adminAuthRoutes.post("/auth/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body)
  if (!rateLimit(`admin-login:${clientKey(req, body.email)}`, 5, 15 * 60 * 1000)) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again later.")
  }
  const admin = await db.adminUsers().findOne({ email: body.email })
  if (!(await verifyPassword(body.password, admin?.passwordHash)) || !admin) {
    throw unauthorized("Email or password is incorrect")
  }
  res.json({ token: issueToken("admin", admin._id) })
})

/** Loads the signed-in admin onto the request, or rejects if the account is gone. */
const loadAdmin: RequestHandler = async (req, _res, next) => {
  const admin = await db.adminUsers().findOne({ _id: req.actorId! }, { projection: { passwordHash: 0 } })
  if (!admin) throw unauthorized()
  req.admin = { id: admin._id, email: admin.email, name: admin.name ?? null, role: admin.role }
  next()
}

/** Every admin route past the login needs a valid token for an admin that still exists. */
export const requireAdmin = [requireAuth("admin"), loadAdmin] as const

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; email: string; name: string | null; role: "owner" | "staff" }
    }
  }
}
