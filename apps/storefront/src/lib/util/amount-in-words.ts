const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

const twoDigits = (n: number) => (n < 20 ? ONES[n]! : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`)

const threeDigits = (n: number) => {
  const h = Math.floor(n / 100)
  const rest = n % 100
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ")
}

/** Whole number in Indian English words: crore, lakh, thousand, hundred. */
function integerInWords(n: number): string {
  if (n === 0) return "Zero"
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000)
  if (crore) parts.push(`${integerInWords(crore)} Crore`)
  n %= 10_000_000
  const lakh = Math.floor(n / 100_000)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  n %= 100_000
  const thousand = Math.floor(n / 1000)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  n %= 1000
  if (n) parts.push(threeDigits(n))
  return parts.join(" ")
}

/** e.g. 1118880 paise → "Eleven Thousand One Hundred Eighty-Eight Rupees and Eighty Paise Only". */
export function rupeesInWords(minorUnits: number): string {
  const rupees = Math.floor(minorUnits / 100)
  const paise = Math.round(minorUnits % 100)
  return `${integerInWords(rupees)} ${rupees === 1 ? "Rupee" : "Rupees"}${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`
}
