/*
 * Every call to the API goes through here: it attaches the staff token,
 * unwraps the `{ error: { code, message } }` envelope into an ApiError and
 * drops the token on a 401, which sends the viewer back to sign in.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9100"
const TOKEN_KEY = "everwear_rider_token"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const listeners = new Set<(token: string | null) => void>()
export const onTokenChange = (fn: (token: string | null) => void) => {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private mode: the session lasts until the tab closes.
  }
  for (const fn of listeners) fn(token)
}

type Query = Record<string, string | number | undefined | null>

export async function api<T>(path: string, init: { method?: string; body?: unknown; form?: FormData; query?: Query } = {}): Promise<T> {
  const url = new URL(`/rider${path}`, API_URL)
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v))
  const token = getToken()
  let res: Response
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body === undefined && !init.form ? "GET" : "POST"),
      headers: { ...(init.body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      // Multipart (proof photo): the browser sets the content type with its boundary.
      body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    })
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check the connection and try again.")
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/auth/")) setToken(null)
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? `Request failed (${res.status})`)
  }
  return data as T
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong")
