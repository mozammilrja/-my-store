"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Container } from "@/components/store/container"
import useSearchSettled from "@lib/hooks/use-search-settled"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import { getSortOptions } from "@modules/store/components/store-refinements/attributes"
import type { SearchClient } from "instantsearch.js"
import { ChevronLeftIcon, ChevronRightIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Configure,
  InstantSearch,
  useClearRefinements,
  useCurrentRefinements,
  useHits,
  useInstantSearch,
  usePagination,
  useSearchBox,
  useSortBy,
  useStats,
} from "react-instantsearch"
import { Filters } from "./filters"
import { HitCard, ProductHit } from "./hit-card"

const PER_PAGE = 12
// Stable references: InstantSearch widgets re-mount when hook options change identity.
const EXCLUDE_QUERY = ["query"]
const EXCLUDE_PINNED = ["query", "category"]

const SORT_LABELS: Record<string, string> = {
  Relevance: "Featured",
  "Latest Arrivals": "Newest",
  "Price: Low -> High": "Price, low to high",
  "Price: High -> Low": "Price, high to low",
  "Title: A -> Z": "Name, A to Z",
  "Title: Z -> A": "Name, Z to A",
}

function Sort({ currencyCode }: { currencyCode: string }) {
  const items = useMemo(
    () => getSortOptions(currencyCode).map((i) => ({ ...i, label: SORT_LABELS[i.label] ?? i.label })),
    [currencyCode]
  )
  const { currentRefinement, refine } = useSortBy({ items })
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-xs text-muted-foreground max-sm:sr-only">Sort</label>
      <Select value={currentRefinement} onValueChange={refine}>
        <SelectTrigger id="sort" size="sm" className="w-44" data-testid="sort-by-container">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SearchWithin() {
  const { query, refine } = useSearchBox()
  const [value, setValue] = useState(query)
  return (
    <input
      type="search"
      value={value}
      maxLength={100}
      onChange={(e) => {
        setValue(e.target.value)
        refine(e.target.value)
      }}
      placeholder="Search in results"
      aria-label="Search in results"
      className="h-9 w-full border-b border-input bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring sm:w-56"
      data-testid="store-search-input"
    />
  )
}

function ActiveFilters({ pinned }: { pinned: boolean }) {
  const excludedAttributes = pinned ? EXCLUDE_PINNED : EXCLUDE_QUERY
  const { items, refine } = useCurrentRefinements({ excludedAttributes })
  const { refine: clear, canRefine } = useClearRefinements({ excludedAttributes })
  const chips = items.flatMap((group) => group.refinements.map((r) => ({ ...r, key: `${group.attribute}-${r.label}` })))
  if (!canRefine || chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => refine(chip)}
          className="inline-flex h-8 items-center gap-1.5 border border-border bg-card px-3 text-xs hover:border-foreground"
        >
          {String(chip.label).replace(/^[^:]+:/, "")}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <Button variant="link" size="xs" onClick={clear}>Clear all</Button>
    </div>
  )
}

function Results({ currencyCode }: { currencyCode: string }) {
  const { items } = useHits<ProductHit>()
  const { status } = useInstantSearch()
  const { hasNoResultsYet } = useSearchSettled()
  const { nbHits } = useStats()

  if (status === "error") {
    return (
      <div className="flex flex-col items-start gap-3 py-16" data-testid="products-error">
        <p className="text-sm">We couldn&apos;t load products right now.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (hasNoResultsYet) {
    return (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
          </li>
        ))}
      </ul>
    )
  }

  const products = items.filter((hit) => hit.handle)

  if (products.length === 0) {
    return (
      <p className="py-16 text-sm text-muted-foreground" data-testid="no-products">
        No products match these filters. Try removing one.
      </p>
    )
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">{nbHits} products</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-6 xl:grid-cols-4" data-testid="products-list">
        {products.map((hit, i) => (
          <li key={hit.objectID}>
            <HitCard hit={hit} currencyCode={currencyCode} priority={i < 4} />
          </li>
        ))}
      </ul>
    </>
  )
}

function Pager() {
  const { currentRefinement, nbPages, refine, isFirstPage, isLastPage, createURL } = usePagination({ padding: 2 })
  if (nbPages <= 1) return null
  const go = (page: number) => (event: React.MouseEvent) => {
    event.preventDefault()
    refine(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-16 text-sm" data-testid="pagination">
      <Button variant="outline" size="icon-sm" asChild aria-disabled={isFirstPage} className={isFirstPage ? "pointer-events-none opacity-40" : ""}>
        <a href={createURL(currentRefinement - 1)} onClick={go(currentRefinement - 1)} aria-label="Previous page">
          <ChevronLeftIcon aria-hidden />
        </a>
      </Button>
      <span className="tabular-nums">
        Page {currentRefinement + 1} of {nbPages}
      </span>
      <Button variant="outline" size="icon-sm" asChild aria-disabled={isLastPage} className={isLastPage ? "pointer-events-none opacity-40" : ""}>
        <a href={createURL(currentRefinement + 1)} onClick={go(currentRefinement + 1)} aria-label="Next page">
          <ChevronRightIcon aria-hidden />
        </a>
      </Button>
    </nav>
  )
}

function Count() {
  const { nbHits } = useStats()
  const { hasNoResultsYet } = useSearchSettled()
  return (
    <span className="text-sm tabular-nums text-muted-foreground">
      {hasNoResultsYet ? " " : `${nbHits} ${nbHits === 1 ? "product" : "products"}`}
    </span>
  )
}

/**
 * Faceted product browsing on the Medusa search index. `category` pins the
 * listing to one category (category pages); filters and sort live in the URL.
 */
export function Browse({ currencyCode, category }: { currencyCode: string; category?: string }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const facetFilters = useMemo(() => (category ? [[`category:${category}`]] : undefined), [category])

  return (
    <InstantSearch
      indexName={PRODUCT_INDEX_NAME}
      searchClient={searchClient as unknown as SearchClient}
      routing
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure
        hitsPerPage={PER_PAGE}
        {...(facetFilters ? { facetFilters } : {})}
      />
      <Container className="grid gap-10 py-10 lg:grid-cols-[16rem_1fr] lg:gap-12" data-testid="category-container">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-28">
            <Filters currencyCode={currencyCode} showCategories={!category} />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-4">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontalIcon data-icon="inline-start" aria-hidden /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-full flex-col gap-0 sm:max-w-sm">
                  <SheetHeader className="border-b">
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>Results update as you choose.</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4">
                    <Filters currencyCode={currencyCode} showCategories={!category} />
                  </div>
                  <SheetFooter className="border-t">
                    <Button onClick={() => setFiltersOpen(false)}>Show results</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <Count />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <SearchWithin />
              <Sort currencyCode={currencyCode} />
            </div>
          </div>
          <ActiveFilters pinned={Boolean(category)} />
          <Results currencyCode={currencyCode} />
          <Pager />
        </div>
      </Container>
    </InstantSearch>
  )
}
