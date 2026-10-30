"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getSearchSuggestions,
  type SearchHit,
  type SearchSuggestion,
} from "@lib/data/search"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  SearchIcon,
  TagIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const DEBOUNCE_MS = 200
const MAX_QUERY_LENGTH = 100
const RECENT_SEARCHES_KEY = "everwear_recent_searches"
const MAX_RECENT = 5

const TRENDING_SEARCHES = [
  "Linen Shirt",
  "Pleated Trousers",
  "Heavyweight Polo",
  "Silk Kurta",
  "Structured Blazer",
  "Wool Overcoat",
]

type Status = "idle" | "loading" | "done" | "error"

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escaped})`, "gi"))

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <strong key={i} className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2">
            {part}
          </strong>
        ) : (
          <span key={i} className="text-muted-foreground">
            {part}
          </span>
        )
      )}
    </span>
  )
}

function SearchPanel({
  onNavigate,
  initialScope = "all",
}: {
  onNavigate: () => void
  initialScope?: string
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const router = useRouter()
  const [value, setValue] = useState("")
  const [scope, setScope] = useState(initialScope)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [hits, setHits] = useState<SearchHit[]>([])
  const [status, setStatus] = useState<Status>("idle")
  const [searched, setSearched] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENT)
      }
    } catch {}
    return []
  })
  const latest = useRef(0)

  const handleValueChange = (newVal: string) => {
    setValue(newVal)
    if (!newVal.trim()) {
      setSuggestions([])
      setHits([])
      setStatus("idle")
    }
  }

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim()
    if (!clean) return
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== clean.toLowerCase())
      const updated = [clean, ...filtered].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const removeRecentSearch = useCallback((term: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== term)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const clearAllRecent = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {}
  }, [])

  const handleSelectQuery = (term: string) => {
    saveRecentSearch(term)
    onNavigate()
    const scopeParam = scope && scope !== "all" ? `&category=${scope}` : ""
    router.push(`/${countryCode}/search?q=${encodeURIComponent(term)}${scopeParam}`)
  }

  const handleSelectCategory = (categoryHandle: string, term: string) => {
    saveRecentSearch(term)
    onNavigate()
    router.push(`/${countryCode}/categories/${categoryHandle}`)
  }

  useEffect(() => {
    const query = value.trim()
    if (!query) return
    const ticket = ++latest.current
    const timer = window.setTimeout(async () => {
      setStatus("loading")
      try {
        const result = await getSearchSuggestions(query, countryCode, scope)
        if (ticket !== latest.current) return
        setSuggestions(result.suggestions)
        setHits(result.products)
        setSearched(query)
        setStatus("done")
      } catch {
        if (ticket === latest.current) setStatus("error")
      }
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [value, countryCode, scope])

  const trimmed = value.trim()
  const pending = trimmed !== searched || status === "loading"

  return (
    <div className="flex flex-col bg-card rounded-xl overflow-hidden border border-border shadow-2xl">
      {/* Top Search Input */}
      <form
        role="search"
        action={`/${countryCode}/search`}
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) handleSelectQuery(trimmed)
        }}
        className="flex items-center gap-3 border-b px-5 bg-surface-container-low/60"
      >
        <SearchIcon className="size-5 text-muted-foreground shrink-0" aria-hidden />
        <input
          type="search"
          name="q"
          value={value}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(event) => handleValueChange(event.target.value)}
          placeholder="Search linen shirts, silk kurtas, tailored blazers..."
          aria-label="Search products"
          autoFocus
          autoComplete="off"
          className="h-14 w-full bg-transparent text-sm sm:text-base outline-none placeholder:text-muted-foreground font-body-md"
          data-testid="search-input"
        />
        {value && (
          <button
            type="button"
            onClick={() => handleValueChange("")}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-container transition-colors"
            aria-label="Clear search"
          >
            <XIcon className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onNavigate}
          className="px-2 py-1 rounded-md hover:bg-surface-container text-muted-foreground hover:text-foreground text-xs uppercase font-label-caps border border-border/40"
        >
          Esc
        </button>
      </form>

      {/* Department Scope Pills */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-container-low/40 border-b overflow-x-auto no-scrollbar">
        <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-wider mr-2 shrink-0">
          Scope:
        </span>
        {[
          { id: "all", label: "All Departments" },
          { id: "men", label: "Men" },
          { id: "women", label: "Women" },
          { id: "outerwear", label: "Outerwear" },
          { id: "tailoring", label: "Tailoring" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setScope(item.id)}
            className={`px-3 py-1 rounded-full text-xs font-label-sm transition-all shrink-0 ${
              scope === item.id
                ? "bg-primary text-primary-foreground font-medium shadow-xs"
                : "bg-surface-container-lowest text-foreground hover:bg-surface-container border border-border/50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="max-h-[65vh] min-h-48 overflow-y-auto" aria-live="polite">
        {!trimmed ? (
          /* Zero-Query / Empty State (Myntra-style recent searches + trending) */
          <div className="p-6 flex flex-col gap-6" data-testid="search-empty">
            {recentSearches.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[11px] text-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <ClockIcon className="size-3.5 text-muted-foreground" />
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={clearAllRecent}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => handleSelectQuery(term)}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-foreground text-xs cursor-pointer border border-border/50 transition-colors"
                    >
                      <ClockIcon className="size-3 text-muted-foreground group-hover:text-foreground" />
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(term, e)}
                        className="p-0.5 rounded-full hover:bg-surface-container-high text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${term}`}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <span className="font-label-caps text-[11px] text-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <TrendingUpIcon className="size-3.5 text-primary" />
                Trending Now
              </span>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSelectQuery(suggestion)}
                    className="px-3.5 py-1.5 rounded-full bg-surface-container-lowest hover:bg-surface-container-low text-foreground text-xs font-body-sm border border-border/60 hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : status === "error" ? (
          <p className="px-6 py-10 text-sm text-destructive-foreground text-center" data-testid="search-error">
            Search suggestions aren&apos;t available right now. Press Enter to view full catalog results.
          </p>
        ) : pending && hits.length === 0 && suggestions.length === 0 ? (
          <div className="px-6 py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground" data-testid="search-loading">
            <SearchIcon className="size-5 animate-pulse text-primary" />
            <p className="text-sm">Searching curated catalog&hellip;</p>
          </div>
        ) : suggestions.length === 0 && hits.length === 0 ? (
          <div className="p-8 flex flex-col items-center text-center gap-3" data-testid="search-no-results">
            <p className="text-sm text-muted-foreground">
              Nothing matches &ldquo;{searched}&rdquo;. Try a broader term like &ldquo;shirt&rdquo; or &ldquo;jacket&rdquo;.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSelectQuery(searched)}
              className="mt-2 text-xs"
            >
              Search all products for &ldquo;{searched}&rdquo;
            </Button>
          </div>
        ) : (
          /* Dual Column Layout: Left Suggestions / Right Top Products */
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left Column: Query & Category Suggestions */}
            <div className="md:col-span-5 p-3 flex flex-col gap-1">
              <span className="px-3 py-1 text-[10px] uppercase font-label-caps tracking-wider text-muted-foreground font-semibold">
                Suggestions
              </span>
              <ul className="flex flex-col gap-0.5">
                {suggestions.map((s, idx) => (
                  <li key={`${s.type}-${s.text}-${idx}`}>
                    {s.type === "category" && s.categoryHandle ? (
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(s.categoryHandle!, s.text)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-container text-left text-sm transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <TagIcon className="size-3.5 text-secondary shrink-0" />
                          <span className="truncate">
                            {highlightMatch(s.text, trimmed)}
                            <span className="text-[11px] text-muted-foreground ml-1.5 font-normal">
                              in Category
                            </span>
                          </span>
                        </div>
                        <ArrowRightIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectQuery(s.text)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-container text-left text-sm transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{highlightMatch(s.text, trimmed)}</span>
                        </div>
                        <ArrowRightIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => handleSelectQuery(trimmed)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-primary hover:bg-surface-container rounded-md transition-colors"
                >
                  <span>View all results for &ldquo;{trimmed}&rdquo;</span>
                  <ArrowRightIcon className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: Visual Product Previews */}
            <div className="md:col-span-7 p-4 bg-surface-container-lowest/50 flex flex-col gap-3">
              <span className="text-[10px] uppercase font-label-caps tracking-wider text-muted-foreground font-semibold">
                Matching Pieces ({hits.length})
              </span>
              <div className="grid grid-cols-2 gap-3" data-testid="search-results">
                {hits.map((hit) => (
                  <LocalizedClientLink
                    key={hit.id}
                    href={`/products/${hit.handle}`}
                    onClick={() => {
                      saveRecentSearch(hit.title)
                      onNavigate()
                    }}
                    className="group flex flex-col gap-2 p-2 rounded-lg bg-surface-container-low/50 hover:bg-surface-container transition-all border border-border/30 hover:border-border"
                    data-testid="search-hit-link"
                  >
                    <span className="relative block aspect-[3/4] overflow-hidden rounded bg-surface-container">
                      {hit.thumbnail ? (
                        <Image
                          src={hit.thumbnail}
                          alt={hit.title}
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
                      {hit.price != null && hit.currency && (
                        <span className="text-xs font-semibold text-foreground">
                          {formatMoney(hit.price, hit.currency)}
                        </span>
                      )}
                    </div>
                  </LocalizedClientLink>
                ))}
              </div>
            </div>
          </div>
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
