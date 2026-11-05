"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { WishlistState } from "@lib/data/wishlist"
import {
  addToWishlist,
  mergeGuestWishlist,
  removeFromWishlist,
} from "@lib/data/wishlist"

const WISHLIST_KEY = "everwear:wishlist"
export const WISHLIST_UPDATED_EVENT = "everwear:wishlist-updated"

/**
 * One wishlist store for the whole page.
 *
 * A signed-in shopper's saves live on the account through
 * `/store/customers/me/wishlist`; a guest's live in localStorage and are
 * pushed up the first time the store sees a token. Every card reads this
 * store, so a grid of 40 cards bootstraps with a single request and a hover
 * never touches the network.
 */
export type WishlistSnapshot = {
  /** False until the first read resolves, so nothing renders a wrong heart. */
  ready: boolean
  authenticated: boolean
  ids: readonly string[]
  /** Ids with a write in flight, for a wait cursor and to block double submits. */
  pending: readonly string[]
}

const EMPTY: WishlistSnapshot = { ready: false, authenticated: false, ids: [], pending: [] }

let snapshot: WishlistSnapshot = EMPTY
let bootstrapped = false
const listeners = new Set<() => void>()

const emit = () => {
  for (const l of listeners) l()
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT))
  }
}

const set = (next: Partial<WishlistSnapshot>) => {
  snapshot = { ...snapshot, ...next }
  emit()
}

function readLocal(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(WISHLIST_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function writeLocal(ids: readonly string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids))
  } catch {
    // A full or blocked store just means saves do not survive a reload.
  }
}

function clearLocal() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(WISHLIST_KEY)
  } catch {
    // Ignore storage errors.
  }
}

/** Resolves the signed-in list once per page, merging anything saved as a guest. */
async function bootstrap() {
  if (bootstrapped) return
  bootstrapped = true

  const local = readLocal()
  // Show the guest list immediately; the server answer replaces it below.
  if (local.length) set({ ids: local })

  try {
    // A GET, not the getWishlist server action: it runs on every page load,
    // and a queued action would hold up the shopper's first click.
    const res = await fetch("/api/wishlist", { cache: "no-store", credentials: "same-origin" })
    if (!res.ok) throw new Error(`wishlist ${res.status}`)
    const state = (await res.json()) as WishlistState
    if (!state.authenticated) {
      // Re-read: a save made while this was in flight is already on disk, and
      // using the list captured above would silently drop it.
      set({ ready: true, authenticated: false, ids: readLocal() })
      return
    }

    // Anything saved as a guest, including during this bootstrap, goes up.
    const pending = readLocal()
    if (pending.length) {
      const merged = await mergeGuestWishlist(pending)
      if (merged.authenticated) {
        clearLocal()
        set({ ready: true, authenticated: true, ids: merged.productIds })
        return
      }
    }
    // A save made during the round trip must survive the server's answer.
    const extra = snapshot.ids.filter((id) => !state.productIds.includes(id))
    set({ ready: true, authenticated: true, ids: [...state.productIds, ...extra] })
  } catch {
    // Offline or a failed read: fall back to whatever the browser holds.
    set({ ready: true, authenticated: false, ids: readLocal() })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (typeof window !== "undefined") {
    window.addEventListener(WISHLIST_UPDATED_EVENT, listener)
    window.addEventListener("storage", listener)
    void bootstrap()
  }
  return () => {
    listeners.delete(listener)
    if (typeof window !== "undefined") {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, listener)
      window.removeEventListener("storage", listener)
    }
  }
}

const getSnapshot = () => snapshot
const getServerSnapshot = () => EMPTY

/**
 * Adds or removes a save, updating the UI first and rolling back if the
 * server refuses. Resolves to the state the product ended up in.
 */
export async function toggleWishlist(productId: string): Promise<boolean> {
  const before = snapshot.ids
  if (snapshot.pending.includes(productId)) return before.includes(productId)

  const saved = before.includes(productId)
  const optimistic = saved ? before.filter((id) => id !== productId) : [...before, productId]

  set({ ids: optimistic, pending: [...snapshot.pending, productId] })

  const settle = (ids: readonly string[]) =>
    set({ ids, pending: snapshot.pending.filter((id) => id !== productId) })

  if (!snapshot.authenticated) {
    writeLocal(optimistic)
    settle(optimistic)
    return !saved
  }

  try {
    const result = saved ? await removeFromWishlist(productId) : await addToWishlist(productId)
    if (!result.authenticated) {
      // The session lapsed mid-write: keep the save locally instead of losing it.
      writeLocal(optimistic)
      set({ authenticated: false })
      settle(optimistic)
      return !saved
    }
    if (result.error) {
      settle(before)
      throw new Error(result.error)
    }
    settle(result.productIds)
    return !saved
  } catch (e) {
    settle(before)
    throw e instanceof Error ? e : new Error("We couldn't update your wishlist.")
  }
}

export async function removeWishlistItem(productId: string) {
  if (!snapshot.ids.includes(productId)) return
  await toggleWishlist(productId)
}

export async function addWishlistItem(productId: string) {
  if (snapshot.ids.includes(productId)) return
  await toggleWishlist(productId)
}

/** Back-compatible alias kept for the older call sites. */
export const toggleWishlistItem = toggleWishlist

/**
 * The wishlist, shared across every card on the page.
 *
 * `toggle` is async and throws on a refused write so callers can show an
 * error toast; `isPending` drives the wait cursor.
 */
export function useProductWishlist() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isSaved = useCallback((id: string) => state.ids.includes(id), [state.ids])
  const isPending = useCallback((id: string) => state.pending.includes(id), [state.pending])

  return {
    ready: state.ready,
    authenticated: state.authenticated,
    items: state.ids as string[],
    count: state.ids.length,
    isSaved,
    isPending,
    toggle: toggleWishlist,
    remove: removeWishlistItem,
    add: addWishlistItem,
  }
}

/**
 * One product's saved / pending state. Subscribes to just that product, so
 * saving one card re-renders only its own heart, not every card on the grid.
 */
export function useSavedProduct(productId: string) {
  // 0 = not saved, 1 = saved, 2/3 = the same while a write is in flight: a
  // primitive snapshot, so React skips re-renders when this product is unchanged.
  const code = useSyncExternalStore(
    subscribe,
    () => (snapshot.ids.includes(productId) ? 1 : 0) + (snapshot.pending.includes(productId) ? 2 : 0),
    () => 0
  )
  return { saved: (code & 1) === 1, pending: (code & 2) === 2, toggle: toggleWishlist }
}

/** The shape the header badge, account nav, bag and product page already use. */
export function useWishlist() {
  const { items, count, isSaved, toggle, remove, ready, authenticated } = useProductWishlist()
  return { items, count, isSaved, toggle, remove, ready, authenticated }
}
