const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "isk", "huf"])

/**
 * Formats an amount the API gave us: always an integer in the currency's
 * minor unit, so cents and paise are divided out here and nowhere else.
 */
export const formatMoney = (amount: number, currencyCode?: string | null) => {
  if (!currencyCode) {
    return formatCount(amount)
  }

  const code = currencyCode.toUpperCase()
  const value = amount / (ZERO_DECIMAL.has(currencyCode.toLowerCase()) ? 1 : 100)

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${code}`
  }
}

/** Short money for chart axes: 1.2K in the currency, not 123456 minor units. */
export const formatMoneyCompact = (amount: number, currencyCode?: string | null) => {
  if (!currencyCode) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(amount)
  }

  const code = currencyCode.toUpperCase()
  const value = amount / (ZERO_DECIMAL.has(currencyCode.toLowerCase()) ? 1 : 100)

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return `${value} ${code}`
  }
}

export const formatCount = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)

export const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—"

export const formatDay = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" })

export const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

export const formatStatus = (status?: string | null) => {
  if (!status) {
    return "Unknown"
  }

  const text = status.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const percentChange = (current: number, previous: number) =>
  previous ? ((current - previous) / previous) * 100 : null
