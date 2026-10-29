export const formatMoney = (amount: number, currencyCode?: string | null) => {
  if (!currencyCode) {
    return formatCount(amount)
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
  }).format(amount)
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
