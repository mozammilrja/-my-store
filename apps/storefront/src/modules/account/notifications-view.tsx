"use client"

import type { FeedNotification, NotificationPrefs } from "@lib/api/types"
import { getPushKey, markAllNotificationsRead, markNotificationRead, removePushSubscription, savePushSubscription, updateNotificationPreferences } from "@lib/data/account"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

/*
 * The customer's notifications: the in-app feed (orders, deliveries,
 * returns and refunds, newest first) and how they want updates sent:
 * email, SMS, WhatsApp (only after they opt in) and this browser's push
 * notifications. Order and delivery updates only; nothing promotional.
 */

type Category = "all" | "orders" | "shipping" | "returns"

const CATEGORY: Record<FeedNotification["type"], { key: Exclude<Category, "all">; label: string; icon: string }> = {
  order_confirmation: { key: "orders", label: "Orders", icon: "inventory_2" },
  shipment_update: { key: "shipping", label: "Delivery", icon: "local_shipping" },
  return_status: { key: "returns", label: "Returns", icon: "assignment_return" },
  refund_processed: { key: "returns", label: "Refunds", icon: "payments" },
  low_stock: { key: "orders", label: "Orders", icon: "inventory_2" },
  ticket_reply: { key: "orders", label: "Support", icon: "support_agent" },
  promotion: { key: "orders", label: "Orders", icon: "inventory_2" },
}

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: Date.parse(iso) < Date.now() - 300 * 86_400_000 ? "numeric" : undefined })
}

const linkFor = (n: FeedNotification) =>
  n.type === "return_status" || n.type === "refund_processed" ? { href: "/account/returns", label: "See returns" } : n.metadata?.orderId ? { href: `/order/${n.metadata.orderId}/track`, label: "View order" } : { href: "/account/orders", label: "Your orders" }

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

