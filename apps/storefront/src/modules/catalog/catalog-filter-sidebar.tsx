"use client"

import { cn } from "@/lib/utils"
import type { Category } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckIcon, SearchIcon, StarIcon, XIcon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { GENDER_HANDLES, listingHref, toggle, type Listing } from "./params"

/** Myntra's accent, used for checks, radios, the slider and "+ more". */
const ACCENT = "#ff3f6c"

const SWATCH: Record<string, string> = {
  black: "#36454f",
  white: "#ffffff",
  grey: "#9ca3af",
  gray: "#9ca3af",
  navy: "#1e2a4a",
  blue: "#0074d9",
  green: "#5eb160",
  red: "#d34b56",
  pink: "#f1a9c4",
  beige: "#e8e6cf",
  brown: "#915039",
  sand: "#e7e5e4",
  mocha: "#785b4f",
  ivory: "#fbf9f8",
  emerald: "#065f46",
  olive: "#3d9970",
  yellow: "#eadd4a",
  maroon: "#b03060",
  orange: "#f28d20",
  purple: "#800080",
}

const GENDER_LABEL: Record<string, string> = { men: "Men", women: "Women", kids: "Kids" }

/** Whole currency units without ".00", like the product cards. */
const shortMoney = (amount: number, currency: string) =>
  formatMoney(amount, currency).replace(/[.,]00(?=\D*$)/, "")

type Facets = {
  currency: string
  options: { title: string; values: { value: string; count: number }[] }[]
  onSaleCount: number
  priceRange: { min: number; max: number } | null
  /** Absent while a response cached before these facets shipped is replayed. */
  brands?: { value: string; count: number }[]
  discounts?: { value: number; count: number }[]
  ratings?: { value: number; count: number }[]
}

/**
 * Myntra-style filter column: FILTERS / CLEAR ALL, a gender radio group,
 * then always-open sections divided by rules. Long lists show eight entries,
 * a "+ N more" link and a search toggle; price is a two-handle slider.
 *
 * Every option is a real link built by `listingHref`, so the column works
 * without JavaScript, can be crawled, and writes the shareable `?f=` URL.
 */
