import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Router, type RequestHandler } from "express"
import type { Filter } from "mongodb"
import multer, { MulterError } from "multer"
import { z } from "zod"
import { db, type ProductDoc, type VariantDoc } from "../../db/schema.js"
import { env } from "../../env.js"
import { badRequest, conflict, notFound } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { assetUrl } from "../../lib/serialize.js"

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_VARIANTS = 100

const currency = z.string().regex(/^[a-z]{3}$/)
const money = z.number().int().min(0).max(100_000_000)
const prices = z.record(currency, money)
const handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, "Use lowercase letters, numbers and dashes")
const text = (max: number) => z.string().trim().max(max)
const optionValue = z.string().trim().min(1).max(40)

/**
 * Accepts absolute API URLs or stored paths; keeps only paths we serve or https URLs.
 *
 * `/images/` is in the list because assetUrl serves those seeded storefront
 * assets back unchanged. Without it, reading a product and writing it again
 * fails on the product's own images, so an upload can never be appended to one.
 */
const imagePath = z
  .string()
  .max(500)
  .transform((u) => (u.startsWith(env.API_PUBLIC_URL) ? u.slice(env.API_PUBLIC_URL.length) : u))
  .refine(
    (u) => u.startsWith("/uploads/") || u.startsWith("/images/") || u.startsWith("https://"),
    "Upload images first"
  )

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "product"

const productFields = {
  title: text(200).min(1),
  subtitle: text(200).optional(),
  description: text(5000).optional(),
  status: z.enum(["draft", "published"]),
  categoryIds: z.array(z.string().max(100)).max(20).default([]),
  collectionId: z.string().max(100).nullable().default(null),
  tags: z.array(text(40).min(1)).max(20).default([]),
  images: z.array(imagePath).max(20).default([]),
  material: text(100).optional(),
}

const toAdminProduct = (p: ProductDoc) => ({
  id: p._id,
  handle: p.handle,
  title: p.title,
  subtitle: p.subtitle ?? null,
  description: p.description ?? null,
  status: p.status,
  thumbnail: p.thumbnail ? assetUrl(p.thumbnail) : p.images[0] ? assetUrl(p.images[0]) : null,
  images: p.images.map(assetUrl),
  categoryIds: p.categoryIds,
  collectionId: p.collectionId ?? null,
  tags: p.tags,
  options: p.options,
  material: p.material ?? null,
  variants: p.variants.map((v) => ({
    id: v._id,
    sku: v.sku ?? null,
    title: v.title,
    options: v.options,
    prices: v.prices,
    compareAtPrices: v.compareAtPrices ?? {},
    manageInventory: v.manageInventory,
    allowBackorder: v.allowBackorder,
    stock: v.stock,
  })),
  totalStock: p.variants.reduce((n, v) => n + (v.manageInventory ? v.stock : 0), 0),
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
})

/** Checks that referenced categories and collection exist. */
async function assertRefs(categoryIds: string[], collectionId: string | null) {
  if (categoryIds.length) {
    const found = await db.categories().countDocuments({ _id: { $in: categoryIds } })
    if (found !== new Set(categoryIds).size) throw badRequest("Unknown category")
  }
  if (collectionId && !(await db.collections().findOne({ _id: collectionId }))) throw badRequest("Unknown collection")
}

export const adminProductRoutes = Router()

