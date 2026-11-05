import { Router } from "express"
import { db } from "../../db/schema.js"
import { SETTINGS_ID, toSeller } from "../admin/settings.js"

export const sellerRoutes = Router()

/**
 * The seller of record's legal details, as printed on every tax invoice
 * (legal name, GSTIN, CIN, registered address, contact). Public: the same
 * details appear on each invoice a customer receives. Owners edit them through
 * PATCH /admin/settings. Unset fields are null.
 */
sellerRoutes.get("/seller", async (_req, res) => {
  const doc = await db.settings().findOne({ _id: SETTINGS_ID }, { projection: { seller: 1 } })
  res.json({ seller: toSeller(doc?.seller) })
})
