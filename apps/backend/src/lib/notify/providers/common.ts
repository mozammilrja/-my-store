import { createHash, createHmac } from "node:crypto"
import { ProviderError } from "../../providers/http.js"

/** A send that failed: `retry` says whether trying again later can succeed. `gone` marks a push subscription the service no longer accepts. */
export class SendError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
    readonly gone = false
  ) {
    super(message)
  }
}

/** Provider HTTP failures: unknown outcomes, rate limits and 5xx are retried; other 4xx are permanent. */
export function asSendError(e: unknown): SendError {
  if (e instanceof SendError) return e
  if (e instanceof ProviderError) return new SendError(e.message, e.uncertain || e.status === 429)
  return new SendError((e as Error).message ?? String(e), true)
}

export type SendResult = { provider: string; messageId: string }

/** Indian mobile numbers as providers want them: 91 followed by ten digits. Null when it isn't one. */
export function indianMobile(raw: string | undefined | null) {
  const d = (raw ?? "").replace(/\D/g, "")
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d
  return /^[6-9]\d{9}$/.test(ten) ? `91${ten}` : null
}

/* ---------- AWS Signature Version 4 ---------- */

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex")
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest()

/**
 * Signs a request with AWS SigV4 (header form). Returns the headers to send,
 * including Authorization and X-Amz-Date. Header names are signed lowercase
 * and sorted; the query string must already be canonical (sorted, encoded).
 */
export function signV4(input: {
  method: string
  host: string
  path: string
  query?: string
  headers: Record<string, string>
  body: string
  region: string
  service: string
  accessKeyId: string
  secretAccessKey: string
  now?: Date
}) {
  const amzDate = (input.now ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "")
  const day = amzDate.slice(0, 8)
  const headers: Record<string, string> = { ...Object.fromEntries(Object.entries(input.headers).map(([k, v]) => [k.toLowerCase(), v.trim()])), host: input.host, "x-amz-date": amzDate }
  const names = Object.keys(headers).sort()
  const canonical = [input.method, input.path, input.query ?? "", ...names.map((n) => `${n}:${headers[n]}`), "", names.join(";"), sha256(input.body)].join("\n")
  const scope = `${day}/${input.region}/${input.service}/aws4_request`
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n")
  const key = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region), input.service), "aws4_request")
  const signature = createHmac("sha256", key).update(toSign).digest("hex")
  return {
    ...input.headers,
    "x-amz-date": amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
  }
}
