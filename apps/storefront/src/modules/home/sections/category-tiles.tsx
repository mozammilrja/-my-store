import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image, { StaticImageData } from "next/image"
import merch from "../../../../public/images/editorial/cat-merch.jpg"
import pants from "../../../../public/images/editorial/cat-pants.jpg"
import shirts from "../../../../public/images/editorial/cat-shirts.jpg"
import sweatshirts from "../../../../public/images/editorial/cat-sweatshirts.jpg"
import { Showcase } from "../data"

/** Lifestyle photos for known category handles; others use their newest product image. */
const PHOTOS: Record<string, StaticImageData> = { shirts, sweatshirts, pants, merch }

export function CategoryTiles({ categories }: { categories: Showcase[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="categories-title" className="py-14 lg:py-20">
      <Container className="flex flex-col gap-8">
        <h2 id="categories-title" className="font-display-tight text-5xl sm:text-6xl">
          Shop by category
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((category) => {
            const photo = PHOTOS[category.href.split("/").pop() ?? ""]
            return (
              <li key={category.id}>
                <LocalizedClientLink href={category.href} className="group relative isolate flex aspect-[3/4] items-end overflow-hidden bg-invert">
                  {photo ? (
                    <Image src={photo} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 25vw, 50vw" className="-z-10 object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none" />
                  ) : category.image ? (
                    <Image src={category.image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="-z-10 object-contain p-[10%] mix-blend-multiply" />
                  ) : null}
                  <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="flex w-full items-end justify-between gap-2 p-4 text-white lg:p-5">
                    <span className="font-display-tight text-3xl lg:text-4xl">{category.title}</span>
                    <span className="text-xs font-semibold tabular-nums text-white/85">{category.count}</span>
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
