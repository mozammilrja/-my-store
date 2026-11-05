import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import type { Request, RequestHandler } from "express"
import jwt from "jsonwebtoken"
import { env } from "../env.js"
import { unauthorized } from "./errors.js"
import { membershipOf, sessionOf } from "./ops-session.js"

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEY_LENGTH = 64

/** scrypt with a random 16-byte salt, stored as `scrypt$<salt>$<hash>` (base64url). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

export async function verifyPassword(password: string, stored: string | undefined) {
  const [scheme, salt, hash] = stored?.split("$") ?? []
  if (scheme !== "scrypt" || !salt || !hash) {
    // Spend comparable time so unknown accounts can't be detected by timing.
    await scrypt(password, randomBytes(16), KEY_LENGTH)
    return false
  }
  const expected = Buffer.from(hash, "base64url")
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), expected.length)
  return timingSafeEqual(new Uint8Array(expected), new Uint8Array(actual))
}

export type Actor = "customer" | "admin" | "warehouse" | "rider" | "seller"

/** Warehouse staff and riders sign in for a shift: 12 hours, like admins. */
const LIFETIME: Record<Actor, number> = { customer: 7 * 24 * 3600, admin: 12 * 3600, warehouse: 12 * 3600, rider: 12 * 3600, seller: 24 * 3600 }

export function issueToken(actor: Actor, subject: string) {
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign({ sub: subject, aud: `everwear:${actor}`, iat: now, exp: now + LIFETIME[actor] }, env.JWT_SECRET, {
    algorithm: "HS256",
  })
}

function readToken(req: Request, actor: Actor): { sub: string; iat: number } | null {
  const header = req.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return null
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] })
    if (typeof payload === "string") return null
    return payload.aud === `everwear:${actor}` && typeof payload.sub === "string" ? { sub: payload.sub, iat: payload.iat ?? 0 } : null
  } catch {
    return null
  }
}

/** The operational accounts; customers never use the portal session. */
const PORTAL_REALM = { admin: "admin", warehouse: "warehouse", rider: "rider", seller: "seller" } as const

/**
 * Who the request is from: a bearer token for `actor` first (the API's
 * original contract, still used by the storefront and integrations), else
 * the operations portal session if it holds an account of that kind.
 */
async function authenticate(req: Request, actor: Actor) {
  const bearer = readToken(req, actor)
  if (bearer) {
    req.authVia = "token"
    req.tokenIssuedAt = bearer.iat
    return bearer.sub
  }
  if (actor === "customer") return null
  const m = membershipOf(await sessionOf(req), PORTAL_REALM[actor])
  if (!m) return null
  req.authVia = "session"
  return m.id
}

/** Sets `req.actorId` when a valid token for `actor` is present; never rejects. */
export const optionalAuth =
  (actor: Actor): RequestHandler =>
  async (req, _res, next) => {
    req.actorId = await authenticate(req, actor)
    next()
  }

/** Rejects the request unless it carries a valid token or portal session for `actor`. */
export const requireAuth =
  (actor: Actor): RequestHandler =>
  async (req, _res, next) => {
    const id = await authenticate(req, actor)
    if (!id) throw unauthorized()
    req.actorId = id
    next()
  }

/**
 * For the account loaders: refuses a bearer token issued before the account's
 * sessions were revoked. Portal sessions are revoked by their own record.
 */
export function assertTokenCurrent(req: Request, account: { sessionsRevokedAt?: Date }) {
  if (req.authVia === "token" && account.sessionsRevokedAt && req.tokenIssuedAt! * 1000 < account.sessionsRevokedAt.getTime()) {
    throw unauthorized("This sign-in has been ended. Sign in again.")
  }
}

declare global {
  namespace Express {
    interface Request {
      /** Id of the signed-in customer or admin, set by the auth middleware. */
      actorId?: string | null
      /** How the request authenticated: a bearer token, or the operations portal session cookie. */
      authVia?: "token" | "session"
      /** The bearer token's issue time (seconds), when authVia is "token". */
      tokenIssuedAt?: number
    }
  }
}

/** Very small fixed-window limiter, per process. Enough for login brute-force protection on one server. */
const attempts = new Map<string, { count: number; resetAt: number }>()
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= max
}

/** Rate-limit key for a login attempt: the caller's address plus what they're trying. */
export const clientKey = (req: Request, id: string) =>
  `${req.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}:${id}`
