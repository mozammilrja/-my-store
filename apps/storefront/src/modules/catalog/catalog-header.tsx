import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckCircle2Icon, RulerIcon, TruckIcon } from "lucide-react"

/** Stitch Editorial Category Hero Banner with trust badges and breadcrumbs. */
export function CatalogHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string | null
}) {
  return (
    <section className="pt-6 pb-6">
      <Container className="flex flex-col gap-4">
        {/* Breadcrumb line */}
        <div className="flex items-center gap-2 font-label-caps text-[10px] sm:text-[11px] tracking-wider uppercase text-muted-foreground">
          <LocalizedClientLink href="/" className="hover:text-foreground transition-colors">
            Home
          </LocalizedClientLink>
          <span>/</span>
          <LocalizedClientLink href="/store" className="hover:text-foreground transition-colors">
            Catalog
          </LocalizedClientLink>
          <span>/</span>
          <span className="text-foreground font-semibold">{title}</span>
        </div>

        {/* Editorial Hero Box */}
        <div className="relative bg-surface-container-low/70 border border-border/60 rounded-2xl p-6 sm:p-10 md:p-12 overflow-hidden shadow-2xs">
          <div className="absolute -right-16 -top-24 size-80 rounded-full bg-gradient-to-br from-secondary/15 via-secondary-container/20 to-transparent pointer-events-none blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-[10px] text-secondary uppercase tracking-[0.14em] font-bold">
                {eyebrow || "Curated Edition · Certified Quality"}
              </span>
              <span className="h-px w-6 bg-secondary/40" />
              <span className="font-label-caps text-[10px] text-muted-foreground uppercase">
                Spring/Summer &apos;25
              </span>
            </div>

            <h1
              className="font-display-hero text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight font-light leading-[1.1]"
              data-testid="store-page-title"
            >
              {title}
            </h1>

            <p className="font-body-lg text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
              {description ||
                "Ethically crafted foundational apparel and accessories engineered for effortless versatility and quiet confidence."}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-border/50 shadow-2xs text-foreground">
                <CheckCircle2Icon className="size-4 text-secondary" />
                <span className="font-label-sm text-xs font-semibold">100% Combed Cotton</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-border/50 shadow-2xs text-foreground">
                <RulerIcon className="size-4 text-secondary" />
                <span className="font-label-sm text-xs font-semibold">Calibrated Tailoring</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-border/50 shadow-2xs text-foreground">
                <TruckIcon className="size-4 text-secondary" />
                <span className="font-label-sm text-xs font-semibold">Same-Day Dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
