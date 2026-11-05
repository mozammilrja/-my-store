import { z } from "zod"

export const email = z.string().trim().toLowerCase().pipe(z.email().max(254))
export const password = z.string().min(8, "Password must be at least 8 characters").max(200)
const text = (max: number) => z.string().trim().min(1).max(max)

export const address = z.object({
  firstName: text(100),
  lastName: text(100),
  company: z.string().trim().max(200).optional(),
  address1: text(200),
  address2: z.string().trim().max(200).optional(),
  city: text(100),
  postalCode: text(20),
  province: z.string().trim().max(100).optional(),
  countryCode: z.string().regex(/^[a-zA-Z]{2}$/).transform((s) => s.toLowerCase()),
  phone: z.string().trim().max(40).optional(),
})

/**
 * A GSTIN: 2-digit state code, 10-character PAN, entity number, "Z", check
 * character. Format only; the registration itself is not looked up.
 */
export const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export const buyerGstin = z.object({
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(gstinPattern, "Enter a valid 15-character GSTIN, e.g. 22AAAAA0000A1Z5"),
  legalName: text(200),
})
