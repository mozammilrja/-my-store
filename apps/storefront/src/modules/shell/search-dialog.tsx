"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { searchProducts, type SearchHit } from "@lib/data/search"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SearchIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const DEBOUNCE_MS = 250
const MAX_QUERY_LENGTH = 100

type Status = "idle" | "loading" | "done" | "error"

function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [value, setValue] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [status, setStatus] = useState<Status>("idle")
  const [searched, setSearched] = useState("")
  const latest = useRef(0)

  useEffect(() => {
    const query = value.trim()
    if (!query) return
    const ticket = ++latest.current
    const timer = window.setTimeout(async () => {
      setStatus("loading")
      try {
        const result = await searchProducts(query, countryCode)
        // Ignore answers to older keystrokes.
        if (ticket !== latest.current) return
        setHits(result)
        setSearched(query)
        setStatus("done")
      } catch {
        if (ticket === latest.current) setStatus("error")
      }
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [value, countryCode])

  const trimmed = value.trim()
  const pending = trimmed !== searched || status === "loading"

  return (
    <div className="flex flex-col">
      <form role="search" action={`/${countryCode}/search`} className="flex items-center gap-3 border-b px-5">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          name="q"
          value={value}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(event) => setValue(event.target.value)}
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
            Search by product name or type, like &ldquo;hoodie&rdquo;.
          </p>
        ) : status === "error" ? (
          <p className="px-5 py-8 text-sm text-destructive-foreground" data-testid="search-error">
            Search isn&apos;t available right now. Please try again.
          </p>
        ) : pending ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" data-testid="search-loading">
            Searching&hellip;
          </p>
        ) : hits.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" data-testid="search-no-results">
            Nothing matches &ldquo;{searched}&rdquo;. Try a broader term.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4" data-testid="search-results">
            {hits.map((hit) => (
              <li key={hit.id}>
                <LocalizedClientLink
                  href={`/products/${hit.handle}`}
                  onClick={onNavigate}
                  className="group flex flex-col gap-2"
                  data-testid="search-hit-link"
                >
                  <span className="relative block aspect-[4/5] overflow-hidden bg-surface">
                    {hit.thumbnail && (
                      <Image
                        src={hit.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 160px, 45vw"
                        className="scale-[1.12] object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.18]"
                      />
                    )}
                  </span>
                  <span className="line-clamp-2 text-sm font-semibold">{hit.title}</span>
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
          {open && <SearchPanel onNavigate={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
