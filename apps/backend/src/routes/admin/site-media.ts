import { Router } from "express"
import { z } from "zod"
import { db } from "../../db/schema.js"
import { env } from "../../env.js"
import { notFound } from "../../lib/errors.js"
import { assetUrl } from "../../lib/serialize.js"
import { defaultMediaUrl } from "../../lib/site-media.js"

export const adminSiteMediaRoutes = Router()

/** Same rule as product images: an uploaded file, a shipped storefront image, or an https URL. */
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .transform((u) => (u.startsWith(env.API_PUBLIC_URL) ? u.slice(env.API_PUBLIC_URL.length) : u))
  .refine((u) => u.startsWith("/uploads/") || u.startsWith("/images/") || u.startsWith("https://"), "Upload the image first")

/**
 * Where the admin can preview an image. Shipped /images/ files live on the
 * storefront, not the API, so they are prefixed with the storefront's origin
 * (the first STORE_CORS entry).
 */
const previewUrl = (path: string) =>
  path.startsWith("/images/") && env.STORE_CORS[0] ? `${env.STORE_CORS[0].replace(/\/$/, "")}${path}` : assetUrl(path)

const toAdmin = (d: { _id: string; label: string; group: string; usedOn: string[]; url: string; updatedAt: Date }) => ({
  key: d._id,
  label: d.label,
  group: d.group,
  usedOn: d.usedOn,
  path: d.url,
  url: assetUrl(d.url),
  previewUrl: previewUrl(d.url),
  isDefault: d.url === defaultMediaUrl(d._id),
  updatedAt: d.updatedAt,
})

adminSiteMediaRoutes.get("/site-media", async (_req, res) => {
  const docs = await db.siteMedia().find({}, { sort: { order: 1 } }).toArray()
  res.json({ media: docs.map(toAdmin) })
})

const keyParam = (raw: unknown) => z.string().min(1).max(200).parse(raw)

adminSiteMediaRoutes.patch("/site-media/:key", async (req, res) => {
  const key = keyParam(req.params.key)
  const { url } = z.object({ url: imageUrl }).parse(req.body)
  const doc = await db.siteMedia().findOneAndUpdate({ _id: key }, { $set: { url, updatedAt: new Date() } }, { returnDocument: "after" })
  if (!doc) throw notFound("Image slot")
  res.json({ media: toAdmin(doc) })
})

/** Puts the image the storefront shipped with back. */
adminSiteMediaRoutes.post("/site-media/:key/reset", async (req, res) => {
  const key = keyParam(req.params.key)
  const doc = await db
    .siteMedia()
    .findOneAndUpdate({ _id: key }, { $set: { url: defaultMediaUrl(key), updatedAt: new Date() } }, { returnDocument: "after" })
  if (!doc) throw notFound("Image slot")
  res.json({ media: toAdmin(doc) })
})