adminProductRoutes.get("/products", async (req, res) => {
  const q = z
    .object({
      q: z.string().trim().max(100).optional(),
      status: z.enum(["draft", "published"]).optional(),
      page: z.coerce.number().int().min(1).max(1000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
    .parse(req.query)
  const filter: Filter<ProductDoc> = {}
  if (q.status) filter.status = q.status
  if (q.q) {
    const escaped = q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    filter.$or = [{ title: { $regex: escaped, $options: "i" } }, { handle: { $regex: escaped, $options: "i" } }, { "variants.sku": q.q }]
  }
  const [products, count] = await Promise.all([
    db.products().find(filter, { sort: { updatedAt: -1 }, skip: (q.page - 1) * q.limit, limit: q.limit }).toArray(),
    db.products().countDocuments(filter),
  ])
  res.json({ products: products.map(toAdminProduct), count, page: q.page, pages: Math.max(1, Math.ceil(count / q.limit)) })
})

adminProductRoutes.get("/products/:id", async (req, res) => {
  const product = await db.products().findOne({ _id: req.params.id })
  if (!product) throw notFound("Product")
  res.json({ product: toAdminProduct(product) })
})

/**
 * Creates a product. Every combination of the option values becomes a
 * variant with the given starting prices and stock.
 */
adminProductRoutes.post("/products", async (req, res) => {
  const body = z
    .object({
      ...productFields,
      handle: handle.optional(),
      options: z.array(z.object({ title: text(40).min(1), values: z.array(optionValue).min(1).max(30) })).max(3).default([]),
      prices,
      stock: z.number().int().min(0).max(1_000_000).default(0),
    })
    .parse(req.body)
  await assertRefs(body.categoryIds, body.collectionId)

  const combos = body.options.reduce<Record<string, string>[]>(
    (acc, o) => acc.flatMap((combo) => [...new Set(o.values)].map((value) => ({ ...combo, [o.title]: value }))),
    [{}]
  )
  if (combos.length > MAX_VARIANTS) throw badRequest(`That makes ${combos.length} variants; the limit is ${MAX_VARIANTS}`)

  const now = new Date()
  const variants: VariantDoc[] = combos.map((options) => ({
    _id: newId("variant"),
    title: Object.values(options).join(" / ") || "Default",
    options,
    prices: body.prices,
    manageInventory: true,
    allowBackorder: false,
    stock: body.stock,
  }))
  const doc: ProductDoc = {
    _id: newId("prod"),
    handle: body.handle ?? `${slugify(body.title)}-${newId("x", 4).slice(2)}`,
    title: body.title,
    ...(body.subtitle ? { subtitle: body.subtitle } : {}),
    ...(body.description ? { description: body.description } : {}),
    status: body.status,
    ...(body.images[0] ? { thumbnail: body.images[0] } : {}),
    images: body.images,
    categoryIds: body.categoryIds,
    collectionId: body.collectionId,
    tags: body.tags,
    options: body.options.map((o) => ({ title: o.title, values: [...new Set(o.values)] })),
    variants,
    ...(body.material ? { material: body.material } : {}),
    createdAt: now,
    updatedAt: now,
  }
  await db.products().insertOne(doc)
  res.status(201).json({ product: toAdminProduct(doc) })
})

adminProductRoutes.patch("/products/:id", async (req, res) => {
  const body = z
    .object({
      ...Object.fromEntries(Object.entries(productFields).map(([k, v]) => [k, v.optional()])),
      handle: handle.optional(),
      variants: z
        .array(
          z.object({
            id: z.string().max(100),
            sku: text(100).nullable().optional(),
            prices: prices.optional(),
            compareAtPrices: prices.optional(),
            stock: z.number().int().min(0).max(1_000_000).optional(),
            manageInventory: z.boolean().optional(),
            allowBackorder: z.boolean().optional(),
          })
        )
        .max(MAX_VARIANTS)
        .optional(),
    })
    .strict()
    .parse(req.body) as Partial<z.infer<z.ZodObject<typeof productFields>>> & {
    handle?: string
    variants?: { id: string; sku?: string | null; prices?: Record<string, number>; compareAtPrices?: Record<string, number>; stock?: number; manageInventory?: boolean; allowBackorder?: boolean }[]
  }

  const product = await db.products().findOne({ _id: req.params.id })
  if (!product) throw notFound("Product")
  await assertRefs(body.categoryIds ?? [], body.collectionId ?? null)

  const variants = product.variants.map((v) => {
    const change = body.variants?.find((x) => x.id === v._id)
    if (!change) return v
    const next: VariantDoc = { ...v }
    if (change.sku !== undefined) {
      if (change.sku) next.sku = change.sku
      else delete next.sku
    }
    if (change.prices) next.prices = change.prices
    if (change.compareAtPrices) {
      // Only keep compare-at prices that are really above the price (a sale).
      const kept = Object.fromEntries(Object.entries(change.compareAtPrices).filter(([cur, amount]) => amount > (next.prices[cur] ?? Infinity)))
      if (Object.keys(kept).length) next.compareAtPrices = kept
      else delete next.compareAtPrices
    }
    if (change.stock !== undefined) next.stock = change.stock
    if (change.manageInventory !== undefined) next.manageInventory = change.manageInventory
    if (change.allowBackorder !== undefined) next.allowBackorder = change.allowBackorder
    return next
  })
  if (body.variants?.some((x) => !product.variants.some((v) => v._id === x.id))) throw badRequest("Unknown variant")

  const { variants: _ignored, ...fields } = body
  const images = fields.images ?? product.images
  const updated: ProductDoc = {
    ...product,
    ...fields,
    images,
    variants,
    updatedAt: new Date(),
  }
  if (images[0]) updated.thumbnail = images[0]
  else delete updated.thumbnail

  // Conditional on the version we read, so concurrent edits don't silently overwrite each other.
  const result = await db.products().replaceOne({ _id: product._id, updatedAt: product.updatedAt }, updated)
  if (!result.matchedCount) throw conflict("Someone else changed this product. Reload and try again.", "stale")
  res.json({ product: toAdminProduct(updated) })
})

adminProductRoutes.delete("/products/:id", async (req, res) => {
  // Orders keep their own copy of item details, so deleting a product never changes past orders.
  const result = await db.products().deleteOne({ _id: req.params.id })
  if (!result.deletedCount) throw notFound("Product")
  res.json({ deleted: true })
})

/** Sniffs the real file type from its first bytes; the browser-supplied type isn't trusted. */
const sniff = (b: Buffer) => {
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png"
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ".jpg"
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return ".webp"
  return null
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })

/** Reads the posted image into memory and turns multer's own errors into ours. */
const readUpload: RequestHandler = (req, res, next) =>
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      next(err.code === "LIMIT_FILE_SIZE" ? badRequest("Images must be 5 MB or smaller", "too_large") : badRequest("Attach an image in the 'file' field"))
      return
    }
    next(err)
  })

adminProductRoutes.post("/uploads", readUpload, async (req, res) => {
  if (!req.file) throw badRequest("Attach an image in the 'file' field")
  const bytes = req.file.buffer
  const ext = sniff(bytes)
  if (!ext) throw badRequest("Only PNG, JPEG or WebP images are allowed", "unsupported_type")
  const name = `${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}${ext}`
  const dir = join(env.UPLOADS_DIR, "products")
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), bytes)
  const path = `/uploads/products/${name}`
  res.status(201).json({ path, url: assetUrl(path) })
})
