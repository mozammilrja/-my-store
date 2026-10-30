import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import { cn } from "@/lib/utils"
import type { Category } from "@lib/api/types"
import { getFacets, listProducts } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchXIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import { listingHref, SORTS, toggle, type Listing } from "./params"

const PER_PAGE = 12

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
}

/**
 * Stitch Editorial Product Listing:
 * Refined 4-tier filter sidebar, active criteria pills, curated recommendation sort,
 * and 4-column product grid with zero-CLS pagination.
 */
export async function ProductListing({
  countryCode,
  path,
  listing,
  categoryIds = [],
  collectionIds = [],
  categories,
}: {
  countryCode: string
  path: string
  listing: Listing
  categoryIds?: string[]
  collectionIds?: string[]
  categories?: Category[]
}) {
  const selectedCategoryIds = categories
    ? categories.filter((c) => listing.categories.includes(c.handle)).map((c) => c.id)
    : []
  const category = [...categoryIds, ...selectedCategoryIds]

  const [result, facets] = await Promise.all([
    listProducts({
      country: countryCode,
      category,
      collection: collectionIds,
      option: listing.options,
      onSale: listing.sale,
      sort: listing.sort,
      page: listing.page,
      limit: PER_PAGE,
    }),
    getFacets({ country: countryCode, category: categoryIds, collection: collectionIds }),
  ])

  const href = (change: Partial<Listing>) => listingHref(path, listing, change)
  const chips = [
    ...listing.categories.map((handle) => ({
      label: categories?.find((c) => c.handle === handle)?.name ?? handle,
      href: href({ categories: listing.categories.filter((c) => c !== handle) }),
    })),
    ...listing.options.map((o) => ({ label: o.split(":")[1]!, href: href({ options: listing.options.filter((x) => x !== o) }) })),
    ...(listing.sale ? [{ label: "On sale", href: href({ sale: false }) }] : []),
  ]

  const filterPanel = (
    <div className="flex flex-col gap-4">
      {categories && categories.length > 0 && (
        <FilterGroup title="Department Category">
          <ul className="flex flex-col gap-1.5">
            {categories.map((c) => {
              const active = listing.categories.includes(c.handle)
              return (
                <li key={c.id}>
                  <LocalizedClientLink
                    href={href({ categories: toggle(listing.categories, c.handle) })}
                    aria-current={active ? "true" : undefined}
                    className="flex min-h-8 items-center gap-2.5 text-xs sm:text-sm font-body-sm text-foreground hover:text-secondary transition-colors"
                    data-testid="refinement-category"
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-surface-container-lowest"
                      )}
                    >
                      {active && <CheckIcon className="size-3" aria-hidden />}
                    </span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-[11px] tabular-nums font-label-caps text-muted-foreground">
                      {c.productCount ?? 0}
                    </span>
                  </LocalizedClientLink>
                </li>
              )
            })}
          </ul>
        </FilterGroup>
      )}

      {facets.options.map((group) => (
        <FilterGroup key={group.title} title={group.title}>
          <div className="flex flex-wrap gap-1.5">
            {group.values.map((v) => {
              const key = `${group.title}:${v.value}`
              const active = listing.options.includes(key)
              const swatch = group.title.toLowerCase() === "color" ? SWATCH[v.value.toLowerCase()] : undefined
              return (
                <LocalizedClientLink
                  key={key}
                  href={href({ options: toggle(listing.options, key) })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-8 min-w-9 items-center justify-center gap-1.5 rounded-md border px-2.5 font-label-sm text-xs transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "border-border bg-surface-container-lowest text-foreground hover:border-primary/50"
                  )}
                  data-testid="option-refinement"
                >
                  {swatch && (
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full border border-black/20"
                      style={{ backgroundColor: swatch }}
                    />
                  )}
                  {v.value}
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {v.count}
                  </span>
                </LocalizedClientLink>
              )
            })}
          </div>
        </FilterGroup>
      ))}

      {(facets.onSaleCount > 0 || listing.sale) && (
        <FilterGroup title="Merchandising & Offers">
          <LocalizedClientLink
            href={href({ sale: !listing.sale })}
            aria-current={listing.sale ? "true" : undefined}
            className="flex min-h-8 items-center gap-2.5 text-xs sm:text-sm font-body-sm hover:text-secondary transition-colors"
            data-testid="on-sale-toggle"
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded border transition-colors",
                listing.sale ? "border-primary bg-primary text-primary-foreground" : "border-input bg-surface-container-lowest"
              )}
            >
              {listing.sale && <CheckIcon className="size-3" aria-hidden />}
            </span>
            <span className="font-medium text-foreground">Archive Sale Only</span>
            <span className="ml-auto font-label-caps text-[10px] bg-secondary-container text-on-secondary-fixed px-1.5 py-0.2 rounded font-bold">
              Up to 50%
            </span>
          </LocalizedClientLink>
        </FilterGroup>
      )}
    </div>
  )

  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-[17rem_1fr] lg:gap-10" data-testid="category-container">
      {/* Desktop Filter Sidebar */}
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-28 bg-surface-container-low/70 border border-border/50 p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <span className="font-label-caps text-xs uppercase tracking-wider text-foreground font-bold">
              Curated Filters
            </span>
            {chips.length > 0 && (
              <LocalizedClientLink
                href={path}
                className="font-label-caps text-[10px] uppercase text-secondary hover:underline font-bold"
              >
                Reset All
              </LocalizedClientLink>
            )}
          </div>
          {filterPanel}
        </div>
      </aside>

      {/* Main Catalog View */}
      <div className="flex min-w-0 flex-col gap-6">
        {/* Active Filter Chips & Sort Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 bg-surface-container-low/70 border border-border/50 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-body-sm text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
              Showing <strong className="text-foreground font-bold" data-testid="product-count">{result.count}</strong> {result.count === 1 ? "product" : "products"}
            </span>
          </div>

          {/* Sort Menu */}
          <nav aria-label="Sort products" data-testid="sort-by-container" className="self-end md:self-auto">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-label-sm">
              <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-widest mr-1">
                Sort:
              </span>
              {SORTS.map((s) => (
                <li key={s.value}>
                  <LocalizedClientLink
                    href={href({ sort: s.value })}
                    aria-current={s.value === listing.sort ? "true" : undefined}
                    className={cn(
                      "transition-colors",
                      s.value === listing.sort
                        ? "text-foreground font-bold underline decoration-2 underline-offset-4"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Mobile Filter Trigger */}
        <details className="group border border-border/60 rounded-xl bg-surface-container-low/60 lg:hidden overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-label-sm uppercase tracking-wider font-bold text-foreground">
            <span className="flex items-center gap-2">
              <SlidersHorizontalIcon className="size-4" aria-hidden /> Filter Criteria
              {chips.length > 0 && (
                <span className="font-label-caps text-[10px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded font-bold">
                  {chips.length}
                </span>
              )}
            </span>
            <ChevronDownIcon className="size-4 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="border-t border-border/60 p-4 bg-surface-container-lowest">{filterPanel}</div>
        </details>

        {/* Active Criterion Tokens */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mr-1">
              Active:
            </span>
            {chips.map((chip) => (
              <LocalizedClientLink
                key={chip.href + chip.label}
                href={chip.href}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-container-lowest px-2.5 font-label-sm text-xs text-foreground hover:border-foreground transition-colors shadow-2xs group"
              >
                <span>{chip.label}</span>
                <XIcon className="size-3 text-muted-foreground group-hover:text-destructive transition-colors" aria-hidden />
                <span className="sr-only">Remove filter</span>
              </LocalizedClientLink>
            ))}
            <LocalizedClientLink
              href={path}
              className="font-label-caps text-[11px] text-secondary hover:underline uppercase font-bold ml-1"
            >
              Clear all
            </LocalizedClientLink>
          </div>
        )}

        {/* Catalog Grid */}
        {result.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center bg-surface-container-low/40 rounded-2xl border border-dashed border-border" data-testid="no-products">
            <div className="size-14 rounded-full bg-surface-container flex items-center justify-center text-muted-foreground">
              <SearchXIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="font-body-md text-sm text-muted-foreground max-w-sm">
              {chips.length ? "No garments match these active filters. Try removing a filter criterion." : "There are no products in this capsule yet."}
            </p>
            <Button asChild variant="outline" size="sm" className="font-label-md">
              <LocalizedClientLink href={chips.length ? path : "/store"}>
                {chips.length ? "Reset Filters" : "Shop All Collections"}
              </LocalizedClientLink>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" data-testid="products-list">
            {result.products.map((product, i) => (
              <li key={product.id}>
                <ProductCard product={product} priority={i < 4} headingLevel="h2" sizes="(min-width: 1280px) 22vw, (min-width: 640px) 33vw, 50vw" />
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {result.pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-10 text-sm" data-testid="product-pagination">
            <Button variant="outline" size="icon-sm" asChild className={cn(listing.page <= 1 && "pointer-events-none opacity-40", "rounded-md")}>
              <LocalizedClientLink href={href({ page: listing.page - 1 })} aria-label="Previous page" aria-disabled={listing.page <= 1}>
                <ChevronLeftIcon className="size-4" aria-hidden />
              </LocalizedClientLink>
            </Button>
            <span className="tabular-nums font-label-sm text-xs font-semibold text-foreground">
              Page {listing.page} of {result.pages}
            </span>
            <Button variant="outline" size="icon-sm" asChild className={cn(listing.page >= result.pages && "pointer-events-none opacity-40", "rounded-md")}>
              <LocalizedClientLink href={href({ page: listing.page + 1 })} aria-label="Next page" aria-disabled={listing.page >= result.pages}>
                <ChevronRightIcon className="size-4" aria-hidden />
              </LocalizedClientLink>
            </Button>
          </nav>
        )}
      </div>
    </Container>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 bg-surface-container-lowest border border-border/50 p-3.5 rounded-xl shadow-2xs">
      <span className="font-label-caps text-[11px] font-bold tracking-wider uppercase text-foreground">
        {title}
      </span>
      {children}
    </div>
  )
}
