"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import useSearchSettled from "@lib/hooks/use-search-settled"
import { PRODUCT_INDEX_NAME, searchClient } from "@lib/search-client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { Hit, SearchClient } from "instantsearch.js"
import { SearchIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch"

type ProductHit = Hit<{
  title: string | null
  handle: string | null
  thumbnail: string | null
}>

const HITS_PER_PAGE = 8
const DEBOUNCE_MS = 250
const MAX_QUERY_LENGTH = 100

function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const timer = useRef<number | undefined>(undefined)
  const queryHook = useCallback((next: string, search: (value: string) => void) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => search(next), DEBOUNCE_MS)
  }, [])

  const { query, refine } = useSearchBox({ queryHook })
  const { items } = useHits<ProductHit>()
  const { status } = useInstantSearch()
  const { isSettled } = useSearchSettled()
  const [value, setValue] = useState(query)
  const { countryCode } = useParams<{ countryCode: string }>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const trimmed = value.trim()
  const pending = trimmed !== query.trim() || !isSettled
  const results = items.filter((hit) => hit.handle)

  return (
    <div className="flex flex-col">
      <form
        role="search"
        action={`/${countryCode}/search`}
        className="flex items-center gap-3 border-b px-5"
      >
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          name="q"
          value={value}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(event) => {
            setValue(event.target.value)
            refine(event.target.value)
          }}
          placeholder="Search products"
          aria-label="Search products"
          autoFocus
          autoComplete="off"
          className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          data-testid="search-input"
        />
      </form>

      <div className="max-h-[60vh] min-h-32 overflow-y-auto" aria-live="polite">
        {!trimmed ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" data-testid="search-empty">
            Search by product name, category or size.
          </p>
        ) : status === "error" ? (
          <p className="px-5 py-8 text-sm text-destructive-foreground" data-testid="search-error">
            Search isn&apos;t available right now. Please try again.
          </p>
        ) : pending ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" data-testid="search-loading">
            Searching&hellip;
          </p>
        ) : results.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" data-testid="search-no-results">
            Nothing matches &ldquo;{query}&rdquo;. Try a broader term.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4" data-testid="search-results">
            {results.map((hit) => (
              <li key={hit.objectID}>
                <LocalizedClientLink
                  href={`/products/${hit.handle}`}
                  onClick={onNavigate}
                  className="group flex flex-col gap-2"
                  data-testid="search-hit-link"
                >
                  <span className="relative block aspect-[4/5] overflow-hidden bg-muted">
                    {hit.thumbnail && (
                      <Image
                        src={hit.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 160px, 45vw"
                        className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                      />
                    )}
                  </span>
                  <span className="line-clamp-2 text-sm">{hit.title}</span>
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Search entry point: a real link to /search, upgraded to an instant-search dialog. */
export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const { countryCode } = useParams<{ countryCode: string }>()

  return (
    <>
      <Button variant="ghost" size="icon-sm" asChild>
        <Link
          href={`/${countryCode}/search`}
          onClick={(event) => {
            event.preventDefault()
            setOpen(true)
          }}
          aria-label="Search products"
          data-testid="nav-search-button"
        >
          <SearchIcon aria-hidden />
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12vh] translate-y-0 gap-0 p-0 sm:max-w-3xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search products</DialogTitle>
          <DialogDescription className="sr-only">
            Results update as you type. Press Enter to see all results.
          </DialogDescription>
          {open && (
            <InstantSearch
              indexName={PRODUCT_INDEX_NAME}
              searchClient={searchClient as unknown as SearchClient}
              future={{ preserveSharedStateOnUnmount: true }}
            >
              <Configure hitsPerPage={HITS_PER_PAGE} />
              <SearchPanel onNavigate={() => setOpen(false)} />
            </InstantSearch>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
