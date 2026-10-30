import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** Clean, high-fashion editorial category header matching Myntra / modern luxury e-commerce. */
export function CatalogHeader({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow?: string
  title: string
  description?: string | null
  count?: number
}) {
  return (
    <section className="pt-4 pb-3 border-b border-border/60 bg-surface-container-low/40">
      <Container className="flex flex-col gap-2">
        {/* Minimal Breadcrumb Line */}
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center gap-1.5 font-label-caps text-[11px] tracking-wider uppercase text-muted-foreground"
        >
          <LocalizedClientLink href="/" className="hover:text-foreground transition-colors">
            Home
          </LocalizedClientLink>
          <span className="opacity-40">/</span>
          <LocalizedClientLink href="/store" className="hover:text-foreground transition-colors">
            Catalog
          </LocalizedClientLink>
          <span className="opacity-40">/</span>
          <span className="text-foreground font-semibold">{title}</span>
        </nav>

        {/* Compact Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1">
          <div className="flex items-baseline gap-2.5">
            <h1
              className="font-display-hero text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight text-foreground"
              data-testid="store-page-title"
            >
              {title}
            </h1>
            {count !== undefined && (
              <span className="text-muted-foreground font-body-sm text-xs sm:text-sm">
                ({count} {count === 1 ? "item" : "items"})
              </span>
            )}
          </div>
          {eyebrow && (
            <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-wider">
              {eyebrow} · Collection 2025
            </span>
          )}
        </div>

        {description && (
          <p className="font-body-sm text-xs text-muted-foreground max-w-2xl leading-relaxed -mt-1 pb-1">
            {description}
          </p>
        )}
      </Container>
    </section>
  )
}
