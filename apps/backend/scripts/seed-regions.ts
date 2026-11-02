import { connect, disconnect } from "../src/db/client.js"
import { db, ensureIndexes } from "../src/db/schema.js"

async function seedRegions() {
  await connect()
  await ensureIndexes()
  const now = new Date()

  const regions = [
    {
      _id: "reg_in",
      name: "India",
      currency: "inr",
      countries: [{ code: "in", name: "India" }],
      taxRate: 12,
      taxInclusive: false,
      shippingOptions: [
        { _id: "so_in_std", name: "Standard Delivery (India)", amount: 0 },
        { _id: "so_in_exp", name: "Express Delivery (India)", amount: 9900 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: "reg_eu",
      name: "Europe",
      currency: "eur",
      countries: [
        { code: "dk", name: "Denmark" },
        { code: "de", name: "Germany" },
        { code: "fr", name: "France" },
      ],
      taxRate: 25,
      taxInclusive: false,
      shippingOptions: [
        { _id: "so_eu_std", name: "Standard Delivery (EU)", amount: 500 },
        { _id: "so_eu_exp", name: "Express Tracked (EU)", amount: 1500 },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ]

  for (const reg of regions) {
    await db.regions().replaceOne({ _id: reg._id }, reg, { upsert: true })
    console.log(`Upserted region: ${reg.name} (${reg._id})`)
  }

  await disconnect()
  console.log("Regions successfully seeded!")
}

seedRegions().catch((err) => {
  console.error(err)
  process.exit(1)
})
