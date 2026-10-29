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
