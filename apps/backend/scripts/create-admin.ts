/**
 * Creates (or resets the password of) an admin user for the Everwear admin.
 *
 *   npm run admin:create -- you@example.com 'a-long-password' "Your Name"
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
  console.error('Usage: npm run admin:create -- <email> <password, 8+ characters> ["Name"]')
  process.exit(1)
}

try {
  await connect()
  await ensureIndexes()
  const now = new Date()
  const passwordHash = await hashPassword(password.data)
  const existing = await db.adminUsers().findOne({ email: email.data })
  if (existing) {
    await db.adminUsers().updateOne({ _id: existing._id }, { $set: { passwordHash, ...(name ? { name } : {}), updatedAt: now } })
    console.log(`Updated password for admin ${email.data}`)
  } else {
    const isFirst = (await db.adminUsers().countDocuments()) === 0
    await db.adminUsers().insertOne({
      _id: newId("admin"),
      email: email.data,
      passwordHash,
      ...(name ? { name } : {}),
      role: isFirst ? "owner" : "staff",
      createdAt: now,
      updatedAt: now,
    })
    console.log(`Created ${isFirst ? "owner" : "staff"} admin ${email.data}`)
  }
} finally {
  await disconnect()
}
