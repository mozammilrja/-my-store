import type {
  AdminCollection,
  AdminCustomer,
  AdminOrder,
  AdminProduct,
  AdminUser,
  Dashboard,
  Paged,
} from "@/lib/types"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9100"
const TOKEN_KEY = "everwear_admin_token"

/** An error the API returned, with a message safe to show in the UI. */
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

/* Private browsing and blocked site data make localStorage throw, so every access is guarded. */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Nothing to do: the session then lasts only as long as the page.
  }
}

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore: the token is already unreachable.
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  query?: Query
}

const toSearch = (query?: Query) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue
    params.append(key, String(value))
  }
  const search = params.toString()
  return search ? `?${search}` : ""
}

/** Calls the API with the stored admin token. Throws ApiError on any non-2xx reply. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = "GET", body, query } = options
  const token = getToken()
  const headers: Record<string, string> = { accept: "application/json" }
  if (body !== undefined) headers["content-type"] = "application/json"
  if (token) headers.authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}${toSearch(query)}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ApiError(503, "unavailable", "Can't reach the API. Is it running?")
  }

  const data = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null

  if (!response.ok) {
    // A rejected token is worthless; dropping it sends the user back to the login.
    if (response.status === 401) clearToken()
    throw new ApiError(
      response.status,
      data?.error?.code ?? "error",
      data?.error?.message ?? "Something went wrong"
    )
  }

  return data as T
}

type ListParams = { q?: string; page?: number; limit?: number }

export const adminApi = {
  login: (email: string, password: string) =>
    api<{ token: string }>("/admin/auth/login", { method: "POST", body: { email, password } }),

  me: () => api<{ admin: AdminUser }>("/admin/me"),

  dashboard: () => api<Dashboard>("/admin/dashboard"),

  orders: (params: ListParams & { status?: string; payment?: string; fulfillment?: string } = {}) =>
    api<Paged<"orders", AdminOrder>>("/admin/orders", { query: params }),

  order: (id: string) => api<{ order: AdminOrder }>(`/admin/orders/${id}`),

  products: (params: ListParams & { status?: string } = {}) =>
    api<Paged<"products", AdminProduct>>("/admin/products", { query: params }),

  product: (id: string) => api<{ product: AdminProduct }>(`/admin/products/${id}`),

  customers: (params: ListParams = {}) =>
    api<Paged<"customers", AdminCustomer>>("/admin/customers", { query: params }),

  customer: (id: string) =>
    api<{ customer: AdminCustomer; orders: AdminOrder[] }>(`/admin/customers/${id}`),

  collections: () => api<{ collections: AdminCollection[] }>("/admin/collections"),
}
