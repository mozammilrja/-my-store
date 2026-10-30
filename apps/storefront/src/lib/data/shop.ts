"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { api, ApiError } from "../api/client"
import type { Address, Cart, Order } from "../api/types"
import { getCartId, getToken, removeCartId, setCartId, setOrderAccess } from "./session"

export type ActionResult = { error: string | null }

const message = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.")

/** The visitor's open bag, or null. A completed or missing cart clears the cookie. */
export async function retrieveCart(): Promise<Cart | null> {
  const id = await getCartId()
  if (!id) return null
  try {
    const { cart } = await api<{ cart: Cart }>(`/store/carts/${id}`, { token: await getToken() })
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
    const moved = await api<{ cart: Cart }>(`/store/carts/${cart.id}`, { method: "PATCH", body: { country: countryCode } })
    return moved.cart
  }
  return cart
}

export async function addToCart(input: { variantId: string; quantity: number; countryCode: string }) {
  const cart = await cartFor(input.countryCode)
  try {
    await api(`/store/carts/${cart.id}/items`, { method: "POST", body: { variantId: input.variantId, quantity: input.quantity } })
  } catch (e) {
    // The bag was checked out elsewhere: start a new one and retry once.
    if (e instanceof ApiError && e.code === "cart_completed") {
      const fresh = await createCart(input.countryCode)
      await api(`/store/carts/${fresh.id}/items`, { method: "POST", body: { variantId: input.variantId, quantity: input.quantity } })
      refresh()
      return
    }
    throw new Error(message(e))
  }
  refresh()
}

/** Re-renders pages that show the bag (cart page, checkout) after a change. */
const refresh = () => revalidatePath("/", "layout")

const requireCartId = async () => {
  const id = await getCartId()
  if (!id) throw new Error("Your bag has expired. Please add the items again.")
  return id
}

export async function updateLineItem(input: { lineId: string; quantity: number }) {
  const id = await requireCartId()
  try {
    await api(`/store/carts/${id}/items/${encodeURIComponent(input.lineId)}`, { method: "PATCH", body: { quantity: input.quantity } })
  } catch (e) {
    throw new Error(message(e))
  }
  refresh()
}

export async function deleteLineItem(lineId: string) {
  const id = await requireCartId()
  try {
    await api(`/store/carts/${id}/items/${encodeURIComponent(lineId)}`, { method: "DELETE" })
  } catch (e) {
    throw new Error(message(e))
  }
  refresh()
}

export async function applyPromotions(codes: string[]) {
  const id = await requireCartId()
  try {
    await api(`/store/carts/${id}/promotions`, { method: "POST", body: { codes } })
  } catch (e) {
    throw new Error(message(e))
  }
  refresh()
}

/** Switches the bag to another country's region, then reloads the same page there. */
export async function changeRegion(countryCode: string, currentPath: string) {
  const id = await getCartId()
  if (id) {
    try {
      await api(`/store/carts/${id}`, { method: "PATCH", body: { country: countryCode } })
    } catch {
      // A stale cart shouldn't block switching country.
    }
  }
  const path = currentPath.startsWith("/") ? currentPath : ""
  redirect(`/${countryCode}${path}`)
}

/** Links the signed-in customer to the current bag (after login or sign-up). */
export async function linkCartToCustomer() {
  const [id, token] = await Promise.all([getCartId(), getToken()])
  if (!id || !token) return
  try {
    await api(`/store/carts/${id}/customer`, { method: "POST", token })
  } catch {
    // A completed or foreign cart is simply left alone.
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

/** Checkout step 1: email and addresses. */
export async function saveAddresses(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: "Your bag has expired. Please add the items again." }
  const shippingAddress = readAddress(form, "shipping")
  const billingAddress = form.get("sameAsShipping") === "on" ? shippingAddress : readAddress(form, "billing")
  try {
    await api(`/store/carts/${id}`, { method: "PATCH", body: { email: text(form, "email"), shippingAddress, billingAddress } })
  } catch (e) {
    return { error: message(e) }
  }
  redirect(`/${shippingAddress.countryCode}/checkout?step=delivery`)
}

/** Checkout step 2: delivery option. */
export async function saveShipping(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = await getCartId()
  if (!id) return { error: "Your bag has expired. Please add the items again." }
  try {
    await api(`/store/carts/${id}/shipping`, { method: "POST", body: { optionId: text(form, "optionId") } })
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
    if (paymentMethod === "razorpay" || paymentMethod === "stripe") {
      order = (
        await api<{ order: Order }>(`/store/carts/${id}/confirm-payment`, {
          method: "POST",
          body: {
            provider: paymentMethod,
            razorpayOrderId: text(form, "razorpayOrderId") || undefined,
            razorpayPaymentId: text(form, "razorpayPaymentId") || undefined,
            razorpaySignature: text(form, "razorpaySignature") || undefined,
            paymentIntentId: text(form, "paymentIntentId") || undefined,
          },
          token: await getToken(),
        })
      ).order
    } else {
      order = (await api<{ order: Order }>(`/store/carts/${id}/complete`, { method: "POST", token: await getToken() })).order
    }
  } catch (e) {
    return { error: message(e) }
  }
  await setOrderAccess(id)
  await removeCartId()
  redirect(`/${text(form, "countryCode") || order.shippingAddress.countryCode}/order/${order.id}/confirmed`)
}
