import { z } from "zod"

/**
 * Zod validation schemas for Everwear Storefront Checkout & Account Forms
 */

export const addressSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name is too long"),
  company: z.string().optional(),
  address1: z
    .string()
    .trim()
    .min(3, "Street address must be at least 3 characters")
    .max(100, "Address is too long"),
  address2: z.string().optional(),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(50, "City name is too long"),
  postalCode: z
    .string()
    .trim()
    .min(3, "Please enter a valid postal / PIN code")
    .max(12, "Postal code is too long"),
  province: z.string().optional(),
  countryCode: z
    .string()
    .trim()
    .length(2, "Country code must be 2 characters (ISO)"),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s-]{8,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
})

/**
 * An address saved to the account's address book. Stricter than checkout's
 * `addressSchema`: couriers need a phone number, and Indian PIN codes are six
 * digits. Used by the form in the browser and again by the server action.
 */
export const savedAddressSchema = addressSchema
  .extend({
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .regex(/^\+?[\d\s()-]{8,20}$/, "Enter a valid phone number, e.g. +91 98765 43210")
      .refine((v) => v.replace(/\D/g, "").length >= 10, "Phone number needs at least 10 digits"),
  })
  .superRefine((a, ctx) => {
    if (a.countryCode.toLowerCase() === "in" && !/^\d{6}$/.test(a.postalCode)) {
      ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Enter a 6-digit PIN code" })
    }
  })

/** Field name → first error message, for showing errors under each input. */
export type FieldErrors = Partial<Record<string, string>>

export const fieldErrorsFrom = (error: z.ZodError): FieldErrors => {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "")
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}

export const checkoutAddressStepSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address for order notifications"),
  shipping: addressSchema,
  sameAsShipping: z.boolean().default(true),
  billing: addressSchema.optional(),
})

export const upiVerificationSchema = z.object({
  vpa: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[\w.-]+@[\w.-]+$/,
      "Please enter a valid UPI ID (e.g. username@okhdfcbank or 9820155489@paytm)"
    ),
})

export const cardValidationSchema = z.object({
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .refine((v) => /^\d{15,16}$/.test(v), "Card number must be 15 or 16 digits"),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\s*\/\s*([2-3]\d)$/, "Expiry must be MM / YY format"),
  cvv: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
  cardholderName: z
    .string()
    .trim()
    .min(2, "Cardholder name is required"),
})

/**
 * GSTIN for a business (B2B) tax invoice: 2-digit state code, 10-character
 * PAN, entity number, "Z", check character. The API checks the same format.
 */
export const buyerGstinSchema = z.object({
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN, e.g. 22AAAAA0000A1Z5"),
  legalName: z
    .string()
    .trim()
    .min(2, "Enter the registered legal name")
    .max(200, "Legal name is too long"),
})
