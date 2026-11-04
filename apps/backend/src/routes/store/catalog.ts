import { Router } from "express"
import type { Document, Filter } from "mongodb"
import { z } from "zod"
import { db, type CategoryDoc, type ProductDoc, type ProductReviewDoc } from "../../db/schema.js"
import { notFound, unauthorized, badRequest } from "../../lib/errors.js"
import { regionForCountry } from "../../lib/regions.js"
import { toStoreProduct, assetUrl } from "../../lib/serialize.js"
import { optionalAuth, requireAuth } from "../../lib/auth.js"
import { newId } from "../../lib/ids.js"

const country = z.string().regex(/^[a-zA-Z]{2}$/, "country must be a 2-letter code")
const handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/, "invalid handle")
const many = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))

const flag = z.enum(["true", "false"]).optional()

const listQuery = z.object({
  country,
  q: z.string().trim().max(100).optional(),
  category: many,
  collection: many,
  tag: many,
  /** Brand names, exact match. Repeatable: brand=Jockey&brand=Levis. */
  brand: many,
  /** Option filters as "Title:Value", e.g. option=Size:M&option=Color:Black. */
  option: many,
  /** Shorthand for option=Size:<value>. Repeatable, ORed together. */
  size: many,
  /** Shorthand for option=Color:<value>. Repeatable, ORed together. */
  color: many,
  /** Only these product ids (related products, agent lookups). */
  id: many,
  /** Leave these product ids out. */
  exclude: many,
  /** Inclusive price bounds in the region currency, minor units. */
  minPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  /** Keep products saving at least this whole percent off MRP. */
  minDiscount: z.coerce.number().int().min(1).max(99).optional(),
  /** Keep products whose approved-review average is at least this. */
  minRating: z.coerce.number().min(1).max(5).optional(),
  /** Keep only products with at least one buyable variant. */
  inStock: flag,
  onSale: flag,
  sort: z
    .enum(["newest", "price_asc", "price_desc", "title", "rating", "popularity", "discount"])
    .optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
})

/** Pairs an option title with every value requested for it, so values OR and titles AND. */
const groupOptionFilters = (pairs: (readonly [string, string])[]) => {
  const byTitle = new Map<string, string[]>()
  for (const [title, value] of pairs) {
    byTitle.set(title, [...(byTitle.get(title) ?? []), value])
  }
  return [...byTitle.entries()]
}

export const catalogRoutes = Router()

