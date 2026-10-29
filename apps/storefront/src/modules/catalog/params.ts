/** Listing state lives in the URL so filtered views can be shared and crawled. */
export type ListingParams = {
  sort?: string | string[]
  page?: string | string[]
  option?: string | string[]
  sale?: string | string[]
  category?: string | string[]
  q?: string | string[]
}

export const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "title", label: "Name, A to Z" },
] as const

export type Sort = (typeof SORTS)[number]["value"]

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)
const all = (v?: string | string[]) => (v === undefined ? [] : Array.isArray(v) ? v : [v])

export function parseListing(params: ListingParams) {
  const sort = SORTS.some((s) => s.value === first(params.sort)) ? (first(params.sort) as Sort) : "newest"
  const page = Math.min(Math.max(Number.parseInt(first(params.page) ?? "1", 10) || 1, 1), 1000)
  const options = all(params.option)
    .filter((o) => /^[^:]{1,40}:[^:]{1,60}$/.test(o))
    .slice(0, 20)
  const categories = all(params.category).filter((c) => /^[a-z0-9-]{1,100}$/.test(c)).slice(0, 10)
  return { sort, page, options, categories, sale: first(params.sale) === "1" }
}

export type Listing = ReturnType<typeof parseListing>

/** Builds a listing URL from the current state plus changes; page resets unless set. */
export function listingHref(path: string, state: Listing, change: Partial<Listing>) {
  const next = { ...state, page: 1, ...change }
  const params = new URLSearchParams()
  if (next.sort !== "newest") params.set("sort", next.sort)
  for (const c of next.categories) params.append("category", c)
  for (const o of next.options) params.append("option", o)
  if (next.sale) params.set("sale", "1")
  if (next.page > 1) params.set("page", String(next.page))
  const qs = params.toString()
  return `${path}${qs ? `?${qs}` : ""}`
}

export const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
