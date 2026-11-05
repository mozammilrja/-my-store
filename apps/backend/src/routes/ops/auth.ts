import { randomBytes } from "node:crypto"
import { Router, type Request } from "express"
import { z } from "zod"
import { db, type OpsRealm, type OpsSessionDoc } from "../../db/schema.js"
import { adminLoginMaxAttempts, env } from "../../env.js"
import { audit } from "../../lib/audit.js"
import { clientKey, hashPassword, rateLimit, verifyPassword } from "../../lib/auth.js"
import { ApiError, badRequest, notFound, unauthorized } from "../../lib/errors.js"
import { newId } from "../../lib/ids.js"
import { log } from "../../lib/log.js"
import { emailProvider, sendEmail } from "../../lib/notify/providers/email.js"
import { accountsByEmail, canSignIn, membershipsOf, principal, sessionAccounts, type Accounts } from "../../lib/ops-access.js"
import { clearSessionCookie, hashToken, openSession, revokeSessionsFor, sessionOf } from "../../lib/ops-session.js"
import { email } from "../../lib/validation.js"

/*
 * Sign-in for the operations portal (apps/operations): one form for admins,
 * warehouse staff, riders and sellers. The email's accounts whose password
 * matches, and which may sign in, are opened in one session; the portal shows
 * the areas they unlock. See docs/OPERATIONS_PORTAL.md.
 */

export const opsAuthRoutes = Router()

const REALMS: OpsRealm[] = ["admin", "warehouse", "rider", "seller"]
const newPassword = z.string().min(12, "Use at least 12 characters").max(200)
const RESET_MINUTES = 30

const ipOf = (req: Request) => req.ip ?? undefined
const tooMany = () => new ApiError(429, "rate_limited", "Too many attempts. Try again later.")

async function currentSession(req: Request) {
  const session = await sessionOf(req)
  if (!session) throw unauthorized()
  const accounts = await sessionAccounts(session)
  if (!Object.keys(accounts).length) {
    // Every account behind it was suspended or removed since sign-in.
    await db.opsSessions().updateOne({ _id: session._id }, { $set: { revokedAt: new Date(), revokedReason: "no_accounts" } })
    throw unauthorized()
  }
  return { session, accounts }
}

const firstActor = (s: Pick<OpsSessionDoc, "memberships" | "email">) => ({ realm: s.memberships[0]!.realm, actorId: s.memberships[0]!.id, actorEmail: s.email })

opsAuthRoutes.post("/auth/login", async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body)
  if (!rateLimit(`ops-login:${clientKey(req, body.email)}`, adminLoginMaxAttempts, 15 * 60 * 1000)) throw tooMany()
  if (!rateLimit(`ops-login-ip:${clientKey(req, "*")}`, adminLoginMaxAttempts * 10, 15 * 60 * 1000)) throw tooMany()

  const found = await accountsByEmail(body.email)
  const signedIn: Accounts = {}
  for (const realm of REALMS) {
    const doc = found[realm]
    if (doc && (await verifyPassword(body.password, doc.passwordHash)) && canSignIn(realm, doc)) Object.assign(signedIn, { [realm]: doc })
  }
  // Spend comparable time when the email has no account, so it can't be probed by timing.
  if (!Object.keys(found).length) await verifyPassword(body.password, undefined)

  const memberships = membershipsOf(signedIn)
  if (!memberships.length) {
    await audit({ realm: "system", actorId: "", actorEmail: body.email, action: "ops.login_failed", targetCollection: "ops_sessions", ip: ipOf(req) })
    throw unauthorized("Email or password is incorrect")
  }
  const session = await openSession(req, res, body.email, memberships)
  await audit({ ...firstActor(session), action: "ops.login", targetCollection: "ops_sessions", targetId: session._id, diff: { realms: memberships.map((m) => m.realm) }, ip: ipOf(req) })
  res.json(principal(body.email, signedIn, session))
})

opsAuthRoutes.get("/auth/me", async (req, res) => {
  const { session, accounts } = await currentSession(req)
  res.json(principal(session.email, accounts, session))
})

opsAuthRoutes.post("/auth/logout", async (req, res) => {
  const session = await sessionOf(req)
  if (session) {
    await db.opsSessions().updateOne({ _id: session._id }, { $set: { revokedAt: new Date(), revokedReason: "signed_out" } })
    await audit({ ...firstActor(session), action: "ops.logout", targetCollection: "ops_sessions", targetId: session._id, ip: ipOf(req) })
  }
  clearSessionCookie(res)
  res.json({ signedOut: true })
})

/** Sessions open on any of the signed-in accounts, so a forgotten device can be signed out. */
const sessionsFilter = (accounts: Accounts) => ({
  $or: membershipsOf(accounts).map((m) => ({ memberships: { $elemMatch: { realm: m.realm, id: m.id } } })),
  revokedAt: { $exists: false },
  expiresAt: { $gt: new Date() },
})

opsAuthRoutes.get("/auth/sessions", async (req, res) => {
  const { session, accounts } = await currentSession(req)
  const list = await db.opsSessions().find(sessionsFilter(accounts), { sort: { lastSeenAt: -1 }, limit: 50 }).toArray()
  res.json({
    sessions: list.map((s) => ({ id: s._id, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, ip: s.ip ?? null, userAgent: s.userAgent ?? null, current: s._id === session._id })),
  })
})

opsAuthRoutes.delete("/auth/sessions/:id", async (req, res) => {
  const { session, accounts } = await currentSession(req)
  const r = await db.opsSessions().updateOne({ _id: req.params.id, ...sessionsFilter(accounts) }, { $set: { revokedAt: new Date(), revokedReason: "revoked_by_user" } })
  if (!r.modifiedCount) throw notFound("Session")
  await audit({ ...firstActor(session), action: "ops.session_revoked", targetCollection: "ops_sessions", targetId: req.params.id, ip: ipOf(req) })
  if (req.params.id === session._id) clearSessionCookie(res)
  res.json({ revoked: true })
})

