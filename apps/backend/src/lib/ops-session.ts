import { createHash, randomBytes } from "node:crypto"
import type { Request, Response } from "express"
import { db, type OpsSessionDoc, type OpsRealm } from "../db/schema.js"
import { env } from "../env.js"
import { ApiError } from "./errors.js"
import { newId } from "./ids.js"

/*
 * The operations portal's session: one sign-in for every operational account
 * an email holds (admin, warehouse floor, rider, seller). The browser keeps an
 * opaque random token in an httpOnly cookie; the server keeps only its SHA-256
 * and the accounts it was opened for, so a session can be listed, revoked or
 * expired server-side. The realm routes accept it in place of their bearer
 * token (lib/auth.ts), and each still loads and checks its own account on every
 * request: a suspended account loses access at once, session or not.
 *
 * Cookie-authenticated requests must carry the X-Everwear-Ops header. A plain
 * cross-site form or image can't set it, and a script on another origin needs
 * a CORS preflight this API only grants to the portal's own origins.
 */

export const OPS_COOKIE = "everwear_ops"
export const OPS_HEADER = "x-everwear-ops"
/** A shift, like the bearer tokens: signing in again each working day. */
export const OPS_SESSION_HOURS = 12

const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url")

function readCookie(req: Request, name: string) {
  const header = req.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const i = part.indexOf("=")
    if (i < 0) continue
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

function cookieAttributes(maxAgeSeconds: number) {
  const secure = env.OPS_COOKIE_SECURE === "true" || (env.OPS_COOKIE_SECURE !== "false" && env.NODE_ENV === "production")
  return [`Path=/`, `HttpOnly`, `SameSite=Strict`, `Max-Age=${maxAgeSeconds}`, ...(secure ? ["Secure"] : []), ...(env.OPS_COOKIE_DOMAIN ? [`Domain=${env.OPS_COOKIE_DOMAIN}`] : [])].join("; ")
}

export async function openSession(req: Request, res: Response, email: string, memberships: OpsSessionDoc["memberships"]) {
  const token = randomBytes(32).toString("base64url")
  const now = new Date()
  const doc: OpsSessionDoc = {
    _id: newId("opss"),
    tokenHash: sha256(token),
    email,
    memberships,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + OPS_SESSION_HOURS * 3600_000),
    ...(req.ip ? { ip: req.ip } : {}),
    ...(req.get("user-agent") ? { userAgent: req.get("user-agent")!.slice(0, 300) } : {}),
  }
  await db.opsSessions().insertOne(doc)
  res.append("Set-Cookie", `${OPS_COOKIE}=${token}; ${cookieAttributes(OPS_SESSION_HOURS * 3600)}`)
  return doc
}

export function clearSessionCookie(res: Response) {
  res.append("Set-Cookie", `${OPS_COOKIE}=; ${cookieAttributes(0)}`)
}

declare global {
  namespace Express {
    interface Request {
      /** The portal session this request was authenticated with (undefined: not looked up yet; null: none). */
      opsSession?: OpsSessionDoc | null
    }
  }
}

/**
 * The live session behind this request's cookie, or null. Looked up once per
 * request. A cookie without the portal header is refused outright rather than
 * ignored, so a forged cross-site request fails loudly.
 */
export async function sessionOf(req: Request): Promise<OpsSessionDoc | null> {
  if (req.opsSession !== undefined) return req.opsSession
  const token = readCookie(req, OPS_COOKIE)
  if (!token) return (req.opsSession = null)
  if (req.get(OPS_HEADER) !== "1") throw new ApiError(403, "csrf", "This request needs the operations portal header")
  const now = new Date()
  const session = await db.opsSessions().findOne({ tokenHash: sha256(token), revokedAt: { $exists: false }, expiresAt: { $gt: now } })
  if (session && now.getTime() - session.lastSeenAt.getTime() > 60_000) {
    await db.opsSessions().updateOne({ _id: session._id }, { $set: { lastSeenAt: now } })
  }
  return (req.opsSession = session)
}

export function membershipOf(session: OpsSessionDoc | null, realm: OpsRealm) {
  return session?.memberships.find((m) => m.realm === realm) ?? null
}

/**
 * Ends every portal session holding one of these accounts, and every bearer
 * token issued to them before now (the realm loaders compare `iat` against
 * `sessionsRevokedAt`). Used on sign-out-everywhere, suspension and password
 * change or reset.
 */
export async function revokeSessionsFor(accounts: { realm: OpsRealm; id: string }[], reason: string, keepSessionId?: string) {
  if (!accounts.length) return 0
  const now = new Date()
  const r = await db.opsSessions().updateMany(
    {
      $or: accounts.map((a) => ({ memberships: { $elemMatch: { realm: a.realm, id: a.id } } })),
      revokedAt: { $exists: false },
      ...(keepSessionId ? { _id: { $ne: keepSessionId } } : {}),
    },
    { $set: { revokedAt: now, revokedReason: reason } }
  )
  // Bearer tokens can't be listed, so they are cut off by issue time. Keeping
  // the current portal session doesn't need them: it isn't a bearer token.
  await Promise.all(
    accounts.map((a) => {
      const set = { $set: { sessionsRevokedAt: now } }
      if (a.realm === "admin") return db.adminUsers().updateOne({ _id: a.id }, set)
      if (a.realm === "warehouse") return db.warehouseUsers().updateOne({ _id: a.id }, set)
      if (a.realm === "rider") return db.riders().updateOne({ _id: a.id }, set)
      return db.sellers().updateOne({ _id: a.id }, set)
    })
  )
  return r.modifiedCount
}

export const hashToken = sha256
