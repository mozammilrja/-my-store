import { portalFetch } from "@/portal/client"

/*
 * The floor, delivery and seller areas call their own part of the API
 * (/warehouse, /rider, /seller) with the portal session. Same contract as the
 * standalone apps had: the `{ error: { code, message } }` envelope becomes an
 * ApiError; a 401 tells the portal the session ended (portalFetch).
 */

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

export type Query = Record<string, string | number | undefined | null>
export type ApiInit = { method?: string; body?: unknown; form?: FormData; query?: Query }

export function createAreaApi(prefix: "/warehouse" | "/rider" | "/seller") {
  return async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined && v !== null && v !== "") params.set(k, String(v))
    const search = params.toString()
    let res: Response
    try {
      res = await portalFetch(`${prefix}${path}${search ? `?${search}` : ""}`, {
        method: init.method ?? (init.body === undefined && !init.form ? "GET" : "POST"),
        headers: init.body === undefined ? {} : { "content-type": "application/json" },
        // Multipart (photos, documents): the browser sets the content type with its boundary.
        body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
      })
    } catch {
      throw new ApiError(0, "network", "Can't reach the server. Check the connection and try again.")
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null)
    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string } } | null)?.error
      throw new ApiError(res.status, err?.code ?? "error", err?.message ?? `Request failed (${res.status})`)
    }
    return data as T
  }
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong")
