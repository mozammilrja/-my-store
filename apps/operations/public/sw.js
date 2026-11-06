/*
 * Everwear operations portal service worker: push notifications (warehouse
 * staff, riders), an app shell that opens without a connection, and a cache
 * of the portal's own static files for slow mobile networks.
 *
 * Cached (same origin only):
 *   - the app shell /index.html: the single page every route serves. It holds
 *     no data, only the names of the current script bundles;
 *   - build output in /assets/ (content-hashed names), cache-first;
 *   - /fonts, /brand, /icons, /favicon.svg, stale-while-revalidate.
 * Never cached: the API (it lives on its own origin, which this worker never
 * touches), so no order, customer, payment, session or delivery data is ever
 * stored by it; and anything that isn't a GET.
 */
const VERSION = "v3"
const SHELL = `ops-shell-${VERSION}`
const STATIC = `ops-static-${VERSION}`
const OFFLINE = "/offline.html"
const PRECACHE = [OFFLINE, "/icons/icon-192.png", "/favicon.svg", "/manifest.webmanifest"]

/**
 * Stores the app shell and the bundles it names (entry script, its CSS and
 * preloaded chunks), so the app can start offline even straight after the
 * first visit, whose files loaded before this worker was running. Screens
 * opened later are cached as they load.
 */
async function storeShell(res) {
  const html = await res.clone().text()
  await (await caches.open(SHELL)).put("/", res)
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))]
  const cache = await caches.open(STATIC)
  await Promise.all(assets.map(async (a) => (await cache.match(a, { ignoreVary: true })) || cache.add(a).catch(() => {})))
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await (await caches.open(SHELL)).addAll(PRECACHE)
      const res = await fetch("/", { cache: "no-cache" })
      if (res.ok) await storeShell(res)
      await self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ops-") && k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const isHashedAsset = (url) => url.pathname.startsWith("/assets/") && /-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|svg|jpg|webp)$/.test(url.pathname)
const isPublicStatic = (url) => ["/fonts/", "/brand/", "/icons/"].some((p) => url.pathname.startsWith(p)) || url.pathname === "/favicon.svg"

/**
 * Pages: the network first, so a new release is picked up at once. The
 * response is the app shell, which is stored as "/" for the next offline
 * start. Offline: the stored shell (the app then says it can't reach the
 * server), or the offline page if no shell was stored yet.
 */
async function navigate(request) {
  try {
    const res = await fetch(request)
    if (res.ok && res.type === "basic" && (res.headers.get("content-type") || "").includes("text/html")) {
      // A new release brings new bundle names: keep the shell and its bundles current.
      storeShell(res.clone()).catch(() => {})
    }
    return res
  } catch (e) {
    const cache = await caches.open(SHELL)
    return (await cache.match("/")) || (await cache.match(OFFLINE)) || Response.error()
  }
}

/** Hashed and public files don't vary by request headers (Origin, Accept-Encoding), so Vary is ignored when matching. */
async function cacheFirst(request) {
  const cache = await caches.open(STATIC)
  const hit = await cache.match(request, { ignoreVary: true })
  if (hit) return hit
  const res = await fetch(request)
  if (res.ok && res.type === "basic") cache.put(request, res.clone())
  return res
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(STATIC)
  const hit = await cache.match(event.request, { ignoreVary: true })
  const refresh = fetch(event.request)
    .then((res) => {
      if (res.ok && res.type === "basic") cache.put(event.request, res.clone())
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
  // The API and every other host: straight to the network, never stored.
  if (url.origin !== self.location.origin) return
  if (request.mode === "navigate") return event.respondWith(navigate(request))
  if (isHashedAsset(url)) return event.respondWith(cacheFirst(request))
  if (isPublicStatic(url)) return event.respondWith(staleWhileRevalidate(event))
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
