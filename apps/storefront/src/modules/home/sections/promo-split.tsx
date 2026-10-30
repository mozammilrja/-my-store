import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon } from "lucide-react"
import Image, { StaticImageData } from "next/image"
import lookbookCapsule from "../../../../public/images/editorial/lookbook-capsule.jpg"
import hoodieImage from "../../../../public/images/editorial/promo-hoodie.jpg"
import { Showcase } from "../data"

type Promo = {
  key: string
  eyebrow: string
  title: string
  copy: string
  image: StaticImageData
  alt: string
  cta: string
  match: RegExp
  fallbackHref: string
}

const PROMOS: Promo[] = [
  {
    key: "lookbook",
    eyebrow: "Curated Lookbook",
    title: "The Minimalist Wardrobe",
    copy: "24 foundational garments engineered for effortless versatility and quiet luxury.",
    image: lookbookCapsule,
    alt: "Everwear minimalist lookbook collection",
    cta: "Explore Capsule",
    match: /shirt|tailor/i,
    fallbackHref: "/categories/shirts",
  },
  {
    key: "sweats",
    eyebrow: "Atelier Comfort",
    title: "Heavyweight Knits & Sweats",
    copy: "Crafted from 350 GSM pre-shrunk combed organic cotton.",
    image: hoodieImage,
    alt: "A model in heavy cream knitwear",
    cta: "Shop Essentials",
    match: /sweat|hood|tee/i,
    fallbackHref: "/categories/sweatshirts",
  },
]

/** Two tall editorial banners linking to curated collections. */
export function PromoSplit({ categories }: { categories: Showcase[] }) {
  return (
    <section aria-label="Featured editorial capsules" className="py-8 sm:py-12">
      <Container className="grid gap-4 sm:grid-cols-2">
        {PROMOS.map((promo) => {
          const category = categories.find((c) => promo.match.test(c.title))
          const href = category?.href ?? promo.fallbackHref

          return (
            <LocalizedClientLink
              key={promo.key}
              href={href}
              className="group relative isolate flex aspect-[4/5] items-end overflow-hidden rounded-2xl bg-surface-container-high text-white shadow-xs hover:shadow-md transition-shadow"
            >
              <Image
                src={promo.image}
                alt={promo.alt}
                fill
                placeholder="blur"
                sizes="(min-width: 640px) 50vw, 100vw"
                className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
              />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="flex flex-col gap-2.5 p-6 sm:p-8 lg:p-10">
                <span className="font-label-caps text-[10px] sm:text-[11px] uppercase tracking-widest text-secondary-fixed font-bold">
                  {promo.eyebrow}
                </span>
                <h3 className="font-headline-xl text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white leading-tight">
                  {promo.title}
                </h3>
                <p className="font-body-sm text-xs sm:text-sm text-white/80 max-w-sm">
                  {promo.copy}
                </p>
                <span className="mt-2 inline-flex w-fit items-center gap-1.5 font-label-sm text-xs font-bold tracking-wider uppercase text-white group-hover:text-secondary-fixed transition-colors">
                  {promo.cta}
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </LocalizedClientLink>
          )
        })}
      </Container>
    </section>
  )
}
