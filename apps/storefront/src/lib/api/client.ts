import "server-only"

const API_URL = process.env.EVERWEAR_API_URL ?? (process.env.NODE_ENV === "production" ? "http://backend:9100" : "http://localhost:9100")

/** An error returned by the Everwear API, with a message safe to show shoppers. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

type Query = Record<string, string | number | boolean | undefined | null | (string | number)[]>

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  query?: Query
  /** Customer session token. */
  token?: string | null
  /** Proves access to a cart's order (guest order pages). */
  cartId?: string | null
  /** Catalog reads are cached briefly; carts, accounts and orders never are. */
  cache?: { revalidate: number; tags?: string[] } | "no-store"
}

const toSearch = (query?: Query) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ""
}

/** Calls the Everwear API from the server. Throws ApiError on any non-2xx response. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = "GET", body, query, token, cartId, cache = "no-store" } = options
  const headers: Record<string, string> = { accept: "application/json" }
  if (body !== undefined) headers["content-type"] = "application/json"
  if (token) headers.authorization = `Bearer ${token}`
  if (cartId) headers["x-cart-id"] = cartId

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}${toSearch(query)}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(cache === "no-store" ? { cache: "no-store" as const } : { next: cache }),
    })
  } catch {
    throw new ApiError(503, "unavailable", "The store is temporarily unavailable. Please try again.")
  }

  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? "Something went wrong")
  }
  return data as T
}
