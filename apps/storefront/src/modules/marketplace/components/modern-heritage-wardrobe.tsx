"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { addToCart } from "@lib/data/shop"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { Icon } from "@/components/ui/icon"

const PRODUCTS = [
  {
    id: "sculpted-linen-blazer",
    image: "/images/women/product-1-sculpted-linen-blazer.jpg",
    badge: "Atelier Exclusive",
    badgeClass: "bg-surface-container-lowest text-on-surface",
    brand: "Everwear Tailoring",
    brandClass: "text-on-surface-variant",
    title: "Sculpted Linen Boyfriend Blazer",
    subtitle: "Ecru Raw Flax / Single-breasted horn buttons",
    price: "₹5,490",
    note: "Free alteration incl.",
    noteClass: "text-on-surface-variant",
    handle: "sculpted-linen-boyfriend-blazer",
    variantId: "variant_sculpted_m_1",
  },
  {
    id: "emerald-zari-kurta",
    image: "/images/women/product-2-emerald-zari-kurta.jpg",
    badge: "Festive Edit",
    badgeClass: "bg-secondary-container text-on-secondary-fixed",
    brand: "Heritage Loom 1984",
    brandClass: "text-secondary font-semibold",
    title: "Emerald Zari Chanderi Kurta Set",
    subtitle: "3-piece ensemble with ScallOrganza Dupatta",
    price: "₹8,990",
    note: "Privilege 10% Cash",
    noteClass: "text-secondary font-bold",
    handle: "emerald-zari-chanderi-kurta-set",
    variantId: "variant_emeraldz_m_1",
  },
  {
    id: "woven-kolhapuri-mule",
    image: "/images/women/product-3-woven-kolhapuri-mule.jpg",
    badge: "Handmade",
    badgeClass: "bg-surface-container-lowest text-on-surface",
    brand: "Aurum Footwear",
    brandClass: "text-on-surface-variant",
    title: "Woven Kolhapuri Block Mule",
    subtitle: "Full Grain Saddle Leather / 45mm Block Heel",
    price: "₹3,850",
    note: "Restocked today",
    noteClass: "text-on-surface-variant",
    handle: "woven-kolhapuri-block-mule",
    variantId: "variant_wovenkol_m_1",
  },
  {
    id: "baroque-tourmaline-choker",
    image: "/images/women/product-4-baroque-tourmaline-choker.jpg",
    badge: "Limited 20",
    badgeClass: "bg-tertiary-fixed text-on-tertiary-fixed",
    brand: "Atelier Silvercraft",
    brandClass: "text-on-surface-variant",
    title: "Baroque Tourmaline Silver Choker",
    subtitle: "925 Sterling Silver / Hand-beaten filigree",
    price: "₹7,200",
    note: "Includes certificate",
    noteClass: "text-on-surface-variant",
    handle: "baroque-tourmaline-silver-choker",
    variantId: "variant_baroquet_m_1",
  },
]

export function ModernHeritageWardrobe() {
  const router = useRouter()
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "in"
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})
  const [addingId, setAddingId] = useState<string | null>(null)

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFavorites((prev) => {
      const next = !prev[id]
      toast.success(next ? "Saved to your Wishlist" : "Removed from Wishlist")
      return { ...prev, [id]: next }
    })
  }

  const handleQuickAdd = async (prod: (typeof PRODUCTS)[number], e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAddingId(prod.id)
    try {
      await addToCart({
        variantId: prod.variantId,
        quantity: 1,
        countryCode,
      })
      notifyCartUpdated()
      toast.success(`Added ${prod.title} (Size M) to your bag`)
    } catch {
      toast.info(`Opening ${prod.title}...`)
      router.push(`/${countryCode}/products/${prod.handle}`)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="w-full py-12 px-margin-mobile md:px-margin flex flex-col gap-10">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">
              Everwear Spring / Summer 2025
            </span>
            <span className="w-8 h-px bg-outline-variant" />
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Archive Index 04
            </span>
          </div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface font-light tracking-tight">
            The Modern Heritage Wardrobe
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <LocalizedClientLink
            href="/store"
            className="px-4 py-2 rounded bg-surface-container-low text-on-surface font-label-sm text-label-sm hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <Icon name="filter_list" size={18} />
            <span>Refine Filters</span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/store?sort=curated"
            className="px-4 py-2 rounded bg-primary text-on-primary font-label-sm text-label-sm hover:bg-surface-container-highest hover:text-on-surface transition-colors flex items-center gap-2 font-medium"
          >
            <span>Sort: Curated Editorial</span>
            <Icon name="expand_more" size={16} />
          </LocalizedClientLink>
        </div>
      </div>

      {/* 4 Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRODUCTS.map((prod) => (
          <div
            key={prod.id}
            className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <LocalizedClientLink
              href={`/products/${prod.handle}`}
              className="relative aspect-[3/4] bg-surface-container-low overflow-hidden block"
            >
              <Image
                src={prod.image}
                alt={prod.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span
                className={`absolute top-3 left-3 px-2 py-1 rounded font-label-caps text-[10px] font-bold uppercase tracking-wider shadow-sm ${prod.badgeClass}`}
              >
                {prod.badge}
              </span>
              <button
                onClick={(e) => toggleFavorite(prod.id, e)}
                aria-label={`Save ${prod.title} to wishlist`}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur flex items-center justify-center transition-colors shadow-sm ${
                  favorites[prod.id]
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-lowest/80 text-on-surface hover:bg-primary hover:text-on-primary"
                }`}
              >
                <Icon
                  name={favorites[prod.id] ? "favorite" : "favorite_border"}
                  size={16}
                  fill={favorites[prod.id] ? "currentColor" : "none"}
                />
              </button>
            </LocalizedClientLink>

            <div className="p-4 flex flex-col flex-1 justify-between gap-3">
              <div>
                <span
                  className={`font-label-caps text-label-caps uppercase tracking-wider block ${prod.brandClass}`}
                >
                  {prod.brand}
                </span>
                <LocalizedClientLink href={`/products/${prod.handle}`}>
                  <h5 className="font-headline-sm text-[16px] text-on-surface font-medium mt-1 leading-snug hover:text-secondary transition-colors">
                    {prod.title}
                  </h5>
                </LocalizedClientLink>
                <p className="font-body-sm text-[12px] text-on-surface-variant line-clamp-1 mt-0.5">
                  {prod.subtitle}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {prod.price}
                  </span>
                  <span className={`font-label-caps text-[10px] ${prod.noteClass}`}>
                    {prod.note}
                  </span>
                </div>
                <button
                  disabled={addingId === prod.id}
                  onClick={(e) => handleQuickAdd(prod, e)}
                  className="px-3 py-1.5 rounded bg-surface-container-low text-on-surface font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-colors font-medium active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {addingId === prod.id ? "Adding..." : "Quick Add"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
