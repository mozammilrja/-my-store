"use server"

import { refresh, revalidatePath } from "next/cache"
// Signing in or out changes whose pages these are, so those purge every
// cached route (revalidatePath "/" layout). Edits to the account only
// re-render the page that made them (refresh).
import { api, ApiError } from "../api/client"
import type { Address, Customer, FeedNotification, Invoice, NotificationPrefs, Order, OrderSummary, ReturnOptions, StoreReturn } from "../api/types"
import { getOrderAccess, getToken, removeCartId, removeToken, setToken } from "./session"
import { linkCartToCustomer, type ActionResult } from "./shop"
import { fieldErrorsFrom, savedAddressSchema, type FieldErrors } from "../validation/checkout-schemas"

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
    await linkCartToCustomer(token)
  } catch (e) {
    return { error: message(e) }
  }
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
    await linkCartToCustomer(token)
  } catch (e) {
    return { error: message(e) }
  }
  revalidatePath("/", "layout")
  return { error: null }
}

export async function signout(countryCode: string) {
  // The bag belongs to the account: signing out leaves this browser with an
  // empty bag, and signing back in restores it (see linkCartToCustomer).
  await Promise.all([removeToken(), removeCartId()])
  revalidatePath("/", "layout")
  // The caller navigates, so it can also refresh client state (the bag count).
  return `/${countryCode}/account`
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
  refresh()
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

export type AddressActionResult = ActionResult & { fieldErrors?: FieldErrors }

export async function saveAddress(_: AddressActionResult, form: FormData): Promise<AddressActionResult> {
  const id = text(form, "addressId")
  // Same Zod schema as the form in the browser; checked again here because
  // a server action can be called directly.
  const parsed = savedAddressSchema.safeParse({
    ...Object.fromEntries(
      ["firstName", "lastName", "company", "address1", "address2", "city", "postalCode", "province", "phone"].map(
        (k) => [k, text(form, k)]
      )
    ),
    countryCode: text(form, "countryCode").toLowerCase(),
  })
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) }
  }
  try {
    await api(id ? `/store/customers/me/addresses/${encodeURIComponent(id)}` : "/store/customers/me/addresses", {
      method: id ? "PATCH" : "POST",
      token: await authed(),
      body: readAddress(form),
    })
  } catch (e) {
    return { error: message(e) }
  }
  refresh()
  return { error: null }
}

/** Makes a saved address the default (first) one. */
export async function setDefaultAddress(addressId: string): Promise<ActionResult> {
  try {
    await api(`/store/customers/me/addresses/${encodeURIComponent(addressId)}/default`, { method: "POST", token: await authed() })
  } catch (e) {
    return { error: message(e) }
  }
  refresh()
  return { error: null }
}

export async function deleteAddress(addressId: string) {
  await api(`/store/customers/me/addresses/${encodeURIComponent(addressId)}`, { method: "DELETE", token: await authed() })
  refresh()
}

export async function listOrders(): Promise<OrderSummary[]> {
  return (await api<{ orders: OrderSummary[] }>("/store/customers/me/orders", { token: await authed() })).orders
}

