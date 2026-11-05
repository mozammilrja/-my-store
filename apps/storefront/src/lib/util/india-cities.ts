import { resolveGstState } from "./gst-state"

/*
 * City-level centres for the tracking map's destination pin. Only the city
 * the shopper typed is looked up here: the street address never leaves the
 * server and is never geocoded.
 */

export type CityPoint = { name: string; lat: number; lng: number }

const CITIES: Record<string, CityPoint> = {}
const add = (name: string, lat: number, lng: number, ...aliases: string[]) => {
  for (const key of [name, ...aliases]) CITIES[key.toLowerCase()] = { name, lat, lng }
}

// Major cities (incl. every city in gst-state.ts's list).
add("Gurugram", 28.4595, 77.0266, "gurgaon")
add("Faridabad", 28.4089, 77.3178)
add("Noida", 28.5355, 77.391, "greater noida")
add("Ghaziabad", 28.6692, 77.4538)
add("Lucknow", 26.8467, 80.9462)
add("New Delhi", 28.6139, 77.209, "delhi")
add("Mumbai", 19.076, 72.8777, "bombay")
add("Navi Mumbai", 19.033, 73.0297)
add("Thane", 19.2183, 72.9781)
add("Pune", 18.5204, 73.8567)
add("Bengaluru", 12.9716, 77.5946, "bangalore")
add("Mysuru", 12.2958, 76.6394, "mysore")
add("Chennai", 13.0827, 80.2707, "madras")
add("Hyderabad", 17.385, 78.4867)
add("Secunderabad", 17.4399, 78.4983)
add("Kolkata", 22.5726, 88.3639, "calcutta")
add("Howrah", 22.5958, 88.2636)
add("Ahmedabad", 23.0225, 72.5714)
add("Surat", 21.1702, 72.8311)
add("Jaipur", 26.9124, 75.7873)
add("Chandigarh", 30.7333, 76.7794)
add("Kochi", 9.9312, 76.2673, "cochin")
add("Thiruvananthapuram", 8.5241, 76.9366, "trivandrum")
add("Bhopal", 23.2599, 77.4126)
add("Indore", 22.7196, 75.8577)
add("Patna", 25.5941, 85.1376)
add("Bhubaneswar", 20.2961, 85.8245)
add("Guwahati", 26.1445, 91.7362)
// State and UT capitals not already listed.
add("Amaravati", 16.5062, 80.648)
add("Itanagar", 27.0844, 93.6053)
add("Dispur", 26.1433, 91.7898)
add("Raipur", 21.2514, 81.6296)
add("Panaji", 15.4909, 73.8278, "panjim")
add("Shimla", 31.1048, 77.1734)
add("Ranchi", 23.3441, 85.3096)
add("Imphal", 24.817, 93.9368)
add("Shillong", 25.5788, 91.8933)
add("Aizawl", 23.7271, 92.7176)
add("Kohima", 25.6751, 94.1086)
add("Gandhinagar", 23.2156, 72.6369)
add("Dehradun", 30.3165, 78.0322)
add("Gangtok", 27.3389, 88.6065)
add("Agartala", 23.8315, 91.2868)
add("Srinagar", 34.0837, 74.7973)
add("Leh", 34.1526, 77.5771)
add("Puducherry", 11.9416, 79.8083, "pondicherry")
add("Port Blair", 11.6234, 92.7265)
add("Kavaratti", 10.5593, 72.6358)
add("Daman", 20.3974, 72.8328)

/** The capital (or main city) for each GST state code, used when the city isn't listed. */
const STATE_CAPITAL: Record<string, string> = {
  "01": "srinagar", "02": "shimla", "03": "chandigarh", "04": "chandigarh", "05": "dehradun", "06": "chandigarh",
  "07": "new delhi", "08": "jaipur", "09": "lucknow", "10": "patna", "11": "gangtok", "12": "itanagar",
  "13": "kohima", "14": "imphal", "15": "aizawl", "16": "agartala", "17": "shillong", "18": "dispur",
  "19": "kolkata", "20": "ranchi", "21": "bhubaneswar", "22": "raipur", "23": "bhopal", "24": "gandhinagar",
  "26": "daman", "27": "mumbai", "29": "bengaluru", "30": "panaji", "31": "kavaratti", "32": "thiruvananthapuram",
  "33": "chennai", "34": "puducherry", "35": "port blair", "36": "hyderabad", "37": "amaravati", "38": "leh",
}

/**
 * Where to put the destination pin: the shipping city's centre, else the
 * capital of the address's GST state (province, city or PIN). Null when
 * neither is known.
 */
export function destinationPoint(a: { city?: string | null; province?: string | null; postalCode?: string | null; countryCode?: string | null }):
  | (CityPoint & { approximate: boolean })
  | null {
  if (a.countryCode && a.countryCode.toLowerCase() !== "in") return null
  const city = CITIES[(a.city ?? "").trim().toLowerCase().replace(/\s+/g, " ")]
  if (city) return { ...city, approximate: false }
  const state = resolveGstState(a)
  const capital = state ? CITIES[STATE_CAPITAL[state.code] ?? ""] : undefined
  return capital ? { ...capital, approximate: true } : null
}

/** The first listed city named in free text such as a carrier scan location ("Bengaluru Central Hub"). */
export function cityInText(text?: string | null): CityPoint | null {
  const t = ` ${(text ?? "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ")} `
  if (!t.trim()) return null
  // Longest names first, so "navi mumbai" wins over "mumbai".
  const key = Object.keys(CITIES)
    .sort((a, b) => b.length - a.length)
    .find((k) => t.includes(` ${k} `))
  return key ? CITIES[key]! : null
}