export function CatalogFilterSidebar({
  path,
  listing,
  categories = [],
  facets,
}: {
  path: string
  listing: Listing
  categories?: Category[]
  facets: Facets
  currentCategoryHandle?: string
}) {
  const href = (change: Partial<Listing>) => listingHref(path, listing, change)

  const genders = listing.categories.filter((c) =>
    (GENDER_HANDLES as readonly string[]).includes(c)
  )
  const nonGender = listing.categories.filter((c) => !genders.includes(c))

  const activeCount =
    listing.categories.length +
    listing.brands.length +
    listing.options.length +
    (listing.minPrice !== undefined || listing.maxPrice !== undefined ? 1 : 0) +
    (listing.discount !== undefined ? 1 : 0) +
    (listing.rating !== undefined ? 1 : 0) +
    (listing.inStock ? 1 : 0) +
    (listing.sale ? 1 : 0)

  const categoryItems = categories
    .filter((c) => !(GENDER_HANDLES as readonly string[]).includes(c.handle))
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))
    .map((c) => ({
      key: c.handle,
      label: c.name,
      count: c.productCount,
      active: listing.categories.includes(c.handle),
      href: href({ categories: toggle(listing.categories, c.handle) }),
    }))

  const brandItems = (facets.brands ?? []).map((b) => ({
    key: b.value,
    label: b.value,
    count: b.count,
    active: listing.brands.includes(b.value),
    href: href({ brands: toggle(listing.brands, b.value) }),
  }))

  const optionItems = (group: Facets["options"][number]) =>
    group.values.map((v) => {
      const key = `${group.title}:${v.value}`
      return {
        key,
        label: v.value,
        count: v.count,
        active: listing.options.includes(key),
        href: href({ options: toggle(listing.options, key) }),
        swatch:
          group.title.toLowerCase() === "color"
            ? (SWATCH[v.value.toLowerCase()] ?? "#9ca3af")
            : undefined,
      }
    })

  const colorGroup = facets.options.find((o) => o.title.toLowerCase() === "color")
  const otherGroups = facets.options.filter((o) => o.title.toLowerCase() !== "color")

  return (
    <aside className="w-full bg-surface-container-lowest" aria-label="Product Filters">
      {/* FILTERS · CLEAR ALL */}
      <div className="flex h-[52px] items-center justify-between border-b border-border/70 px-5">
        <span className="text-[16px] font-bold uppercase text-foreground">Filters</span>
        {activeCount > 0 && (
          <LocalizedClientLink
            href={listingHref(path, listing, {
              categories: [],
              brands: [],
              options: [],
              minPrice: undefined,
              maxPrice: undefined,
              discount: undefined,
              rating: undefined,
              inStock: false,
              sale: false,
            })}
            className="text-[13px] font-bold uppercase"
            style={{ color: ACCENT }}
            data-testid="filters-clear-all"
          >
            Clear all
          </LocalizedClientLink>
        )}
      </div>

      {/* Gender: one at a time, like Myntra's radios. */}
      <ul className="flex flex-col gap-2 border-b border-border/70 px-5 py-4" aria-label="Gender">
        {GENDER_HANDLES.map((g) => {
          const active = genders.includes(g)
          return (
            <li key={g}>
              <LocalizedClientLink
                href={href({ categories: active ? nonGender : [...nonGender, g] })}
                aria-current={active ? "true" : undefined}
                className="flex items-center gap-3 text-[14px] font-bold text-foreground"
                data-testid="gender-refinement"
              >
                <Radio checked={active} />
                {GENDER_LABEL[g]}
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>

      {categoryItems.length > 0 && (
        <FilterList
          title="Categories"
          items={categoryItems}
          searchPlaceholder="Search for Category"
          testId="category-refinement"
        />
      )}

      {brandItems.length > 0 && (
        <FilterList
          title="Brand"
          items={brandItems}
          searchPlaceholder="Search for Brand"
          testId="brand-refinement"
        />
      )}

      {facets.priceRange && facets.priceRange.max > facets.priceRange.min && (
        <section className="border-b border-border/70 px-5 py-4">
          <h3 className="mb-4 text-[14px] font-bold uppercase text-foreground">Price</h3>
          <PriceSlider
            // Remount when the URL's bounds change (back button, clear all).
            key={`${listing.minPrice ?? ""}_${listing.maxPrice ?? ""}`}
            range={facets.priceRange}
            currency={facets.currency}
            min={listing.minPrice}
            max={listing.maxPrice}
            hrefFor={(min, max) => href({ minPrice: min, maxPrice: max })}
          />
        </section>
      )}

      {colorGroup && (
        <FilterList
          title="Color"
          items={optionItems(colorGroup)}
          searchPlaceholder="Search for Color"
          testId="option-refinement"
        />
      )}

      {otherGroups.map((group) => (
        <FilterList
          key={group.title}
          title={group.title}
          items={optionItems(group)}
          searchPlaceholder={`Search for ${group.title}`}
          testId="option-refinement"
        />
      ))}

      {(facets.discounts ?? []).length > 0 && (
        <section className="border-b border-border/70 px-5 py-4">
          <h3 className="mb-3 text-[14px] font-bold uppercase text-foreground">
            Discount Range
          </h3>
          <ul className="flex flex-col gap-2">
            {(facets.discounts ?? []).map((tier) => {
              const selected = listing.discount === tier.value
              return (
                <li key={tier.value}>
                  <LocalizedClientLink
                    href={href({ discount: selected ? undefined : tier.value })}
                    aria-current={selected ? "true" : undefined}
                    data-testid="discount-refinement"
                    className="flex items-center gap-3 text-[14px] text-foreground"
                  >
                    <Radio checked={selected} />
                    {tier.value}% and above
                  </LocalizedClientLink>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(facets.ratings ?? []).length > 0 && (
        <section className="border-b border-border/70 px-5 py-4">
          <h3 className="mb-3 text-[14px] font-bold uppercase text-foreground">
            Customer Ratings
          </h3>
          <ul className="flex flex-col gap-2">
            {(facets.ratings ?? []).map((tier) => {
              const selected = listing.rating === tier.value
              return (
                <li key={tier.value}>
                  <LocalizedClientLink
                    href={href({ rating: selected ? undefined : tier.value })}
                    aria-current={selected ? "true" : undefined}
                    data-testid="rating-refinement"
                    className="flex items-center gap-3 text-[14px] text-foreground"
                  >
                    <Radio checked={selected} />
                    <span className="inline-flex items-center gap-0.5">
                      {tier.value}
                      <StarIcon aria-hidden className="size-3 fill-current" />& above
                    </span>
                    <Count value={tier.count} />
                  </LocalizedClientLink>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="px-5 py-4">
        <h3 className="mb-3 text-[14px] font-bold uppercase text-foreground">More Filters</h3>
        <ul className="flex flex-col gap-2">
          {facets.onSaleCount > 0 && (
            <li>
              <LocalizedClientLink
                href={href({ sale: !listing.sale })}
                aria-current={listing.sale ? "true" : undefined}
                data-testid="sale-refinement"
                className="flex items-center gap-3 text-[14px] text-foreground"
              >
                <Checkbox checked={listing.sale} />
                On sale
                <Count value={facets.onSaleCount} />
              </LocalizedClientLink>
            </li>
          )}
          <li>
            <LocalizedClientLink
              href={href({ inStock: !listing.inStock })}
              aria-current={listing.inStock ? "true" : undefined}
              data-testid="stock-refinement"
              className="flex items-center gap-3 text-[14px] text-foreground"
            >
              <Checkbox checked={listing.inStock} />
              Exclude out of stock
            </LocalizedClientLink>
          </li>
        </ul>
      </section>
    </aside>
  )
}

type Item = {
  key: string
  label: string
  count?: number
  active: boolean
  href: string
  swatch?: string
}

/** Rows shown before "+ N more", as on Myntra. */
const VISIBLE = 8

/**
 * A checkbox section: title with a round search toggle, eight rows, then
 * "+ N more". Selected rows always stay visible, even past the first eight.
 */
function FilterList({
  title,
  items,
  searchPlaceholder,
  testId,
}: {
  title: string
  items: Item[]
  searchPlaceholder: string
  testId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState("")

  const needle = query.trim().toLowerCase()
  const matching = needle ? items.filter((i) => i.label.toLowerCase().includes(needle)) : items
  const shown =
    expanded || needle
      ? matching
      : matching.filter((item, i) => i < VISIBLE || item.active)
  const hidden = matching.length - shown.length
  const searchable = items.length > VISIBLE

  return (
    <section className="border-b border-border/70 px-5 py-4">
      <div className="mb-3 flex h-8 items-center justify-between gap-2">
        {searching ? (
          <div className="flex h-8 flex-1 items-center rounded-full bg-surface-container-low px-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              aria-label={`Close ${title.toLowerCase()} search`}
              onClick={() => {
                setSearching(false)
                setQuery("")
              }}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-[14px] font-bold uppercase text-foreground">{title}</h3>
            {searchable && (
              <button
                type="button"
                aria-label={`Search ${title.toLowerCase()}`}
                onClick={() => setSearching(true)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-surface-container-low text-muted-foreground hover:text-foreground"
              >
                <SearchIcon className="size-4" />
              </button>
            )}
          </>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {shown.map((item) => (
          <li key={item.key}>
            <LocalizedClientLink
              href={item.href}
              aria-current={item.active ? "true" : undefined}
              data-testid={testId}
              className="flex items-center gap-3 text-[14px] text-foreground"
            >
              <Checkbox checked={item.active} />
              {item.swatch && (
                <span
                  aria-hidden
                  className="size-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: item.swatch }}
                />
              )}
              <span className="min-w-0 truncate">{item.label}</span>
              {item.count !== undefined && <Count value={item.count} />}
            </LocalizedClientLink>
          </li>
        ))}
        {needle && matching.length === 0 && (
          <li className="text-[13px] text-muted-foreground">No matches</li>
        )}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 cursor-pointer pl-7 text-[14px]"
          style={{ color: ACCENT }}
        >
          + {hidden} more
        </button>
      )}
      {expanded && !needle && matching.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 cursor-pointer pl-7 text-[14px]"
          style={{ color: ACCENT }}
        >
          Show less
        </button>
      )}
    </section>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[2px] border",
        checked ? "border-transparent text-white" : "border-[#c3c2c9] bg-surface-container-lowest"
      )}
      style={checked ? { backgroundColor: ACCENT } : undefined}
    >
      {checked && <CheckIcon className="size-3" strokeWidth={3} />}
    </span>
  )
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 items-center justify-center rounded-full border"
      style={{ borderColor: checked ? ACCENT : "#c3c2c9" }}
    >
      {checked && <span className="size-2 rounded-full" style={{ backgroundColor: ACCENT }} />}
    </span>
  )
}

function Count({ value }: { value: number }) {
  return <span className="shrink-0 text-[11px] tabular-nums text-[#94969f]">({value})</span>
}

const thumb =
  "pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#ff3f6c] [&::-webkit-slider-thumb]:bg-white " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-2 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[#ff3f6c] [&::-moz-range-thumb]:bg-white " +
  "focus-visible:outline-none [&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-[#ff3f6c]/40"

/**
 * Two-handle price slider. Dragging updates the label live; letting go (or
 * releasing an arrow key) navigates to the filtered URL. A handle left at an
 * end of the range means "no bound", shown as "₹8,990+" on the top end.
 */
function PriceSlider({
  range,
  currency,
  min,
  max,
  hrefFor,
}: {
  range: { min: number; max: number }
  currency: string
  min?: number
  max?: number
  hrefFor: (min: number | undefined, max: number | undefined) => string
}) {
  const router = useRouter()
  const params = useParams()
  const country = (params?.countryCode as string | undefined) ?? "in"

  const step = Math.max(1, Math.round((range.max - range.min) / 100))
  const clamp = (v: number) => Math.min(Math.max(v, range.min), range.max)
  const [low, setLow] = useState(clamp(min ?? range.min))
  const [high, setHigh] = useState(clamp(max ?? range.max))

  const commit = () => {
    const nextMin = low <= range.min ? undefined : low
    const nextMax = high >= range.max ? undefined : high
    if (nextMin === min && nextMax === max) return
    router.push(`/${country}${hrefFor(nextMin, nextMax)}`, { scroll: false })
  }

  const pct = (v: number) => ((v - range.min) / (range.max - range.min)) * 100

  return (
    <div data-testid="price-slider">
      <div className="relative mx-1.5 h-4">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-[#d4d5d9]" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded"
          style={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%`, backgroundColor: ACCENT }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={range.min}
          max={range.max}
          step={step}
          value={low}
          onChange={(e) => setLow(Math.min(Number(e.target.value), high - step))}
          onPointerUp={commit}
          onKeyUp={commit}
          className={thumb}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={range.min}
          max={range.max}
          step={step}
          value={high}
          onChange={(e) => setHigh(Math.max(Number(e.target.value), low + step))}
          onPointerUp={commit}
          onKeyUp={commit}
          className={thumb}
        />
      </div>
      <p className="mt-3 text-[13px] font-semibold text-foreground" data-testid="price-label">
        {shortMoney(low, currency)} - {shortMoney(high, currency)}
        {high >= range.max ? "+" : ""}
      </p>
    </div>
  )
}
