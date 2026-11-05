"use server"

import { refresh as refreshRoute } from "next/cache"
import { redirect } from "next/navigation"
import { api, ApiError } from "../api/client"
import type { Address, BuyerGstin, Cart, Order } from "../api/types"
import { getCartId, getToken, removeCartId, setCartId, setOrderAccess } from "./session"
import { buyerGstinSchema, checkoutAddressStepSchema } from "../validation/checkout-schemas"

export type ActionResult = { error: string | null }

/**
 * Calls a /store/carts/:id endpoint as the signed-in shopper. The API only
 * lets an account's own token touch a bag tied to that account, so every bag
 * call must carry it (a guest simply has none).
 */
async function cartApi<T = unknown>(path: string, options: Parameters<typeof api>[1] = {}) {
  return api<T>(path, { ...options, token: options.token ?? (await getToken()) ?? undefined })
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.")

/** The visitor's open bag, or null. A completed or missing cart clears the cookie. */
export async function retrieveCart(): Promise<Cart | null> {
  const id = await getCartId()
  if (!id) return null
  try {
    const { cart } = await cartApi<{ cart: Cart }>(`/store/carts/${id}`, { token: await getToken() })
    return cart.completed ? null : cart
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null
    throw e
  }
}

async function createCart(countryCode: string) {
  const { cart } = await api<{ cart: Cart }>("/store/carts", { method: "POST", body: { country: countryCode }, token: await getToken() })
  await setCartId(cart.id)
  return cart
}

/** The open bag for this country, creating one (or moving it to the country's region) when needed. */
async function cartFor(countryCode: string) {
  const cart = await retrieveCart()
  if (!cart) return createCart(countryCode)
  if (!cart.countryCodes.includes(countryCode.toLowerCase())) {
    const moved = await cartApi<{ cart: Cart }>(`/store/carts/${cart.id}`, { method: "PATCH", body: { country: countryCode } })
    return moved.cart
  }
  return cart
}

/**
 * Bag actions report failures by returning `{ error }` instead of throwing:
 * Next.js replaces a thrown server-action error's message with a generic
 * one in production, so "Only 2 of this item are available" would reach the
 * shopper as an unreadable React error. Callers use `ensureOk` to turn the
 * result back into a thrown Error on the client.
 */
export type CartActionResult = { error: string | null }

/** The bag in brief, as the header badge and "Go to bag" buttons need it. */
const snapshot = (cart: Cart) => ({
  count: cart.items.reduce((n, i) => n + i.quantity, 0),
  variantIds: cart.items.map((i) => i.variantId),
})

/**
 * Adds a line and returns the new bag. No page re-render: nothing a shopper
 * adds from (product, listing, account pages) renders the bag on the server,
 * and the bag and checkout pages are always rendered fresh on arrival. The
 * caller passes `bag` to notifyCartUpdated so the header needs no refetch.
 */
export async function addToCart(input: {
  variantId: string
  quantity: number
  countryCode: string
}): Promise<CartActionResult & { bag?: { count: number; variantIds: string[] } }> {
  try {
    const cart = await cartFor(input.countryCode)
    const body = { variantId: input.variantId, quantity: input.quantity }
    let updated: Cart
    try {
      updated = (await cartApi<{ cart: Cart }>(`/store/carts/${cart.id}/items`, { method: "POST", body })).cart
    } catch (e) {
      // The bag was checked out elsewhere: start a new one and retry once.
      if (!(e instanceof ApiError && e.code === "cart_completed")) throw e
      const fresh = await createCart(input.countryCode)
      updated = (await cartApi<{ cart: Cart }>(`/store/carts/${fresh.id}/items`, { method: "POST", body })).cart
    }
    return { error: null, bag: snapshot(updated) }
  } catch (e) {
    return { error: message(e) }
  }
}

/**
 * Re-renders the current page (the bag or checkout that made the change)
 * in the action's own response. Only this route: unlike revalidatePath("/",
 * "layout"), it keeps the cached catalog and the browser's prefetched pages.
 */
const refresh = () => refreshRoute()

const EXPIRED = "Your bag has expired. Please add the items again."

export async function updateLineItem(input: { lineId: string; quantity: number }): Promise<CartActionResult> {
  const id = await getCartId()
  if (!id) return { error: EXPIRED }
  try {
    await cartApi(`/store/carts/${id}/items/${encodeURIComponent(input.lineId)}`, { method: "PATCH", body: { quantity: input.quantity } })
  } catch (e) {
    return { error: message(e) }
  }
  refresh()
  return { error: null }
}

export async function deleteLineItem(lineId: string): Promise<CartActionResult> {
  const id = await getCartId()
  if (!id) return { error: EXPIRED }
  try {
    await cartApi(`/store/carts/${id}/items/${encodeURIComponent(lineId)}`, { method: "DELETE" })
  } catch (e) {
    return { error: message(e) }
  }
  refresh()
  return { error: null }
}

export async function clearCart() {
  const cart = await retrieveCart()
  if (!cart) return
  for (const item of cart.items) {
    // One line failing should not stop the rest from being removed.
    await deleteLineItem(item.id)
  }
  refresh()
}

export async function applyPromotions(codes: string[]): Promise<CartActionResult> {
  const id = await getCartId()
  if (!id) return { error: EXPIRED }
  try {
    await cartApi(`/store/carts/${id}/promotions`, { method: "POST", body: { codes } })
  } catch (e) {
    return { error: message(e) }
  }
  refresh()
  return { error: null }
}

/** Links the signed-in customer to the current bag (after login or sign-up). */
/**
 * Runs right after sign-in or sign-up. Myntra-style, the bag follows the
 * account: a guest bag with items in it is attached to the account; an empty
 * or missing guest bag is swapped for the account's last open bag.
 */
export async function linkCartToCustomer(freshToken?: string) {
  // Just after sign-in the new token is not readable from the request's
  // cookies yet, so the caller passes it in.
  const [id, cookieToken] = await Promise.all([getCartId(), getToken()])
  const token = freshToken ?? cookieToken
  if (!token) return

  const guest = id ? await retrieveCart().catch(() => null) : null
  if (guest && guest.items.length > 0) {
    try {
      await cartApi(`/store/carts/${guest.id}/customer`, { method: "POST", token })
    } catch {
      // A completed or foreign cart is simply left alone.
    }
    return
  }

  try {
    const { cartId } = await api<{ cartId: string | null }>("/store/customers/me/cart", { token })
    if (cartId) await setCartId(cartId)
  } catch {
    // No saved bag to restore; the shopper starts with an empty one.
  }
}

/* ---------- checkout ---------- */

const text = (form: FormData, key: string) => form.get(key)?.toString().trim() ?? ""

const readAddress = (form: FormData, prefix: string): Address => ({
  firstName: text(form, `${prefix}.firstName`),
  lastName: text(form, `${prefix}.lastName`),
  company: text(form, `${prefix}.company`) || undefined,
  address1: text(form, `${prefix}.address1`),
  address2: text(form, `${prefix}.address2`) || undefined,
  city: text(form, `${prefix}.city`),
  postalCode: text(form, `${prefix}.postalCode`),
  province: text(form, `${prefix}.province`) || undefined,
  countryCode: text(form, `${prefix}.countryCode`).toLowerCase(),
  phone: text(form, `${prefix}.phone`) || undefined,
})

/**
 * Saves checkout's email, addresses and (optionally) the buyer's GSTIN.
 * Validates with the same Zod schemas as the form.
 */
export async function setCheckoutAddress(form: FormData): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: "Your bag has expired. Please add the items again." }
  const shippingAddress = readAddress(form, "shipping")
  const sameAsShipping = form.get("sameAsShipping") === "on"
  const billingAddress = sameAsShipping ? shippingAddress : readAddress(form, "billing")
  const emailVal = text(form, "email")

  const validation = checkoutAddressStepSchema.safeParse({
    email: emailVal,
    shipping: shippingAddress,
    sameAsShipping,
    billing: sameAsShipping ? undefined : billingAddress,
  })
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Please fill in all required address fields." }
  }

  // GSTIN for a business invoice: sent only when the form has the toggle,
  // "on" saves it, anything else clears a previously saved one.
  let buyerGstin: BuyerGstin | null | undefined
  if (form.has("gstin.enabled")) {
    if (form.get("gstin.enabled") === "on") {
      const gst = buyerGstinSchema.safeParse({ gstin: text(form, "gstin.number"), legalName: text(form, "gstin.legalName") })
      if (!gst.success) return { error: gst.error.issues[0]?.message || "Please check the GSTIN details." }
      buyerGstin = gst.data
    } else {
      buyerGstin = null
    }
  }

  try {
    await cartApi(`/store/carts/${id}`, {
      method: "PATCH",
      body: { email: emailVal, shippingAddress, billingAddress, ...(buyerGstin !== undefined ? { buyerGstin } : {}) },
    })
  } catch (e) {
    return { error: message(e) }
  }
  return { error: null }
}

