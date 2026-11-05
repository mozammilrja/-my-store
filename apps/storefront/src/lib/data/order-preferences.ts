"use server"

import { api, ApiError } from "../api/client"
import type { DeliveryPreferences, Order } from "../api/types"
import { getOrderAccess, getToken } from "./session"

export type DeliveryPreferencesInput = {
  slot: "morning" | "evening" | null
  options: { measuringTape?: boolean; reusableBox?: boolean }
}

/**
 * Saves the shopper's doorstep slot and options on an order. Same access as
 * viewing the order (account token or the order-access cookie); the API
 * refuses once the order has shipped or been canceled.
 */
export async function updateDeliveryPreferences(
  orderId: string,
  input: DeliveryPreferencesInput
): Promise<{ ok: true; preferences: DeliveryPreferences } | { ok: false; error: string; locked: boolean }> {
  try {
    const [token, cartId] = await Promise.all([getToken(), getOrderAccess()])
    const { order } = await api<{ order: Order }>(`/store/orders/${encodeURIComponent(orderId)}/delivery-preferences`, {
      method: "PATCH",
      body: { slot: input.slot, options: input.options },
      token,
      cartId,
    })
    return { ok: true, preferences: order.deliveryPreferences! }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message, locked: e.status === 409 }
    return { ok: false, error: "Couldn't save your choice. Please try again.", locked: false }
  }
}
