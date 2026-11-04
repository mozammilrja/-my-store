import { db, type RegionDoc } from "../db/schema.js"
import { env } from "../env.js"

/**
 * The one region this store trades in.
 *
 * The regions collection still holds every region the catalog has ever been
 * priced for, and historical orders keep pointing at whichever region they
 * were placed in. But the business operates in one of them, so admin
 * reporting is scoped to it rather than comparing currencies side by side.
 *
 * Configured by currency through OPERATING_REGION_CURRENCY so the deployment
 * decides, not a hardcoded id that would differ between databases.
 */

let cached: RegionDoc | null = null

export async function getOperatingRegion(): Promise<RegionDoc> {
  // The test suites drop and rebuild their database between runs, so a region
  // memoised from a previous build would be stale.
  if (cached && env.NODE_ENV !== "test") return cached

  const wanted = env.OPERATING_REGION_CURRENCY.toLowerCase()
  const region =
    (await db.regions().findOne({ currency: wanted })) ??
    (await db.regions().findOne({}, { sort: { name: 1 } }))

  if (!region) {
    throw new Error(
      `No region found for OPERATING_REGION_CURRENCY=${wanted}, and the regions collection is empty.`
    )
  }
  cached = region
  return region
}

/** Clears the memoised region; used by the tests, which rebuild the database. */
export function resetOperatingRegionCache() {
  cached = null
}

/** A Mongo filter restricting a collection of orders to the operating region. */
export async function operatingRegionOrderFilter() {
  const region = await getOperatingRegion()
  return { currency: region.currency }
}