export function NotificationsView({ notifications, preferences, hasPhone }: { notifications: FeedNotification[]; preferences: NotificationPrefs; hasPhone: boolean }) {
  const [tab, setTab] = useState<Category>("all")
  const [prefs, setPrefs] = useState(preferences)
  const [pending, startTransition] = useTransition()
  const unread = notifications.filter((n) => n.status === "unread")
  const shown = notifications.filter((n) => tab === "all" || CATEGORY[n.type]?.key === tab)
  const count = (k: Exclude<Category, "all">) => notifications.filter((n) => CATEGORY[n.type]?.key === k).length

  const savePref = (patch: Partial<NotificationPrefs>) => {
    const before = prefs
    setPrefs({ ...prefs, ...patch })
    startTransition(async () => {
      const r = await updateNotificationPreferences(patch)
      if (r.error) {
        setPrefs(before)
        toast.error(r.error)
      } else toast.success("Saved")
    })
  }

  return (
    <div className="flex flex-col w-full gap-space-xl" data-testid="notifications-view">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-container-high">
        <div>
          <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-1">Account</span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase">Notifications</h1>
        </div>
        <button
          type="button"
          disabled={!unread.length || pending}
          onClick={() =>
            startTransition(async () => {
              const r = await markAllNotificationsRead()
              if (r.error) toast.error(r.error)
            })
          }
          className="h-11 px-5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm rounded uppercase tracking-wider transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">done_all</span>
          Mark all as read
        </button>
      </div>

      <section aria-labelledby="channels-heading" className="bg-surface-container-lowest rounded-xl p-space-lg border border-surface-container-high/60 flex flex-col gap-space-md">
        <div>
          <h2 id="channels-heading" className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            How we keep you posted
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Order confirmations, delivery updates, your delivery code, returns and refunds. Never offers.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              ["email", "Email", "To your account email"],
              ["sms", "SMS", hasPhone ? "To the phone on your order" : "Add a phone to an address first"],
              ["whatsapp", "WhatsApp", "Updates on WhatsApp, only if you turn this on"],
            ] as const
          ).map(([key, label, note]) => (
            <label key={key} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${prefs[key] ? "border-primary bg-surface-container-lowest" : "border-surface-container-high bg-surface-container-low"}`}>
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-primary" checked={prefs[key]} disabled={pending} onChange={(e) => savePref({ [key]: e.target.checked })} data-testid={`pref-${key}`} />
              <span className="flex flex-col">
                <span className="font-body-sm text-body-sm font-semibold text-on-surface">{label}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{note}</span>
              </span>
            </label>
          ))}
        </div>
        <BrowserPush enabled={prefs.push} onToggle={(push) => savePref({ push })} />
      </section>

      <div role="tablist" aria-label="Notification type" className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            ["all", `All (${notifications.length})`],
            ["orders", `Orders (${count("orders")})`],
            ["shipping", `Delivery (${count("shipping")})`],
            ["returns", `Returns & refunds (${count("returns")})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-9 px-4 rounded font-label-sm text-label-sm uppercase tracking-wider whitespace-nowrap ${tab === key ? "bg-primary text-on-primary font-semibold" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-space-md" id="notifications-list">
        {shown.length === 0 ? (
          <li className="p-space-xl bg-surface-container-lowest rounded-xl text-center border border-surface-container-high/60">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">notifications_off</span>
            <p className="font-body-md text-body-md text-on-surface-variant">{notifications.length ? "Nothing here in this category." : "Updates about your orders will appear here."}</p>
          </li>
        ) : (
          shown.map((n) => {
            const c = CATEGORY[n.type] ?? CATEGORY.order_confirmation
            const isUnread = n.status === "unread"
            const link = linkFor(n)
            return (
              <li key={n._id} className="bg-surface-container-lowest p-space-lg rounded-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-surface-container-high/60" data-testid="notification-card">
                {isUnread && <div className="absolute top-0 left-0 bottom-0 w-1 bg-secondary" aria-hidden />}
                <div className="flex items-start gap-space-md">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isUnread ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-surface-container text-on-surface-variant"}`}>
                    <span className="material-symbols-outlined text-[24px]" aria-hidden>
                      {c.icon}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-label-caps text-label-caps uppercase tracking-wider ${isUnread ? "text-secondary font-bold" : "text-on-surface-variant font-semibold"}`}>{c.label}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" aria-hidden />
                      <time dateTime={n.createdAt} className="font-body-sm text-body-sm text-on-surface-variant">
                        {ago(n.createdAt)}
                      </time>
                      {isUnread && <span className="bg-secondary text-on-secondary font-label-caps text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>}
                    </div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">{n.title}</h2>
                    <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">{n.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <LocalizedClientLink href={link.href} className="h-9 px-4 font-label-sm text-label-sm rounded uppercase tracking-wider flex items-center font-medium bg-surface-container hover:bg-surface-container-high text-on-surface">
                    {link.label}
                  </LocalizedClientLink>
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          const r = await markNotificationRead(n._id)
                          if (r.error) toast.error(r.error)
                        })
                      }
                      className="h-9 w-9 bg-surface-container hover:bg-surface-container-high text-on-surface rounded flex items-center justify-center"
                      aria-label={`Mark "${n.title}" as read`}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden>
                        done
                      </span>
                    </button>
                  )}
                </div>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

/** Push on this browser: registers the service worker, asks permission, and saves the subscription. */
function BrowserPush({ enabled, onToggle }: { enabled: boolean; onToggle: (on: boolean) => void }) {
  const [state, setState] = useState<"checking" | "unsupported" | "unavailable" | "denied" | "off" | "on">("checking")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return live && setState("unsupported")
      if (!(await getPushKey().catch(() => null))) return live && setState("unavailable")
      if (Notification.permission === "denied") return live && setState("denied")
      const reg = await navigator.serviceWorker.getRegistration("/")
      const sub = await reg?.pushManager.getSubscription()
      if (live) setState(sub ? "on" : "off")
    })()
    return () => {
      live = false
    }
  }, [])

  const turnOn = async () => {
    setBusy(true)
    try {
      const key = await getPushKey()
      if (!key) return setState("unavailable")
      if ((await Notification.requestPermission()) !== "granted") return setState("denied")
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const r = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys })
      if (r.error) throw new Error(r.error)
      setState("on")
      if (!enabled) onToggle(true)
      toast.success("Notifications are on for this browser")
    } catch (e) {
      toast.error((e as Error).message || "Couldn't turn on notifications")
    } finally {
      setBusy(false)
    }
  }
  const turnOff = async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration("/")
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setState("off")
      toast.success("Notifications are off for this browser")
    } finally {
      setBusy(false)
    }
  }

  const note = {
    checking: "Checking this browser…",
    unsupported: "This browser can't show notifications.",
    unavailable: "Browser notifications aren't available right now.",
    denied: "Notifications are blocked for this site. Allow them in your browser's site settings.",
    off: "Get delivery updates on this browser, even when the site is closed.",
    on: "This browser shows your delivery updates.",
  }[state]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-surface-container-low p-4">
      <div>
        <p className="font-body-sm text-body-sm font-semibold text-on-surface">Browser notifications</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant" role="status">
          {note}
        </p>
      </div>
      {(state === "off" || state === "on") && (
        <button
          type="button"
          disabled={busy}
          onClick={state === "on" ? turnOff : turnOn}
          className={`h-10 px-4 rounded font-label-sm text-label-sm uppercase tracking-wider font-semibold disabled:opacity-60 ${state === "on" ? "border border-surface-container-high text-on-surface" : "bg-primary text-on-primary"}`}
          data-testid="push-toggle"
        >
          {state === "on" ? "Turn off" : "Turn on"}
        </button>
      )}
    </div>
  )
}
