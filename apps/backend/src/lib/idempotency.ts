import crypto from "crypto"
import { db } from "../db/schema.js"
import { conflict } from "./errors.js"

export interface IdempotencyResult<T> {
  status: number
  body: T
}

/**
 * Executes a function with MongoDB-backed idempotency protection.
 * If a request with the same idempotency key and scope has already succeeded,
 * the previous response is returned immediately without re-execution.
 */
export async function executeIdempotent<T>(
  key: string,
  scope: string,
  requestPayload: any,
  fn: () => Promise<IdempotencyResult<T>>,
  lockTtlMs = 60000
): Promise<IdempotencyResult<T>> {
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(requestPayload ?? {}))
    .digest("hex")

  const now = new Date()
  const lockedUntil = new Date(now.getTime() + lockTtlMs)

  // Check if an existing record exists
  const existing = await db.idempotencyRecords().findOne({ key, scope })
  if (existing) {
    if (existing.status === "completed") {
      return {
        status: existing.responseStatus ?? 200,
        body: existing.responseBody as T,
      }
    }
    if (existing.status === "pending" && existing.lockedUntil > now) {
      // Wait briefly for in-flight concurrent execution to complete
      const waitStart = Date.now()
      while (Date.now() - waitStart < 3000) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        const record = await db.idempotencyRecords().findOne({ key, scope })
        if (record?.status === "completed") {
          return {
            status: record.responseStatus ?? 200,
            body: record.responseBody as T,
          }
        }
        if (record?.status === "failed") break
      }
      throw conflict("A request with this idempotency key is currently being processed", "concurrent_request")
    }
  }

  // Attempt to acquire or take over expired lock
  const claimed = await db.idempotencyRecords().findOneAndUpdate(
    {
      key,
      scope,
      $or: [
        { status: "failed" },
        { status: "pending", lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        requestHash,
        status: "pending",
        lockedUntil,
        createdAt: now,
      },
    },
    { returnDocument: "after" }
  )

  if (!claimed && !existing) {
    try {
      await db.idempotencyRecords().insertOne({
        _id: `${scope}_${key}`,
        key,
        scope,
        requestHash,
        status: "pending",
        lockedUntil,
        createdAt: now,
      })
    } catch {
      // Caught duplicate key race condition: wait for winner to complete
      const waitStart = Date.now()
      while (Date.now() - waitStart < 3000) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        const record = await db.idempotencyRecords().findOne({ key, scope })
        if (record?.status === "completed") {
          return {
            status: record.responseStatus ?? 200,
            body: record.responseBody as T,
          }
        }
        if (record?.status === "failed") break
      }
      throw conflict("A request with this idempotency key is currently being processed", "concurrent_request")
    }
  }

  try {
    const result = await fn()
    await db.idempotencyRecords().updateOne(
      { key, scope },
      {
        $set: {
          status: "completed",
          responseStatus: result.status,
          responseBody: result.body,
        },
      }
    )
    return result
  } catch (error) {
    await db.idempotencyRecords().updateOne(
      { key, scope, status: "pending" },
      { $set: { status: "failed" } }
    )
    throw error
  }
}
