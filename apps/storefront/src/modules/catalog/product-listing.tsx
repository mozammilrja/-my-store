import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import { cn } from "@/lib/utils"
import type { Category } from "@lib/api/types"
import { getFacets, listProducts } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import { listingHref, SORTS, toggle, type Listing } from "./params"

const PER_PAGE = 12

const SWATCH: Record<string, string> = { black: "#111111", white: "#ffffff" }

/**
 * Server-rendered product grid with filters, sorting and pagination. Every
 * control is a link, so it works without JavaScript and every view is
 * crawlable and shareable.
 */
export async function ProductListing({
  countryCode,
  path,
  listing,
  categoryIds = [],
  collectionIds = [],
  /** Category filter shown on /store; omitted on category pages. */
  categories,
}: {
  countryCode: string
  /** Page path without the country prefix, e.g. `/collections/winter-layers`. */
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
    <div className="flex flex-col divide-y">
      {categories && categories.length > 0 && (
        <FilterGroup title="Category">
          <ul className="flex flex-col">
            {categories.map((c) => {
              const active = listing.categories.includes(c.handle)
              return (
                <li key={c.id}>
                  <LocalizedClientLink
                    href={href({ categories: toggle(listing.categories, c.handle) })}
                    aria-current={active ? "true" : undefined}
                    className="flex min-h-9 items-center gap-2.5 text-sm hover:underline"
                    data-testid="refinement-category"
                  >
                    <span className={cn("flex size-4.5 items-center justify-center border", active ? "border-foreground bg-foreground text-background" : "border-input")}>
                      {active && <CheckIcon className="size-3" aria-hidden />}
                    </span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{c.productCount ?? 0}</span>
                  </LocalizedClientLink>
                </li>
              )
            })}
          </ul>
        </FilterGroup>
      )}
      {facets.options.map((group) => (
        <FilterGroup key={group.title} title={group.title}>
          <div className="flex flex-wrap gap-2">
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
                    "inline-flex h-9 min-w-11 items-center justify-center gap-1.5 border px-3 text-sm transition-colors",
                    active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                  )}
                  data-testid="option-refinement"
                >
                  {swatch && <span aria-hidden className="size-3 rounded-full border border-black/20" style={{ backgroundColor: swatch }} />}
                  {v.value}
                  <span className={cn("text-xs tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>{v.count}</span>
                </LocalizedClientLink>
              )
            })}
          </div>
        </FilterGroup>
      ))}
      {(facets.onSaleCount > 0 || listing.sale) && (
      <FilterGroup title="Offers">
        <LocalizedClientLink
          href={href({ sale: !listing.sale })}
          aria-current={listing.sale ? "true" : undefined}
          className="flex min-h-9 items-center gap-2.5 text-sm hover:underline"
          data-testid="on-sale-toggle"
        >
          <span className={cn("flex size-4.5 items-center justify-center border", listing.sale ? "border-foreground bg-foreground text-background" : "border-input")}>
            {listing.sale && <CheckIcon className="size-3" aria-hidden />}
          </span>
          On sale only
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{facets.onSaleCount}</span>
        </LocalizedClientLink>
      </FilterGroup>
      )}
    </div>
  )

  return (
    <Container className="grid gap-10 py-10 lg:grid-cols-[16rem_1fr] lg:gap-12" data-testid="category-container">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-28">{filterPanel}</div>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <span className="text-sm tabular-nums text-muted-foreground" data-testid="product-count">
            {result.count} {result.count === 1 ? "product" : "products"}
          </span>
          <nav aria-label="Sort products" data-testid="sort-by-container">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {SORTS.map((s) => (
                <li key={s.value}>
                  <LocalizedClientLink
                    href={href({ sort: s.value })}
                    aria-current={s.value === listing.sort ? "true" : undefined}
                    className={cn(
                      "underline-offset-[6px] hover:text-foreground",
                      s.value === listing.sort ? "font-semibold underline decoration-2" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <details className="group border lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-bold tracking-[0.12em] uppercase">
            <SlidersHorizontalIcon className="size-4" aria-hidden /> Filters
            {chips.length > 0 && <span className="text-muted-foreground">({chips.length})</span>}
          </summary>
          <div className="border-t px-4">{filterPanel}</div>
        </details>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {chips.map((chip) => (
              <LocalizedClientLink
                key={chip.href + chip.label}
                href={chip.href}
                className="inline-flex h-8 items-center gap-1.5 border border-border px-3 text-xs hover:border-foreground"
              >
                {chip.label}
                <XIcon className="size-3" aria-hidden />
                <span className="sr-only">Remove filter</span>
              </LocalizedClientLink>
            ))}
            <LocalizedClientLink href={path} className="text-xs font-semibold underline underline-offset-4">
              Clear all
            </LocalizedClientLink>
          </div>
        )}

        {result.products.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-16" data-testid="no-products">
            <p className="text-sm text-muted-foreground">
              {chips.length ? "No products match these filters. Try removing one." : "There are no products here yet."}
            </p>
            <Button asChild variant="outline" size="sm">
              <LocalizedClientLink href={chips.length ? path : "/store"}>{chips.length ? "Clear filters" : "Shop all products"}</LocalizedClientLink>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-4 xl:grid-cols-4" data-testid="products-list">
            {result.products.map((product, i) => (
              <li key={product.id}>
                <ProductCard product={product} priority={i < 4} headingLevel="h2" sizes="(min-width: 1280px) 22vw, (min-width: 640px) 33vw, 50vw" />
              </li>
            ))}
          </ul>
        )}

        {result.pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-8 text-sm" data-testid="product-pagination">
            <Button variant="outline" size="icon-sm" asChild className={cn(listing.page <= 1 && "pointer-events-none opacity-40")}>
              <LocalizedClientLink href={href({ page: listing.page - 1 })} aria-label="Previous page" aria-disabled={listing.page <= 1}>
                <ChevronLeftIcon aria-hidden />
              </LocalizedClientLink>
            </Button>
            <span className="tabular-nums">
              Page {listing.page} of {result.pages}
            </span>
            <Button variant="outline" size="icon-sm" asChild className={cn(listing.page >= result.pages && "pointer-events-none opacity-40")}>
              <LocalizedClientLink href={href({ page: listing.page + 1 })} aria-label="Next page" aria-disabled={listing.page >= result.pages}>
                <ChevronRightIcon aria-hidden />
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
    <section className="flex flex-col gap-3 py-5 first:pt-0">
      <h2 className="text-xs font-bold tracking-[0.12em] uppercase">{title}</h2>
      {children}
    </section>
  )
}
