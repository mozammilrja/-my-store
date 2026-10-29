import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { Showcase } from "../data"

/** A volt band that pushes one collection, with the others as links. */
export function CollectionBand({ collections }: { collections: Showcase[] }) {
  const [featured, ...others] = collections
  if (!featured) return null

  return (
    <section aria-labelledby="collection-band-title" className="bg-accent text-accent-foreground">
      <Container className="grid items-center gap-10 py-14 lg:grid-cols-12 lg:py-20">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <span className="text-xs font-bold tracking-[0.14em] uppercase">Collection</span>
          <h2 id="collection-band-title" className="font-display-tight text-[clamp(3.5rem,9vw,8rem)]">
            {featured.title}
          </h2>
          <p className="text-sm font-medium">{featured.count} pieces in this edit.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <LocalizedClientLink href={featured.href}>Shop the collection</LocalizedClientLink>
            </Button>
          </div>
          {others.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-black/15 pt-6 text-xs font-bold tracking-[0.1em] uppercase">
              {others.map((c) => (
                <li key={c.id}>
                  <LocalizedClientLink href={c.href} className="underline-offset-4 hover:underline">
                    {c.title} ({c.count})
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        {featured.image && (
          <LocalizedClientLink href={featured.href} className="relative aspect-square overflow-hidden bg-surface lg:col-span-5" tabIndex={-1} aria-hidden>
            <Image src={featured.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </LocalizedClientLink>
        )}
      </Container>
    </section>
  )
}
