/**
 * Listing state lives in the URL so filtered views can be shared and crawled.
 *
 * URLs are written Myntra-style, with every filter in one `f` value:
 *
 *   ?f=Categories:shirts::Gender:men,women::Brand:Everwear Atelier::Size:M,L
 *    &rf=Price:1000_3000&sort=price_asc&p=2
 *
 * `::` separates filter groups, `:` a group's name from its values and `,` the
 * values. Option axes (Size, Color, ...) use their own title as the group
 * name. The older one-parameter-per-filter form (`?category=shirts&brand=X`)
 * is still read, so existing links keep working.
 */
export type ListingParams = {
  f?: string | string[]
  rf?: string | string[]
  p?: string | string[]
  /** Search text, Myntra's name for it. `q` is still read. */
  rawQuery?: string | string[]
  sort?: string | string[]
  page?: string | string[]
  option?: string | string[]
  sale?: string | string[]
  category?: string | string[]
  brand?: string | string[]
  minPrice?: string | string[]
  maxPrice?: string | string[]
  discount?: string | string[]
  rating?: string | string[]
  stock?: string | string[]
  q?: string | string[]
}

export const SORTS = [
  { value: "popularity", label: "Popularity" },
  { value: "newest", label: "New arrivals" },
  { value: "price_asc", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "discount", label: "Better discount" },
  { value: "rating", label: "Customer rating" },
  { value: "title", label: "Name, A to Z" },
] as const

export type Sort = (typeof SORTS)[number]["value"]

/** Listings default to newest so an unsorted URL keeps its old meaning. */
export const DEFAULT_SORT: Sort = "newest"

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)
const all = (v?: string | string[]) => (v === undefined ? [] : Array.isArray(v) ? v : [v])

const int = (v: string | undefined, min: number, max: number) => {
  if (v === undefined) return undefined
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined
}

/** Category handles shown under "Gender" rather than "Categories". */
export const GENDER_HANDLES = ["men", "women", "kids"] as const

const isGender = (handle: string) => (GENDER_HANDLES as readonly string[]).includes(handle)

/** Group names with a fixed meaning; any other name is an option axis. */
const KEY = {
  categories: "Categories",
  gender: "Gender",
  brand: "Brand",
  discount: "Discount",
  rating: "Rating",
  availability: "Availability",
  offers: "Offers",
  price: "Price",
} as const

const RESERVED = new Set<string>(Object.values(KEY).map((k) => k.toLowerCase()))

