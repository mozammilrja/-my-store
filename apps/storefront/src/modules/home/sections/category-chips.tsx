import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Showcase } from "../data"

/** Quick category shortcuts under the hero; scrolls sideways on small screens. */
export function CategoryChips({ categories }: { categories: Showcase[] }) {
  if (categories.length === 0) return null

  return (
    <nav aria-label="Shop by category" className="border-b">
      <Container className="no-scrollbar flex gap-2 overflow-x-auto py-4">
        {[{ id: "all", title: "Shop all", href: "/store" }, ...categories].map((c) => (
          <LocalizedClientLink
            key={c.id}
            href={c.href}
            className="shrink-0 rounded-full border border-border px-5 py-2.5 text-xs font-bold tracking-[0.1em] uppercase transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          >
            {c.title}
          </LocalizedClientLink>
        ))}
      </Container>
    </nav>
  )
}