/** Saves the shopper's note for the courier; an empty note removes it. */
export async function setDeliveryInstructions(note: string): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: EXPIRED }
  const value = note.trim()
  if (value.length > 300) return { error: "Delivery instructions can be up to 300 characters." }
  try {
    await cartApi(`/store/carts/${id}`, { method: "PATCH", body: { deliveryInstructions: value } })
  } catch (e) {
    return { error: message(e) }
  }
  return { error: null }
}

/** Saves (or, with null, removes) the GSTIN printed on the order's tax invoice. */
export async function setBuyerGstin(input: BuyerGstin | null): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: EXPIRED }
  let buyerGstin: BuyerGstin | null = null
  if (input) {
    const gst = buyerGstinSchema.safeParse(input)
    if (!gst.success) return { error: gst.error.issues[0]?.message || "Please check the GSTIN details." }
    buyerGstin = gst.data
  }
  try {
    await cartApi(`/store/carts/${id}`, { method: "PATCH", body: { buyerGstin } })
  } catch (e) {
    return { error: message(e) }
  }
  return { error: null }
}

export type OnlinePaymentIntent = {
  provider: "razorpay"
  razorpayOrderId: string
  keyId: string
  amount: number
  currency: string
}

/**
 * Opens an online payment with the provider (Razorpay) for the bag's total.
 * Refuses when the API has no gateway keys: its placeholder "simulated"
 * intent can never be paid, so it must not reach the payment window.
 */
