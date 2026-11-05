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
  /** Currency of the single region this store trades in. Admin reporting is scoped to it. */
  OPERATING_REGION_CURRENCY: z.string().min(3).max(3).default("inr"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  /**
   * Admin sign-in attempts allowed per email in 15 minutes. Defaults to 5 in
   * production and 100 elsewhere, so local testing does not lock you out.
   */
  ADMIN_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().optional(),
  STORE_CORS: list,
  ADMIN_CORS: list,
  /** Browser origins of the warehouse app (apps/warehouse). */
  WAREHOUSE_CORS: list,
  // Razorpay. Online payment is offered only when the key pair is set; the
  // webhook endpoint refuses every event until RAZORPAY_WEBHOOK_SECRET is set.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  /** Override only to point tests at a local stand-in for the Razorpay API. */
  RAZORPAY_API_BASE: z.url().default("https://api.razorpay.com"),
  /** Minutes an unpaid payment attempt stays open before it is expired. */
  PAYMENT_ATTEMPT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  // Shipping. SHIPPING_PROVIDER picks the courier integration; "none" means
  // shipments are created by hand (no AWB or tracking is ever invented).
  SHIPPING_PROVIDER: z.enum(["shiprocket", "none"]).default("shiprocket"),
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  /** Shiprocket pickup location nickname (Settings > Pickup Addresses). */
  SHIPROCKET_PICKUP_LOCATION: z.string().optional(),
  /** Value Shiprocket sends in the x-api-key header of tracking webhooks. */
  SHIPROCKET_WEBHOOK_TOKEN: z.string().optional(),
  SHIPROCKET_API_BASE: z.url().default("https://apiv2.shiprocket.in"),
  /** Pincode orders ship from, for serviceability and rate checks. */
  SHIPPING_ORIGIN_PINCODE: z.string().regex(/^\d{6}$/).optional(),
  /** Parcel defaults when products carry no weight or size. */
  SHIPPING_DEFAULT_WEIGHT_KG: z.coerce.number().positive().default(0.5),
  SHIPPING_DEFAULT_DIMENSIONS_CM: z.string().regex(/^\d+x\d+x\d+$/).default("30x25x5"),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment:", z.prettifyError(parsed.error))
  process.exit(1)
}

/** Validated settings. The process exits at startup if any are missing or invalid. */
export const env = parsed.data
export const isProd = env.NODE_ENV === "production"
export const adminLoginMaxAttempts = env.ADMIN_LOGIN_MAX_ATTEMPTS ?? (isProd ? 5 : 100)