opsAuthRoutes.post("/auth/sessions/revoke-others", async (req, res) => {
  const { session, accounts } = await currentSession(req)
  const n = await revokeSessionsFor(membershipsOf(accounts), "signed_out_elsewhere", session._id)
  await audit({ ...firstActor(session), action: "ops.sessions_revoked", targetCollection: "ops_sessions", diff: { count: n }, ip: ipOf(req) })
  res.json({ revoked: n })
})

/** Changes the password of every account in this session (they signed in with the same one). */
opsAuthRoutes.post("/auth/password", async (req, res) => {
  const { session, accounts } = await currentSession(req)
  const body = z.object({ currentPassword: z.string().min(1).max(200), newPassword }).parse(req.body)
  if (!rateLimit(`ops-password:${session._id}`, 10, 15 * 60 * 1000)) throw tooMany()
  const changed: { realm: OpsRealm; id: string }[] = []
  for (const m of membershipsOf(accounts)) {
    const doc = accounts[m.realm]!
    if (await verifyPassword(body.currentPassword, doc.passwordHash)) changed.push(m)
  }
  if (!changed.length) throw badRequest("Your current password is incorrect", "wrong_password")
  await setPasswords(changed, body.newPassword)
  // Other devices sign in again; this one stays signed in.
  await revokeSessionsFor(changed, "password_changed", session._id)
  await audit({ ...firstActor(session), action: "ops.password_changed", targetCollection: "ops_sessions", diff: { realms: changed.map((c) => c.realm) }, ip: ipOf(req) })
  res.json({ changed: changed.map((c) => c.realm) })
})

async function setPasswords(accounts: { realm: OpsRealm; id: string }[], password: string) {
  const passwordHash = await hashPassword(password)
  const set = { $set: { passwordHash, updatedAt: new Date() } }
  await Promise.all(
    accounts.map((a) =>
      a.realm === "admin"
        ? db.adminUsers().updateOne({ _id: a.id }, set)
        : a.realm === "warehouse"
          ? db.warehouseUsers().updateOne({ _id: a.id }, set)
          : a.realm === "rider"
            ? db.riders().updateOne({ _id: a.id }, set)
            : db.sellers().updateOne({ _id: a.id }, set)
    )
  )
}

/** Creates a reset link for this email and returns the raw token (only its hash is stored). */
export async function issuePasswordReset(address: string) {
  const token = randomBytes(32).toString("base64url")
  const now = new Date()
  // One live link per email: an older one stops working.
  await db.opsPasswordResets().updateMany({ email: address, usedAt: { $exists: false } }, { $set: { usedAt: now } })
  await db.opsPasswordResets().insertOne({ _id: newId("opsr"), tokenHash: hashToken(token), email: address, createdAt: now, expiresAt: new Date(now.getTime() + RESET_MINUTES * 60_000) })
  return token
}

/**
 * Always answers the same way, so it can't be used to learn which emails
 * have accounts. The email goes out only for an account that can sign in.
 */
opsAuthRoutes.post("/auth/password/forgot", async (req, res) => {
  const body = z.object({ email }).parse(req.body)
  if (!rateLimit(`ops-forgot:${clientKey(req, body.email)}`, 5, 60 * 60 * 1000)) throw tooMany()
  const found = await accountsByEmail(body.email)
  const usable = REALMS.some((r) => found[r] && canSignIn(r, found[r]!))
  if (usable) {
    const token = await issuePasswordReset(body.email)
    const link = `${env.OPS_APP_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`
    await audit({ realm: "system", actorId: "", actorEmail: body.email, action: "ops.password_reset_requested", targetCollection: "ops_password_resets", ip: ipOf(req) })
    if (!emailProvider()) {
      log.warn("ops password reset requested but no email provider is configured", { email: body.email })
    } else {
      try {
        await sendEmail({
          to: body.email,
          subject: "Reset your Everwear operations password",
          text: [`Someone asked to reset the password for ${body.email} on the Everwear operations portal.`, "", `Reset it here within ${RESET_MINUTES} minutes: ${link}`, "", "If it wasn't you, ignore this email: your password stays the same."].join("\n"),
        })
      } catch (e) {
        log.error("ops password reset email failed", { email: body.email, error: (e as Error).message })
      }
    }
  }
  res.status(202).json({ accepted: true })
})

opsAuthRoutes.post("/auth/password/reset", async (req, res) => {
  const body = z.object({ token: z.string().min(20).max(200), password: newPassword }).parse(req.body)
  if (!rateLimit(`ops-reset:${clientKey(req, "*")}`, 20, 15 * 60 * 1000)) throw tooMany()
  const now = new Date()
  // Claimed atomically: a link works once, even if submitted twice at the same moment.
  const reset = await db.opsPasswordResets().findOneAndUpdate(
    { tokenHash: hashToken(body.token), usedAt: { $exists: false }, expiresAt: { $gt: now } },
    { $set: { usedAt: now } }
  )
  if (!reset) throw badRequest("This reset link has expired or was already used. Ask for a new one.", "invalid_token")
  const accounts = membershipsOf(await accountsByEmail(reset.email))
  await setPasswords(accounts, body.password)
  await revokeSessionsFor(accounts, "password_reset")
  await audit({ realm: "system", actorId: "", actorEmail: reset.email, action: "ops.password_reset", targetCollection: "ops_password_resets", targetId: reset._id, diff: { realms: accounts.map((a) => a.realm) }, ip: ipOf(req) })
  res.json({ reset: true })
})
