"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"
import { Icon } from "@/components/ui/icon"

type ProductItem = {
  id: string
  title: string
  brand: string
  rating: string
  price: string
  comparePrice: string
  discount: string
  badge?: string
  badgeVariant?: "default" | "secondary"
  sizeLabel: string
  sizes: string[]
  colors: string[]
  extraColors?: string
  image: string
  category: "shirts" | "trousers" | "ethnic" | "footwear"
  href: string
}

const PRODUCTS: ProductItem[] = [
  {
    id: "prod-1",
    title: "Normandy Pure Linen Resort Shirt",
    brand: "Everwear Atelier",
    rating: "4.8 (210)",
    price: "₹2,490",
    comparePrice: "₹3,490",
    discount: "28% OFF",
    badge: "Bestseller",
    badgeVariant: "default",
    sizeLabel: "Sizes:",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#f4ebd9", "#3d4b3c", "#1b1c1b"],
    extraColors: "+2 colors",
    image: "/images/men/product-1-linen-shirt.jpg",
    category: "shirts",
    href: "/store?category=shirts",
  },
  {
    id: "prod-2",
    title: "Double-Pleated Wool Blend Trouser",
    brand: "Studio Craft",
    rating: "4.9 (88)",
    price: "₹2,890",
    comparePrice: "₹3,990",
    discount: "27% OFF",
    badge: "New Cut",
    badgeVariant: "secondary",
    sizeLabel: "Waist:",
    sizes: ["30", "32", "34", "36"],
    colors: ["#5b4a42", "#202022", "#7a7b80"],
    image: "/images/men/product-2-wool-trouser.jpg",
    category: "trousers",
    href: "/store?category=pants",
  },
  {
    id: "prod-3",
    title: "Heavyweight 300 GSM Boxy Tee",
    brand: "Tirupur Mill",
    rating: "4.7 (512)",
    price: "₹990",
    comparePrice: "₹1,499",
    discount: "34% OFF",
    sizeLabel: "Sizes:",
    sizes: ["S", "M", "L"],
    colors: ["#2f2f31", "#e8e4de", "#525f4b"],
    extraColors: "+4 colors",
    image: "/images/men/product-3-boxy-tee.jpg",
    category: "shirts",
    href: "/store?category=sweatshirts",
  },
  {
    id: "prod-4",
    title: "Chanderi Silk Mandarin Kurta",
    brand: "Jaipur Handloom",
    rating: "4.9 (134)",
    price: "₹3,450",
    comparePrice: "₹4,990",
    discount: "30% OFF",
    badge: "Handwoven",
    badgeVariant: "default",
    sizeLabel: "Sizes:",
    sizes: ["38", "40", "42", "44"],
    colors: ["#465345", "#a35d46"],
    image: "/images/men/product-4-mandarin-kurta.jpg",
    category: "ethnic",
    href: "/store",
  },
  {
    id: "prod-5",
    title: "Italian Suede Tassel Loafer",
    brand: "Agra Cordwainers",
    rating: "4.8 (94)",
    price: "₹4,200",
    comparePrice: "₹5,900",
    discount: "29% OFF",
    sizeLabel: "UK Size:",
    sizes: ["7", "8", "9", "10"],
    colors: ["#4a2e24", "#1b1c1b"],
    image: "/images/men/product-5-suede-loafer.jpg",
    category: "footwear",
    href: "/store",
  },
  {
    id: "prod-6",
    title: "Unstructured Deconstructed Blazer",
    brand: "Ludhiana Wools",
    rating: "4.9 (42)",
    price: "₹5,490",
    comparePrice: "₹7,990",
    discount: "31% OFF",
    badge: "Limited",
    badgeVariant: "default",
    sizeLabel: "Chest:",
    sizes: ["38", "40", "42"],
    colors: ["#af8d6c", "#3a414b"],
    image: "/images/men/product-6-blazer.jpg",
    category: "shirts",
    href: "/store",
  },
  {
    id: "prod-7",
    title: "13.5oz Raw Selvedge Straight Jean",
    brand: "Arvind Mills Edit",
    rating: "4.6 (178)",
    price: "₹2,690",
    comparePrice: "₹3,799",
    discount: "29% OFF",
    sizeLabel: "Waist:",
    sizes: ["30", "32", "34"],
    colors: ["#1b263b", "#0d131a"],
    image: "/images/men/product-7-selvedge-jean.jpg",
    category: "trousers",
    href: "/store?category=pants",
  },
  {
    id: "prod-8",
    title: "Textured Waffle Resort Polo",
    brand: "Everwear Essentials",
    rating: "4.8 (340)",
    price: "₹1,190",
    comparePrice: "₹1,799",
    discount: "33% OFF",
    sizeLabel: "Sizes:",
    sizes: ["S", "M", "L"],
    colors: ["#f4ebd9", "#525f4b", "#202022"],
    image: "/images/men/product-8-waffle-polo.jpg",
    category: "shirts",
    href: "/store?category=shirts",
  },
]

