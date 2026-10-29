import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon } from "lucide-react"
import Image, { StaticImageData } from "next/image"
import hoodieImage from "../../../../public/images/editorial/promo-hoodie.jpg"
import teeImage from "../../../../public/images/editorial/promo-tee.jpg"
import { Showcase } from "../data"

type Promo = { key: string; title: string; copy: string; image: StaticImageData; alt: string; match: RegExp }

const PROMOS: Promo[] = [
  {
    key: "sweats",
    title: "Hoodies & sweats",
    copy: "Heavyweight comfort for cold mornings.",
    image: hoodieImage,
    alt: "A man in a cream hoodie leaning on a brick wall",
    match: /sweat|hood/i,
  },
  {
    key: "tees",
    title: "The essential tee",
    copy: "Clean shapes that go with everything.",
    image: teeImage,
    alt: "A woman in a white t-shirt and black jeans outdoors",
    match: /shirt|tee/i,
  },
]

/** Two tall lifestyle banners linking to real categories. */
export function PromoSplit({ categories }: { categories: Showcase[] }) {
  const promos = PROMOS.flatMap((promo) => {
    const category = categories.find((c) => promo.match.test(c.title))
    return category ? [{ ...promo, href: category.href }] : []
  })
  if (promos.length === 0) return null

  return (
    <section aria-label="Featured categories" className="py-6">
      <Container className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {promos.map((promo) => (
          <LocalizedClientLink
            key={promo.key}
            href={promo.href}
            className="group relative isolate flex aspect-[4/5] items-end overflow-hidden bg-invert text-invert-foreground"
          >
            <Image
              src={promo.image}
              alt={promo.alt}
              fill
              placeholder="blur"
              sizes="(min-width: 640px) 50vw, 100vw"
              className="-z-10 object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="flex flex-col gap-3 p-6 lg:p-10">
              <h2 className="font-display-tight text-5xl lg:text-7xl">{promo.title}</h2>
              <p className="text-sm text-white/85">{promo.copy}</p>
              <span className="inline-flex w-fit items-center gap-2 border-b-2 border-accent pb-1 text-xs font-bold tracking-[0.12em] uppercase">
                Shop now <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </div>
          </LocalizedClientLink>
        ))}
      </Container>
    </section>
  )
}
