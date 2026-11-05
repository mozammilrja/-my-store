import { Router } from "express"
import { z } from "zod"
import { db } from "../../db/schema.js"
import { clientKey, rateLimit } from "../../lib/auth.js"
import { ApiError } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { email } from "../../lib/validation.js"

export const newsletterRoutes = Router()

/** Sign-ups one client may send per hour. */
const LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }

/**
 * Newsletter sign-up from the storefront footers. Public. Signing up twice is
 * not an error: the address is stored once and the latest source is kept.
 */
newsletterRoutes.post("/newsletter", async (req, res) => {
  const body = z
    .object({
      email,
      source: z.string().trim().min(1).max(60).default("footer"),
    })
    .parse(req.body)

  if (!rateLimit(`newsletter:${clientKey(req, "signup")}`, LIMIT.max, LIMIT.windowMs)) {
    throw new ApiError(429, "rate_limited", "Too many sign-ups. Try again later.")
  }

  const now = new Date()
  await db.newsletterSubscribers().updateOne(
    { email: body.email },
    {
      $set: { source: body.source, updatedAt: now },
      $setOnInsert: { _id: newId("nl"), email: body.email, createdAt: now },
    },
    { upsert: true }
  )
  res.status(201).json({ subscribed: true })
})