export async function startOnlinePayment(): Promise<ActionResult & { intent?: OnlinePaymentIntent }> {
  const id = await getCartId()
  if (!id) return { error: EXPIRED }
  try {
    const intent = await cartApi<OnlinePaymentIntent & { isStagingSimulated?: boolean }>(`/store/carts/${id}/payment-intent`, {
      method: "POST",
      body: { provider: "razorpay" },
    })
    if (intent.isStagingSimulated || !intent.keyId) {
      return { error: "Online payment isn't available right now. Please choose Cash on Delivery." }
    }
    return {
      error: null,
      intent: { provider: "razorpay", razorpayOrderId: intent.razorpayOrderId, keyId: intent.keyId, amount: intent.amount, currency: intent.currency },
    }
  } catch (e) {
    return { error: message(e) }
  }
}

/** Sets the cart's delivery option (checkout's delivery and review steps). */
/** Chooses the delivery method; returns the updated bag so a caller mid-render needn't re-read it. */
export async function setShippingOption(optionId: string): Promise<ActionResult & { cart?: Cart }> {
  const id = await getCartId()
  if (!id) return { error: "Your bag has expired. Please add the items again." }
  try {
    const { cart } = await cartApi<{ cart: Cart }>(`/store/carts/${id}/shipping`, { method: "POST", body: { optionId } })
    return { error: null, cart }
  } catch (e) {
    return { error: message(e) }
  }
}

/**
 * Places the order: cash on delivery completes the cart; "razorpay" confirms
 * a payment the gateway window reported as successful (the API verifies its
 * signature before marking the order paid).
 */
export async function placeOrder(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: "Your bag has expired. Please add the items again." }
  const paymentMethod = (form.get("paymentMethod") as string) || "cod"
  let order: Order

  try {
    if (paymentMethod === "razorpay") {
      order = (
        await cartApi<{ order: Order }>(`/store/carts/${id}/confirm-payment`, {
          method: "POST",
          body: {
            provider: paymentMethod,
            razorpayOrderId: text(form, "razorpayOrderId") || undefined,
            razorpayPaymentId: text(form, "razorpayPaymentId") || undefined,
            razorpaySignature: text(form, "razorpaySignature") || undefined,
          },
          token: await getToken(),
        })
      ).order
    } else {
      order = (await cartApi<{ order: Order }>(`/store/carts/${id}/complete`, { method: "POST", token: await getToken() })).order
    }
  } catch (e) {
    return { error: message(e) }
  }
  await setOrderAccess(id)
  await removeCartId()
  redirect(`/${text(form, "countryCode") || order.shippingAddress.countryCode}/order/${order.id}/confirmed`)
}
