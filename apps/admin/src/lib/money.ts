const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "isk", "huf"])

/** Formats an integer minor-unit amount (cents, paise) in its currency. */
export function formatMoney(amount: number | null | undefined, currency: string, locale = "en-US") {
  const code = currency.toUpperCase()
  const value = (amount ?? 0) / (ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100)
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(value)
  } catch {
    return `${value.toFixed(2)} ${code}`
  }
}
