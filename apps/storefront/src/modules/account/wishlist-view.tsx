"use client"

import { ensureOk } from "@lib/util/cart-action"
import type { Product } from "@lib/api/types"
import { addToCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { useProductWishlist } from "@lib/util/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { StoreSelect } from "@/components/store/store-select"

/** `catalogProducts` is the customer's saved products as the server read them on load. */
export function WishlistView({ catalogProducts }: { catalogProducts: Product[] }) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const { items: wishlistIds, ready, remove, add } = useProductWishlist()
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortOption, setSortOption] = useState<"newest" | "price_asc" | "price_desc">("newest")
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  // The live wishlist store decides what is still saved, so a removal or a
  // move to the bag drops the card at once and an Undo brings it back. Until
  // the store has loaded, the server's list stands in.
  const savedProducts = useMemo(
    () => (ready ? catalogProducts.filter((p) => wishlistIds.includes(p.id)) : catalogProducts),
    [catalogProducts, wishlistIds, ready]
  )

  // Categorised counts
  const counts = useMemo(() => {
    return {
      all: savedProducts.length,
      apparel: savedProducts.filter((p) => p.categoryIds?.some((c) => c.includes("apparel") || c.includes("men") || c.includes("women"))).length,
      footwear: savedProducts.filter((p) => p.categoryIds?.some((c) => c.includes("footwear") || c.includes("shoes"))).length,
      jewellery: savedProducts.filter((p) => p.categoryIds?.some((c) => c.includes("jewel") || c.includes("accessories"))).length,
      accessories: savedProducts.filter((p) => p.categoryIds?.some((c) => c.includes("bag") || c.includes("accessory"))).length,
    }
  }, [savedProducts])

  // Filtered & sorted
  const displayedProducts = useMemo(() => {
    let list = [...savedProducts]

    if (selectedCategory !== "all") {
      list = list.filter((p) =>
        p.categoryIds?.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()))
      )
    }

    if (sortOption === "price_asc") {
      list.sort((a, b) => (a.priceRange?.min ?? 0) - (b.priceRange?.min ?? 0))
    } else if (sortOption === "price_desc") {
      list.sort((a, b) => (b.priceRange?.min ?? 0) - (a.priceRange?.min ?? 0))
    }

    return list
  }, [savedProducts, selectedCategory, sortOption])

  const handleSelectSize = (productId: string, variantId: string) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variantId }))
  }

  const handleAddToCart = (product: Product) => {
    const variantId = selectedVariants[product.id] ?? product.variants[0]?.id
    if (!variantId) {
      toast.error("Please select a size first")
      return
    }

    startTransition(async () => {
      try {
        ensureOk(await addToCart({ variantId, quantity: 1, countryCode }))
      } catch (err: unknown) {
        // The bag refused it (out of stock, no size): it stays saved.
        toast.error(err instanceof Error ? err.message : "Failed to add to bag")
        return
      }
      notifyCartUpdated()
      try {
        await remove(product.id)
      } catch (err: unknown) {
        toast.error(
          `${product.title} is in your bag, but we couldn't take it off your wishlist. ${
            err instanceof Error ? err.message : ""
          }`.trim()
        )
        return
      }
      toast.success("Moved to bag", {
        description: product.title,
        action: {
          label: "Undo",
          // Undo puts it back on the wishlist; the bag keeps its copy.
          onClick: () => {
            add(product.id).catch((e: unknown) =>
              toast.error(e instanceof Error ? e.message : "We couldn't update your wishlist.")
            )
          },
        },
      })
    })
  }

  const handleRemove = async (product: Product) => {
    try {
      await remove(product.id)
      toast.info(`Removed ${product.title} from your wishlist`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't update your wishlist.")
    }
  }

  const totalCount = savedProducts.length

  return (
    <div className="flex flex-col w-full" data-testid="wishlist-view">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg mb-space-xl pb-space-md border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest font-bold">
              Saved Artifacts
            </span>
            <span className="w-8 h-[1px] bg-secondary/40" />
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-light tracking-tight uppercase">
            My Wishlist
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {totalCount} {totalCount === 1 ? "item" : "items"} curated for your upcoming seasonal rotation
          </p>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-space-md self-start md:self-auto">
          <StoreSelect
            variant="pill"
            align="end"
            aria-label="Sort wishlist"
            value={sortOption}
            onValueChange={(v) => setSortOption(v as "newest" | "price_asc" | "price_desc")}
            leading={<span className="font-label-sm text-label-sm text-on-surface-variant">Sort by:</span>}
            valueClassName="font-label-md text-label-md font-semibold normal-case"
            className="h-auto data-[size=default]:h-auto py-2"
            options={[
              { value: "newest", label: "Newest Additions" },
              { value: "price_asc", label: "Price: Low to High" },
              { value: "price_desc", label: "Price: High to Low" },
            ]}
          />
        </div>
      </div>

      {/* 2. Category Filtering Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-space-xl no-scrollbar">
        {(
          [
            { id: "all", label: `All (${counts.all})` },
            { id: "apparel", label: `Apparel (${counts.apparel})` },
            { id: "footwear", label: `Footwear (${counts.footwear})` },
            { id: "jewellery", label: `Jewellery (${counts.jewellery})` },
            { id: "accessories", label: `Accessories (${counts.accessories})` },
          ] as const
        ).map((tab) => {
          const active = selectedCategory === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-5 py-2.5 rounded-full font-label-md text-label-md font-semibold transition-all shadow-2xs cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-surface-container-high"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 3. Product Grid */}
      {displayedProducts.length === 0 ? (
        /* Blank Canvas Empty Wishlist State */
        <div className="mt-space-lg p-space-xl bg-surface-container-low rounded-2xl flex flex-col items-center text-center max-w-2xl mx-auto w-full my-space-xl border border-surface-container-high">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-space-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">favorite_border</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-medium">
            Your Wishlist is a Blank Canvas
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-md">
            Explore our mid-season spring edits, timeless tailoring, and artisanal curations to save items for future purchases.
          </p>
          <div className="mt-space-lg flex items-center gap-3 flex-wrap justify-center">
            <LocalizedClientLink
              href="/store"
              className="h-11 px-6 bg-primary text-on-primary hover:bg-inverse-surface font-label-md text-label-md font-medium rounded-lg transition-colors flex items-center justify-center uppercase tracking-wider"
            >
              Explore New Arrivals
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/store"
              className="h-11 px-6 bg-surface-container-lowest text-on-surface hover:bg-surface-container font-label-md text-label-md font-medium rounded-lg transition-colors flex items-center justify-center uppercase tracking-wider border border-surface-container-high"
            >
              View Lookbook
            </LocalizedClientLink>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {displayedProducts.map((prod, idx) => {
            const price = prod.priceRange?.min ?? 0
            const activeVariantId = selectedVariants[prod.id] ?? prod.variants[0]?.id
            const imageSrc =
              prod.thumbnail ??
              prod.images[0] ??
              "https://lh3.googleusercontent.com/aida-public/AB6AXuCR1EO6mGMU0x_0TQnYnsklSRscTw9LM28HFoRhqRA1CqiIVNrhNf-adjyoh4aKLUz4Rj03EnwvdkegwZGojReHIVk6SOZTZZ0Obg1Q1wjEFBbQi9_ocbd_cFCo3F3s1f5PC99N2SR_zwf9qBs3wPqNSdsRcNdtinS40_1QbtyJhM9hcwdQ00xQtn5F88yCC61lEyI5g49c0he5HiSbdsXSemxncmoChqPzHnupvOEM"

            const badgeLabel =
              idx === 0 ? "New Arrival" : idx === 1 ? "Handcrafted" : "Limited Edition"

            return (
              <div
                key={prod.id}
                className="flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-xs group transition-all duration-300 hover:shadow-md border border-surface-container-high/60"
              >
                {/* 3:4 Aspect Image */}
                <div className="relative aspect-[3/4] bg-surface-container-low overflow-hidden">
                  <Image
                    src={imageSrc}
                    alt={prod.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className="bg-[#ECFDF5] text-[#065F46] font-label-caps text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider shadow-2xs">
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Wishlist Heart Action (filled, click to remove) */}
                  <button
                    type="button"
                    onClick={() => handleRemove(prod)}
                    aria-label="Remove from wishlist"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center text-secondary shadow-sm hover:scale-110 transition-transform cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      favorite
                    </span>
                  </button>
                </div>

                {/* Details */}
                <div className="p-space-md flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest font-semibold">
                        EVERWEAR ATELIER
                      </span>
                      {prod.onSale && (
                        <span className="font-label-caps uppercase text-label-caps bg-error-container text-on-error-container px-2 py-0.5 rounded font-bold">
                          15% OFF
                        </span>
                      )}
                    </div>
                    <LocalizedClientLink href={`/products/${prod.handle}`}>
                      <h3 className="font-body-md text-body-md text-on-surface font-medium mt-1 hover:underline truncate">
                        {prod.title}
                      </h3>
                    </LocalizedClientLink>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="font-headline-sm text-headline-sm text-primary font-semibold">
                        {formatMoney(price, prod.currency)}
                      </span>
                      {prod.onSale && (
                        <span className="font-body-sm text-body-sm text-outline line-through">
                          {formatMoney(Math.round(price * 1.18), prod.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Size Selector & Add to Bag */}
                  <div className="mt-space-md pt-space-sm flex flex-col gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                          Select Size
                        </span>
                        <span className="font-label-caps uppercase text-[10px] text-secondary font-semibold">In Stock</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {prod.variants.slice(0, 4).map((v) => {
                          const active = v.id === activeVariantId
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleSelectSize(prod.id, v.id)}
                              className={`py-1.5 rounded font-label-sm text-label-sm transition-colors cursor-pointer ${
                                active
                                  ? "bg-primary text-on-primary font-semibold shadow-xs"
                                  : "bg-surface-container-low text-on-surface font-medium hover:bg-primary hover:text-on-primary border border-surface-container-high"
                              }`}
                            >
                              {v.title.slice(0, 4)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAddToCart(prod)}
                      className="w-full h-11 bg-primary text-on-primary hover:bg-inverse-surface font-label-md text-label-md font-medium rounded-lg transition-colors flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                      <span>Move to bag</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
