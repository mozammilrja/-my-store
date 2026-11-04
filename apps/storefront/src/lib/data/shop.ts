"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { api, ApiError } from "../api/client"
import type { Address, Cart, Order } from "../api/types"
import { getCartId, getToken, removeCartId, setCartId, setOrderAccess } from "./session"
import { checkoutAddressStepSchema } from "../validation/checkout-schemas"

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

export async function addToCart(input: {
  variantId: string
  quantity: number
  countryCode: string
}): Promise<CartActionResult> {
  try {
    const cart = await cartFor(input.countryCode)
    try {
      await cartApi(`/store/carts/${cart.id}/items`, { method: "POST", body: { variantId: input.variantId, quantity: input.quantity } })
    } catch (e) {
      // The bag was checked out elsewhere: start a new one and retry once.
      if (!(e instanceof ApiError && e.code === "cart_completed")) throw e
      const fresh = await createCart(input.countryCode)
      await cartApi(`/store/carts/${fresh.id}/items`, { method: "POST", body: { variantId: input.variantId, quantity: input.quantity } })
    }
  } catch (e) {
    return { error: message(e) }
  }
  refresh()
  return { error: null }
}

/** Re-renders pages that show the bag (cart page, checkout) after a change. */
const refresh = () => revalidatePath("/", "layout")

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
 * Saves checkout's email and addresses without navigating, so the one-button
 * checkout can save the address, the delivery choice and place the order in
 * one go. Validates with the same Zod schema as the form.
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

  try {
    await cartApi(`/store/carts/${id}`, { method: "PATCH", body: { email: emailVal, shippingAddress, billingAddress } })
  } catch (e) {
    return { error: message(e) }
  }
  return { error: null }
}

/** Checkout step 1 of the stepped flow: save, then go on to delivery. */
export async function saveAddresses(_: ActionResult, form: FormData): Promise<ActionResult> {
  const result = await setCheckoutAddress(form)
  if (result.error) return result
  redirect(`/${text(form, "shipping.countryCode").toLowerCase()}/checkout?step=delivery`)
}

/** Checkout step 2: delivery option. */
/**
 * Set the cart's shipping option without navigating. `saveShipping` ends in a
 * redirect to the review step, which is right for the stepped checkout but
 * aborts a caller that still has work to do: the single-page flow persists the
 * delivery choice and then places the order in the same action.
 */
export async function setShippingOption(optionId: string): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: "Your bag has expired. Please add the items again." }
  try {
    await cartApi(`/store/carts/${id}/shipping`, { method: "POST", body: { optionId } })
  } catch (e) {
    return { error: message(e) }
  }
  return { error: null }
}

export async function saveShipping(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: "Your bag has expired. Please add the items again." }
  try {
    await cartApi(`/store/carts/${id}/shipping`, { method: "POST", body: { optionId: text(form, "optionId") } })
  } catch (e) {
    return { error: message(e) }
  }
  redirect(`/${text(form, "countryCode")}/checkout?step=review`)
}

/** Checkout step 3: place the order via COD or online payment gateway. */
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
