import "server-only"
import { sdk } from "@lib/config"
import { getCacheTag, getCartId, setCartId } from "@lib/data/cookies"
import { listRegions } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { getDefaultCountryCode } from "./site"

export const MAX_LINE_ITEM_QUANTITY = 100

/** Stores the cart in the shopper's cookie and clears cached cart reads. */
/** Cart metadata flag: the cart now belongs to a shopper's browser session. */
export const HANDED_OFF_KEY = "ucp_handed_off"

/**
 * True when the visitor already has a different, open bag with items in it.
 * Links that switch carts (/buy, cart resume) must not silently replace it.
 */
export const hasOtherActiveCart = async (cartId: string) => {
  const current = await getCartId()
  if (!current || current === cartId) return false
  try {
    const { cart } = await sdk.store.cart.retrieve(current, { fields: "id,completed_at,*items" })
    return !cart.completed_at && (cart.items?.length ?? 0) > 0
  } catch {
    return false
  }
}

/**
 * Makes `cartId` the visitor's cart and marks it as handed off, so the agent
 * API stops exposing or changing the shopper's details on it.
 */
export const activateCart = async (cartId: string) => {
  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, { fields: "id,metadata" })
    if (cart.metadata?.[HANDED_OFF_KEY] !== true) {
      await sdk.store.cart.update(cartId, { metadata: { ...cart.metadata, [HANDED_OFF_KEY]: true } })
    }
  } catch {
    // The flag only narrows what the agent API returns; never block the shopper on it.
  }
  await setCartId(cartId)
  const cartCacheTag = await getCacheTag("carts")
  if (cartCacheTag) {
    revalidateTag(cartCacheTag, { expire: 0 })
  }
}

/**
 * Resolves the region from an explicit country code, falling back to the
 * store's default country only when none was requested.
 */
export const resolveRegion = async (
  countryCode?: string
): Promise<{ countryCode: string; region: HttpTypes.StoreRegion } | null> => {
  const regions = await listRegions()
  const code = countryCode?.toLowerCase() || getDefaultCountryCode(regions)
  const region = regions.find((r) => r.countries?.some((c) => c.iso_2 === code))
  return code && region ? { countryCode: code, region } : null
}

export const createCartWithItems = async (
  regionId: string,
  items: { variant_id: string; quantity: number }[]
) => {
  const { cart } = await sdk.store.cart.create({ region_id: regionId })
  for (const item of items) {
    await sdk.store.cart.createLineItem(cart.id, item)
  }
  return cart.id
}

/** Returns the requested variant IDs that don't exist in the store's sales channel. */
export const findMissingVariantIds = async (variantIds: string[]) => {
  const { variants } = await sdk.client.fetch<{
    variants: { id: string }[]
  }>("/store/product-variants", {
    query: { id: variantIds, fields: "id", limit: variantIds.length },
  })
  const found = new Set(variants.map((variant) => variant.id))
  return variantIds.filter((id) => !found.has(id))
}
