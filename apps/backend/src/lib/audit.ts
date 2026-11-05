import { db, type AuditLogDoc, type OpsRealm } from "../db/schema.js"
import { newId } from "./ids.js"

/**
 * Appends to the audit log. `adminId`/`adminEmail` keep their names for the
 * entries already stored; `actorRealm` says which kind of account they belong
 * to. An empty actor id records something done before anyone signed in.
 */
export function audit(entry: {
  realm: OpsRealm | "system"
  actorId: string
  actorEmail: string
  action: string
  targetCollection: string
  targetId?: string
  diff?: unknown
  ip?: string
}) {
  const doc: AuditLogDoc = {
    _id: newId("audit"),
    adminId: entry.actorId,
    adminEmail: entry.actorEmail,
    actorRealm: entry.realm,
    action: entry.action,
    targetCollection: entry.targetCollection,
    ...(entry.targetId ? { targetId: entry.targetId } : {}),
    ...(entry.diff !== undefined ? { diff: entry.diff } : {}),
    ...(entry.ip ? { ip: entry.ip } : {}),
    createdAt: new Date(),
  }
  return db.auditLogs().insertOne(doc)
}
