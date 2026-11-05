import { Router } from "express"
import { db } from "../../db/schema.js"
import { assetUrl } from "../../lib/serialize.js"

export const siteMediaRoutes = Router()

/** Every storefront image slot and the URL to show for it, in one read. */
siteMediaRoutes.get("/site-media", async (_req, res) => {
  const docs = await db.siteMedia().find({}, { projection: { url: 1 } }).toArray()
  res.set("cache-control", "public, max-age=60")
  res.json({ media: Object.fromEntries(docs.map((d) => [d._id, assetUrl(d.url)])) })
})
