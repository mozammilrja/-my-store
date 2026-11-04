/**
 * The seller's legal details, printed on tax invoices. They come from the
 * environment so real registrations are never hard-coded, and a missing value
 * shows as "not set" instead of an invented number:
 *
 *   SELLER_LEGAL_NAME, SELLER_GSTIN, SELLER_CIN, SELLER_ADDRESS,
 *   SELLER_STATE (e.g. "Delhi (07)"), SELLER_EMAIL, SELLER_PHONE
 */
export const SELLER = {
  legalName: process.env.SELLER_LEGAL_NAME || "Everwear",
  gstin: process.env.SELLER_GSTIN || null,
  cin: process.env.SELLER_CIN || null,
  address: process.env.SELLER_ADDRESS || null,
  state: process.env.SELLER_STATE || null,
  email: process.env.SELLER_EMAIL || null,
  phone: process.env.SELLER_PHONE || null,
}