/** Values may contain the separators, so those three characters are escaped. */
const escapeValue = (v: string) => v.replace(/[%,:]/g, (c) => encodeURIComponent(c))
const unescapeValue = (v: string) => {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

/** Parses `Key:a,b::Key2:c` into ordered groups. Malformed groups are skipped. */
export function parseFilterString(f: string): { key: string; values: string[] }[] {
  return f
    .split("::")
    .slice(0, 40)
    .map((group) => {
      const at = group.indexOf(":")
      if (at <= 0) return null
      const key = group.slice(0, at).trim()
      const values = group
        .slice(at + 1)
        .split(",")
        .map((v) => unescapeValue(v).trim())
        .filter(Boolean)
      return key && values.length ? { key, values } : null
    })
    .filter((g): g is { key: string; values: string[] } => g !== null)
}

/** Reads `f` and `rf` into the same shape as the older per-filter params. */
function fromFilterParams(f?: string, rf?: string): ListingParams {
  const out: Record<string, string[]> = {}
  const add = (name: string, values: string[]) => {
    out[name] = [...(out[name] ?? []), ...values]
  }

  for (const { key, values } of f ? parseFilterString(f) : []) {
    const k = key.toLowerCase()
    if (k === "categories" || k === "gender") add("category", values.map((v) => v.toLowerCase()))
    else if (k === "brand") add("brand", values)
    else if (k === "discount") add("discount", values.slice(0, 1))
    else if (k === "rating") add("rating", values.slice(0, 1))
    else if (k === "availability") {
      if (values.some((v) => v.toLowerCase() === "in stock")) add("stock", ["1"])
    } else if (k === "offers") {
      if (values.some((v) => v.toLowerCase() === "sale")) add("sale", ["1"])
    } else if (!RESERVED.has(k)) add("option", values.map((v) => `${key}:${v}`))
  }

  for (const { key, values } of rf ? parseFilterString(rf) : []) {
    if (key.toLowerCase() !== "price") continue
    const [min, max] = (values[0] ?? "").split("_")
    if (min) add("minPrice", [min])
    if (max) add("maxPrice", [max])
  }

  return out
}

export function parseListing(raw: ListingParams) {
  // Myntra-style values win; the older per-filter params fill in the rest.
  const fromF = fromFilterParams(first(raw.f), first(raw.rf))
  const merge = (name: keyof ListingParams) => {
    const values = [...all(fromF[name]), ...all(raw[name])]
    return values.length ? values : undefined
  }
  const params: ListingParams = {
    sort: raw.sort,
    page: raw.p ?? raw.page,
    q: raw.rawQuery ?? raw.q,
    option: merge("option"),
    category: merge("category"),
    brand: merge("brand"),
    minPrice: merge("minPrice"),
    maxPrice: merge("maxPrice"),
    discount: merge("discount"),
    rating: merge("rating"),
    stock: merge("stock"),
    sale: merge("sale"),
  }

  const sort = SORTS.some((s) => s.value === first(params.sort))
    ? (first(params.sort) as Sort)
    : DEFAULT_SORT
  const page = Math.min(Math.max(Number.parseInt(first(params.page) ?? "1", 10) || 1, 1), 1000)
  const options = [...new Set(all(params.option))]
    .filter((o) => /^[^:]{1,40}:[^:]{1,60}$/.test(o))
    .slice(0, 20)
  const categories = [...new Set(all(params.category))]
    .filter((c) => /^[a-z0-9-]{1,100}$/.test(c))
    .slice(0, 10)
  const brands = [...new Set(all(params.brand).map((b) => b.trim()))]
    .filter((b) => b.length > 0 && b.length <= 80)
    .slice(0, 20)

  const minPrice = int(first(params.minPrice), 0, 100_000_000)
  const maxPrice = int(first(params.maxPrice), 0, 100_000_000)

  return {
    sort,
    page,
    options,
    categories,
    brands,
    // Drop an inverted range rather than returning nothing.
    minPrice: minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice ? undefined : minPrice,
    maxPrice: minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice ? undefined : maxPrice,
    discount: int(first(params.discount), 1, 99),
    rating: int(first(params.rating), 1, 5),
    inStock: first(params.stock) === "1",
    sale: first(params.sale) === "1",
    /** Free-text search, trimmed and capped; "" when there is none. */
    q: (first(params.q) ?? "").trim().slice(0, 100),
  }
}

export type Listing = ReturnType<typeof parseListing>

/** Writes the Myntra-style `f` value for a listing state, or "" when nothing is filtered. */
export function filterString(state: Listing) {
  const groups: [string, string[]][] = []
  const push = (key: string, values: string[]) => {
    if (values.length) groups.push([key, values])
  }
  push(KEY.categories, state.categories.filter((c) => !isGender(c)))
  push(KEY.gender, state.categories.filter(isGender))
  push(KEY.brand, state.brands)

  // Options are stored as "Title:Value"; group them under their title.
  const byTitle = new Map<string, string[]>()
  for (const o of state.options) {
    const at = o.indexOf(":")
    const title = o.slice(0, at)
    byTitle.set(title, [...(byTitle.get(title) ?? []), o.slice(at + 1)])
  }
  for (const [title, values] of byTitle) push(title, values)

  if (state.discount !== undefined) push(KEY.discount, [String(state.discount)])
  if (state.rating !== undefined) push(KEY.rating, [String(state.rating)])
  if (state.inStock) push(KEY.availability, ["In Stock"])
  if (state.sale) push(KEY.offers, ["Sale"])

  return groups.map(([key, values]) => `${key}:${values.map(escapeValue).join(",")}`).join("::")
}

/** Builds a listing URL from the current state plus changes; page resets unless set. */
export function listingHref(path: string, state: Listing, change: Partial<Listing>) {
  const next = { ...state, page: 1, ...change }
  const params = new URLSearchParams()
  const f = filterString(next)
  if (f) params.set("f", f)
  if (next.minPrice !== undefined || next.maxPrice !== undefined) {
    params.set("rf", `${KEY.price}:${next.minPrice ?? ""}_${next.maxPrice ?? ""}`)
  }
  if (next.q) params.set("rawQuery", next.q)
  if (next.sort !== DEFAULT_SORT) params.set("sort", next.sort)
  if (next.page > 1) params.set("p", String(next.page))
  const qs = params.toString()
  return `${path}${qs ? `?${qs}` : ""}`
}

export const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

/** How many filters are applied, for the sidebar's count badge. */
export const activeFilterCount = (state: Listing) =>
  state.categories.length +
  state.brands.length +
  state.options.length +
  (state.minPrice !== undefined || state.maxPrice !== undefined ? 1 : 0) +
  (state.discount !== undefined ? 1 : 0) +
  (state.rating !== undefined ? 1 : 0) +
  (state.inStock ? 1 : 0) +
  (state.sale ? 1 : 0)
