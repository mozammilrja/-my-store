import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import { cn } from "@/lib/utils"
import type { Category } from "@lib/api/types"
import { getFacets, listProducts } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchXIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import { listingHref, SORTS, type Listing } from "./params"
import { CatalogFilterSidebar } from "./catalog-filter-sidebar"

const PER_PAGE = 12

/**
 * Editorial Product Listing with Hierarchical Faceted Filter Sidebar:
 * Collapsible accordions, active criteria tokens, category tree, brand search, and price ranges.
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
    ...listing.options.map((o) => {
      const parts = o.split(":")
      return {
        label: `${parts[0]}: ${parts[1]}`,
        href: href({ options: listing.options.filter((x) => x !== o) }),
      }
    }),
    ...(listing.sale ? [{ label: "On sale", href: href({ sale: false }) }] : []),
  ]

  const currentCategoryHandle = categoryIds[0]
    ? categories?.find((c) => c.id === categoryIds[0])?.handle
    : undefined

  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-[18rem_1fr] lg:gap-8" data-testid="category-container">
      {/* Desktop Filter Sidebar */}
      <div className="hidden lg:block w-72 shrink-0" aria-label="Filters">
        <div className="sticky top-28">
          <CatalogFilterSidebar
            path={path}
            listing={listing}
            categories={categories}
            facets={facets}
            currentCategoryHandle={currentCategoryHandle}
          />
        </div>
      </div>

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
              <SlidersHorizontalIcon className="size-4" aria-hidden /> Filters &amp; Refinements
              {chips.length > 0 && (
                <span className="font-label-caps text-[10px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded font-bold">
                  {chips.length}
                </span>
              )}
            </span>
            <ChevronDownIcon className="size-4 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="border-t border-border/60 p-2 bg-surface-container-lowest">
            <CatalogFilterSidebar
              path={path}
              listing={listing}
              categories={categories}
              facets={facets}
              currentCategoryHandle={currentCategoryHandle}
            />
          </div>
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
