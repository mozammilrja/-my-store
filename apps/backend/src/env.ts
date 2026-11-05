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
  /** Browser origins of the rider app (apps/rider). */
  RIDER_CORS: list,
  /** Browser origins of the seller portal (apps/seller). */
  SELLER_CORS: list,
  /** Folder for private files (proof-of-delivery photos). Never served publicly. */
  PRIVATE_UPLOADS_DIR: z.string().default("private-uploads"),
  // Razorpay. Online payment is offered only when the key pair is set; the
  // webhook endpoint refuses every event until RAZORPAY_WEBHOOK_SECRET is set.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  /** Override only to point tests at a local stand-in for the Razorpay API. */
  RAZORPAY_API_BASE: z.url().default("https://api.razorpay.com"),
  /** Minutes an unpaid payment attempt stays open before it is expired. */
  PAYMENT_ATTEMPT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  // Shipping. Each courier integration is on when its credentials are set;
  // SHIPPING_PROVIDER is the one used when a booking doesn't name one, and
  // "none" turns them all off (shipments are then recorded by hand; no AWB
  // or tracking is ever invented).
  SHIPPING_PROVIDER: z.enum(["shiprocket", "delhivery", "none"]).default("shiprocket"),
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  /** Shiprocket pickup location nickname (Settings > Pickup Addresses). */
  SHIPROCKET_PICKUP_LOCATION: z.string().optional(),
  /** Value Shiprocket sends in the x-api-key header of tracking webhooks. */
  SHIPROCKET_WEBHOOK_TOKEN: z.string().optional(),
  SHIPROCKET_API_BASE: z.url().default("https://apiv2.shiprocket.in"),
  /** Delhivery API token (Delhivery One > Settings > API setup). */
  DELHIVERY_API_TOKEN: z.string().optional(),
  /** Registered Delhivery warehouse name parcels are collected from, exactly as on Delhivery. */
  DELHIVERY_PICKUP_LOCATION: z.string().optional(),
  /** Token Delhivery sends with its scan-push webhook (Authorization: Bearer <token> or x-api-key). */
  DELHIVERY_WEBHOOK_TOKEN: z.string().optional(),
  /** https://track.delhivery.com in production; https://staging-express.delhivery.com for testing. */
  DELHIVERY_API_BASE: z.url().default("https://track.delhivery.com"),
  /** Pincode orders ship from, for serviceability and rate checks. */
  SHIPPING_ORIGIN_PINCODE: z.string().regex(/^\d{6}$/).optional(),
  /** Parcel defaults when products carry no weight or size. */
  SHIPPING_DEFAULT_WEIGHT_KG: z.coerce.number().positive().default(0.5),
  SHIPPING_DEFAULT_DIMENSIONS_CM: z.string().regex(/^\d+x\d+x\d+$/).default("30x25x5"),

  // Notifications. Each channel uses its chosen provider, or the first one configured.
  /** Links in messages: the storefront (with its country path), rider app and warehouse app. */
  STOREFRONT_URL: z.url().default("http://localhost:8001/in"),
  RIDER_APP_URL: z.url().default("http://localhost:7201"),
  WAREHOUSE_APP_URL: z.url().default("http://localhost:7101"),
  NOTIFY_EMAIL_PROVIDER: z.enum(["smtp", "ses", "none"]).optional(),
  NOTIFY_SMS_PROVIDER: z.enum(["msg91", "twilio", "none"]).optional(),
  NOTIFY_WHATSAPP_PROVIDER: z.enum(["meta", "gupshup", "none"]).optional(),
  /** From address for email, e.g. "Everwear <orders@everwear.com>". */
  MAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  /** true for implicit TLS (port 465); otherwise STARTTLS is required. */
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SES_REGION: z.string().optional(),
  SES_ACCESS_KEY_ID: z.string().optional(),
  SES_SECRET_ACCESS_KEY: z.string().optional(),
  /** Override only for tests. */
  SES_API_BASE: z.url().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_API_BASE: z.url().default("https://control.msg91.com"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  /** Sender: a number in E.164, or use a messaging service. */
  TWILIO_FROM: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  TWILIO_API_BASE: z.url().default("https://api.twilio.com"),
  WHATSAPP_META_TOKEN: z.string().optional(),
  WHATSAPP_META_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_META_API_VERSION: z.string().default("v21.0"),
  WHATSAPP_META_API_BASE: z.url().default("https://graph.facebook.com"),
  GUPSHUP_API_KEY: z.string().optional(),
  /** The WhatsApp business number registered with Gupshup (digits, with country code). */
  GUPSHUP_SOURCE: z.string().optional(),
  GUPSHUP_APP_NAME: z.string().optional(),
  GUPSHUP_API_BASE: z.url().default("https://api.gupshup.io"),
  /** Web push (VAPID). Generate once with: npx web-push generate-vapid-keys */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:support@everwear.com"),
  /** Firebase Cloud Messaging (HTTP v1): the service account JSON, base64-encoded. */
  FCM_SERVICE_ACCOUNT_BASE64: z.string().optional(),
  /** Overrides only for tests. */
  FCM_API_BASE: z.url().default("https://fcm.googleapis.com"),
  FCM_TOKEN_URL: z.url().default("https://oauth2.googleapis.com/token"),
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
