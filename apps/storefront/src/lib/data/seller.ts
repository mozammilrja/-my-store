import "server-only"
import { cache } from "react"
import { api } from "../api/client"
import { SELLER } from "../util/seller"

/** The seller of record printed on tax invoices. Unset fields are null. */
export type Seller = {
  legalName: string | null
  gstin: string | null
  cin: string | null
  address: string | null
  state: string | null
  email: string | null
  phone: string | null
}

/**
 * Seller details from the store settings in the database (edited by an owner
 * through the admin settings API), field by field falling back to the
 * SELLER_* environment variables, then to nothing. Never invents a value.
 */
export const getSeller = cache(async (): Promise<Seller> => {
  let stored: Partial<Seller> = {}
  try {
    stored = (await api<{ seller: Partial<Seller> }>("/store/seller", { cache: "no-store" })).seller ?? {}
  } catch {
    // API unreachable or older backend: fall back to the environment below.
  }
  const pick = (key: keyof Seller, env: string | null | undefined) => stored[key] ?? env ?? null
  return {
    legalName: pick("legalName", process.env.SELLER_LEGAL_NAME || null),
    gstin: pick("gstin", SELLER.gstin),
    cin: pick("cin", SELLER.cin),
    address: pick("address", SELLER.address),
    state: pick("state", SELLER.state),
    email: pick("email", SELLER.email),
    phone: pick("phone", SELLER.phone),
  }
})
