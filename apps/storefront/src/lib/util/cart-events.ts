export const CART_UPDATED_EVENT = "everwear:cart-updated"

/** Lets client-loaded bag UI refresh after a change on statically rendered pages. */
export const notifyCartUpdated = () => {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}
