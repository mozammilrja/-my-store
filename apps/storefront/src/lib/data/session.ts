import "server-only"
import { cookies } from "next/headers"

const TOKEN = "ew_token"
const CART = "ew_cart"
const ORDER = "ew_order"

const base = {
  httpOnly: true,
  // Lax so a shopper returning from an outside link keeps their bag and session.
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

export const getToken = async () => (await cookies()).get(TOKEN)?.value ?? null
export const setToken = async (token: string) => (await cookies()).set(TOKEN, token, { ...base, maxAge: 60 * 60 * 24 * 7 })
export const removeToken = async () => (await cookies()).set(TOKEN, "", { ...base, maxAge: 0 })

export const getCartId = async () => (await cookies()).get(CART)?.value ?? null
export const setCartId = async (id: string) => (await cookies()).set(CART, id, { ...base, maxAge: 60 * 60 * 24 * 30 })
export const removeCartId = async () => (await cookies()).set(CART, "", { ...base, maxAge: 0 })

/** The cart an order was placed from: lets a guest open their own confirmation. */
export const getOrderAccess = async () => (await cookies()).get(ORDER)?.value ?? null
export const setOrderAccess = async (cartId: string) => (await cookies()).set(ORDER, cartId, { ...base, maxAge: 60 * 60 * 24 })
