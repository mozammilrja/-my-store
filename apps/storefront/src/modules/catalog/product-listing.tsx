import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import { cn } from "@/lib/utils"
import { listProductsWithSort } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { ChevronLeftIcon, ChevronRightIcon, SlidersHorizontalIcon } from "lucide-react"

const PER_PAGE = 12

const SORTS: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Newest" },
  { value: "price_asc", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
]

export const parseSort = (value?: string): SortOptions =>
  SORTS.some((s) => s.value === value) ? (value as SortOptions) : "created_at"

export const parsePage = (value?: string) => {
  const page = Number.parseInt(value ?? "1", 10)
  return Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1
}

/**
 * Server-rendered product grid for category and collection pages: crawlable
 * links, sort and pagination in the URL. Full faceted filtering lives on /store.
 */
export async function ProductListing({
  countryCode,
  path,
  query,
  sortBy,
  page,
  filterHref,
}: {
  countryCode: string
  /** Page path without the country prefix, e.g. `/collections/winter-layers`. */
  path: string
  query: HttpTypes.StoreProductListParams
  sortBy: SortOptions
  page: number
  /** Optional link to the same products on the faceted /store page. */
  filterHref?: string
}) {
  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams: { ...query, limit: PER_PAGE },
    sortBy,
    countryCode,
  })

  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE))
  const href = (next: { sortBy?: SortOptions; page?: number }) => {
    const params = new URLSearchParams()
    const s = next.sortBy ?? sortBy
    const p = next.page ?? 1
    if (s !== "created_at") params.set("sortBy", s)
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return `${path}${qs ? `?${qs}` : ""}`
  }

  return (
    <Container className="flex flex-col gap-8 py-10" data-testid="category-container">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          {filterHref && (
            <Button variant="outline" size="sm" asChild>
              <LocalizedClientLink href={filterHref}>
                <SlidersHorizontalIcon data-icon="inline-start" aria-hidden /> Filter
              </LocalizedClientLink>
            </Button>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">
            {count} {count === 1 ? "product" : "products"}
          </span>
        </div>
        <nav aria-label="Sort products" data-testid="sort-by-container">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {SORTS.map((s) => (
              <li key={s.value}>
                <LocalizedClientLink
                  href={href({ sortBy: s.value })}
                  aria-current={s.value === sortBy ? "true" : undefined}
                  className={cn(
                    "underline-offset-[6px] hover:text-primary",
                    s.value === sortBy ? "underline decoration-primary decoration-2" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-16" data-testid="no-products">
          <p className="text-sm text-muted-foreground">
            {page > 1 ? "There are no products on this page." : "There are no products here yet."}
          </p>
          <Button asChild variant="outline" size="sm">
            <LocalizedClientLink href="/store">Shop all products</LocalizedClientLink>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-6 xl:grid-cols-4" data-testid="products-list">
          {products.map((product, i) => (
            <li key={product.id}>
              <ProductCard product={product} priority={i < 4} headingLevel="h2" sizes="(min-width: 1280px) 22vw, (min-width: 640px) 33vw, 50vw" />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-8 text-sm" data-testid="product-pagination">
          <Button variant="outline" size="icon-sm" asChild className={cn(page <= 1 && "pointer-events-none opacity-40")}>
            <LocalizedClientLink href={href({ page: page - 1 })} aria-label="Previous page" aria-disabled={page <= 1}>
              <ChevronLeftIcon aria-hidden />
            </LocalizedClientLink>
          </Button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="icon-sm" asChild className={cn(page >= totalPages && "pointer-events-none opacity-40")}>
            <LocalizedClientLink href={href({ page: page + 1 })} aria-label="Next page" aria-disabled={page >= totalPages}>
              <ChevronRightIcon aria-hidden />
            </LocalizedClientLink>
          </Button>
        </nav>
      )}
    </Container>
  )
}
