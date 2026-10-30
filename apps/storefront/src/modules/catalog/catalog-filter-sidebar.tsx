"use client"

import { useState } from "react"
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, SearchIcon, StarIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Category } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listingHref, toggle, type Listing } from "./params"

const SWATCH: Record<string, string> = {
  black: "#111111",
  white: "#ffffff",
  grey: "#9ca3af",
  gray: "#9ca3af",
  navy: "#1e2a4a",
  blue: "#2440d6",
  green: "#3f6b47",
  red: "#c8291d",
  beige: "#d8c8a8",
  brown: "#7a5236",
  sand: "#e7e5e4",
  mocha: "#785b4f",
  ivory: "#fbf9f8",
  emerald: "#065f46",
}

const BRANDS = [
  { name: "Everwear Tailoring", count: 24 },
  { name: "Heritage Loom 1984", count: 18 },
  { name: "Aurum Footwear", count: 12 },
  { name: "Atelier Silvercraft", count: 15 },
  { name: "Everwear Studio", count: 28 },
]

const GENDERS = [
  { handle: "men", label: "Men" },
  { handle: "women", label: "Women" },
  { handle: "kids", label: "Kids" },
]

export function CatalogFilterSidebar({
  path,
  listing,
  categories = [],
  facets,
  currentCategoryHandle,
}: {
  path: string
  listing: Listing
  categories?: Category[]
  facets: {
    options: { title: string; values: { value: string; count: number }[] }[]
    onSaleCount: number
    priceRange: { min: number; max: number } | null
  }
  currentCategoryHandle?: string
}) {
  // Accordion section states (default open for primary facet dimensions)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    gender: true,
    brand: true,
    price: true,
    color: true,
    size: true,
    offers: true,
    rating: false,
    availability: false,
  })

  const [brandSearch, setBrandSearch] = useState("")

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const href = (change: Partial<Listing>) => listingHref(path, listing, change)

  // Active filter chips
  const activeChips = [
    ...listing.categories.map((handle) => ({
      label: categories?.find((c) => c.handle === handle)?.name ?? handle,
      href: href({ categories: listing.categories.filter((c) => c !== handle) }),
    })),
    ...listing.options.map((o) => {
      const parts = o.split(":")
      return {
        label: `${parts[0]}: ${parts[1]}`,
        href: href({ options: listing.options.filter((x) => x !== o) }),
      }
    }),
    ...(listing.sale ? [{ label: "On Sale", href: href({ sale: false }) }] : []),
  ]

  const colorGroup = facets.options.find((o) => o.title.toLowerCase() === "color")
  const sizeGroup = facets.options.find((o) => o.title.toLowerCase() === "size")
  const otherGroups = facets.options.filter(
    (o) => !["color", "size"].includes(o.title.toLowerCase())
  )

  const filteredBrands = BRANDS.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  )

  return (
    <aside
      className="w-full bg-surface-container-lowest border border-border/80 rounded-xl overflow-hidden shadow-xs divide-y divide-border/60"
      aria-label="Product Filters"
    >
      {/* 1. Header: Filters Title & CLEAR ALL */}
      <div className="p-4 flex items-center justify-between bg-surface-container-low/40">
        <div className="flex items-center gap-2">
          <span className="font-headline-sm text-base font-bold text-foreground">Filters</span>
          {activeChips.length > 0 && (
            <span className="font-label-caps text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">
              {activeChips.length}
            </span>
          )}
        </div>
        {activeChips.length > 0 && (
          <LocalizedClientLink
            href={path}
            className="font-label-caps text-xs uppercase tracking-wider text-secondary font-bold hover:underline"
          >
            CLEAR ALL
          </LocalizedClientLink>
        )}
      </div>

      {/* 2. Active Filter Pills */}
      {activeChips.length > 0 && (
        <div className="p-3 bg-surface-container-lowest flex flex-wrap gap-1.5 border-b border-border/60">
          {activeChips.map((chip, idx) => (
            <LocalizedClientLink
              key={idx}
              href={chip.href}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container border border-border/50 text-foreground font-body-sm text-xs transition-colors group"
            >
              <XIcon className="size-3 text-muted-foreground group-hover:text-destructive transition-colors" />
              <span>{chip.label}</span>
            </LocalizedClientLink>
          ))}
        </div>
      )}

      {/* 3. CATEGORIES Hierarchy Navigation */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-label-caps text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            CATEGORIES
          </span>
        </div>

        {/* Parent Category Breadcrumb */}
        <LocalizedClientLink
          href="/store"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ChevronLeftIcon className="size-3.5" />
          <span>All Departments</span>
        </LocalizedClientLink>

        {/* Current Active Category / Department */}
        <div className="pl-3 flex flex-col gap-1.5 mt-1 border-l-2 border-primary/80">
          <span className="font-label-sm text-xs font-bold text-foreground flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-secondary" />
            <span>
              {categories.find((c) => c.handle === currentCategoryHandle)?.name || "Current Selection"}
            </span>
          </span>

          {/* Subcategory list with counts */}
          <ul className="flex flex-col gap-1 pl-2.5 pt-1">
            {categories.slice(0, 8).map((cat) => {
              const active = listing.categories.includes(cat.handle)
              return (
                <li key={cat.id}>
                  <LocalizedClientLink
                    href={href({ categories: toggle(listing.categories, cat.handle) })}
                    className={cn(
                      "flex items-center justify-between text-xs py-1 transition-colors hover:text-secondary",
                      active ? "text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    {cat.productCount !== undefined && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        ({cat.productCount})
                      </span>
                    )}
                  </LocalizedClientLink>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* 4. GENDER / IDEAL FOR Accordion */}
      <div className="p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => toggleSection("gender")}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
            GENDER / IDEAL FOR
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              openSections.gender && "rotate-180"
            )}
          />
        </button>

        {openSections.gender && (
          <div className="flex flex-col gap-2 pt-1">
            {GENDERS.map((g) => {
              const active = listing.categories.includes(g.handle)
              return (
                <LocalizedClientLink
                  key={g.handle}
                  href={href({ categories: toggle(listing.categories, g.handle) })}
                  className="flex items-center gap-2.5 text-xs text-foreground hover:text-secondary transition-colors"
                >
                  <span
                    className={cn(
                      "size-4 rounded border transition-colors flex items-center justify-center shrink-0",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-surface-container-lowest"
                    )}
                  >
                    {active && <CheckIcon className="size-3" />}
                  </span>
                  <span className={cn(active && "font-semibold")}>{g.label}</span>
                </LocalizedClientLink>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. PRICE Accordion with Quick Range Filters */}
      <div className="p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
            PRICE
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              openSections.price && "rotate-180"
            )}
          />
        </button>

        {openSections.price && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
              <span>Min: ₹799</span>
              <span className="h-px w-6 bg-border" />
              <span>Max: ₹8,990+</span>
            </div>

            {/* Quick Price Ranges */}
            {[
              { label: "Under ₹1,000", hrefChange: { sort: "price_asc" as const } },
              { label: "₹1,000 - ₹2,999", hrefChange: { sort: "newest" as const } },
              { label: "₹3,000 - ₹5,999", hrefChange: { sort: "newest" as const } },
              { label: "₹6,000 and above", hrefChange: { sort: "price_desc" as const } },
            ].map((p, idx) => (
              <LocalizedClientLink
                key={idx}
                href={href(p.hrefChange)}
                className="flex items-center gap-2.5 text-xs text-foreground hover:text-secondary transition-colors py-0.5"
              >
                <span className="size-3.5 rounded-full border border-input flex items-center justify-center shrink-0">
                  <span className="size-1.5 rounded-full bg-transparent" />
                </span>
                <span>{p.label}</span>
              </LocalizedClientLink>
            ))}
          </div>
        )}
      </div>

      {/* 6. BRAND / ATELIER Accordion with Live Search */}
      <div className="p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => toggleSection("brand")}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
            BRAND / ATELIER
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              openSections.brand && "rotate-180"
            )}
          />
        </button>

        {openSections.brand && (
          <div className="flex flex-col gap-2.5 pt-1">
            {/* Brand Search Box */}
            <div className="relative flex items-center">
              <SearchIcon className="size-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Brand"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-surface-container-low border border-border rounded focus:outline-none focus:border-primary font-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
              {filteredBrands.map((b) => (
                <label
                  key={b.name}
                  className="flex items-center justify-between text-xs text-foreground hover:text-secondary transition-colors cursor-pointer py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-4 rounded border border-input bg-surface-container-lowest flex items-center justify-center shrink-0" />
                    <span className="truncate">{b.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    ({b.count})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7. COLOR Accordion with Swatches */}
      {colorGroup && (
        <div className="p-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => toggleSection("color")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
              COLOR
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                openSections.color && "rotate-180"
              )}
            />
          </button>

          {openSections.color && (
            <div className="flex flex-col gap-1.5 pt-1">
              {colorGroup.values.map((v) => {
                const key = `Color:${v.value}`
                const active = listing.options.includes(key)
                const swatch = SWATCH[v.value.toLowerCase()] || "#9ca3af"
                return (
                  <LocalizedClientLink
                    key={v.value}
                    href={href({ options: toggle(listing.options, key) })}
                    className="flex items-center justify-between text-xs py-1 text-foreground hover:text-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "size-4 rounded border transition-colors flex items-center justify-center shrink-0",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-surface-container-lowest"
                        )}
                      >
                        {active && <CheckIcon className="size-3" />}
                      </span>
                      <span
                        className="size-3 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: swatch }}
                      />
                      <span className={cn(active && "font-semibold")}>{v.value}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      ({v.count})
                    </span>
                  </LocalizedClientLink>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. SIZE Accordion (Compact Grid / Checkboxes) */}
      {sizeGroup && (
        <div className="p-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => toggleSection("size")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
              SIZE
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                openSections.size && "rotate-180"
              )}
            />
          </button>

          {openSections.size && (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {sizeGroup.values.map((v) => {
                const key = `Size:${v.value}`
                const active = listing.options.includes(key)
                return (
                  <LocalizedClientLink
                    key={v.value}
                    href={href({ options: toggle(listing.options, key) })}
                    className={cn(
                      "flex items-center justify-center h-8 rounded border font-label-sm text-xs font-semibold transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                        : "border-border bg-surface-container-low hover:border-foreground text-foreground"
                    )}
                  >
                    <span>{v.value}</span>
                  </LocalizedClientLink>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 9. Other Option Facets (e.g. Fit, Sleeve, Fabric) */}
      {otherGroups.map((group) => (
        <div key={group.title} className="p-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => toggleSection(group.title.toLowerCase())}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
              {group.title}
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                openSections[group.title.toLowerCase()] && "rotate-180"
              )}
            />
          </button>

          {openSections[group.title.toLowerCase()] && (
            <div className="flex flex-col gap-1.5 pt-1">
              {group.values.map((v) => {
                const key = `${group.title}:${v.value}`
                const active = listing.options.includes(key)
                return (
                  <LocalizedClientLink
                    key={v.value}
                    href={href({ options: toggle(listing.options, key) })}
                    className="flex items-center justify-between text-xs py-1 text-foreground hover:text-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "size-4 rounded border transition-colors flex items-center justify-center shrink-0",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-surface-container-lowest"
                        )}
                      >
                        {active && <CheckIcon className="size-3" />}
                      </span>
                      <span className={cn(active && "font-semibold")}>{v.value}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      ({v.count})
                    </span>
                  </LocalizedClientLink>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* 10. OFFERS / DISCOUNT Accordion */}
      <div className="p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => toggleSection("offers")}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
            DISCOUNT &amp; OFFERS
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              openSections.offers && "rotate-180"
            )}
          />
        </button>

        {openSections.offers && (
          <div className="flex flex-col gap-2 pt-1">
            <LocalizedClientLink
              href={href({ sale: !listing.sale })}
              className="flex items-center justify-between text-xs text-foreground hover:text-secondary transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "size-4 rounded border transition-colors flex items-center justify-center shrink-0",
                    listing.sale
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-surface-container-lowest"
                  )}
                >
                  {listing.sale && <CheckIcon className="size-3" />}
                </span>
                <span className={cn(listing.sale && "font-bold text-secondary")}>
                  Archive Sale (Up to 50% Off)
                </span>
              </div>
              <span className="font-label-caps text-[9px] bg-secondary-container text-on-secondary-fixed px-1.5 py-0.2 rounded font-bold">
                50%
              </span>
            </LocalizedClientLink>

            <label className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer pt-0.5">
              <div className="flex items-center gap-2.5">
                <span className="size-4 rounded border border-input bg-surface-container-lowest shrink-0" />
                <span>Special Bank Discounts</span>
              </div>
              <span className="text-[10px] tabular-nums text-secondary font-semibold">10%</span>
            </label>
          </div>
        )}
      </div>

      {/* 11. CUSTOMER RATINGS Accordion */}
      <div className="p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => toggleSection("rating")}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
            CUSTOMER RATINGS
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              openSections.rating && "rotate-180"
            )}
          />
        </button>

        {openSections.rating && (
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-secondary transition-colors">
              <span className="size-4 rounded border border-input bg-surface-container-lowest shrink-0" />
              <div className="flex items-center gap-1 font-semibold">
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px]">
                  4 <StarIcon className="size-2.5 fill-current" />
                </span>
                <span>&amp; above</span>
              </div>
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-secondary transition-colors">
              <span className="size-4 rounded border border-input bg-surface-container-lowest shrink-0" />
              <div className="flex items-center gap-1 font-semibold">
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                  3 <StarIcon className="size-2.5 fill-current" />
                </span>
                <span>&amp; above</span>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* 12. AVAILABILITY Accordion */}
      <div className="p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => toggleSection("availability")}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
            AVAILABILITY
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              openSections.availability && "rotate-180"
            )}
          />
        </button>

        {openSections.availability && (
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-secondary transition-colors">
              <span className="size-4 rounded border border-primary bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <CheckIcon className="size-3" />
              </span>
              <span>Exclude Out of Stock</span>
            </label>
          </div>
        )}
      </div>
    </aside>
  )
}
