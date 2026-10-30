import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

const TILES = [
  {
    title: "Tailored Shirts & Overshirts",
    count: "420 Styles",
    price: "From ₹1,299",
    href: "/store?category=shirts",
    image: "/images/men/subcat-1-linen-shirts.jpg",
    isAccent: false,
  },
  {
    title: "Casual Tees & Heavyweight Polos",
    count: "680 Styles",
    price: "From ₹799",
    href: "/store?category=sweatshirts",
    image: "/images/men/subcat-2-casual-tees.jpg",
    isAccent: false,
  },
  {
    title: "Structured Trousers & Chinos",
    count: "310 Styles",
    price: "From ₹1,899",
    href: "/store?category=pants",
    image: "/images/men/subcat-3-trousers.jpg",
    isAccent: false,
  },
  {
    title: "Artisanal Kurtas & Nehru Jackets",
    count: "245 Styles",
    price: "From ₹2,499",
    href: "/store",
    image: "/images/men/subcat-4-kurtas.jpg",
    isAccent: true,
  },
  {
    title: "Minimalist Footwear & Loafers",
    count: "190 Styles",
    price: "From ₹2,999",
    href: "/store",
    image: "/images/men/subcat-5-loafers.jpg",
    isAccent: false,
  },
  {
    title: "Timepieces & Leather Goods",
    count: "165 Styles",
    price: "From ₹1,499",
    href: "/store",
    image: "/images/men/subcat-6-accessories.jpg",
    isAccent: false,
  },
]

export function SubcategoryMatrix() {
  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant font-semibold">
              Department Taxonomy
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg font-normal tracking-tight text-on-surface">
            Visual Subcategory Discovery
          </h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
          Select a design capsule to inspect curated silhouetted patterns, textile weights, and daily coordinates.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {TILES.map((tile, idx) => (
          <LocalizedClientLink
            key={idx}
            href={tile.href}
            className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="relative w-full aspect-[3/4] bg-surface-container-high overflow-hidden">
              <Image
                src={tile.image}
                alt={tile.title}
                fill
                sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span
                className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded font-label-caps text-label-caps uppercase ${
                  tile.isAccent
                    ? "bg-secondary-container text-on-secondary-fixed font-bold"
                    : "bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface"
                }`}
              >
                {tile.count}
              </span>
            </div>
            <div className="p-3.5 flex flex-col justify-between flex-1">
              <span className="font-label-md text-label-md font-semibold text-on-surface group-hover:text-secondary transition-colors">
                {tile.title}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                {tile.price}
              </span>
            </div>
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}
