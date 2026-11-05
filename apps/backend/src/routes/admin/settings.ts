import { Router } from "express"
import { z } from "zod"
import { db, type SellerDetails, type SettingsDoc } from "../../db/schema.js"
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
  seller: toSeller(doc?.seller),
  updatedAt: doc?.updatedAt ?? null,
})

/** Every seller field, null when unset, so clients never guess at a shape. */
export const toSeller = (s?: SellerDetails | null) => ({
  legalName: s?.legalName ?? null,
  gstin: s?.gstin ?? null,
  cin: s?.cin ?? null,
  address: s?.address ?? null,
  state: s?.state ?? null,
  email: s?.email ?? null,
  phone: s?.phone ?? null,
})

/** GSTIN: 2-digit state code, 10-character PAN, entity number, "Z", check character. */
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
/** CIN: listing status, industry code, state, year, company type, registration number. */
const CIN = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/

const sellerSchema = z
  .object({
    legalName: z.string().trim().min(1).max(160).nullable(),
    gstin: z.string().trim().toUpperCase().regex(GSTIN, "Enter a valid 15-character GSTIN").nullable(),
    cin: z.string().trim().toUpperCase().regex(CIN, "Enter a valid 21-character CIN").nullable(),
    address: z.string().trim().min(5).max(400).nullable(),
    state: z.string().trim().min(2).max(60).nullable(),
    email: z.string().trim().toLowerCase().email().max(200).nullable(),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number").nullable(),
  })
  .partial()
  .strict()

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
      seller: sellerSchema.optional(),
    })
    .strict()
    .parse(req.body)

  const { supportEmail, seller, ...rest } = body
  // Seller fields are set or cleared one by one, so a partial update never wipes the rest.
  const sellerSet: Record<string, string> = {}
  const unset: Record<string, ""> = {}
  for (const [key, value] of Object.entries(seller ?? {})) {
    if (value === null) unset[`seller.${key}`] = ""
    else if (value !== undefined) sellerSet[`seller.${key}`] = value
  }
  if (supportEmail === null) unset.supportEmail = ""
  await db.settings().updateOne(
    { _id: SETTINGS_ID },
    {
      $set: { ...rest, ...(supportEmail ? { supportEmail } : {}), ...sellerSet, updatedAt: new Date() },
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
      $setOnInsert: { _id: SETTINGS_ID },
    },
    { upsert: true }
  )

  res.json({ settings: await getSettings() })
})
