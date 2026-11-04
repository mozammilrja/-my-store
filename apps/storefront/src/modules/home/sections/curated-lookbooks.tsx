"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useRef } from "react"
import { Icon } from "@/components/ui/icon"

const LOOKBOOKS = [
  {
    category: "Natural Dyes & Khadi",
    categoryColor: "text-secondary",
    title: "The Indigo Handspun Edit",
    description:
      "Authentic dabu block prints and organic deep indigo weaves crafted by veteran master artisans in Bagru.",
    image: "/images/men/lookbook-1-indigo.jpg",
    silhouettes: "18 Silhouettes",
    href: "/store",
  },
  {
    category: "Workwear Reimagined",
    categoryColor: "text-on-tertiary-container",
    title: "Urban Minimalist Uniform",
    description:
      "Sharp unstructured blazers, wrinkle-resistant twill shirts, and modular commuting essentials.",
    image: "/images/men/lookbook-2-urban.jpg",
    silhouettes: "24 Silhouettes",
    href: "/store",
  },
  {
    category: "Celebration Series",
    categoryColor: "text-secondary",
    title: "Wedding Sangeet & Festive Sets",
    description:
      "Pastel silk bundis, draped asymmetry kurtas, and tonal embroidery designed for celebratory Indian evenings.",
    image: "/images/men/lookbook-3-festive.jpg",
    silhouettes: "32 Silhouettes",
    href: "/store",
  },
  {
    category: "Unbeatable Value",
    categoryColor: "text-on-surface-variant",
    title: "Sub-₹1,499 Everyday Essentials",
    description:
      "High-count combed jersey tees, waffle lounge shorts, and breathable cotton polos built for longevity.",
    image: "/images/men/lookbook-4-essentials.jpg",
    silhouettes: "45 Silhouettes",
    href: "/store",
  },
]

export function CuratedLookbooks() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const offset = direction === "left" ? -340 : 340
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" })
  }

  return (
    <section className="w-full px-margin-mobile md:px-margin my-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
            Seasonal Capsule Edits
          </span>
          <h2 className="font-headline-lg text-headline-lg font-normal tracking-tight text-on-surface mt-1">
            Curated Lookbooks
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous capsule"
            onClick={() => scroll("left")}
            className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
          >
            <Icon name="west" size={20} />
          </button>
          <button
            type="button"
            aria-label="Next capsule"
            onClick={() => scroll("right")}
            className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
          >
            <Icon name="east" size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {LOOKBOOKS.map((item, idx) => (
          <div
            key={idx}
            className="bg-surface-container-low rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group shadow-sm"
          >
            <div className="relative z-10 flex flex-col gap-2">
              <span
                className={`font-label-caps text-label-caps uppercase tracking-wider font-bold ${item.categoryColor}`}
              >
                {item.category}
              </span>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {item.title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="my-4 aspect-[4/3] rounded-lg overflow-hidden relative">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                {item.silhouettes}
              </span>
              <LocalizedClientLink
                href={item.href}
                className="px-3 py-1.5 rounded bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container-highest hover:text-on-surface transition-colors cursor-pointer"
              >
                View Capsule
              </LocalizedClientLink>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
