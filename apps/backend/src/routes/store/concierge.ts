import { Router } from "express"
import { z } from "zod"
import { db, type ConciergeBookingDoc } from "../../db/schema.js"
import { clientKey, optionalAuth, rateLimit } from "../../lib/auth.js"
import { ApiError, badRequest } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"

export const conciergeRoutes = Router()

/** Bookings one phone number (or one client) may file per hour. */
const LIMIT = { max: 5, windowMs: 60 * 60 * 1000 }
/** How far ahead an appointment can be requested. */
const MAX_DAYS_AHEAD = 90

const DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Concierge appointment requests from the storefront's /concierge page.
 *
 * Public, like the page: a shopper does not need an account to ask for a
 * styling session. A signed-in customer's id is attached when present. The
 * desk confirms each request by phone, so this only records it and hands back
 * a reference.
 */
conciergeRoutes.post("/concierge/bookings", optionalAuth("customer"), async (req, res) => {
  const body = z
    .object({
      service: z.enum(["virtual", "home", "flagship"]),
      location: z.string().trim().min(2).max(120),
      name: z.string().trim().min(2).max(120),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
      date: z.string().regex(DAY, "Use a YYYY-MM-DD date"),
      slot: z.string().trim().min(2).max(80),
      occasions: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
      stylist: z.string().trim().max(120).nullish(),
      notes: z.string().trim().max(2000).default(""),
    })
    .parse(req.body)

  // The requested day must be today or later, and not absurdly far out.
  const today = new Date().toISOString().slice(0, 10)
  const latest = new Date(Date.now() + MAX_DAYS_AHEAD * 86_400_000).toISOString().slice(0, 10)
  if (body.date < today) throw badRequest("Choose today or a later date", "date_in_past")
  if (body.date > latest) throw badRequest(`Choose a date within ${MAX_DAYS_AHEAD} days`, "date_too_far")

  const digits = body.phone.replace(/\D/g, "")
  if (
    !rateLimit(`concierge:phone:${digits}`, LIMIT.max, LIMIT.windowMs) ||
    !rateLimit(`concierge:${clientKey(req, "booking")}`, LIMIT.max * 4, LIMIT.windowMs)
  ) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please try again later.")
  }

  const counter = await db
    .counters()
    .findOneAndUpdate({ _id: "concierge" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })

  const now = new Date()
  const booking: ConciergeBookingDoc = {
    _id: newId("cnc"),
    reference: `CNC-${now.getFullYear()}-${1000 + (counter?.seq ?? 1)}`,
    service: body.service,
    location: body.location,
    name: body.name,
    phone: body.phone,
    date: body.date,
    slot: body.slot,
    occasions: [...new Set(body.occasions)],
    stylist: body.stylist || null,
    notes: body.notes,
    customerId: req.actorId ?? null,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  }
  await db.conciergeBookings().insertOne(booking)

  res.status(201).json({
    booking: { id: booking._id, reference: booking.reference, status: booking.status },
  })
})
