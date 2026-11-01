"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

const WISHLIST_KEY = "everwear:wishlist"
export const WISHLIST_UPDATED_EVENT = "everwear:wishlist-updated"

function getStoredItems(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(WISHLIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setStoredItems(items: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT))
  } catch {
    // Ignore storage errors
  }
}

let cachedItems: string[] = []

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(WISHLIST_UPDATED_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(WISHLIST_UPDATED_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

function getSnapshot(): string[] {
  const current = getStoredItems()
  if (JSON.stringify(current) !== JSON.stringify(cachedItems)) {
    cachedItems = current
  }
  return cachedItems
}

const EMPTY_SNAPSHOT: string[] = []

function getServerSnapshot(): string[] {
  return EMPTY_SNAPSHOT
}

export function toggleWishlistItem(id: string): boolean {
  const current = getStoredItems()
  const exists = current.includes(id)
  const next = exists ? current.filter((x) => x !== id) : [...current, id]
  setStoredItems(next)
  return !exists
}

export function removeWishlistItem(id: string) {
  const current = getStoredItems()
  setStoredItems(current.filter((x) => x !== id))
}

export function addWishlistItem(id: string) {
  const current = getStoredItems()
  if (!current.includes(id)) {
    setStoredItems([...current, id])
  }
}

export function useWishlist() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return {
    items: mounted ? items : [],
    count: mounted ? items.length : 0,
    isSaved: (id: string) => mounted && items.includes(id),
    toggle: (id: string) => toggleWishlistItem(id),
    remove: (id: string) => removeWishlistItem(id),
  }
}
