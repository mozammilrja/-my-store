import type { SeedContext } from "../api-server.ts"

/*
 * Delivery fleet and cash on delivery: one zone at the Bengaluru hub, a
 * rider waiting for checks (licence unverified), two approved riders, a
 * parcel waiting for a rider, and a delivered COD parcel whose cash was
 * handed over through the real remittance code (to be counted), plus one
 * more delivered COD parcel whose cash the rider still holds.
 */
export async function seed({ db, now, hashPassword }: SeedContext) {
  const { submitRemittance } = await import("../../../../backend/src/lib/fleet/cod.ts")
  const passwordHash = await hashPassword("rider-password-1")
  await db.deliveryZones().insertOne({ _id: "zone_blr_east", code: "BLR-EAST", name: "Bengaluru East", warehouseId: "wh_blr", pincodes: ["560038", "560008"], codAllowed: true, active: true, createdAt: now, updatedAt: now } as never)

  const shifts = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: "00:00", end: "23:59" }))
  const rider = (o: Record<string, unknown>) => ({ passwordHash, documents: [], shifts, online: false, lastLocation: null, warehouseId: "wh_blr", zoneIds: ["zone_blr_east"], createdAt: now, updatedAt: now, ...o })
  await db.riders().insertMany([
    rider({
      _id: "rdr_ravi",
      email: "ravi@riders.test",
      phone: "9845000001",
      name: "Ravi Kumar",
      status: "pending",
      vehicle: { type: "scooter", registration: "KA 01 AB 1234" },
      documents: [
        { type: "driving_licence", number: "KA0120230001234", verified: false },
        { type: "aadhaar", number: "123412341234", verified: true, verifiedAt: now, verifiedBy: "adm_owner" },
      ],
    }),
    rider({ _id: "rdr_imran", email: "imran@riders.test", phone: "9845000002", name: "Imran Pasha", status: "approved", vehicle: { type: "bike" }, online: true, onlineSince: now, approvedAt: now }),
    rider({ _id: "rdr_sana", email: "sana@riders.test", phone: "9845000003", name: "Sana Rao", status: "approved", vehicle: { type: "bike" }, approvedAt: now }),
  ] as never)

  const task = (o: Record<string, unknown>) => ({
    shipmentId: `ship_${o._id}`,
    fulfilmentId: `ful_${o._id}`,
    orderId: `ord_${o._id}`,
    warehouseId: "wh_blr",
    zoneId: "zone_blr_east",
    declinedBy: [],
    stop: { name: "Meera Iyer", phone: "9886011111", address1: "4 Residency Road", city: "Bengaluru", postalCode: "560038" },
    attempts: [],
    earnings: [],
    otp: null,
    createdAt: now,
    updatedAt: now,
    ...o,
  })
  const yesterday = new Date(now.getTime() - 86_400_000)
  await db.deliveryTasks().insertMany([
    task({ _id: "dt_wait", code: "EWF-1001", displayId: 1001, status: "unassigned", riderId: null, cod: null }),
    task({
      _id: "dt_done1",
      code: "EWF-1002",
      displayId: 1002,
      status: "delivered",
      riderId: "rdr_sana",
      cod: { due: 249000, currency: "inr", collected: 249000, collectedAt: yesterday, remittanceId: null },
      attempts: [{ at: new Date(yesterday.getTime() - 3600_000), reason: "customer_unavailable", riderId: "rdr_sana" }],
      earnings: [
        { kind: "failed_attempt", amount: 1500, at: yesterday, riderId: "rdr_sana" },
        { kind: "delivery", amount: 4000, at: yesterday, riderId: "rdr_sana" },
      ],
      pod: { at: yesterday, riderId: "rdr_sana", receiverName: "Meera", otpVerified: true },
    }),
  ] as never)
  const sana = (await db.riders().findOne({ _id: "rdr_sana" }))!
  // The rider hands over what they say is the full ₹2,490.
  await submitRemittance(sana, 249000)

  await db.deliveryTasks().insertOne(
    task({
      _id: "dt_done2",
      code: "EWF-1003",
      displayId: 1003,
      status: "delivered",
      riderId: "rdr_sana",
      cod: { due: 100000, currency: "inr", collected: 100000, collectedAt: now, remittanceId: null },
      earnings: [{ kind: "delivery", amount: 4000, at: now, riderId: "rdr_sana" }],
      pod: { at: now, riderId: "rdr_sana", receiverName: "Arjun", otpVerified: true },
    }) as never
  )
}
