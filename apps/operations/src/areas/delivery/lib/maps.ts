import type { Task } from "./types"

type Stop = NonNullable<Task["stop"]>

/** Where Google Maps should go for a stop: its pin when it has one, else the address text. */
const place = (s: Stop) => (s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : [s.address1, s.address2, s.city, s.postalCode, "India"].filter(Boolean).join(", "))

/** Directions in Google Maps from where the rider is to one stop. */
export const directions = (s: Stop) => `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(place(s))}`

/**
 * The whole route in Google Maps, in the order the API sequenced it: the last
 * stop is the destination and the rest are waypoints (Maps takes up to nine).
 * Null when no stop has an address yet (parcels not collected).
 */
export function routeDirections(stops: Stop[]) {
  if (!stops.length) return null
  const ordered = stops.slice(0, 10)
  const last = ordered[ordered.length - 1]!
  const waypoints = ordered.slice(0, -1).map(place).join("|")
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(place(last))}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}`
}
