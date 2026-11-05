import { env } from "../env.js"

/**
 * Structured one-line JSON logs for payment and shipping events, so failures
 * can be searched and alerted on. Never pass card data, secrets or tokens:
 * ids, amounts, statuses and provider messages only.
 */
type Fields = Record<string, string | number | boolean | null | undefined>

const write = (level: "info" | "warn" | "error", event: string, fields: Fields = {}) => {
  if (env.NODE_ENV === "test" && level === "info") return
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const log = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
}
