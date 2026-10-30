import { z } from "zod"

const list = z
  .string()
  .default("")
  .transform((value) => value.split(",").map((s) => s.trim()).filter(Boolean))

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(9100),
  /** Public base URL of this API; used to build absolute links to uploaded files. */
  API_PUBLIC_URL: z.url().default("http://localhost:9100"),
  /** Folder for uploaded files (product images). Served at /uploads. */
  UPLOADS_DIR: z.string().default("uploads"),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("everwear"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  STORE_CORS: list,
  ADMIN_CORS: list,
  // Payment Providers (optional in local/test, required for live external gateway connections)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  // Carrier Logistics (optional in local/test, required for live manifest/dispatch APIs)
  DELHIVERY_API_KEY: z.string().optional(),
  DELHIVERY_CLIENT_ID: z.string().optional(),
  DELHIVERY_MODE: z.enum(["staging", "production"]).default("staging"),
  BLUEDART_CUSTOMER_CODE: z.string().optional(),
  BLUEDART_LOGIN_ID: z.string().optional(),
  BLUEDART_LICENCE_KEY: z.string().optional(),
  BLUEDART_API_MODE: z.enum(["staging", "production"]).default("staging"),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment:", z.prettifyError(parsed.error))
  process.exit(1)
}

/** Validated settings. The process exits at startup if any are missing or invalid. */
export const env = parsed.data
export const isProd = env.NODE_ENV === "production"
