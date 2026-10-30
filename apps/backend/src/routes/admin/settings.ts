import { Router } from "express"
import { z } from "zod"
import { db, type SettingsDoc } from "../../db/schema.js"
import { forbidden } from "../../lib/errors.js"

export const adminSettingsRoutes = Router()

/** The id of the one settings document; there is only ever one store here. */
export const SETTINGS_ID = "store"

const DEFAULTS = {
  storeName: "AVELIQ",
  lowStockThreshold: 5,
} as const

const toAdminSettings = (doc: SettingsDoc | null) => ({
  storeName: doc?.storeName ?? DEFAULTS.storeName,
  lowStockThreshold: doc?.lowStockThreshold ?? DEFAULTS.lowStockThreshold,
  supportEmail: doc?.supportEmail ?? null,
  updatedAt: doc?.updatedAt ?? null,
})

/**
 * Reads the store settings, falling back to the defaults the API shipped with,
 * so a store that has never saved any still answers.
 */
export const getSettings = async () => toAdminSettings(await db.settings().findOne({ _id: SETTINGS_ID }))

adminSettingsRoutes.get("/settings", async (_req, res) => {
  res.json({ settings: await getSettings() })
})

adminSettingsRoutes.patch("/settings", async (req, res) => {
  // Settings change what every other screen reports, so only an owner may.
  if (req.admin!.role !== "owner") throw forbidden("Only an owner can change settings")

  const body = z
    .object({
      storeName: z.string().trim().min(1).max(100).optional(),
      lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
      supportEmail: z.string().trim().email().max(200).nullable().optional(),
    })
    .strict()
    .parse(req.body)

  const { supportEmail, ...rest } = body
  await db.settings().updateOne(
    { _id: SETTINGS_ID },
    {
      $set: { ...rest, ...(supportEmail ? { supportEmail } : {}), updatedAt: new Date() },
      ...(supportEmail === null ? { $unset: { supportEmail: "" } } : {}),
      $setOnInsert: { _id: SETTINGS_ID },
    },
    { upsert: true }
  )

  res.json({ settings: await getSettings() })
})
