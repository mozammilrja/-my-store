import type { CartActionResult } from "@lib/data/shop"

/** Throws the bag action's own message, so existing try/catch + toast code keeps working. */
export function ensureOk(result: CartActionResult) {
  if (result.error) throw new Error(result.error)
}
