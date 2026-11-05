import { z } from "zod"
import { db, type PushSubscriptionDoc } from "../../db/schema.js"
import { env } from "../../env.js"
import { badRequest } from "../errors.js"
import { newId } from "../ids.js"

/*
 * Registering devices for push. A web push endpoint is a URL the API will
 * POST to, so in production only the browsers' own push services are
 * accepted (otherwise anyone could make the server call arbitrary hosts).
 */

const PUSH_HOSTS = [/(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.apple\.com$/]

const endpoint = z
  .url()
  .max(2048)
  .refine((u) => {
    const url = new URL(u)
    if (env.NODE_ENV !== "production" && env.NODE_ENV !== "development") return true
    return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname))
  }, "That isn't a browser push service address")

export const subscriptionSchema = z.union([
  z.object({ endpoint, keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }) }),
  z.object({ token: z.string().min(20).max(4096) }),
])

export async function saveSubscription(ownerType: PushSubscriptionDoc["ownerType"], ownerId: string, input: z.infer<typeof subscriptionSchema>, userAgent?: string) {
  const now = new Date()
  const filter = "endpoint" in input ? { endpoint: input.endpoint } : { token: input.token }
  // A device signed in as someone else moves to the new owner.
  await db.pushSubscriptions().updateOne(
    filter,
    {
      $set: { ownerType, ownerId, ...("endpoint" in input ? { kind: "webpush" as const, keys: input.keys } : { kind: "fcm" as const }), ...(userAgent ? { userAgent: userAgent.slice(0, 300) } : {}), failures: 0 },
      $setOnInsert: { _id: newId("psub"), ...filter, createdAt: now },
    },
    { upsert: true }
  )
  // Keep it tidy: at most 10 devices per person.
  const all = await db.pushSubscriptions().find({ ownerType, ownerId }, { sort: { createdAt: -1 }, projection: { _id: 1 } }).toArray()
  if (all.length > 10) await db.pushSubscriptions().deleteMany({ _id: { $in: all.slice(10).map((s) => s._id) } })
}

export async function removeSubscription(ownerType: PushSubscriptionDoc["ownerType"], ownerId: string, input: { endpoint?: string; token?: string }) {
  if (!input.endpoint && !input.token) throw badRequest("Say which device to remove")
  await db.pushSubscriptions().deleteOne({ ownerType, ownerId, ...(input.endpoint ? { endpoint: input.endpoint } : { token: input.token }) })
}

export const vapidPublicKey = () => env.VAPID_PUBLIC_KEY ?? null