export function TrendingGrid() {
  const [activeFilter, setActiveFilter] = useState<"all" | "shirts" | "trousers" | "ethnic">("all")
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({})

  const toggleWishlist = (id: string, title: string) => {
    setWishlist((prev) => {
      const next = !prev[id]
      if (next) {
        toast.success(`Added ${title} to your wishlist`)
      } else {
        toast.info(`Removed ${title} from wishlist`)
      }
      return { ...prev, [id]: next }
    })
  }

  const filteredProducts =
    activeFilter === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeFilter)

  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-10" id="trending-catalog">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="local_fire_department" size={20} className="text-secondary" />
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary font-semibold">
              Trending Across India
            </span>
          </div>
          <h2 className="font-headline-xl text-headline-lg sm:text-headline-xl font-normal tracking-tight text-on-surface">
            Most Coveted This Week
          </h2>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded font-label-sm text-label-sm uppercase tracking-wide transition-colors cursor-pointer ${
              activeFilter === "all"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            All Top 8
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("shirts")}
            className={`px-3.5 py-1.5 rounded font-label-sm text-label-sm uppercase tracking-wide transition-colors cursor-pointer ${
              activeFilter === "shirts"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            Shirts
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("trousers")}
            className={`px-3.5 py-1.5 rounded font-label-sm text-label-sm uppercase tracking-wide transition-colors cursor-pointer ${
              activeFilter === "trousers"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            Trousers
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ethnic")}
            className={`px-3.5 py-1.5 rounded font-label-sm text-label-sm uppercase tracking-wide transition-colors cursor-pointer ${
              activeFilter === "ethnic"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            Ethnic
          </button>
        </div>
      </div>

      {/* 8 Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {filteredProducts.map((prod) => {
          const isFavorited = !!wishlist[prod.id]

          return (
            <div
              key={prod.id}
              className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <div className="relative aspect-[3/4] bg-surface-container-high overflow-hidden">
                <Image
                  src={prod.image}
                  alt={prod.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {prod.badge && (
                  <span
                    className={`absolute top-3 left-3 px-2 py-0.5 rounded font-label-caps text-label-caps uppercase ${
                      prod.badgeVariant === "secondary"
                        ? "bg-secondary-container text-on-secondary-fixed font-bold"
                        : "bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface font-semibold"
                    }`}
                  >
                    {prod.badge}
                  </span>
                )}

                <button
                  type="button"
                  aria-label="Add to wishlist"
                  onClick={() => toggleWishlist(prod.id, prod.title)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center text-on-surface hover:text-error transition-colors cursor-pointer"
                >
                  <Icon
                    name="favorite"
                    size={18}
                    className={isFavorited ? "text-error" : ""}
                    fill={isFavorited ? "currentColor" : "none"}
                  />
                </button>

                {/* Hover Quick Add Size Bar */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-surface/95 backdrop-blur-md translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-between gap-2">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-semibold">
                    {prod.sizeLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {prod.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          toast.success(`Selected size ${s} for ${prod.title}`)
                        }}
                        className="w-6 h-6 rounded bg-surface-container text-on-surface font-label-caps text-[10px] hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center cursor-pointer font-bold"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1 justify-between gap-2">
                <div>
                  <div className="flex items-center justify-between text-on-surface-variant font-label-caps text-label-caps uppercase">
                    <span>{prod.brand}</span>
                    <span className="flex items-center gap-0.5 text-on-surface">
                      <Icon
                        name="star"
                        size={14}
                        fill="currentColor"
                        className="text-amber-500"
                      />{" "}
                      {prod.rating}
                    </span>
                  </div>

                  <LocalizedClientLink href={prod.href}>
                    <h4 className="font-body-md text-body-md font-semibold text-on-surface mt-1 group-hover:text-secondary transition-colors line-clamp-1">
                      {prod.title}
                    </h4>
                  </LocalizedClientLink>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      {prod.price}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant line-through">
                      {prod.comparePrice}
                    </span>
                    <span className="font-label-caps text-label-caps text-secondary font-bold">
                      {prod.discount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {prod.colors.map((c, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-full border border-outline-variant"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  {prod.extraColors && (
                    <span className="font-label-caps text-[10px] text-on-surface-variant ml-1">
                      {prod.extraColors}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
