import type { AdminUserDoc, AdminUserRole, OpsRealm, OpsSessionDoc, RiderDoc, SellerDoc, WarehouseRole, WarehouseUserDoc } from "../db/schema.js"
import { db } from "../db/schema.js"

/*
 * Portal roles. They are derived from the accounts a session holds, never
 * stored and never taken from the browser:
 *
 *   admin account, role owner            -> OWNER
 *   admin account, any other role        -> ADMIN (its finer admin role still applies on the API)
 *   warehouse account, role supervisor   -> WAREHOUSE_SUPERVISOR
 *   warehouse account, any other role    -> WAREHOUSE_STAFF (picker, packer, inspector, dispatcher)
 *   rider account                        -> DELIVERY_RIDER
 *   seller account                       -> SELLER
 *
 * Each portal area maps to one realm of the API. The realm's own routes do
 * the authorisation (warehouse assignment, rider assignment, seller
 * ownership, admin role checks); the portal only decides which areas to show.
 */

export const PORTAL_ROLES = ["OWNER", "ADMIN", "WAREHOUSE_SUPERVISOR", "WAREHOUSE_STAFF", "DELIVERY_RIDER", "SELLER"] as const
export type PortalRole = (typeof PORTAL_ROLES)[number]

export const AREAS = ["admin", "warehouse", "delivery", "seller"] as const
export type Area = (typeof AREAS)[number]

export const AREA_REALM: Record<Area, OpsRealm> = { admin: "admin", warehouse: "warehouse", delivery: "rider", seller: "seller" }

export type Accounts = {
  admin?: AdminUserDoc
  warehouse?: WarehouseUserDoc
  rider?: RiderDoc
  seller?: SellerDoc
}

/** Every operational account with this email, whatever its state. */
export async function accountsByEmail(email: string): Promise<Accounts> {
  const [admin, warehouse, rider, seller] = await Promise.all([
    db.adminUsers().findOne({ email }),
    db.warehouseUsers().findOne({ email }),
    db.riders().findOne({ email }),
    db.sellers().findOne({ email }),
  ])
  return { ...(admin ? { admin } : {}), ...(warehouse ? { warehouse } : {}), ...(rider ? { rider } : {}), ...(seller ? { seller } : {}) }
}

/**
 * Whether an account may be signed in to. These match each realm's own login
 * route: suspended admins and warehouse staff can't; riders and sellers can
 * unless rejected, so a pending or suspended one sees why they can't work.
 */
export function canSignIn(realm: OpsRealm, doc: { status?: string }) {
  if (realm === "admin") return doc.status !== "suspended"
  if (realm === "warehouse") return doc.status === "active"
  if (realm === "rider") return doc.status !== "rejected"
  return true
}

/** The accounts a session holds, re-read now; any that can no longer sign in are left out. */
export async function sessionAccounts(session: OpsSessionDoc): Promise<Accounts> {
  const out: Accounts = {}
  await Promise.all(
    session.memberships.map(async (m) => {
      if (m.realm === "admin") {
        const d = await db.adminUsers().findOne({ _id: m.id })
        if (d && canSignIn("admin", d)) out.admin = d
      } else if (m.realm === "warehouse") {
        const d = await db.warehouseUsers().findOne({ _id: m.id })
        if (d && canSignIn("warehouse", d)) out.warehouse = d
      } else if (m.realm === "rider") {
        const d = await db.riders().findOne({ _id: m.id })
        if (d && canSignIn("rider", d)) out.rider = d
      } else {
        const d = await db.sellers().findOne({ _id: m.id })
        if (d && canSignIn("seller", d)) out.seller = d
      }
    })
  )
  return out
}

export function rolesOf(a: Accounts): PortalRole[] {
  const roles: PortalRole[] = []
  if (a.admin) roles.push(a.admin.role === "owner" ? "OWNER" : "ADMIN")
  if (a.warehouse) roles.push(a.warehouse.role === "supervisor" ? "WAREHOUSE_SUPERVISOR" : "WAREHOUSE_STAFF")
  if (a.rider) roles.push("DELIVERY_RIDER")
  if (a.seller) roles.push("SELLER")
  return roles
}

export function areasOf(a: Accounts): Area[] {
  return AREAS.filter((area) => !!a[AREA_REALM[area] as keyof Accounts])
}

/** What the portal needs to draw itself. No password hashes, bank or KYC details. */
export function principal(email: string, a: Accounts, session: OpsSessionDoc) {
  const areas = areasOf(a)
  const name = a.admin?.name ?? a.warehouse?.name ?? a.rider?.name ?? a.seller?.displayName ?? null
  return {
    email,
    name,
    roles: rolesOf(a),
    areas,
    home: areas.length ? `/${areas[0]}` : null,
    accounts: {
      ...(a.admin ? { admin: { id: a.admin._id, role: a.admin.role as AdminUserRole, name: a.admin.name ?? null } } : {}),
      ...(a.warehouse ? { warehouse: { id: a.warehouse._id, role: a.warehouse.role as WarehouseRole, name: a.warehouse.name, warehouseIds: a.warehouse.warehouseIds } } : {}),
      ...(a.rider ? { rider: { id: a.rider._id, name: a.rider.name, status: a.rider.status } } : {}),
      ...(a.seller ? { seller: { id: a.seller._id, displayName: a.seller.displayName, status: a.seller.status } } : {}),
    },
    session: { id: session._id, createdAt: session.createdAt, expiresAt: session.expiresAt },
  }
}

export function membershipsOf(a: Accounts): OpsSessionDoc["memberships"] {
  return [
    ...(a.admin ? [{ realm: "admin" as const, id: a.admin._id }] : []),
    ...(a.warehouse ? [{ realm: "warehouse" as const, id: a.warehouse._id }] : []),
    ...(a.rider ? [{ realm: "rider" as const, id: a.rider._id }] : []),
    ...(a.seller ? [{ realm: "seller" as const, id: a.seller._id }] : []),
  ]
}
