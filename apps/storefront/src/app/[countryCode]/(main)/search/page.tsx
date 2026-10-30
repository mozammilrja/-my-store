import { Metadata } from "next"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { ProductCard } from "@/components/store/product-card"
import { getRegion, listProducts } from "@lib/data/catalog"
import { SearchIcon } from "lucide-react"

const RESULT_LIMIT = 24
const MAX_QUERY = 100

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ q?: string | string[] }>
}

const getQuery = (q?: string | string[]) =>
  (Array.isArray(q) ? q[0] : q)?.trim().slice(0, MAX_QUERY) ?? ""

export async function generateMetadata(props: Props): Promise<Metadata> {
  const query = getQuery((await props.searchParams).q)
  return {
    title: query ? `Search: ${query}` : "Search",
    robots: { index: false, follow: true },
  }
}

/** Server-rendered search: works without JavaScript and is the target of the header search link. */
export default async function SearchPage(props: Props) {
  const { countryCode } = await props.params
  const query = getQuery((await props.searchParams).q)
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const result = query
    ? await listProducts({ country: countryCode, q: query, limit: RESULT_LIMIT }).catch(() => null)
    : { products: [], count: 0 }

  return (
    <Container className="flex flex-col gap-10 py-12" data-testid="search-container">
      <div className="flex flex-col gap-6 border-b pb-10">
        <h1 className="font-display-hero text-3xl sm:text-5xl font-light tracking-tight">
          {query ? <>Results for &ldquo;{query}&rdquo;</> : "Search"}
        </h1>
        <form role="search" action={`/${countryCode}/search`} className="flex max-w-xl items-center gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="q" className="sr-only">Search products</label>
            <div className="relative">
              <input
                id="q"
                type="search"
                name="q"
                placeholder="Search products, materials, styles..."
                defaultValue={query}
                maxLength={MAX_QUERY}
                className="h-11 w-full rounded-full border border-stone-300 bg-surface-container-lowest/80 pl-4 pr-10 text-sm outline-none transition-all focus:border-stone-500 focus:bg-background focus:ring-1 focus:ring-stone-400"
                data-testid="search-page-input"
              />
              <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" aria-hidden />
            </div>
          </div>
          <Button type="submit" size="default" className="rounded-full px-6">
            Search
          </Button>
        </form>
      </div>

      {!result ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          Search isn&apos;t available right now. Please try again in a moment.
        </p>
      ) : query && result.products.length === 0 ? (
        <p className="text-muted-foreground" data-testid="search-no-results">
          Nothing matches &ldquo;{query}&rdquo;. Check the spelling or try a broader word.
        </p>
      ) : (
        <>
          {query && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {result.count} {result.count === 1 ? "product" : "products"}
            </p>
          )}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:gap-x-6 xl:grid-cols-4" data-testid="search-results">
            {result.products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} headingLevel="h2" />
              </li>
            ))}
          </ul>
        </>
      )}
    </Container>
  )
}
