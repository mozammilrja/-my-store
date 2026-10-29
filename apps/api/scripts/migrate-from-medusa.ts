/**
 * One-time copy of the catalog from Medusa's Postgres into MongoDB.
 * Reads Medusa only (SELECT queries); writes are upserts keyed by id, so the
 * script can be re-run. Medusa ids are kept so existing links keep working.
 *
 *   MEDUSA_DATABASE_URL=postgres://... npm run migrate:medusa
 *
 * Copies: regions (with policies and shipping options), categories,
 * collections, products with options, variants, prices and stock.
 * Does not copy: customers, carts, orders (test data).
 */
import pg from "pg"
import { connect, disconnect } from "../src/db/client.js"
import { db, ensureIndexes, type ProductDoc, type RegionDoc, type VariantDoc } from "../src/db/schema.js"

const url = process.env.MEDUSA_DATABASE_URL
if (!url) {
  console.error("Set MEDUSA_DATABASE_URL to the Medusa Postgres connection string")
  process.exit(1)
}

// Medusa stores major units (10 = €10.00); we store minor units.
const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "isk", "huf"])
const toMinor = (amount: string | number, currency: string) =>
  Math.round(Number(amount) * (ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100))

const pool = new pg.Pool({ connectionString: url })
const q = async <T extends pg.QueryResultRow>(sql: string) => (await pool.query<T>(sql)).rows

const num = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v))

