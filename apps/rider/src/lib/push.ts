import { api } from "./api"

/*
 * Push notifications on this device: registers /sw.js, asks the browser's
 * permission, subscribes with the API's VAPID key and saves the
 * subscription for the signed-in account. State is read back from the
 * browser, so it reflects what this device will actually show.
 */

export type PushState = "unsupported" | "unavailable" | "denied" | "off" | "on"

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}
const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
const key = async () => (await api<{ publicKey: string | null }>("/push/key")).publicKey

export async function pushState(): Promise<PushState> {
  if (!supported()) return "unsupported"
  if (!(await key().catch(() => null))) return "unavailable"
  if (Notification.permission === "denied") return "denied"
  const reg = await navigator.serviceWorker.getRegistration("/")
  return (await reg?.pushManager.getSubscription()) ? "on" : "off"
}

export async function enablePush(): Promise<PushState> {
  const publicKey = await key()
  if (!publicKey) return "unavailable"
  if ((await Notification.requestPermission()) !== "granted") return "denied"
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) })
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await api("/push-subscriptions", { body: { endpoint: json.endpoint, keys: json.keys } })
  return "on"
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/")
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await api("/push-subscriptions", { method: "DELETE", body: { endpoint: sub.endpoint } })
    await sub.unsubscribe()
  }
  return "off"
}

export const PUSH_NOTE: Record<PushState | "checking", string> = {
  checking: "Checking this device…",
  unsupported: "This browser can't show notifications. On iPhone, add the app to your home screen first.",
  unavailable: "Notifications aren't set up on the server yet.",
  denied: "Notifications are blocked. Allow them in the browser's site settings.",
  off: "Off on this device.",
  on: "On for this device.",
}
