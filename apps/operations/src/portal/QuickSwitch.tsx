import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { MODULE_ROUTES } from "@/routes"
import { AREA_PAGES, type Destination } from "./destinations"
import { AREA_LABEL, usePortal } from "./session"

/**
 * Ctrl/Cmd+K: jump to any page the signed-in person's workspaces include.
 * Only their own areas are listed. The admin has its own palette with more
 * actions, so this one is mounted in the other areas only.
 */
export function QuickSwitch() {
  const { principal } = usePortal()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  useEffect(() => {
    if (open) {
      setQ("")
      setActive(0)
      setTimeout(() => input.current?.focus(), 0)
    }
  }, [open])

  const all = useMemo<Destination[]>(() => {
    if (!principal) return []
    return principal.areas.flatMap((a) =>
      a === "admin" ? (MODULE_ROUTES as { path: string; label: string }[]).map((m) => ({ to: `/admin/${m.path}`, label: m.label, area: "admin" as const })) : AREA_PAGES[a]
    )
  }, [principal])
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const results = all.filter((d) => words.every((w) => `${d.label} ${AREA_LABEL[d.area]} ${d.keywords ?? ""}`.toLowerCase().includes(w))).slice(0, 12)

  if (!open) return null
  const go = (d?: Destination) => {
    if (!d) return
    setOpen(false)
    navigate(d.to)
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Go to a page" className="w-full max-w-lg overflow-hidden rounded-xl border border-subtle bg-surface-container-lowest text-primary shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-2 border-b border-subtle px-4">
          <Search className="size-4 text-muted" aria-hidden />
          <span className="sr-only">Search pages</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((i) => Math.min(i + 1, results.length - 1))
              else if (e.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0))
              else if (e.key === "Enter") go(results[active])
            }}
            placeholder="Go to…"
            role="combobox"
            aria-expanded="true"
            aria-controls="quick-switch-results"
            aria-activedescendant={results[active] ? `qs-${active}` : undefined}
            className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-subtle px-1.5 text-[11px] text-muted">Esc</kbd>
        </label>
        <ul id="quick-switch-results" role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {results.length ? (
            results.map((d, i) => (
              <li
                key={d.to}
                id={`qs-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(d)}
                className="flex h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-body aria-selected:bg-accent-soft aria-selected:text-accent"
              >
                <span>{d.label}</span>
                <span className="text-meta text-muted">{AREA_LABEL[d.area]}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-6 text-center text-body text-muted">No page matches “{q}”.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
