import jwt from "jsonwebtoken"
import webpush from "web-push"
import type { PushSubscriptionDoc } from "../../../db/schema.js"
import { env } from "../../../env.js"
import { providerJson } from "../../providers/http.js"
import { asSendError, SendError, type SendResult } from "./common.js"

/*
 * Push: Web Push (VAPID, payload encrypted per RFC 8291 by the web-push
 * library) to browsers and installed web apps; Firebase Cloud Messaging
 * (HTTP v1, service-account OAuth) to native app tokens. A subscription the
 * push service says is gone is reported as `gone` so it can be removed.
 */

export type Push = { title: string; body: string; url: string; tag?: string }

export const webPushReady = () => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)

type ServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri?: string }
let account: ServiceAccount | null | undefined
function fcmAccount() {
  if (account !== undefined) return account
  try {
    account = env.FCM_SERVICE_ACCOUNT_BASE64 ? (JSON.parse(Buffer.from(env.FCM_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")) as ServiceAccount) : null
  } catch {
    account = null
  }
  return account
}
export const fcmReady = () => !!fcmAccount()

export async function sendWebPush(sub: PushSubscriptionDoc, m: Push): Promise<SendResult> {
  if (!webPushReady()) throw new SendError("Web push isn't configured (VAPID keys)", false)
  if (!sub.endpoint || !sub.keys) throw new SendError("Not a web push subscription", false)
  const details = webpush.generateRequestDetails({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(m), {
    vapidDetails: { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY! },
    TTL: 24 * 3600,
    urgency: "high",
  })
  let res: Response
  try {
    res = await fetch(details.endpoint, { method: details.method, headers: details.headers as Record<string, string>, body: details.body ? new Uint8Array(details.body) : undefined, signal: AbortSignal.timeout(15_000) })
  } catch (e) {
    throw new SendError(`Push service unreachable: ${(e as Error).message}`, true)
  }
  if (res.status === 404 || res.status === 410) throw new SendError("Subscription expired", false, true)
  if (!res.ok) throw new SendError(`Push service: HTTP ${res.status}`, res.status >= 500 || res.status === 429)
  return { provider: "webpush", messageId: res.headers.get("location") ?? String(res.status) }
}

let cached: { token: string; until: number } | null = null
async function fcmToken() {
  if (cached && cached.until > Date.now()) return cached.token
  const a = fcmAccount()!
  const now = Math.floor(Date.now() / 1000)
  const assertion = jwt.sign({ iss: a.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: a.token_uri ?? env.FCM_TOKEN_URL, iat: now, exp: now + 3600 }, a.private_key, { algorithm: "RS256" })
  const res = await providerJson<{ access_token: string; expires_in: number }>("Google OAuth", env.FCM_TOKEN_URL, {
    method: "POST",
    form: { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion },
  })
  cached = { token: res.access_token, until: Date.now() + (res.expires_in - 60) * 1000 }
  return cached.token
}

export async function sendFcm(sub: PushSubscriptionDoc, m: Push): Promise<SendResult> {
  const a = fcmAccount()
  if (!a) throw new SendError("FCM isn't configured", false)
  if (!sub.token) throw new SendError("Not an FCM device", false)
  try {
    const res = await providerJson<{ name: string }>("FCM", `${env.FCM_API_BASE}/v1/projects/${a.project_id}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${await fcmToken()}` },
      body: { message: { token: sub.token, notification: { title: m.title, body: m.body }, data: { url: m.url, ...(m.tag ? { tag: m.tag } : {}) } } },
    })
    return { provider: "fcm", messageId: res.name }
  } catch (e) {
    const err = asSendError(e)
    // FCM says a token is no longer valid with 404 (UNREGISTERED) or 400 INVALID_ARGUMENT on the token.
    const status = (e as { status?: number }).status
    if (status === 404 || (status === 400 && /registration token|UNREGISTERED|INVALID_ARGUMENT/i.test(err.message))) throw new SendError(err.message, false, true)
    throw err
  }
}
