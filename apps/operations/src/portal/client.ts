/*
 * The one way this portal talks to the API. Every request carries the
 * operations session cookie (httpOnly: scripts never see it) and the
 * X-Everwear-Ops header the API requires alongside it, which a cross-site
 * form or image can't send. A 401 means the session ended (signed out
 * elsewhere, expired, suspended); listeners send the viewer to sign in.
 */

export const API_URL: string = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:9100" : "https://api.everwear.com")

export const PORTAL_HEADER = "x-everwear-ops"

type Listener = () => void
const expiredListeners = new Set<Listener>()
const signOutListeners = new Set<Listener>()

/** Called when the API refuses the session mid-use. */
export function onSessionExpired(fn: Listener) {
  expiredListeners.add(fn)
  return () => void expiredListeners.delete(fn)
}

/** Called after a deliberate sign-out, so each area can drop what it cached. */
export function onSignedOut(fn: Listener) {
  signOutListeners.add(fn)
  return () => void signOutListeners.delete(fn)
}
export const notifySignedOut = () => signOutListeners.forEach((fn) => fn())

/** "Sign in again" on an error screen: end the session here and on the server, then show the sign-in. */
export async function endSession() {
  try {
    await fetch(`${API_URL}/ops/auth/logout`, { method: "POST", credentials: "include", headers: { [PORTAL_HEADER]: "1" } })
  } catch {
    // Offline: the cookie stays until it expires, but the viewer still sees the sign-in.
  }
  expiredListeners.forEach((fn) => fn())
}

const AUTH_PATHS = ["/ops/auth/login", "/ops/auth/me", "/ops/auth/password/forgot", "/ops/auth/password/reset"]

/** fetch() against the API with the session; the caller reads the response. */
export async function portalFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set(PORTAL_HEADER, "1")
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" })
  if (res.status === 401 && !AUTH_PATHS.some((p) => path.startsWith(p))) expiredListeners.forEach((fn) => fn())
  return res
}

export class PortalError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "PortalError"
  }
}

/** JSON request for the portal's own screens (sign-in, account). */
export async function portalJson<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await portalFetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? {} : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new PortalError(0, "network", "Can't reach the server. Check the connection and try again.")
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error
    throw new PortalError(res.status, err?.code ?? "error", err?.message ?? `Request failed (${res.status})`)
  }
  return data as T
}
