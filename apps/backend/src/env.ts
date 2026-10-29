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
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment:", z.prettifyError(parsed.error))
  process.exit(1)
}

/** Validated settings. The process exits at startup if any are missing or invalid. */
export const env = parsed.data
export const isProd = env.NODE_ENV === "production"