async function migrateRegions() {
  const regions = await q<{ id: string; name: string; currency_code: string; metadata: Record<string, unknown> | null; created_at: Date; updated_at: Date }>(
    `select id, name, currency_code, metadata, created_at, updated_at from region where deleted_at is null`
  )
  const countries = await q<{ region_id: string; iso_2: string; display_name: string }>(
    `select region_id, iso_2, display_name from region_country where region_id is not null and deleted_at is null`
  )
  const shipping = await q<{ id: string; name: string; country_code: string; currency_code: string; amount: string; region_rule: string | null }>(`
    select so.id, so.name, gz.country_code, p.currency_code, p.amount,
           (select pr.value from price_rule pr where pr.price_id = p.id and pr.attribute = 'region_id' and pr.deleted_at is null limit 1) as region_rule
    from shipping_option so
    join geo_zone gz on gz.service_zone_id = so.service_zone_id and gz.deleted_at is null
    join shipping_option_price_set sps on sps.shipping_option_id = so.id and sps.deleted_at is null
    join price p on p.price_set_id = sps.price_set_id and p.deleted_at is null
    where so.deleted_at is null`)

  for (const r of regions) {
    const codes = countries.filter((c) => c.region_id === r.id)
    const codeSet = new Set(codes.map((c) => c.iso_2))
    const options = new Map<string, { _id: string; name: string; amount: number }>()
    for (const s of shipping) {
      if (!codeSet.has(s.country_code) || s.currency_code !== r.currency_code) continue
      if (s.region_rule && s.region_rule !== r.id) continue
      const amount = toMinor(s.amount, s.currency_code)
      const existing = options.get(s.id)
      // Prefer the region-specific price when both a generic and a region price exist.
      if (!existing || s.region_rule) options.set(s.id, { _id: s.id, name: s.name, amount })
    }

    const m = r.metadata ?? {}
    const policyValues = [m.return_window_days, m.shipping_rate, m.handling_days_min, m.handling_days_max, m.transit_days_min, m.transit_days_max].map(num)
    const policies: RegionDoc["policies"] = policyValues.every((v) => Number.isFinite(v) && v >= 0)
      ? {
          returnWindowDays: policyValues[0]!,
          freeReturns: m.free_returns === true || m.free_returns === "true",
          shippingRate: toMinor(policyValues[1]!, r.currency_code),
          handlingDays: { min: policyValues[2]!, max: policyValues[3]! },
          transitDays: { min: policyValues[4]!, max: policyValues[5]! },
        }
      : undefined

    const doc: RegionDoc = {
      _id: r.id,
      name: r.name,
      currency: r.currency_code.toLowerCase(),
      countries: codes.map((c) => ({ code: c.iso_2, name: c.display_name })),
      taxRate: 0,
      taxInclusive: false,
      ...(policies ? { policies } : {}),
      shippingOptions: [...options.values()],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
    await db.regions().replaceOne({ _id: doc._id }, doc, { upsert: true })
  }
  return regions.length
}

async function migrateCategoriesAndCollections() {
  const categories = await q<{ id: string; name: string; handle: string; description: string | null; parent_category_id: string | null; rank: number; created_at: Date; updated_at: Date }>(
    `select id, name, handle, description, parent_category_id, rank, created_at, updated_at
     from product_category where deleted_at is null and is_active and not is_internal`
  )
  for (const c of categories) {
    await db.categories().replaceOne(
      { _id: c.id },
      {
        handle: c.handle,
        name: c.name,
        ...(c.description ? { description: c.description } : {}),
        parentId: c.parent_category_id,
        rank: c.rank,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
      { upsert: true }
    )
  }

  const collections = await q<{ id: string; title: string; handle: string; created_at: Date; updated_at: Date }>(
    `select id, title, handle, created_at, updated_at from product_collection where deleted_at is null`
  )
  for (const c of collections) {
    await db.collections().replaceOne(
      { _id: c.id },
      { title: c.title, handle: c.handle, createdAt: c.created_at, updatedAt: c.updated_at },
      { upsert: true }
    )
  }
  return { categories: categories.length, collections: collections.length }
}

async function migrateProducts() {
  const products = await q<{
    id: string; handle: string; title: string; subtitle: string | null; description: string | null; status: string
    thumbnail: string | null; material: string | null; origin_country: string | null; weight: string | null
    collection_id: string | null; created_at: Date; updated_at: Date
  }>(`select id, handle, title, subtitle, description, status, thumbnail, material, origin_country, weight,
             collection_id, created_at, updated_at
      from product where deleted_at is null and not is_giftcard`)

  const images = await q<{ id: string; product_id: string; url: string }>(
    `select id, product_id, url from image where deleted_at is null order by product_id, rank`
  )
  const variantImages = await q<{ variant_id: string; url: string }>(
    `select pvi.variant_id, i.url from product_variant_product_image pvi
     join image i on i.id = pvi.image_id and i.deleted_at is null where pvi.deleted_at is null`
  )
  const productCategories = await q<{ product_id: string; product_category_id: string }>(
    `select product_id, product_category_id from product_category_product`
  )
  const tags = await q<{ product_id: string; value: string }>(
    `select pt.product_id, t.value from product_tags pt join product_tag t on t.id = pt.product_tag_id and t.deleted_at is null`
  )
  const optionValues = await q<{ product_id: string; title: string; value: string; rank: number | null }>(`
    select ppo.product_id, o.title, ov.value, ov.rank
    from product_product_option ppo
    join product_option o on o.id = ppo.product_option_id and o.deleted_at is null
    join product_product_option_value ppov on ppov.product_product_option_id = ppo.id and ppov.deleted_at is null
    join product_option_value ov on ov.id = ppov.product_option_value_id and ov.deleted_at is null
    where ppo.deleted_at is null
    order by ppo.product_id, o.title, ov.rank nulls last, ov.value`)
  const variants = await q<{
    id: string; product_id: string; title: string; sku: string | null; manage_inventory: boolean; allow_backorder: boolean; variant_rank: number | null
  }>(`select id, product_id, title, sku, manage_inventory, allow_backorder, variant_rank
      from product_variant where deleted_at is null order by product_id, variant_rank nulls last, created_at`)
  const variantOptions = await q<{ variant_id: string; title: string; value: string }>(`
    select pvo.variant_id, o.title, ov.value
    from product_variant_option pvo
    join product_option_value ov on ov.id = pvo.option_value_id
    join product_option o on o.id = ov.option_id`)
  const prices = await q<{ variant_id: string; currency_code: string; amount: string }>(`
    select pvps.variant_id, p.currency_code, p.amount
    from product_variant_price_set pvps
    join price p on p.price_set_id = pvps.price_set_id and p.deleted_at is null
    where pvps.deleted_at is null and p.price_list_id is null and p.rules_count = 0`)
  const stock = await q<{ variant_id: string; available: string }>(`
    select pvii.variant_id,
           coalesce(min(floor((il.stocked_quantity - il.reserved_quantity) / greatest(pvii.required_quantity, 1))), 0) as available
    from product_variant_inventory_item pvii
    left join inventory_level il on il.inventory_item_id = pvii.inventory_item_id and il.deleted_at is null
    where pvii.deleted_at is null
    group by pvii.variant_id`)

  const group = <T, K extends keyof T>(rows: T[], key: K) => {
    const map = new Map<T[K], T[]>()
    for (const row of rows) map.set(row[key], [...(map.get(row[key]) ?? []), row])
    return map
  }
  const imagesBy = group(images, "product_id")
  const variantImagesBy = group(variantImages, "variant_id")
  const categoriesBy = group(productCategories, "product_id")
  const tagsBy = group(tags, "product_id")
  const optionsBy = group(optionValues, "product_id")
  const variantsBy = group(variants, "product_id")
  const variantOptionsBy = group(variantOptions, "variant_id")
  const pricesBy = group(prices, "variant_id")
  const stockBy = new Map(stock.map((s) => [s.variant_id, Math.max(0, Number(s.available))]))

  for (const p of products) {
    const options = new Map<string, string[]>()
    for (const o of optionsBy.get(p.id) ?? []) {
      const values = options.get(o.title) ?? []
      if (!values.includes(o.value)) values.push(o.value)
      options.set(o.title, values)
    }

    const docVariants: VariantDoc[] = (variantsBy.get(p.id) ?? []).map((v) => ({
      _id: v.id,
      ...(v.sku ? { sku: v.sku } : {}),
      title: v.title,
      options: Object.fromEntries((variantOptionsBy.get(v.id) ?? []).map((o) => [o.title, o.value])),
      prices: Object.fromEntries((pricesBy.get(v.id) ?? []).map((pr) => [pr.currency_code.toLowerCase(), toMinor(pr.amount, pr.currency_code)])),
      manageInventory: v.manage_inventory,
      allowBackorder: v.allow_backorder,
      stock: stockBy.get(v.id) ?? 0,
      ...(variantImagesBy.has(v.id) ? { images: variantImagesBy.get(v.id)!.map((i) => i.url) } : {}),
    }))

    const productImages = (imagesBy.get(p.id) ?? []).map((i) => i.url)
    const doc: ProductDoc = {
      _id: p.id,
      handle: p.handle,
      title: p.title,
      ...(p.subtitle ? { subtitle: p.subtitle } : {}),
      ...(p.description ? { description: p.description } : {}),
      status: p.status === "published" ? "published" : "draft",
      ...(p.thumbnail ?? productImages[0] ? { thumbnail: (p.thumbnail ?? productImages[0])! } : {}),
      images: productImages,
      categoryIds: (categoriesBy.get(p.id) ?? []).map((c) => c.product_category_id),
      collectionId: p.collection_id,
      tags: (tagsBy.get(p.id) ?? []).map((t) => t.value),
      options: [...options.entries()].map(([title, values]) => ({ title, values })),
      variants: docVariants,
      ...(p.material ? { material: p.material } : {}),
      ...(p.origin_country ? { originCountry: p.origin_country } : {}),
      ...(p.weight ? { weight: Number(p.weight) } : {}),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }
    await db.products().replaceOne({ _id: doc._id }, doc, { upsert: true })
  }
  return { products: products.length, variants: variants.length }
}

try {
  await connect()
  await ensureIndexes()
  const regions = await migrateRegions()
  const { categories, collections } = await migrateCategoriesAndCollections()
  const { products, variants } = await migrateProducts()
  console.log(`Copied ${regions} regions, ${categories} categories, ${collections} collections, ${products} products, ${variants} variants.`)
} finally {
  await pool.end()
  await disconnect()
}
