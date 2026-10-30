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
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const DEBOUNCE_MS = 250
const MAX_QUERY_LENGTH = 100

type Status = "idle" | "loading" | "done" | "error"

function SearchPanel({
  onNavigate,
  initialScope = "all",
}: {
  onNavigate: () => void
  initialScope?: string
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [value, setValue] = useState("")
  const [scope, setScope] = useState(initialScope)
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
    <div className="flex flex-col bg-card rounded-lg overflow-hidden border border-border">
      {/* Top search input with scope */}
      <form role="search" action={`/${countryCode}/search`} className="flex items-center gap-3 border-b px-5 bg-surface-container-low/50">
        <SearchIcon className="size-5 text-muted-foreground shrink-0" aria-hidden />
        <input
          type="search"
          name="q"
          value={value}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search linen shirts, leather totes, structured blazers..."
          aria-label="Search products"
          autoFocus
          autoComplete="off"
          className="h-14 w-full bg-transparent text-sm sm:text-base outline-none placeholder:text-muted-foreground font-body-md"
          data-testid="search-input"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onNavigate}
          className="p-1.5 rounded-md hover:bg-surface-container text-muted-foreground hover:text-foreground text-xs uppercase font-label-caps"
        >
          Esc
        </button>
      </form>

      {/* Department scope tabs */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-container-low border-b overflow-x-auto no-scrollbar">
        <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-wider mr-2 shrink-0">
          Scope:
        </span>
        {[
          { id: "all", label: "All Departments" },
          { id: "men", label: "Men" },
          { id: "women", label: "Women" },
          { id: "beauty", label: "Beauty & Formulations" },
          { id: "tailoring", label: "Tailoring" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setScope(item.id)}
            className={`px-2.5 py-1 rounded text-xs font-label-sm transition-colors shrink-0 ${
              scope === item.id
                ? "bg-primary text-primary-foreground font-medium shadow-xs"
                : "bg-surface-container-lowest text-foreground hover:bg-surface-container"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] min-h-36 overflow-y-auto" aria-live="polite">
        {!trimmed ? (
          <div className="p-6 flex flex-col gap-4 text-sm text-muted-foreground" data-testid="search-empty">
            <p className="font-body-sm text-muted-foreground">
              Type to search items, fabrics, or collections across Europe & India.
            </p>
            <div className="flex flex-col gap-2">
              <span className="font-label-caps text-[11px] text-foreground uppercase tracking-wider font-semibold">
                Suggested Searches
              </span>
              <div className="flex flex-wrap gap-2">
                {["Linen Shirt", "Pleated Trousers", "Heavyweight Polo", "Ceramide Cream", "Silk Kurta"].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setValue(suggestion)}
                      className="px-3 py-1 rounded-md bg-surface-container-low text-foreground hover:bg-surface-container text-xs font-body-sm border border-border/40"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : status === "error" ? (
          <p className="px-5 py-8 text-sm text-destructive-foreground" data-testid="search-error">
            Search isn&apos;t available right now. Please try again.
          </p>
        ) : pending ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" data-testid="search-loading">
            Searching curated catalog&hellip;
          </p>
        ) : hits.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" data-testid="search-no-results">
            Nothing matches &ldquo;{searched}&rdquo;. Try a broader term like &ldquo;shirt&rdquo; or &ldquo;pants&rdquo;.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4" data-testid="search-results">
            {hits.map((hit) => (
              <li key={hit.id}>
                <LocalizedClientLink
                  href={`/products/${hit.handle}`}
                  onClick={onNavigate}
                  className="group flex flex-col gap-2 p-2 rounded-lg hover:bg-surface-container-low transition-colors"
                  data-testid="search-hit-link"
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded bg-surface-container-low">
                    {hit.thumbnail ? (
                      <Image
                        src={hit.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 160px, 45vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </span>
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label-caps text-[9px] text-secondary uppercase tracking-wider font-semibold">
                      Everwear
                    </span>
                    <span className="font-headline-sm text-xs font-medium text-foreground line-clamp-1 group-hover:underline">
                      {hit.title}
                    </span>
                    <span className="text-[11px] font-label-sm text-muted-foreground">
                      Explore Piece &rarr;
                    </span>
                  </div>
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Search entry point: supports both desktop omni-search input and compact button. */
export function SearchDialog({ desktopBar = false }: { desktopBar?: boolean }) {
  const [open, setOpen] = useState(false)
  const { countryCode } = useParams<{ countryCode: string }>()

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      {desktopBar ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className="w-full flex items-center bg-surface-container-low hover:bg-surface-container rounded-lg p-1 transition-all cursor-pointer border border-border/50 shadow-xs"
        >
          <div className="relative shrink-0">
            <select
              aria-label="Department Scope"
              onClick={(e) => e.stopPropagation()}
              className="appearance-none bg-transparent font-label-sm text-xs text-foreground pl-3 pr-6 py-1.5 cursor-pointer focus:outline-none"
            >
              <option value="all">All Departments</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
              <option value="beauty">Beauty</option>
            </select>
            <ChevronDownIcon className="size-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
          <div className="h-4 w-px bg-border mx-1 shrink-0" />
          <div className="relative flex-1 flex items-center px-2">
            <SearchIcon className="size-4 text-muted-foreground mr-2 shrink-0" />
            <span className="w-full font-body-sm text-xs sm:text-sm text-muted-foreground truncate select-none">
              Search linen shirts, leather totes, structured blazers...
            </span>
            <div className="hidden lg:flex items-center gap-1 bg-surface-container-high px-1.5 py-0.5 rounded text-muted-foreground font-label-caps text-[10px] uppercase select-none shrink-0 ml-1">
              <kbd className="font-sans">Ctrl</kbd>
              <span className="text-[8px]">+</span>
              <kbd className="font-sans">K</kbd>
            </div>
          </div>
        </div>
      ) : (
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
            <SearchIcon aria-hidden className="size-4" />
          </Link>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[10vh] translate-y-0 gap-0 p-0 sm:max-w-3xl border-0 bg-transparent shadow-2xl" showCloseButton={false}>
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
