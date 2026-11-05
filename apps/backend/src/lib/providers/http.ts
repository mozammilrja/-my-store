/**
 * JSON calls to payment and courier providers: every call has a timeout, and
 * GETs (safe to repeat) are retried on network errors and 5xx responses.
 * Writes are never retried here; callers make them idempotent instead.
 */
export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message)
  }
  /** True when the outcome is unknown (timeout, network, 5xx): the call may or may not have taken effect. */
  get uncertain() {
    return this.status === 0 || this.status >= 500
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
  retries?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function providerJson<T>(provider: string, url: string, options: Options = {}): Promise<T> {
  const { method = "GET", headers = {}, body, timeoutMs = 15_000 } = options
  const retries = options.retries ?? (method === "GET" ? 2 : 0)
  let lastError: ProviderError | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt) await sleep(300 * 2 ** (attempt - 1))
    let res: Response
    try {
      res = await fetch(url, {
        method,
        headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (e) {
      lastError = new ProviderError(provider, 0, `${provider} did not respond (${(e as Error).name === "TimeoutError" ? "timeout" : "network error"})`)
      continue
    }
    const text = await res.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }
    if (res.ok) return data as T
    const message =
      (data as { error?: { description?: string } })?.error?.description ??
      (data as { message?: string })?.message ??
      `HTTP ${res.status}`
    lastError = new ProviderError(provider, res.status, `${provider}: ${message}`, data)
    if (res.status < 500) break
  }
  throw lastError!
}
