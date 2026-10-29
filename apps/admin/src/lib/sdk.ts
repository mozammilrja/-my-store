import Medusa from "@medusajs/js-sdk"

export const BACKEND_URL =
  import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000"

// Medusa's own dashboard, used for screens this app hasn't rebuilt yet
export const LEGACY_ADMIN_URL = `${BACKEND_URL}/app`

export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  auth: {
    type: "jwt",
    jwtTokenStorageKey: "everwear_admin_token",
  },
})

export type ListResponse<K extends string, T> = { [key in K]: T[] } & {
  count: number
  offset: number
  limit: number
}
