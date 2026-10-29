import { Hono } from "hono"
import type { Document, Filter } from "mongodb"
import { z } from "zod"
import { db, type ProductDoc } from "../../db/schema.js"
import { notFound } from "../../lib/errors.js"
import { regionForCountry } from "../../lib/regions.js"
import { toStoreProduct } from "../../lib/serialize.js"

const country = z.string().regex(/^[a-zA-Z]{2}$/, "country must be a 2-letter code")
const handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, "invalid handle")
const many = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))

const listQuery = z.object({
  country,
  q: z.string().trim().max(100).optional(),
  category: many,
  collection: many,
  tag: many,
  /** Option filters as "Title:Value", e.g. option=Size:M&option=Color:Black. */
  option: many,
  onSale: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "title"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
})

/** Query values can repeat (`?tag=a&tag=b`); Hono's `queries()` keeps every value. */
const readQuery = (c: { req: { queries: () => Record<string, string[]> } }) =>
  Object.fromEntries(Object.entries(c.req.queries()).map(([k, v]) => [k, v.length > 1 ? v : v[0]]))

export const catalogRoutes = new Hono()

catalogRoutes.get("/regions", async (c) => {
  const regions = await db.regions().find({}, { sort: { name: 1 } }).toArray()
  return c.json({
    regions: regions.map((r) => ({
      id: r._id,
      name: r.name,
      currency: r.currency,
      countries: r.countries,
      taxRate: r.taxRate,
      taxInclusive: r.taxInclusive,
      policies: r.policies ?? null,
      shippingOptions: r.shippingOptions.map((s) => ({ id: s._id, name: s.name, amount: s.amount })),
    })),
  })
})

catalogRoutes.get("/categories", async (c) => {
  const categories = await db.categories().find({}, { sort: { rank: 1, name: 1 } }).toArray()
  const counts = await db
    .products()
    .aggregate<{ _id: string; count: number }>([
      { $match: { status: "published" } },
      { $unwind: "$categoryIds" },
      { $group: { _id: "$categoryIds", count: { $sum: 1 } } },
    ])
    .toArray()
  const countBy = new Map(counts.map((x) => [x._id, x.count]))
  return c.json({
    categories: categories.map((cat) => ({
      id: cat._id,
      handle: cat.handle,
      name: cat.name,
      description: cat.description ?? null,
      parentId: cat.parentId ?? null,
      productCount: countBy.get(cat._id) ?? 0,
    })),
  })
})

catalogRoutes.get("/categories/:handle", async (c) => {
  const category = await db.categories().findOne({ handle: handle.parse(c.req.param("handle")) })
  if (!category) throw notFound("Category")
  return c.json({
    category: { id: category._id, handle: category.handle, name: category.name, description: category.description ?? null, parentId: category.parentId ?? null },
  })
})

catalogRoutes.get("/collections", async (c) => {
  const collections = await db.collections().find({}, { sort: { title: 1 } }).toArray()
  const counts = await db
    .products()
    .aggregate<{ _id: string; count: number }>([
      { $match: { status: "published", collectionId: { $ne: null } } },
      { $group: { _id: "$collectionId", count: { $sum: 1 } } },
    ])
    .toArray()
  const countBy = new Map(counts.map((x) => [x._id, x.count]))
  return c.json({
    collections: collections.map((col) => ({ id: col._id, handle: col.handle, title: col.title, productCount: countBy.get(col._id) ?? 0 })),
  })
})

catalogRoutes.get("/collections/:handle", async (c) => {
  const collection = await db.collections().findOne({ handle: handle.parse(c.req.param("handle")) })
  if (!collection) throw notFound("Collection")
  return c.json({ collection: { id: collection._id, handle: collection.handle, title: collection.title } })
})

catalogRoutes.get("/products", async (c) => {
  const query = listQuery.parse(readQuery(c))
  const region = await regionForCountry(query.country)
  const currency = region.currency

  const match: Filter<ProductDoc> = { status: "published" }
  if (query.q) match.$text = { $search: query.q }
  if (query.category.length) match.categoryIds = { $in: query.category }
  if (query.collection.length) match.collectionId = { $in: query.collection }
  if (query.tag.length) match.tags = { $all: query.tag }

  const optionFilters = query.option.flatMap((pair) => {
    const at = pair.indexOf(":")
    return at > 0 ? [[pair.slice(0, at), pair.slice(at + 1)] as const] : []
  })
  if (optionFilters.length) {
    match.variants = {
      $elemMatch: Object.fromEntries(optionFilters.map(([title, value]) => [`options.${title}`, value])),
    }
  }

  const sort: Document =
    query.sort === "price_asc"
      ? { minPrice: 1, _id: 1 }
      : query.sort === "price_desc"
        ? { minPrice: -1, _id: 1 }
        : query.sort === "title"
          ? { title: 1, _id: 1 }
          : query.q && !query.sort
            ? { score: { $meta: "textScore" }, _id: 1 }
            : { createdAt: -1, _id: 1 }

  const pipeline: Document[] = [
    { $match: match },
    {
      $addFields: {
        minPrice: { $min: `$variants.prices.${currency}` },
        isOnSale: {
          $anyElementTrue: {
            $map: {
              input: "$variants",
              as: "v",
              in: { $gt: [`$$v.compareAtPrices.${currency}`, `$$v.prices.${currency}`] },
            },
          },
        },
      },
    },
    ...(query.onSale === "true" ? [{ $match: { isOnSale: true } }] : []),
    ...(query.q ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
    {
      $facet: {
        items: [{ $sort: sort }, { $skip: (query.page - 1) * query.limit }, { $limit: query.limit }],
        total: [{ $count: "n" }],
      },
    },
  ]

  const [result] = await db.products().aggregate<{ items: ProductDoc[]; total: { n: number }[] }>(pipeline).toArray()
  const count = result?.total[0]?.n ?? 0
  return c.json({
    products: (result?.items ?? []).map((p) => toStoreProduct(p, region)),
    count,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(count / query.limit)),
  })
})

catalogRoutes.get("/products/:handle", async (c) => {
  const { country: code } = z.object({ country }).parse(readQuery(c))
  const region = await regionForCountry(code)
  const product = await db.products().findOne({ handle: handle.parse(c.req.param("handle")), status: "published" })
  if (!product) throw notFound("Product")
  return c.json({ product: toStoreProduct(product, region) })
})
