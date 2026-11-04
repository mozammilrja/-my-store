import { MongoClient, type ClientSession, type Db } from "mongodb"
import { env } from "../env.js"

const client = new MongoClient(env.MONGODB_URI, {
  appName: "everwear-api",
  // Orders and stock must never be read from a stale or rolled-back write.
  readConcern: { level: "majority" },
  writeConcern: { w: "majority" },
  /*
   * The driver defaults to 100 sockets per client. With the API, the test
   * runners and any scripts all connected at once that is enough to exhaust
   * the server's file descriptors, which showed up as a browser suite failing
   * in a different module on each run while every test passed on its own.
   * A smaller ceiling is still far more concurrency than this API needs, and
   * idle sockets are handed back rather than held open.
   */
  maxPoolSize: 20,
  minPoolSize: 0,
  maxIdleTimeMS: 30_000,
  waitQueueTimeoutMS: 10_000,
})

let db: Db | null = null

export async function connect(): Promise<Db> {
  if (db) return db
  await client.connect()
  db = client.db(env.MONGODB_DB)
  return db
}

export function getDb(): Db {
  if (!db) throw new Error("Database not connected; call connect() first")
  return db
}

export async function disconnect() {
  await client.close()
  db = null
}

/**
 * Runs `fn` in a multi-document transaction (requires the replica set).
 * Use for anything that must be all-or-nothing: placing an order, moving stock.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = client.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(async () => {
      result = await fn(session)
    })
    return result as T
  } finally {
    await session.endSession()
  }
}
