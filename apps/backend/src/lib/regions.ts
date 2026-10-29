import { db, type RegionDoc } from "../db/schema.js"
import { notFound } from "./errors.js"

/** Finds the region that ships to a country (ISO 3166-1 alpha-2, any case). */
export async function regionForCountry(countryCode: string): Promise<RegionDoc> {
  const region = await db.regions().findOne({ "countries.code": countryCode.toLowerCase() })
  if (!region) throw notFound("Region for this country")
  return region
}
