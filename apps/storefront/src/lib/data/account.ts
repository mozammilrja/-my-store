"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { api, ApiError } from "../api/client"
import type { Address, Customer, Order, OrderSummary } from "../api/types"
import { getOrderAccess, getToken, removeToken, setToken } from "./session"
import { linkCartToCustomer, type ActionResult } from "./shop"

const message = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.")
const text = (form: FormData, key: string) => form.get(key)?.toString().trim() ?? ""

/** The signed-in customer, or null (an expired token signs the visitor out). */
export async function retrieveCustomer(): Promise<Customer | null> {
  const token = await getToken()
  if (!token) return null
  try {
    return (await api<{ customer: Customer }>("/store/customers/me", { token })).customer
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export async function login(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const { token } = await api<{ token: string }>("/store/auth/login", {
      method: "POST",
      body: { email: text(form, "email"), password: form.get("password")?.toString() ?? "" },
    })
    await setToken(token)
  } catch (e) {
    return { error: message(e) }
  }
  await linkCartToCustomer()
  revalidatePath("/", "layout")
  return { error: null }
}

export async function signup(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const { token } = await api<{ token: string }>("/store/auth/register", {
      method: "POST",
      body: {
        email: text(form, "email"),
        password: form.get("password")?.toString() ?? "",
        firstName: text(form, "firstName") || undefined,
        lastName: text(form, "lastName") || undefined,
        phone: text(form, "phone") || undefined,
      },
    })
    await setToken(token)
  } catch (e) {
    return { error: message(e) }
  }
  await linkCartToCustomer()
  revalidatePath("/", "layout")
  return { error: null }
}

export async function signout(countryCode: string) {
  await removeToken()
  revalidatePath("/", "layout")
  redirect(`/${countryCode}/account`)
}

const authed = async () => {
  const token = await getToken()
  if (!token) throw new Error("Please sign in again.")
  return token
}

export async function updateProfile(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    await api("/store/customers/me", {
      method: "PATCH",
      token: await authed(),
      body: { firstName: text(form, "firstName"), lastName: text(form, "lastName"), phone: text(form, "phone") },
    })
  } catch (e) {
    return { error: message(e) }
  }
  revalidatePath("/", "layout")
  return { error: null }
}

const readAddress = (form: FormData): Address => ({
  firstName: text(form, "firstName"),
  lastName: text(form, "lastName"),
  company: text(form, "company") || undefined,
  address1: text(form, "address1"),
  address2: text(form, "address2") || undefined,
  city: text(form, "city"),
  postalCode: text(form, "postalCode"),
  province: text(form, "province") || undefined,
  countryCode: text(form, "countryCode").toLowerCase(),
  phone: text(form, "phone") || undefined,
})

export async function saveAddress(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = text(form, "addressId")
  try {
    await api(id ? `/store/customers/me/addresses/${encodeURIComponent(id)}` : "/store/customers/me/addresses", {
      method: id ? "PATCH" : "POST",
      token: await authed(),
      body: readAddress(form),
    })
  } catch (e) {
    return { error: message(e) }
  }
  revalidatePath("/", "layout")
  return { error: null }
}

export async function deleteAddress(addressId: string) {
  await api(`/store/customers/me/addresses/${encodeURIComponent(addressId)}`, { method: "DELETE", token: await authed() })
  revalidatePath("/", "layout")
}

export async function listOrders(): Promise<OrderSummary[]> {
  return (await api<{ orders: OrderSummary[] }>("/store/customers/me/orders", { token: await authed() })).orders
}

/** An order the visitor may see: their own (signed in) or the one this browser just placed. */
export async function retrieveOrder(id: string): Promise<Order | null> {
  try {
    const [token, cartId] = await Promise.all([getToken(), getOrderAccess()])
    return (await api<{ order: Order }>(`/store/orders/${encodeURIComponent(id)}`, { token, cartId })).order
  } catch (e) {
    if (e instanceof ApiError && [400, 403, 404].includes(e.status)) return null
    throw e
  }
}
