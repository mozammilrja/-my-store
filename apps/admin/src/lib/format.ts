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

/** 100 for most currencies, 1 for the ones with no minor unit (JPY, KRW and friends). */
export const minorFactor = (currencyCode?: string | null) =>
  currencyCode && ZERO_DECIMAL.has(currencyCode.toLowerCase()) ? 1 : 100

/** Minor units to an editable major-unit string. The API only ever sees integers. */
export const toMajor = (minor: number, currencyCode?: string | null) => {
  const factor = minorFactor(currencyCode)
  return (minor / factor).toFixed(factor === 1 ? 0 : 2)
}

/** An edited major-unit string back to the integer minor units the API takes. */
export const toMinor = (major: string, currencyCode?: string | null) =>
  Math.round(Number(major) * minorFactor(currencyCode))

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

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1000],
]

/** "4 minutes ago", for a live stream where the clock matters more than the date. */
export const formatRelative = (value: string | Date) => {
  const elapsed = new Date(value).getTime() - Date.now()

  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms || unit === "second") {
      return RELATIVE.format(Math.round(elapsed / ms), unit)
    }
  }

  return "just now"
}

export const formatStatus = (status?: string | null) => {
  if (!status) {
    return "Unknown"
  }

  const text = status.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const percentChange = (current: number, previous: number) =>
  previous ? ((current - previous) / previous) * 100 : null
