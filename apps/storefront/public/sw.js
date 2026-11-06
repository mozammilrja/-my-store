/*
 * Everwear storefront service worker: push notifications, an offline page,
 * and a cache of public static files so repeat visits load fast on slow
 * mobile networks.
 *
 * What is cached is an allow-list of public, same-origin files:
 *   - build output with a content hash in its name (/_next/static/...),
 *     cache-first: the name changes when the content does;
 *   - fonts, brand marks, icons and catalogue images (/fonts, /brand,
 *     /icons, /images, /_next/image), stale-while-revalidate, bounded;
 *   - /offline.html, shown when a page can't be loaded.
 * Nothing else is cached: pages (they can carry the shopper's name, bag or
 * orders), /api, the commerce API on its own origin, checkout and payment
 * requests, and anything that isn't a GET all go straight to the network.
 */
const VERSION = "v3"
const STATIC = `everwear-static-${VERSION}`
const MEDIA = `everwear-media-${VERSION}`
const MEDIA_MAX = 150
const OFFLINE = "/offline.html"
const PRECACHE = [OFFLINE, "/icons/icon-192.png", "/brand/favicon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("everwear-") && k !== STATIC && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

/** Hashed build files: never change under the same URL. Dev builds have no hash and are left alone. */
const isHashedBuild = (url) => url.pathname.startsWith("/_next/static/") && (/[-.][0-9a-f]{8,}\.(js|css|woff2?)$/i.test(url.pathname) || url.pathname.startsWith("/_next/static/media/"))
const isPublicMedia = (url) => ["/fonts/", "/brand/", "/icons/", "/images/"].some((p) => url.pathname.startsWith(p)) || url.pathname === "/_next/image"

/** Hashed and public files don't vary by request headers (Origin, Accept-Encoding), so Vary is ignored when matching. */
async function cacheFirst(request) {
  const cache = await caches.open(STATIC)
  const hit = await cache.match(request, { ignoreVary: true })
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok && res.type === "basic") cache.put(request, res.clone())
  return res
}

async function trim(cache) {
  const keys = await cache.keys()
  for (const k of keys.slice(0, Math.max(0, keys.length - MEDIA_MAX))) await cache.delete(k)
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(MEDIA)
  const hit = await cache.match(event.request, { ignoreVary: true })
  const refresh = fetch(event.request)
    .then(async (res) => {
      if (res.ok && res.type === "basic" && !res.headers.get("set-cookie")) {
        await cache.put(event.request, res.clone())
        await trim(cache)
      }
      return res
    })
    .catch(() => hit)
  if (hit) {
    event.waitUntil(refresh)
    return hit
  }
  return refresh
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    // Pages are never stored: they can be personal. Offline, show the offline page.
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || Response.error()))
    return
  }
  if (isHashedBuild(url)) return event.respondWith(cacheFirst(request))
  if (isPublicMedia(url)) return event.respondWith(staleWhileRevalidate(event))
})

/* ---------- Push ---------- */

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: "Everwear", body: event.data ? event.data.text() : "" }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Everwear", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: data.url || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      for (const tab of tabs) {
        if (new URL(tab.url).origin === new URL(url, self.location.origin).origin && "focus" in tab) {
          tab.navigate(url)
          return tab.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
