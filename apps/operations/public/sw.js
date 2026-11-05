/*
 * Everwear push notifications (warehouse app). The API sends { title, body, url, tag }
 * (encrypted for this browser). Tapping a notification opens its page,
 * reusing an open tab of this site when there is one.
 */
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
      icon: "/favicon.svg",
      badge: "/favicon.svg",
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
