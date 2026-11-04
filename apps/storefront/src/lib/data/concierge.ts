"use server"

import { api, ApiError } from "../api/client"

export type ConciergeBookingInput = {
  service: "virtual" | "home" | "flagship"
  location: string
  name: string
  phone: string
  date: string
  slot: string
  occasions: string[]
  stylist?: string | null
  notes?: string
}

export type ConciergeBookingResult =
  | { ok: true; reference: string }
  | { ok: false; error: string }

/** Files a concierge appointment request with the API. Never throws to the form. */
export async function requestConciergeBooking(
  input: ConciergeBookingInput
): Promise<ConciergeBookingResult> {
  try {
    const { booking } = await api<{ booking: { id: string; reference: string } }>(
      "/store/concierge/bookings",
      { method: "POST", body: input }
    )
    return { ok: true, reference: booking.reference }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message }
    return { ok: false, error: "We couldn't send your request. Please try again or message us on WhatsApp." }
  }
}
