"use server"

import { api, ApiError } from "../api/client"
import type { Product } from "../api/types"
import { getToken } from "./session"

/**
 * Wishlist state as the browser needs it. A guest gets `authenticated: false`
 * and an empty list, and keeps their saves in localStorage until they sign in.
 */
export type WishlistState = {
  authenticated: boolean
  productIds: string[]
  error: string | null
}

const GUEST: WishlistState = { authenticated: false, productIds: [], error: null }

const message = (e: unknown) =>
  e instanceof ApiError ? e.message : "We couldn't update your wishlist. Please try again."

/** Reads the saved product ids, or reports the viewer as a guest. */
export async function getWishlist(): Promise<WishlistState> {
  const token = await getToken()
  if (!token) return GUEST
  try {
    const { productIds } = await api<{ productIds: string[] }>("/store/customers/me/wishlist", {
      token,
    })
    return { authenticated: true, productIds, error: null }
  } catch (e) {
    // An expired token is a guest, not an error worth showing.
    if (e instanceof ApiError && e.status === 401) return GUEST
    return { ...GUEST, authenticated: true, error: message(e) }
  }
}

/** The signed-in customer's wishlist as full products, for the account page. */
export async function getWishlistProducts(): Promise<Product[]> {
  const token = await getToken()
  if (!token) return []
  try {
    return (await api<{ items: Product[] }>("/store/customers/me/wishlist", { token })).items ?? []
  } catch {
    return []
  }
}

/** Saves a product. The API uses $addToSet, so repeating it is harmless. */
export async function addToWishlist(productId: string): Promise<WishlistState> {
  const token = await getToken()
  if (!token) return GUEST
  try {
    const { productIds } = await api<{ productIds: string[] }>("/store/customers/me/wishlist", {
      method: "POST",
      body: { productId },
      token,
    })
    return { authenticated: true, productIds, error: null }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return GUEST
    return { authenticated: true, productIds: [], error: message(e) }
  }
}

/** Removes a product. An id that was never saved is a no-op upstream. */
export async function removeFromWishlist(productId: string): Promise<WishlistState> {
  const token = await getToken()
  if (!token) return GUEST
  try {
    const { productIds } = await api<{ productIds: string[] }>(
      `/store/customers/me/wishlist/${encodeURIComponent(productId)}`,
      { method: "DELETE", token }
    )
    return { authenticated: true, productIds, error: null }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return GUEST
    return { authenticated: true, productIds: [], error: message(e) }
  }
}

/**
 * Pushes saves made before signing in up to the account, then returns the
 * merged list. Ids already on the account are skipped by `$addToSet`.
 */
export async function mergeGuestWishlist(productIds: string[]): Promise<WishlistState> {
  const token = await getToken()
  if (!token) return GUEST
  const unique = [...new Set(productIds)].slice(0, 100)
  if (!unique.length) return getWishlist()

  let latest: string[] = []
  let failed: string | null = null
  for (const productId of unique) {
    const result = await addToWishlist(productId)
    if (!result.authenticated) return GUEST
    if (result.error) failed = result.error
    else latest = result.productIds
  }
  if (!latest.length) {
    const current = await getWishlist()
    return { ...current, error: failed ?? current.error }
  }
  return { authenticated: true, productIds: latest, error: failed }
}
