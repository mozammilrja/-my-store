import type {
  AdminCategory,
  AdminCollection,
  AdminCustomer,
  AdminOrder,
  AdminProduct,
  AdminPromotion,
  AdminRegion,
  AdminUser,
  Dashboard,
  FulfillmentStatus,
  NewProduct,
  NewPromotion,
  Paged,
  PaymentStatus,
  ProductPatch,
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

/** Uploads one image. Multipart, so it bypasses the JSON client above. */
export async function uploadImage(file: File): Promise<{ path: string; url: string }> {
  const form = new FormData()
  form.append("file", file)
  const token = getToken()

  let response: Response
  try {
    response = await fetch(`${API_URL}/admin/uploads`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    })
  } catch {
    throw new ApiError(503, "unavailable", "Can't reach the API. Is it running?")
  }

  const data = (await response.json().catch(() => null)) as
    | { path?: string; url?: string; error?: { code?: string; message?: string } }
    | null

  if (!response.ok) {
    if (response.status === 401) clearToken()
    throw new ApiError(
      response.status,
      data?.error?.code ?? "error",
      data?.error?.message ?? "That image could not be uploaded"
    )
  }

  return { path: data!.path!, url: data!.url! }
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

  setOrderStatus: (
    id: string,
    body: { fulfillmentStatus?: FulfillmentStatus; paymentStatus?: PaymentStatus }
  ) => api<{ order: AdminOrder }>(`/admin/orders/${id}/status`, { method: "POST", body }),

  cancelOrder: (id: string) =>
    api<{ order: AdminOrder }>(`/admin/orders/${id}/cancel`, { method: "POST" }),

  products: (params: ListParams & { status?: string } = {}) =>
    api<Paged<"products", AdminProduct>>("/admin/products", { query: params }),

  product: (id: string) => api<{ product: AdminProduct }>(`/admin/products/${id}`),

  createProduct: (body: NewProduct) =>
    api<{ product: AdminProduct }>("/admin/products", { method: "POST", body }),

  updateProduct: (id: string, body: ProductPatch) =>
    api<{ product: AdminProduct }>(`/admin/products/${id}`, { method: "PATCH", body }),

  deleteProduct: (id: string) =>
    api<{ deleted: true }>(`/admin/products/${id}`, { method: "DELETE" }),

  customers: (params: ListParams = {}) =>
    api<Paged<"customers", AdminCustomer>>("/admin/customers", { query: params }),

  customer: (id: string) =>
    api<{ customer: AdminCustomer; orders: AdminOrder[] }>(`/admin/customers/${id}`),

  regions: () => api<{ regions: AdminRegion[] }>("/admin/regions"),

  promotions: () => api<{ promotions: AdminPromotion[] }>("/admin/promotions"),

  createPromotion: (body: NewPromotion) =>
    api<{ promotion: AdminPromotion }>("/admin/promotions", { method: "POST", body }),

  setPromotionActive: (id: string, active: boolean) =>
    api<{ promotion: AdminPromotion }>(`/admin/promotions/${id}`, { method: "PATCH", body: { active } }),

  deletePromotion: (id: string) =>
    api<{ deleted: true }>(`/admin/promotions/${id}`, { method: "DELETE" }),

  categories: () => api<{ categories: AdminCategory[] }>("/admin/categories"),

  createCategory: (body: { name: string; handle: string; description?: string }) =>
    api<{ category: { id: string; name: string; handle: string } }>("/admin/categories", { method: "POST", body }),

  updateCategory: (id: string, body: { name?: string; handle?: string; description?: string }) =>
    api<{ category: { id: string; name: string; handle: string } }>(`/admin/categories/${id}`, { method: "PATCH", body }),

  deleteCategory: (id: string) =>
    api<{ deleted: true }>(`/admin/categories/${id}`, { method: "DELETE" }),

  collections: () => api<{ collections: AdminCollection[] }>("/admin/collections"),

  createCollection: (body: { title: string; handle: string }) =>
    api<{ collection: { id: string; title: string; handle: string } }>("/admin/collections", { method: "POST", body }),

  updateCollection: (id: string, body: { title?: string; handle?: string }) =>
    api<{ collection: { id: string; title: string; handle: string } }>(`/admin/collections/${id}`, { method: "PATCH", body }),

  deleteCollection: (id: string) =>
    api<{ deleted: true }>(`/admin/collections/${id}`, { method: "DELETE" }),
}
