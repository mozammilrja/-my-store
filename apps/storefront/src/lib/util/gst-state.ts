/*
 * GST place-of-supply helpers: resolve an Indian delivery address to its state
 * and two-digit GST state code using only what the address itself says.
 */

export type GstState = { name: string; code: string }

const STATES: Record<string, GstState> = Object.fromEntries(
  (
    [
      ["Jammu and Kashmir", "01"], ["Himachal Pradesh", "02"], ["Punjab", "03"], ["Chandigarh", "04"],
      ["Uttarakhand", "05"], ["Haryana", "06"], ["Delhi", "07"], ["Rajasthan", "08"], ["Uttar Pradesh", "09"],
      ["Bihar", "10"], ["Sikkim", "11"], ["Arunachal Pradesh", "12"], ["Nagaland", "13"], ["Manipur", "14"],
      ["Mizoram", "15"], ["Tripura", "16"], ["Meghalaya", "17"], ["Assam", "18"], ["West Bengal", "19"],
      ["Jharkhand", "20"], ["Odisha", "21"], ["Chhattisgarh", "22"], ["Madhya Pradesh", "23"], ["Gujarat", "24"],
      ["Dadra and Nagar Haveli and Daman and Diu", "26"], ["Maharashtra", "27"], ["Karnataka", "29"], ["Goa", "30"],
      ["Lakshadweep", "31"], ["Kerala", "32"], ["Tamil Nadu", "33"], ["Puducherry", "34"],
      ["Andaman and Nicobar Islands", "35"], ["Telangana", "36"], ["Andhra Pradesh", "37"], ["Ladakh", "38"],
    ] as const
  ).map(([name, code]) => [name.toLowerCase(), { name, code }])
)

const STATE_ALIASES: Record<string, string> = {
  orissa: "odisha",
  pondicherry: "puducherry",
  "nct of delhi": "delhi",
  "new delhi": "delhi",
  "delhi ncr": "delhi",
  "j&k": "jammu and kashmir",
  "jammu & kashmir": "jammu and kashmir",
  uttaranchal: "uttarakhand",
  "andaman & nicobar islands": "andaman and nicobar islands",
  up: "uttar pradesh",
  mp: "madhya pradesh",
  tn: "tamil nadu",
  wb: "west bengal",
}

const CITY_STATE: Record<string, string> = {
  gurgaon: "haryana", gurugram: "haryana", faridabad: "haryana",
  noida: "uttar pradesh", "greater noida": "uttar pradesh", ghaziabad: "uttar pradesh", lucknow: "uttar pradesh",
  delhi: "delhi", "new delhi": "delhi",
  mumbai: "maharashtra", pune: "maharashtra", thane: "maharashtra", "navi mumbai": "maharashtra",
  bengaluru: "karnataka", bangalore: "karnataka", mysuru: "karnataka", mysore: "karnataka",
  chennai: "tamil nadu",
  hyderabad: "telangana", secunderabad: "telangana",
  kolkata: "west bengal", howrah: "west bengal",
  ahmedabad: "gujarat", surat: "gujarat",
  jaipur: "rajasthan",
  chandigarh: "chandigarh",
  kochi: "kerala", cochin: "kerala", thiruvananthapuram: "kerala", trivandrum: "kerala",
  bhopal: "madhya pradesh", indore: "madhya pradesh",
  patna: "bihar",
  bhubaneswar: "odisha",
  guwahati: "assam",
}

/** India Post PIN prefixes that fall in a single state (ambiguous circles are left out). */
const PIN2_STATE: Record<string, string> = {
  "11": "delhi", "12": "haryana", "13": "haryana", "17": "himachal pradesh",
  "30": "rajasthan", "31": "rajasthan", "32": "rajasthan", "33": "rajasthan", "34": "rajasthan",
  "36": "gujarat", "37": "gujarat", "38": "gujarat", "39": "gujarat",
  "40": "maharashtra", "41": "maharashtra", "42": "maharashtra", "43": "maharashtra", "44": "maharashtra",
  "56": "karnataka", "57": "karnataka", "58": "karnataka", "59": "karnataka",
  "75": "odisha", "76": "odisha", "77": "odisha", "78": "assam",
}
/** Three-digit PIN prefixes that belong to another state inside a circle above. */
const PIN3_EXCEPTIONS: Record<string, string | null> = { "403": "goa", "396": null }

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ")

/** A state or UT name (or common alias) → its GST state; null when unrecognised. */
export function stateByName(name?: string | null): GstState | null {
  const n = norm(name).replace(/&/g, "and")
  const key = STATE_ALIASES[norm(name)] ?? STATE_ALIASES[n] ?? n
  return STATES[key] ?? null
}

/** A major Indian city → its state; null when the city isn't in the list. */
export function stateByCity(city?: string | null): GstState | null {
  const s = CITY_STATE[norm(city)]
  return s ? STATES[s]! : null
}

/** A six-digit PIN code → its state, only where the prefix belongs to exactly one state. */
export function stateByPin(pin?: string | null): GstState | null {
  const p = (pin ?? "").replace(/\s/g, "")
  if (!/^[1-9]\d{5}$/.test(p)) return null
  const p3 = p.slice(0, 3)
  if (p3 in PIN3_EXCEPTIONS) {
    const s = PIN3_EXCEPTIONS[p3]
    return s ? STATES[s]! : null
  }
  const s = PIN2_STATE[p.slice(0, 2)]
  return s ? STATES[s]! : null
}

/**
 * The GST state of a delivery address: its stated province, else its city,
 * else its PIN code. Null when none of them identifies an Indian state.
 */
export function resolveGstState(a: { province?: string | null; city?: string | null; postalCode?: string | null; countryCode?: string | null }): GstState | null {
  if (a.countryCode && a.countryCode.toLowerCase() !== "in") return null
  return stateByName(a.province) ?? stateByCity(a.city) ?? stateByPin(a.postalCode)
}

/** "Haryana (06)" */
export const stateLabel = (s: GstState) => `${s.name} (${s.code})`

/** Indian numbers as "+91 98765 43210" (10 digits, optional +91 / 91 / 0 prefix); anything else as entered. */
export function formatIndianPhone(phone: string) {
  const m = phone.replace(/[\s\-()]/g, "").match(/^(?:\+?91|0)?([6-9]\d{9})$/)
  return m ? `+91 ${m[1]!.slice(0, 5)} ${m[1]!.slice(5)}` : phone
}
