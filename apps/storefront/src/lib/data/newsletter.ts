"use server"

import { api, ApiError } from "../api/client"

export type NewsletterResult = { ok: boolean; message: string }

/** Stores a newsletter sign-up. Signing up twice is fine; the API keeps one row. */
export async function subscribeToNewsletter(email: string, source: string): Promise<NewsletterResult> {
  try {
    await api("/store/newsletter", { method: "POST", body: { email, source } })
    return { ok: true, message: "You're subscribed. Look out for our next dispatch." }
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) return { ok: false, message: "Enter a valid email address." }
    if (e instanceof ApiError) return { ok: false, message: e.message }
    return { ok: false, message: "We couldn't subscribe you right now. Please try again." }
  }
}
