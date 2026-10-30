import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Showcase } from "../data"

/** Stitch Category Filter Chips: 32px height, 4px radius, subtle hairline border. */
export function CategoryChips({ categories }: { categories: Showcase[] }) {
  if (categories.length === 0) return null

  return (
    <nav aria-label="Quick category navigation" className="border-b border-border/60 bg-surface-container-low/40">
      <Container className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3">
        <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-widest mr-2 shrink-0">
          Fast Navigation:
        </span>
        {[{ id: "all", title: "All Collections", href: "/store" }, ...categories].map((c) => (
          <LocalizedClientLink
            key={c.id}
            href={c.href}
            className="shrink-0 rounded-md bg-surface-container-lowest border border-border px-3.5 py-1.5 font-label-sm text-xs font-medium text-foreground transition-all hover:border-foreground hover:bg-foreground hover:text-white shadow-2xs"
          >
            {c.title}
          </LocalizedClientLink>
        ))}
      </Container>
    </nav>
  )
}
