/**
 * Creates (or resets the password of) a storefront customer account, e.g. a
 * demo shopper for local testing.
 *
 *   npm run customer:create -- you@example.com 'a-long-password' "First Last"
 */
import { connect, disconnect } from "../src/db/client.js"
import { db, ensureIndexes } from "../src/db/schema.js"
import { hashPassword } from "../src/lib/auth.js"
import { newId } from "../src/lib/ids.js"
import { email as emailSchema, password as passwordSchema } from "../src/lib/validation.js"

const [rawEmail, rawPassword, name] = process.argv.slice(2)
const email = emailSchema.safeParse(rawEmail)
const password = passwordSchema.safeParse(rawPassword)
if (!email.success || !password.success) {
  console.error('Usage: npm run customer:create -- <email> <password, 8+ characters> ["First Last"]')
  process.exit(1)
}

const [firstName, ...rest] = (name ?? "").trim().split(/\s+/).filter(Boolean)
const profile = {
  ...(firstName ? { firstName } : {}),
  ...(rest.length ? { lastName: rest.join(" ") } : {}),
}

try {
  await connect()
  await ensureIndexes()
  const now = new Date()
  const passwordHash = await hashPassword(password.data)
  const existing = await db.customers().findOne({ email: email.data })
  if (existing) {
    await db.customers().updateOne({ _id: existing._id }, { $set: { passwordHash, ...profile, updatedAt: now } })
    console.log(`Updated password for customer ${email.data}`)
  } else {
    await db.customers().insertOne({
      _id: newId("cus"),
      email: email.data,
      passwordHash,
      ...profile,
      addresses: [],
      createdAt: now,
      updatedAt: now,
    })
    console.log(`Created customer ${email.data}`)
  }
} finally {
  await disconnect()
}
