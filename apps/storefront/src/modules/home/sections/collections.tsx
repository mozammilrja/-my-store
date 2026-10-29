import { Container } from "@/components/store/container"
import { cn } from "@/lib/utils"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { Showcase } from "../data"

/** Collections as staggered editorial tiles. */
export function Collections({ collections }: { collections: Showcase[] }) {
  if (collections.length === 0) return null

  return (
    <section aria-labelledby="collections-title" className="py-20 lg:py-28">
      <Container className="flex flex-col gap-10">
        <div className="grid gap-4 lg:grid-cols-12">
          <h2 id="collections-title" className="font-display text-4xl tracking-tight sm:text-5xl lg:col-span-6">
            Collections
          </h2>
          <p className="max-w-md text-sm text-muted-foreground lg:col-span-6 lg:justify-self-end">
            Edits for the season and for every day, grouped so the pieces work
            together.
          </p>
        </div>
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2">
          {collections.map((collection, index) => (
            <li key={collection.id} className={cn(index % 2 === 1 && "sm:mt-24")}>
              <LocalizedClientLink href={collection.href} className="group flex flex-col gap-4">
                <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                  {collection.image && (
                    <Image
                      src={collection.image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02] motion-reduce:transition-none"
                    />
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl tracking-tight group-hover:text-primary">
                    {collection.title}
                  </h3>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {collection.count} {collection.count === 1 ? "piece" : "pieces"}
                  </span>
                </div>
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