export async function requestReturn(orderId: string, reason: string, items?: { itemId: string; quantity: number }[]): Promise<ActionResult> {
  try {
    await api(`/store/customers/me/orders/${encodeURIComponent(orderId)}/returns`, {
      method: "POST",
      token: await authed(),
      body: { reason, items },
    })
    refresh()
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function listNotifications(): Promise<FeedNotification[]> {
  return (await api<{ notifications: FeedNotification[] }>("/store/customers/me/notifications", { token: await authed() })).notifications
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    await api(`/store/customers/me/notifications/${encodeURIComponent(id)}/read`, { method: "POST", token: await authed(), body: {} })
    refresh()
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    await api("/store/customers/me/notifications/read-all", { method: "POST", token: await authed(), body: {} })
    refresh()
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function getNotificationPreferences(): Promise<{ preferences: NotificationPrefs; pushDevices: number }> {
  return api("/store/customers/me/notification-preferences", { token: await authed() })
}

export async function updateNotificationPreferences(prefs: Partial<NotificationPrefs>): Promise<ActionResult & { preferences?: NotificationPrefs }> {
  try {
    const r = await api<{ preferences: NotificationPrefs }>("/store/customers/me/notification-preferences", { method: "PATCH", token: await authed(), body: prefs })
    return { error: null, preferences: r.preferences }
  } catch (e) {
    return { error: message(e) }
  }
}

/** The VAPID key this browser subscribes with; null when push isn't set up on the API. */
export async function getPushKey(): Promise<string | null> {
  return (await api<{ publicKey: string | null }>("/store/push/key")).publicKey
}

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<ActionResult> {
  try {
    await api("/store/customers/me/push-subscriptions", { method: "POST", token: await authed(), body: sub })
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  try {
    await api("/store/customers/me/push-subscriptions", { method: "DELETE", token: await authed(), body: { endpoint } })
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function listReturns(): Promise<StoreReturn[]> {
  return (await api<{ returns: StoreReturn[] }>("/store/customers/me/returns", { token: await authed() })).returns
}

/** What this order can still send back, or why it can't. */
export async function getReturnOptions(orderId: string): Promise<{ options: ReturnOptions | null; error: string | null }> {
  try {
    return { options: await api<ReturnOptions>(`/store/customers/me/orders/${encodeURIComponent(orderId)}/return-options`, { token: await authed() }), error: null }
  } catch (e) {
    return { options: null, error: message(e) }
  }
}

export type ReturnRequestInput = {
  orderId: string
  type: "return" | "exchange"
  method: "pickup" | "self_ship"
  items: { itemId: string; quantity: number; reason: string; note?: string; exchangeVariantId?: string }[]
}

export async function createReturnRequest(input: ReturnRequestInput): Promise<ActionResult & { code?: string }> {
  try {
    const { return: r } = await api<{ return: StoreReturn }>("/store/customers/me/returns", { method: "POST", token: await authed(), body: input })
    refresh()
    return { error: null, code: r.code }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function cancelReturnRequest(returnId: string): Promise<ActionResult> {
  try {
    await api(`/store/customers/me/returns/${encodeURIComponent(returnId)}/cancel`, { method: "POST", token: await authed(), body: {} })
    refresh()
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

/** Self-ship returns: the courier and AWB the customer sent the parcel with. */
export async function addReturnShipping(returnId: string, carrier: string, awb: string): Promise<ActionResult> {
  try {
    await api(`/store/customers/me/returns/${encodeURIComponent(returnId)}/ship`, { method: "POST", token: await authed(), body: { carrier, awb } })
    refresh()
    return { error: null }
  } catch (e) {
    return { error: message(e) }
  }
}

/** An order the visitor may see: their own (signed in) or the one this browser just placed. */
/** The order's GST invoice, under the same access rule as the order; null if not visible. */
export async function retrieveInvoice(orderId: string): Promise<Invoice | null> {
  try {
    const [token, cartId] = await Promise.all([getToken(), getOrderAccess()])
    return (
      await api<{ invoice: Invoice }>(`/store/orders/${encodeURIComponent(orderId)}/invoice`, { token, cartId })
    ).invoice
  } catch (e) {
    if (e instanceof ApiError && [400, 403, 404].includes(e.status)) return null
    throw e
  }
}

export async function retrieveOrder(id: string): Promise<Order | null> {
  try {
    const [token, cartId] = await Promise.all([getToken(), getOrderAccess()])
    return (await api<{ order: Order }>(`/store/orders/${encodeURIComponent(id)}`, { token, cartId })).order
  } catch (e) {
    if (e instanceof ApiError && [400, 403, 404].includes(e.status)) return null
    throw e
  }
}
