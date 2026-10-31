import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { Icon } from "@/components/ui/icon"

const WORKSHOPS = [
  {
    location: "Tamil Nadu",
    title: "Tirupur Knitwear Collective",
    icon: "eco",
    subtitle: "Heavyweight Supima Cotton & Ringspun Jersey",
    description:
      "Zero liquid discharge knitting units running 100% on wind power, producing dense 280-350 GSM tees that never lose form after wash cycles.",
    stylesCount: "220 Verified Styles",
    image: "/images/men/atelier-1-tirupur.jpg",
    href: "/store",
  },
  {
    location: "Rajasthan",
    title: "Jaipur Handloom Guild",
    icon: "handyman",
    subtitle: "Organic Dabu Prints & Chanderi Silks",
    description:
      "Generational master block-carvers and hand-spinners delivering breezy kurtas dyed with pomegranate peels, turmeric, and fermented indigo.",
    stylesCount: "145 Verified Styles",
    image: "/images/men/atelier-2-jaipur.jpg",
    href: "/store",
  },
  {
    location: "Punjab",
    title: "Ludhiana Woolen Mills",
    icon: "architecture",
    subtitle: "Merino Blends & Structured Outerwear",
    description:
      "Fine tailored yarns transformed into lightweight deconstructed overcoats, knit polos, and weather-resistant transitional layering pieces.",
    stylesCount: "95 Verified Styles",
    image: "/images/men/atelier-3-ludhiana.jpg",
    href: "/store",
  },
]

export function AtelierSpotlights() {
  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
        <div>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
            Provenance &amp; Traceability
          </span>
          <h2 className="font-headline-lg text-headline-lg font-normal tracking-tight text-on-surface mt-1">
            Indian Atelier &amp; Mill Spotlights
          </h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
          Every garment links back to certified regional craft centers preserving indigenous weaving and sustainable practices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {WORKSHOPS.map((shop, idx) => (
          <div
            key={idx}
            className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all"
          >
            <div className="flex flex-col gap-4">
              <div className="aspect-[16/9] rounded-lg overflow-hidden relative">
                <Image
                  src={shop.image}
                  alt={shop.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2.5 left-2.5 bg-surface-container-lowest/90 px-2 py-0.5 rounded font-label-caps text-label-caps text-on-surface font-semibold">
                  {shop.location}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {shop.title}
                  </h3>
                  <Icon name={shop.icon} size={20} className="text-secondary" />
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mt-0.5">
                  {shop.subtitle}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                  {shop.description}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-surface-container flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                {shop.stylesCount}
              </span>
              <LocalizedClientLink
                href={shop.href}
                className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider hover:text-secondary flex items-center gap-1 cursor-pointer"
              >
                Explore Origin{" "}
                <Icon name="arrow_forward" size={14} />
              </LocalizedClientLink>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
