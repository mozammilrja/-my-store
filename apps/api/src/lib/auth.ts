import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import type { Context, MiddlewareHandler } from "hono"
import { sign, verify } from "hono/jwt"
import { env } from "../env.js"
import { unauthorized } from "./errors.js"

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

export type Actor = "customer" | "admin"

const LIFETIME: Record<Actor, number> = { customer: 7 * 24 * 3600, admin: 12 * 3600 }

export async function issueToken(actor: Actor, subject: string) {
  const now = Math.floor(Date.now() / 1000)
  return sign({ sub: subject, aud: `everwear:${actor}`, iat: now, exp: now + LIFETIME[actor] }, env.JWT_SECRET, "HS256")
}

async function readToken(c: Context, actor: Actor): Promise<string | null> {
  const header = c.req.header("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return null
  try {
    const payload = await verify(token, env.JWT_SECRET, "HS256")
    return payload.aud === `everwear:${actor}` && typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}

/** Sets `actorId` when a valid token for `actor` is present; never rejects. */
export const optionalAuth = (actor: Actor): MiddlewareHandler => async (c, next) => {
  c.set("actorId", await readToken(c, actor))
  await next()
}

/** Rejects the request unless it carries a valid token for `actor`. */
export const requireAuth = (actor: Actor): MiddlewareHandler => async (c, next) => {
  const id = await readToken(c, actor)
  if (!id) throw unauthorized()
  c.set("actorId", id)
  await next()
}

declare module "hono" {
  interface ContextVariableMap {
    actorId: string | null
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
