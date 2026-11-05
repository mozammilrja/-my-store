import { db, type ActorRef, type ProductDoc, type SellerDoc, type VariantDoc } from "../../db/schema.js"
import { badRequest, conflict, forbidden, notFound } from "../errors.js"
import { newId } from "../ids.js"

/*
 * A seller's listings. Created as drafts, sent for review, published only
 * when the store approves. Once live, a seller can change prices (and stock,
 * through their stock screen); a change to the wording or photos is a new
 * review. SKUs are unique across the catalogue, because the warehouse scans
 * them.
 */

export type ListingInput = {
  title: string
  description?: string
  categoryIds: string[]
  images: string[]
  material?: string
  weight?: number
  options: { title: string; values: string[] }[]
  variants: { sku: string; options: Record<string, string>; price: number; compareAtPrice?: number | null }[]
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "product"

async function checkListing(input: ListingInput, productId?: string) {
  const cats = await db.categories().countDocuments({ _id: { $in: input.categoryIds } })
  if (cats !== new Set(input.categoryIds).size) throw badRequest("Pick categories from the list")
  const skus = input.variants.map((v) => v.sku.toUpperCase())
  if (new Set(skus).size !== skus.length) throw badRequest("Each size or colour needs its own SKU", "duplicate_sku")
  const taken = await db.products().findOne({ "variants.sku": { $in: skus }, ...(productId ? { _id: { $ne: productId } } : {}) }, { projection: { _id: 1 } })
  if (taken) throw conflict("One of those SKUs is already used in the catalogue. SKUs must be unique.", "duplicate_sku")
  for (const v of input.variants) {
    for (const o of input.options) if (!o.values.includes(v.options[o.title] ?? "")) throw badRequest(`Each variant needs a ${o.title} from the list`)
    if (v.compareAtPrice != null && v.compareAtPrice <= v.price) throw badRequest("A compare-at price must be above the price")
  }
}

const toVariants = (input: ListingInput, keep: VariantDoc[] = []): VariantDoc[] =>
  input.variants.map((v) => {
    const sku = v.sku.toUpperCase()
    const was = keep.find((k) => k.sku === sku)
    return {
      _id: was?._id ?? newId("variant"),
      sku,
      title: input.options.map((o) => v.options[o.title]).join(" / ") || "Default",
      options: v.options,
      prices: { inr: v.price },
      ...(v.compareAtPrice ? { compareAtPrices: { inr: v.compareAtPrice } } : {}),
      manageInventory: true,
      allowBackorder: false,
      // Stock comes only through the stock ledger (receiving at a warehouse).
      stock: was?.stock ?? 0,
    }
  })

export async function createListing(seller: SellerDoc, input: ListingInput) {
  if (seller.status === "rejected") throw forbidden("Your seller account isn't active.")
  await checkListing(input)
  const now = new Date()
  const p: ProductDoc = {
    _id: newId("prod"),
    handle: `${slug(input.title)}-${newId("x", 5).slice(2)}`,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    status: "draft",
    ...(input.images[0] ? { thumbnail: input.images[0] } : {}),
    images: input.images,
    categoryIds: input.categoryIds,
    collectionId: null,
    tags: [],
    options: input.options,
    variants: toVariants(input),
    ...(input.material ? { material: input.material } : {}),
    ...(input.weight ? { weight: input.weight } : {}),
    brand: seller.displayName,
    sellerId: seller._id,
    review: { status: "draft" },
    createdAt: now,
    updatedAt: now,
  }
  await db.products().insertOne(p)
  return p
}

async function own(seller: SellerDoc, productId: string) {
  const p = await db.products().findOne({ _id: productId, sellerId: seller._id })
  if (!p) throw notFound("Listing")
  return p
}

/** Draft, rejected or pending: anything. Approved (live): prices only. */
export async function updateListing(seller: SellerDoc, productId: string, input: ListingInput) {
  const p = await own(seller, productId)
  const live = p.review?.status === "approved"
  if (live) {
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
    const content = [p.title !== input.title, (p.description ?? "") !== (input.description ?? ""), !same(p.images, input.images), !same(p.options, input.options), !same(p.categoryIds, input.categoryIds), !same(p.variants.map((v) => v.sku).sort(), input.variants.map((v) => v.sku.toUpperCase()).sort())]
    if (content.some(Boolean)) throw conflict("This listing is live. Only prices can change; send other changes as a new listing or ask the store to unpublish it.", "listing_live")
  }
  await checkListing(input, p._id)
  const variants = toVariants(input, p.variants)
  const now = new Date()
  const res = await db.products().updateOne(
    { _id: p._id, updatedAt: p.updatedAt },
    {
      $set: {
        title: input.title,
        ...(input.description !== undefined ? { description: input.description } : {}),
        images: input.images,
        ...(input.images[0] ? { thumbnail: input.images[0] } : {}),
        categoryIds: input.categoryIds,
        options: input.options,
        variants,
        ...(input.material ? { material: input.material } : {}),
        ...(input.weight ? { weight: input.weight } : {}),
        updatedAt: now,
        ...(p.review?.status === "rejected" ? { review: { status: "draft" } } : {}),
      },
    }
  )
  if (!res.matchedCount) throw conflict("This listing changed meanwhile. Reload and try again.", "stale")
  return (await db.products().findOne({ _id: p._id }))!
}

export async function submitListing(seller: SellerDoc, productId: string) {
  if (seller.status !== "approved") throw conflict("Your seller account must be approved before listings can go live.", "seller_not_approved")
  const p = await own(seller, productId)
  if (!["draft", "rejected"].includes(p.review?.status ?? "draft")) throw conflict("This listing is already with us or live.", "invalid_transition")
  if (!p.images.length) throw badRequest("Add at least one photo.", "no_images")
  const now = new Date()
  await db.products().updateOne({ _id: p._id }, { $set: { review: { status: "pending", submittedAt: now }, updatedAt: now } })
  return (await db.products().findOne({ _id: p._id }))!
}

/** The store's decision on a pending listing; approved listings go on sale at once. */
export async function reviewListing(productId: string, decision: "approved" | "rejected", actor: ActorRef, note?: string) {
  const p = await db.products().findOne({ _id: productId, sellerId: { $type: "string" } })
  if (!p) throw notFound("Listing")
  if (p.review?.status !== "pending") throw conflict("This listing isn't waiting for review.", "invalid_transition")
  const seller = await db.sellers().findOne({ _id: p.sellerId! })
  if (decision === "approved" && seller?.status !== "approved") throw conflict("The seller isn't approved.", "seller_not_approved")
  if (decision === "rejected" && !note) throw badRequest("Say what needs fixing.")
  const now = new Date()
  await db.products().updateOne(
    { _id: p._id },
    { $set: { review: { ...p.review, status: decision, reviewedAt: now, reviewedBy: actor.id, ...(note ? { note } : {}) }, status: decision === "approved" ? "published" : "draft", updatedAt: now } }
  )
  await db.auditLogs().insertOne({ _id: newId("audit"), adminId: actor.id, adminEmail: actor.name ?? "", action: `listing.${decision}`, targetCollection: "products", targetId: p._id, diff: { note }, createdAt: now })
  return (await db.products().findOne({ _id: p._id }))!
}
