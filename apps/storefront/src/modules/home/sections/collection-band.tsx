import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { ArrowRightIcon } from "lucide-react"
import { Showcase } from "../data"

/** Stitch Editorial Collection Spotlight: warm ivory or sleek charcoal canvas with architectural layout. */
export function CollectionBand({ collections }: { collections: Showcase[] }) {
  const [featured, ...others] = collections
  if (!featured) return null

  return (
    <section aria-labelledby="collection-band-title" className="py-12 sm:py-16">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low border border-border/60 p-6 sm:p-10 lg:p-16">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="flex flex-col gap-5 lg:col-span-7">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-secondary" />
                <span className="font-label-caps text-[10px] sm:text-[11px] font-bold tracking-[0.14em] text-secondary uppercase">
                  Curated Collection
                </span>
              </div>
              <h2 id="collection-band-title" className="font-headline-xl text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground leading-tight">
                {featured.title}
              </h2>
              <p className="font-body-md text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
                Discover {featured.count} crafted pieces designed with intentional proportion, natural fibers, and timeless silhouettes.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button asChild size="lg" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-label-md tracking-wider uppercase font-semibold">
                  <LocalizedClientLink href={featured.href} className="flex items-center gap-2">
                    Shop The Edit
                    <ArrowRightIcon className="size-4" aria-hidden />
                  </LocalizedClientLink>
                </Button>
              </div>
              {others.length > 0 && (
                <div className="border-t border-border/60 pt-6 mt-2">
                  <span className="font-label-caps text-[10px] uppercase tracking-wider text-muted-foreground block mb-2 font-bold">
                    More Curated Edits:
                  </span>
                  <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-label-sm">
                    {others.map((c) => (
                      <li key={c.id}>
                        <LocalizedClientLink href={c.href} className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                          {c.title} <span className="text-[10px] opacity-70">({c.count})</span>
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {featured.image && (
              <LocalizedClientLink
                href={featured.href}
                className="relative aspect-[4/3] sm:aspect-square overflow-hidden rounded-xl bg-surface-container-lowest border border-border/40 shadow-xs lg:col-span-5 group"
                tabIndex={-1}
                aria-hidden
              >
                <Image
                  src={featured.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </LocalizedClientLink>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
