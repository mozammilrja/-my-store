import { convertToLocale } from "@lib/util/money"

/** Formats a backend amount in the cart or region currency. */
export const formatMoney = (amount: number | null | undefined, currencyCode: string) =>
  convertToLocale({ amount: amount ?? 0, currency_code: currencyCode })
