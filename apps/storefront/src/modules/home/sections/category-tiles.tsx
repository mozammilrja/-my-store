import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image, { StaticImageData } from "next/image"
import accessories from "../../../../public/images/editorial/cat-accessories.jpg"
import footwear from "../../../../public/images/editorial/cat-footwear.jpg"
import kurta from "../../../../public/images/editorial/cat-kurta.jpg"
import merch from "../../../../public/images/editorial/cat-merch.jpg"
import pants from "../../../../public/images/editorial/cat-pants.jpg"
import shirts from "../../../../public/images/editorial/cat-shirts.jpg"
import sweatshirts from "../../../../public/images/editorial/cat-sweatshirts.jpg"
import { Showcase } from "../data"

const PHOTOS: Record<string, StaticImageData> = {
  shirts,
  sweatshirts,
  pants,
  merch,
  kurta,
  footwear,
  accessories,
}

const PRICE_HINTS: Record<string, string> = {
  shirts: "From ₹1,299",
  sweatshirts: "From ₹799",
  pants: "From ₹1,899",
  merch: "From ₹499",
}

/**
 * Stitch Visual Subcategory Discovery Matrix:
 * 3:4 portrait crops, style count badges, curated titles, and subtle zoom.
 */
export function CategoryTiles({ categories }: { categories: Showcase[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="categories-title" className="py-12 sm:py-16">
      <Container className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="size-2 rounded-full bg-secondary" />
              <span className="font-label-caps text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Department Taxonomy
              </span>
            </div>
            <h2 id="categories-title" className="font-headline-xl text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-foreground">
              Shop by category
            </h2>
          </div>
          <p className="font-body-sm text-xs sm:text-sm text-muted-foreground max-w-md">
            Select a design capsule to inspect curated silhouetted patterns, textile weights, and daily coordinates.
          </p>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => {
            const handle = category.href.split("/").pop() ?? ""
            const photo = PHOTOS[handle]
            const priceHint = PRICE_HINTS[handle] || "Curated Capsule"

            return (
              <li key={category.id}>
                <LocalizedClientLink
                  href={category.href}
                  className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 border border-border/50 h-full"
                >
                  <div className="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden">
                    {photo ? (
                      <Image
                        src={photo}
                        alt=""
                        fill
                        placeholder="blur"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : category.image ? (
                      <Image
                        src={category.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-label-caps text-xs text-muted-foreground">
                        Everwear Capsule
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 bg-surface-container-lowest/90 backdrop-blur-xs px-2 py-0.5 rounded font-label-caps text-[9px] uppercase font-semibold text-foreground shadow-2xs">
                      {category.count} {category.count === 1 ? "Style" : "Styles"}
                    </span>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-1">
                    <span className="font-label-md text-sm sm:text-base font-semibold text-foreground group-hover:text-secondary transition-colors">
                      {category.title}
                    </span>
                    <span className="font-body-sm text-xs text-muted-foreground">
                      {priceHint}
                    </span>
                  </div>
                </LocalizedClientLink>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