catalogRoutes.get("/regions", async (_req, res) => {
  const regions = await db.regions().find({}, { sort: { name: 1 } }).toArray()
  res.json({
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

catalogRoutes.get("/categories", async (_req, res) => {
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
  res.json({
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

catalogRoutes.get("/categories/:handle", async (req, res) => {
  const parsedHandle = handle.parse(req.params.handle)
  const altHandle = parsedHandle === "t-shirts" ? "tshirts" : parsedHandle === "tshirts" ? "t-shirts" : parsedHandle
  const category = await db.categories().findOne({
    $or: [{ handle: parsedHandle }, { handle: altHandle }],
  })
  if (!category) throw notFound("Category")
  res.json({
    category: { id: category._id, handle: category.handle, name: category.name, description: category.description ?? null, parentId: category.parentId ?? null },
  })
})

catalogRoutes.get("/collections", async (_req, res) => {
  const collections = await db.collections().find({}, { sort: { title: 1 } }).toArray()
  const counts = await db
    .products()
    .aggregate<{ _id: string; count: number }>([
      { $match: { status: "published", collectionId: { $ne: null } } },
      { $group: { _id: "$collectionId", count: { $sum: 1 } } },
    ])
    .toArray()
  const countBy = new Map(counts.map((x) => [x._id, x.count]))
  res.json({
    collections: collections.map((col) => ({ id: col._id, handle: col.handle, title: col.title, productCount: countBy.get(col._id) ?? 0 })),
  })
})

catalogRoutes.get("/collections/:handle", async (req, res) => {
  const collection = await db.collections().findOne({ handle: handle.parse(req.params.handle) })
  if (!collection) throw notFound("Collection")
  res.json({ collection: { id: collection._id, handle: collection.handle, title: collection.title } })
})

/**
 * Real-time search suggestions & autocomplete inspired by Myntra's type-ahead architecture.
 * Returns query completions, category suggestions, and fast visual product previews.
 */
catalogRoutes.get("/search/suggest", async (req, res) => {
  const querySchema = z.object({
    country,
    q: z.string().trim().min(1).max(100),
    scope: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(20).default(6),
  })
  const query = querySchema.parse(req.query)
  const region = await regionForCountry(query.country)
  const currency = region.currency

  const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const wordBoundaryRegex = new RegExp(`(^|\\s)${escaped}`, "i")
  const looseRegex = new RegExp(escaped, "i")

  let scopeCategoryIds: string[] = []
  if (query.scope && query.scope !== "all") {
    const scopeCat = await db.categories().findOne({
      $or: [{ handle: query.scope.toLowerCase() }, { name: new RegExp(`^${query.scope}$`, "i") }],
    })
    if (scopeCat) {
      const childCategories = await db.categories().find({ parentId: scopeCat._id }).toArray()
      scopeCategoryIds = [scopeCat._id, ...childCategories.map((c) => c._id)]
    }
  }

  const categoryFilter: Filter<CategoryDoc> = {
    $or: [{ name: looseRegex }, { handle: looseRegex }],
  }
  if (scopeCategoryIds.length) {
    categoryFilter._id = { $in: scopeCategoryIds }
  }

  const [matchedCategories, matchedProducts] = await Promise.all([
    db.categories().find(categoryFilter, { limit: 4 }).toArray(),
    db.products().find(
      {
        status: "published",
        $or: [
          { title: wordBoundaryRegex },
          { tags: looseRegex },
          { material: looseRegex },
          { description: looseRegex },
        ],
        ...(scopeCategoryIds.length ? { categoryIds: { $in: scopeCategoryIds } } : {}),
      },
      { limit: query.limit }
    ).toArray(),
  ])

  const suggestions: Array<{
    text: string
    type: "query" | "category"
    categoryHandle?: string
  }> = []
  const seen = new Set<string>()

  // 1. Matching categories (e.g. "Jackets" or "Linen")
  for (const cat of matchedCategories) {
    const key = `cat:${cat.name.toLowerCase()}`
    if (!seen.has(key)) {
      seen.add(key)
      suggestions.push({
        text: cat.name,
        type: "category",
        categoryHandle: cat.handle,
      })
    }
  }

  // 2. Matching product titles and tags
  for (const p of matchedProducts) {
    const titleKey = `q:${p.title.toLowerCase()}`
    if (!seen.has(titleKey) && suggestions.length < 8) {
      seen.add(titleKey)
      suggestions.push({ text: p.title, type: "query" })
    }
    for (const tag of p.tags ?? []) {
      if (looseRegex.test(tag)) {
        const tagKey = `tag:${tag.toLowerCase()}`
        if (!seen.has(tagKey) && suggestions.length < 8) {
          seen.add(tagKey)
          suggestions.push({ text: tag, type: "query" })
        }
      }
    }
  }

  // 3. Top product preview cards
  const productPreviews = matchedProducts.slice(0, 4).map((p) => {
    const prices = p.variants
      .map((v) => v.prices[currency])
      .filter((pr): pr is number => typeof pr === "number")
    const minPrice = prices.length ? Math.min(...prices) : null
    const thumbnail = p.thumbnail ?? p.images[0] ?? null

    return {
      id: p._id,
      handle: p.handle,
      title: p.title,
      thumbnail: thumbnail ? assetUrl(thumbnail) : null,
      price: minPrice,
      currency,
    }
  })

  res.json({
    query: query.q,
    suggestions: suggestions.slice(0, 6),
    products: productPreviews,
  })
})

catalogRoutes.get("/products", async (req, res) => {
  const query = listQuery.parse(req.query)
  const region = await regionForCountry(query.country)
  const currency = region.currency

  const match: Filter<ProductDoc> = { status: "published" }
  if (query.q) match.$text = { $search: query.q }
  if (query.category.length) match.categoryIds = { $in: query.category }
  if (query.collection.length) match.collectionId = { $in: query.collection }
  if (query.tag.length) match.tags = { $all: query.tag }
  if (query.brand.length) match.brand = { $in: query.brand }
  if (query.id.length || query.exclude.length) {
    match._id = { ...(query.id.length ? { $in: query.id } : {}), ...(query.exclude.length ? { $nin: query.exclude } : {}) }
  }

  const optionFilters = [
    ...query.option.flatMap((pair) => {
      const at = pair.indexOf(":")
      return at > 0 ? [[pair.slice(0, at), pair.slice(at + 1)] as const] : []
    }),
    ...query.size.map((value) => ["Size", value] as const),
    ...query.color.map((value) => ["Color", value] as const),
  ]
  const grouped = groupOptionFilters(optionFilters)
  if (grouped.length) {
    // One variant has to satisfy every axis, but any of the values asked for on it.
    match.variants = {
      $elemMatch: {
        $and: grouped.map(([title, values]) => ({
          $or: values.map((value) => ({ [`options.${title}`]: value })),
        })),
      },
    } as Filter<ProductDoc>["variants"]
  }

  // Rating lives in another collection, so only join it when a filter or sort needs it.
  const needsRating =
    query.minRating !== undefined || query.sort === "rating" || query.sort === "popularity"

  const sort: Document =
    query.sort === "price_asc"
      ? { minPrice: 1, _id: 1 }
      : query.sort === "price_desc"
        ? { minPrice: -1, _id: 1 }
        : query.sort === "title"
          ? { title: 1, _id: 1 }
          : query.sort === "discount"
            ? { maxDiscount: -1, _id: 1 }
            : query.sort === "rating"
              ? { rating: -1, ratingCount: -1, _id: 1 }
              : query.sort === "popularity"
                ? // Nothing counts views, so reviewed-and-liked stands in for popular.
                  { ratingCount: -1, rating: -1, createdAt: -1, _id: 1 }
                : query.q && !query.sort
                  ? { score: { $meta: "textScore" }, _id: 1 }
                  : { createdAt: -1, _id: 1 }

  /** Highest whole-percent saving across the product's variants, 0 when none. */
  const maxDiscountExpr = {
    $max: {
      $map: {
        input: "$variants",
        as: "v",
        in: {
          $let: {
            vars: {
              price: `$$v.prices.${currency}`,
              mrp: `$$v.compareAtPrices.${currency}`,
            },
            in: {
              $cond: [
                { $gt: ["$$mrp", "$$price"] },
                {
                  $round: [
                    { $multiply: [{ $divide: [{ $subtract: ["$$mrp", "$$price"] }, "$$mrp"] }, 100] },
                    0,
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    },
  }

  const pipeline: Document[] = [
    { $match: match },
    {
      $addFields: {
        minPrice: { $min: `$variants.prices.${currency}` },
        maxDiscount: maxDiscountExpr,
        hasStock: {
          $anyElementTrue: {
            $map: {
              input: "$variants",
              as: "v",
              in: {
                $or: [
                  { $eq: ["$$v.manageInventory", false] },
                  { $eq: ["$$v.allowBackorder", true] },
                  { $gt: ["$$v.stock", 0] },
                ],
              },
            },
          },
        },
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
    ...(query.inStock === "true" ? [{ $match: { hasStock: true } }] : []),
    ...(query.minDiscount !== undefined ? [{ $match: { maxDiscount: { $gte: query.minDiscount } } }] : []),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? [
          {
            $match: {
              minPrice: {
                ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
                ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
              },
            },
          },
        ]
      : []),
    ...(needsRating
      ? [
          {
            $lookup: {
              from: "product_reviews",
              localField: "_id",
              foreignField: "productId",
              pipeline: [
                { $match: { status: "approved" } },
                { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
              ],
              as: "reviewStats",
            },
          },
          {
            $addFields: {
              rating: { $arrayElemAt: ["$reviewStats.avg", 0] },
              ratingCount: { $ifNull: [{ $arrayElemAt: ["$reviewStats.count", 0] }, 0] },
            },
          },
          { $project: { reviewStats: 0 } },
        ]
      : []),
    ...(query.minRating !== undefined ? [{ $match: { rating: { $gte: query.minRating } } }] : []),
    ...(query.q ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
    {
      $facet: {
        items: [{ $sort: sort }, { $skip: (query.page - 1) * query.limit }, { $limit: query.limit }],
        total: [{ $count: "n" }],
      },
    },
  ]

  type Joined = ProductDoc & { rating?: number | null; ratingCount?: number }
  const [result] = await db.products().aggregate<{ items: Joined[]; total: { n: number }[] }>(pipeline).toArray()
  const items = result?.items ?? []
  const count = result?.total[0]?.n ?? 0

  let statsMap = new Map<string, { rating: number | null; ratingCount: number }>()
  if (needsRating) {
    statsMap = new Map(
      items.map((p) => [
        p._id,
        {
          rating: p.rating != null ? Number(p.rating.toFixed(1)) : null,
          ratingCount: p.ratingCount ?? 0,
        },
      ])
    )
  } else if (items.length > 0) {
    const productIds = items.map((p) => p._id)
    const stats = await db
      .productReviews()
      .aggregate<{ _id: string; avg: number; count: number }>([
        { $match: { productId: { $in: productIds }, status: "approved" } },
        { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
      .toArray()
    statsMap = new Map(
      stats.map((s) => [s._id, { rating: Number(s.avg.toFixed(1)), ratingCount: s.count }])
    )
  }

  res.json({
    products: items.map((p) => toStoreProduct(p, region, statsMap.get(p._id))),
    count,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(count / query.limit)),
  })
})

catalogRoutes.get("/products/:handle", async (req, res) => {
  const { country: code } = z.object({ country }).parse(req.query)
  const region = await regionForCountry(code)
  const product = await db.products().findOne({ handle: handle.parse(req.params.handle), status: "published" })
  if (!product) throw notFound("Product")

  const stats = await db
    .productReviews()
    .aggregate<{ _id: string; avg: number; count: number }>([
      { $match: { productId: product._id, status: "approved" } },
      { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray()
  const reviewStats = stats[0]
    ? { rating: Number(stats[0].avg.toFixed(1)), ratingCount: stats[0].count }
    : undefined

  res.json({ product: toStoreProduct(product, region, reviewStats) })
})

/**
 * Filter values for a listing: option values with product counts, the price
 * range in the region currency, and categories. Narrowed by the same
 * category/collection as the listing so counts match what shoppers see.
 */
catalogRoutes.get("/facets", async (req, res) => {
  const query = z
    .object({ country, q: z.string().trim().max(100).optional(), category: many, collection: many })
    .parse(req.query)
  const region = await regionForCountry(query.country)
  const match: Filter<ProductDoc> = { status: "published" }
  // Facet counts follow the search, so the sidebar only offers what matches.
  if (query.q) match.$text = { $search: query.q }
  if (query.category.length) match.categoryIds = { $in: query.category }
  if (query.collection.length) match.collectionId = { $in: query.collection }

  const cur = region.currency
  const DISCOUNT_TIERS = [10, 20, 30, 40, 50, 60, 70]
  const RATING_TIERS = [4, 3, 2]
  const [options, prices, onSaleCount, brands, discountCounts, ratingCounts] = await Promise.all([
    db
      .products()
      .aggregate<{ _id: { title: string; value: string }; count: number }>([
        { $match: match },
        { $unwind: "$options" },
        { $unwind: "$options.values" },
        { $group: { _id: { title: "$options.title", value: "$options.values" }, products: { $addToSet: "$_id" } } },
        { $project: { count: { $size: "$products" } } },
      ])
      .toArray(),
    db
      .products()
      .aggregate<{ min: number | null; max: number | null }>([
        { $match: match },
        { $unwind: "$variants" },
        { $group: { _id: null, min: { $min: `$variants.prices.${cur}` }, max: { $max: `$variants.prices.${cur}` } } },
      ])
      .toArray(),
    db.products().countDocuments({
      ...match,
      $expr: {
        $anyElementTrue: {
          $map: { input: "$variants", as: "v", in: { $gt: [`$$v.compareAtPrices.${cur}`, `$$v.prices.${cur}`] } },
        },
      },
    }),
    db
      .products()
      .aggregate<{ _id: string; count: number }>([
        { $match: { ...match, brand: { $type: "string", $ne: "" } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 50 },
      ])
      .toArray(),
    db
      .products()
      .aggregate<{ _id: null; counts: number[] }>([
        { $match: match },
        {
          $addFields: {
            maxDiscount: {
              $max: {
                $map: {
                  input: "$variants",
                  as: "v",
                  in: {
                    $let: {
                      vars: { price: `$$v.prices.${cur}`, mrp: `$$v.compareAtPrices.${cur}` },
                      in: {
                        $cond: [
                          { $gt: ["$$mrp", "$$price"] },
                          {
                            $round: [
                              {
                                $multiply: [
                                  { $divide: [{ $subtract: ["$$mrp", "$$price"] }, "$$mrp"] },
                                  100,
                                ],
                              },
                              0,
                            ],
                          },
                          0,
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            counts: {
              $push: {
                $map: {
                  input: DISCOUNT_TIERS,
                  as: "t",
                  in: { $cond: [{ $gte: ["$maxDiscount", "$$t"] }, 1, 0] },
                },
              },
            },
          },
        },
        {
          $project: {
            counts: {
              $reduce: {
                input: "$counts",
                initialValue: DISCOUNT_TIERS.map(() => 0),
                in: {
                  $map: {
                    input: { $range: [0, DISCOUNT_TIERS.length] },
                    as: "i",
                    in: {
                      $add: [
                        { $arrayElemAt: ["$$value", "$$i"] },
                        { $arrayElemAt: ["$$this", "$$i"] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      ])
      .toArray(),
    db
      .products()
      .aggregate<{ _id: number; count: number }>([
        { $match: match },
        {
          $lookup: {
            from: "product_reviews",
            localField: "_id",
            foreignField: "productId",
            pipeline: [
              { $match: { status: "approved" } },
              { $group: { _id: null, avg: { $avg: "$rating" } } },
            ],
            as: "reviewStats",
          },
        },
        { $addFields: { rating: { $arrayElemAt: ["$reviewStats.avg", 0] } } },
        { $match: { rating: { $ne: null } } },
        { $project: { rating: 1 } },
      ])
      .toArray()
      .then((rows) =>
        RATING_TIERS.map((tier) => ({
          _id: tier,
          count: rows.filter((r) => (r as unknown as { rating: number }).rating >= tier).length,
        }))
      ),
  ])

  const grouped = new Map<string, { value: string; count: number }[]>()
  for (const o of options) grouped.set(o._id.title, [...(grouped.get(o._id.title) ?? []), { value: o._id.value, count: o.count }])
  const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]
  const order = (title: string, a: string, b: string) =>
    title.toLowerCase() === "size" ? SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b) : a.localeCompare(b)

  res.json({
    currency: region.currency,
    options: [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, values]) => ({ title, values: values.sort((a, b) => order(title, a.value, b.value)) })),
    priceRange: prices[0]?.min != null ? { min: prices[0].min, max: prices[0].max } : null,
    onSaleCount,
    brands: brands.map((b) => ({ value: b._id, count: b.count })),
    discounts: DISCOUNT_TIERS.map((tier, i) => ({
      value: tier,
      count: discountCounts[0]?.counts[i] ?? 0,
    })).filter((d) => d.count > 0),
    ratings: ratingCounts.map((r) => ({ value: r._id, count: r.count })).filter((r) => r.count > 0),
  })
})

/* ---------- Product Reviews & Social Proof ---------- */

catalogRoutes.get("/products/:handle/reviews", async (req, res) => {
  const product = await db.products().findOne({ handle: req.params.handle, status: "published" })
  if (!product) throw notFound("Product")

  const reviews = await db
    .productReviews()
    .find({ productId: product._id, status: "approved" }, { sort: { createdAt: -1 }, limit: 100 })
    .toArray()

  const count = reviews.length
  const totalScore = reviews.reduce((acc, r) => acc + r.rating, 0)
  const average = count ? Number((totalScore / count).toFixed(1)) : 0

  const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)))
    breakdown[star] = (breakdown[star] ?? 0) + 1
  }

  res.json({
    reviews,
    summary: {
      count,
      average,
      breakdown,
    },
  })
})

catalogRoutes.post("/products/:handle/reviews", requireAuth("customer"), async (req, res) => {
  const product = await db.products().findOne({ handle: req.params.handle, status: "published" })
  if (!product) throw notFound("Product")

  const customerId = req.actorId!
  const customer = await db.customers().findOne({ _id: customerId })
  if (!customer) throw unauthorized()

  const body = z
    .object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(120).optional(),
      comment: z.string().trim().min(5).max(1000),
    })
    .parse(req.body)

  const verifiedOrdersCount = await db
    .orders()
    .countDocuments({ customerId, "items.productId": product._id, paymentStatus: "paid" })
  const verifiedPurchase = verifiedOrdersCount > 0

  const doc: ProductReviewDoc = {
    _id: newId("rev"),
    productId: product._id,
    customerId,
    customerName: `${customer.firstName ?? "Verified"} ${customer.lastName ?? "Shopper"}`.trim(),
    rating: body.rating,
    title: body.title,
    comment: body.comment,
    verifiedPurchase,
    status: "approved",
    createdAt: new Date(),
  }

  await db.productReviews().insertOne(doc)
  res.status(201).json({ review: doc })
})
