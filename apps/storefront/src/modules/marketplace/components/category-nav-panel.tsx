"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { cn } from "@/lib/utils"

type CategoryPillar = {
  id: string
  title: string
  eyebrow: string
  count: string
  image: string
  description: string
  href: string
  cta: string
  links: { label: string; href: string; badge?: string }[]
}

type EditorialCard = {
  badge: string
  title: string
  description: string
  privilege: string
  image: string
  ctaText: string
  href: string
}

type DepartmentData = {
  id: string
  label: string
  eyebrow: string
  categories: CategoryPillar[]
  editorial: EditorialCard
}

const DEPARTMENTS: DepartmentData[] = [
  {
    id: "womens-atelier",
    label: "Women's Atelier",
    eyebrow: "Couture, Weaves & Contemporary Wardrobe",
    categories: [
      {
        id: "indian-festive",
        title: "Indian & Festive Wear",
        eyebrow: "Handloom Heritage",
        count: "1,428 Styles",
        image: "/images/women/product-2-emerald-zari-kurta.jpg",
        description: "Heirloom Chanderi weaves, gilded zari motifs, and silk drapes.",
        href: "/categories/women",
        cta: "Explore Festive",
        links: [
          { label: "Kurta & Co-ord Sets", href: "/categories/women", badge: "NEW" },
          { label: "Sarees & Modern Drapes", href: "/categories/women", badge: "TRENDING" },
          { label: "Flared Anarkalis & Lehengas", href: "/categories/women" },
          { label: "Zari Dupattas & Stoles", href: "/categories/women" },
        ],
      },
      {
        id: "western-tailoring",
        title: "Western & Contemporary",
        eyebrow: "Modern Silhouettes",
        count: "892 Styles",
        image: "/images/women/product-1-sculpted-linen-blazer.jpg",
        description: "Architectural tailoring, pure linens, and fluid silk drape.",
        href: "/categories/women",
        cta: "Explore Contemporary",
        links: [
          { label: "Sculpted Linen Blazers", href: "/categories/women", badge: "ATELIER" },
          { label: "Silk Tops & Poplin Shirts", href: "/categories/women" },
          { label: "Pleated Trousers & Culottes", href: "/categories/pants" },
          { label: "Merino Sweaters & Knits", href: "/categories/sweatshirts" },
        ],
      },
      {
        id: "footwear-bags",
        title: "Footwear & Leather Bags",
        eyebrow: "Artisan Leathercraft",
        count: "340 Styles",
        image: "/images/women/product-3-woven-kolhapuri-mule.jpg",
        description: "Handcrafted Kolhapuris, pebbled totes, and block heels.",
        href: "/categories/footwear",
        cta: "Explore Footwear",
        links: [
          { label: "Woven Kolhapuri Mules", href: "/categories/footwear", badge: "HANDMADE" },
          { label: "Artisan Block Heels & Juttis", href: "/categories/footwear" },
          { label: "Pebbled Calfskin Totes", href: "/categories/accessories" },
          { label: "Occasion Evening Clutches", href: "/categories/accessories" },
        ],
      },
      {
        id: "jewellery-beauty",
        title: "Fine Jewellery & Botanics",
        eyebrow: "Heritage Ornaments",
        count: "215 Items",
        image: "/images/women/product-4-baroque-tourmaline-choker.jpg",
        description: "Baroque gemstones, Kundan filigree, and pure extracts.",
        href: "/categories/jewellery",
        cta: "Visit Beauty Lounge",
        links: [
          { label: "Tourmaline & Pearl Chokers", href: "/categories/jewellery", badge: "KUNDAN" },
          { label: "Hand-Carved Silver Cuffs", href: "/categories/jewellery" },
          { label: "Botanical Face Elixirs", href: "/categories/beauty" },
          { label: "Signature Oud Extrait", href: "/categories/beauty" },
        ],
      },
    ],
    editorial: {
      badge: "Editorial Capsule",
      title: "The Monsoon Atelier Edit 2025",
      description: "Raw silks, hand-pleated silhouettes, and saturated jewel tones calibrated for grace.",
      privilege: "Complimentary Pure Silk Scarf on orders above ₹4,999",
      image: "/images/women/monsoon-capsule.jpg",
      ctaText: "Explore Capsule Drop",
      href: "/store",
    },
  },
  {
    id: "mens-wardrobe",
    label: "Men's Wardrobe",
    eyebrow: "Bespoke Tailoring & Casual Luxury",
    categories: [
      {
        id: "men-shirts",
        title: "Linen & Overshirts",
        eyebrow: "Tailored Classics",
        count: "480 Styles",
        image: "/images/men/subcat-1-linen-shirts.jpg",
        description: "French-seamed long-staple linen and structured overshirts.",
        href: "/categories/men",
        cta: "Explore Shirts",
        links: [
          { label: "Camp Collar Linen Shirts", href: "/categories/men", badge: "ESSENTIAL" },
          { label: "Structured Twill Overshirts", href: "/categories/men", badge: "POPULAR" },
          { label: "Boxy Heavyweight Tees", href: "/categories/men" },
          { label: "Waffle Knit Resort Polos", href: "/categories/men" },
        ],
      },
      {
        id: "men-trousers",
        title: "Trousers & Selvedge Denim",
        eyebrow: "Precision Cuts",
        count: "320 Styles",
        image: "/images/men/subcat-3-trousers.jpg",
        description: "Double-pleated wool trousers and Japanese raw selvedge denim.",
        href: "/categories/pants",
        cta: "Explore Bottoms",
        links: [
          { label: "Pleated Wool Trousers", href: "/categories/pants", badge: "SIGNATURE" },
          { label: "13oz Raw Selvedge Denim", href: "/categories/pants" },
          { label: "Relaxed Linen Drawstring Pants", href: "/categories/pants" },
          { label: "Tailored Travel Chinos", href: "/categories/pants" },
        ],
      },
      {
        id: "men-kurtas",
        title: "Festive Kurtas & Bundis",
        eyebrow: "Ethnic Tailoring",
        count: "210 Styles",
        image: "/images/men/subcat-4-kurtas.jpg",
        description: "Handspun Khadi kurtas, mandarin collars, and silk bundi jackets.",
        href: "/categories/men",
        cta: "Explore Ethnic",
        links: [
          { label: "Mandarin Collar Silk Kurtas", href: "/categories/men", badge: "FESTIVE" },
          { label: "Embroidered Bundi Jackets", href: "/categories/men" },
          { label: "Festive Asymmetric Sets", href: "/categories/men" },
          { label: "Tussar Silk Nehru Jackets", href: "/categories/men" },
        ],
      },
      {
        id: "men-shoes",
        title: "Loafers & Leather Accessories",
        eyebrow: "Artisan Footwear",
        count: "185 Styles",
        image: "/images/men/subcat-5-loafers.jpg",
        description: "Blake-stitched suede loafers and pebbled weekender bags.",
        href: "/categories/footwear",
        cta: "Explore Footwear",
        links: [
          { label: "Suede Penny Loafers", href: "/categories/footwear", badge: "HANDMADE" },
          { label: "Pebbled Leather Weekenders", href: "/categories/accessories" },
          { label: "Minimalist Calfskin Derbies", href: "/categories/footwear" },
          { label: "Full-Grain Brass Buckle Belts", href: "/categories/accessories" },
        ],
      },
    ],
    editorial: {
      badge: "Crafted Heritage",
      title: "The Italian Linen & Loom Edit",
      description: "Unstructured summer blazers and breathable tailoring engineered for tropical warmth.",
      privilege: "Complimentary Atelier Leather Care Kit with orders above ₹5,999",
      image: "/images/men/hero.jpg",
      ctaText: "Shop Men's Capsule",
      href: "/categories/men",
    },
  },
  {
    id: "ethnic-heritage",
    label: "Ethnic & Heritage",
    eyebrow: "Master Artisans of the Subcontinent",
    categories: [
      {
        id: "chanderi-weaves",
        title: "Chanderi & Banarasi Silk",
        eyebrow: "Gilded Textiles",
        count: "612 Styles",
        image: "/images/women/product-2-emerald-zari-kurta.jpg",
        description: "Fine metallic warp threads and gossamer handloom drapes.",
        href: "/categories/women",
        cta: "Explore Silks",
        links: [
          { label: "Pure Chanderi Saree Drapes", href: "/categories/women", badge: "ATELIER" },
          { label: "Banarasi Brocade Kurtas", href: "/categories/women" },
          { label: "Hand-Block Floral Dupattas", href: "/categories/women" },
          { label: "Zardozi Embroidered Blouses", href: "/categories/women" },
        ],
      },
      {
        id: "festive-kurta-sets",
        title: "Festive Co-ord & Anarkalis",
        eyebrow: "Ceremonial Edit",
        count: "430 Styles",
        image: "/images/editorial/cat-kurta.jpg",
        description: "Voluminous kalis, gota patti embroidery, and fluid silhouettes.",
        href: "/categories/women",
        cta: "Explore Ceremonial",
        links: [
          { label: "Tiered Anarkali Ensembles", href: "/categories/women", badge: "TRENDING" },
          { label: "Straight Kurta Pants Sets", href: "/categories/women" },
          { label: "Gota Patti Festive Dupattas", href: "/categories/women" },
          { label: "Tissue Silk Celebration Capes", href: "/categories/women" },
        ],
      },
      {
        id: "artisan-footwear",
        title: "Juttis & Kolhapuri Mules",
        eyebrow: "Regional Craft",
        count: "190 Styles",
        image: "/images/women/product-3-woven-kolhapuri-mule.jpg",
        description: "Hand-punched leather soles and metallic thread embroidery.",
        href: "/categories/footwear",
        cta: "Explore Juttis",
        links: [
          { label: "Braided Kolhapuri Flats", href: "/categories/footwear", badge: "HANDCRAFT" },
          { label: "Dabka Embroidered Juttis", href: "/categories/footwear" },
          { label: "Raw Silk Mules", href: "/categories/footwear" },
          { label: "Cushioned Mojaris", href: "/categories/footwear" },
        ],
      },
      {
        id: "heritage-jewels",
        title: "Temple & Polki Ornaments",
        eyebrow: "Regal Jewellery",
        count: "160 Items",
        image: "/images/women/product-4-baroque-tourmaline-choker.jpg",
        description: "Uncut stones, antique gold plating, and artisanal enameling.",
        href: "/categories/jewellery",
        cta: "Explore Ornaments",
        links: [
          { label: "Polki Collar Necklaces", href: "/categories/jewellery", badge: "LIMITED" },
          { label: "Filigree Chandbali Earrings", href: "/categories/jewellery" },
          { label: "Temple Motif Bangles", href: "/categories/jewellery" },
          { label: "Carved Jadau Rings", href: "/categories/jewellery" },
        ],
      },
    ],
    editorial: {
      badge: "Artisan Spotlight",
      title: "The Handloom Masterclass",
      description: "Celebrating generations of weaving families across Maheshwar and Varanasi.",
      privilege: "Every piece certified with Handloom Authenticity Mark",
      image: "/images/men/atelier-2-jaipur.jpg",
      ctaText: "Discover the Weavers",
      href: "/store",
    },
  },
  {
    id: "contemporary-rtw",
    label: "Contemporary RTW",
    eyebrow: "Architectural Wardrobe & Quiet Luxury",
    categories: [
      {
        id: "rtw-blazers",
        title: "Structured Blazers & Coats",
        eyebrow: "Tailoring Atelier",
        count: "275 Styles",
        image: "/images/women/product-1-sculpted-linen-blazer.jpg",
        description: "Sharp lapels, unstructured shoulders, and virgin wool blends.",
        href: "/categories/women",
        cta: "Explore Outerwear",
        links: [
          { label: "Boyfriend Cut Linen Blazers", href: "/categories/women", badge: "ICONIC" },
          { label: "Double-Breasted Wool Coats", href: "/categories/women" },
          { label: "Cropped Trench Jackets", href: "/categories/women" },
          { label: "Relaxed Summer Dusters", href: "/categories/women" },
        ],
      },
      {
        id: "rtw-separates",
        title: "Silk Tops & Trousers",
        eyebrow: "Everyday Elevates",
        count: "410 Styles",
        image: "/images/editorial/cat-pants.jpg",
        description: "Pleated front culottes, bias-cut silk skirts, and poplin tunics.",
        href: "/categories/pants",
        cta: "Explore Separates",
        links: [
          { label: "High-Rise Wide Leg Trousers", href: "/categories/pants", badge: "NEW" },
          { label: "Mulberry Silk Camisoles", href: "/categories/women" },
          { label: "Crisp Poplin Button-Downs", href: "/categories/women" },
          { label: "Fluid Satin Midi Skirts", href: "/categories/women" },
        ],
      },
      {
        id: "rtw-leather",
        title: "Minimalist Leather Bags",
        eyebrow: "Italian Calfskin",
        count: "145 Styles",
        image: "/images/editorial/cat-accessories.jpg",
        description: "Clean geometry, raw edge finishing, and unlined luxury totes.",
        href: "/categories/accessories",
        cta: "Explore Bags",
        links: [
          { label: "Soft Slouch Hobo Bags", href: "/categories/accessories", badge: "TRENDING" },
          { label: "Architectural Top Handle Totes", href: "/categories/accessories" },
          { label: "Minimalist Phone Crossbodies", href: "/categories/accessories" },
          { label: "Smooth Leather Card Cases", href: "/categories/accessories" },
        ],
      },
      {
        id: "rtw-knitwear",
        title: "Cashmere & Fine Gauge Knits",
        eyebrow: "Cozy Sophistication",
        count: "180 Styles",
        image: "/images/editorial/cat-sweatshirts.jpg",
        description: "Cloud-soft Mongolian cashmere and breathable cotton-silk knits.",
        href: "/categories/sweatshirts",
        cta: "Explore Knitwear",
        links: [
          { label: "Crewneck Cashmere Sweaters", href: "/categories/sweatshirts", badge: "LUXURY" },
          { label: "Ribbed Knit Polo Cardigans", href: "/categories/sweatshirts" },
          { label: "Relaxed Fine Gauge V-Necks", href: "/categories/sweatshirts" },
          { label: "Chunky Cable Knit Sweaters", href: "/categories/sweatshirts" },
        ],
      },
    ],
    editorial: {
      badge: "Spring Capsule",
      title: "Neutral Architectural Tones",
      description: "Tonal dressing in ivory, sand, and charcoal for serene urban silhouettes.",
      privilege: "Express 24h metro delivery included on all ready-to-wear orders",
      image: "/images/editorial/hero-editorial.jpg",
      ctaText: "Shop the Runway Edit",
      href: "/store",
    },
  },
]

export function CategoryNavPanel({
  activeTab: controlledTab,
  onTabChange,
  onToggleSearchLens,
  searchLensActive,
  onDismiss,
  dismissed,
}: {
  activeTab?: string
  onTabChange?: (id: string) => void
  onToggleSearchLens?: () => void
  searchLensActive?: boolean
  onDismiss?: () => void
  dismissed?: boolean
}) {
  const [internalTab, setInternalTab] = useState("womens-atelier")
  const [collapsed, setCollapsed] = useState(false)

  if (dismissed) return null

  const currentTabId = controlledTab || internalTab
  const currentDept = DEPARTMENTS.find((d) => d.id === currentTabId) || DEPARTMENTS[0]

  const handleTabClick = (id: string) => {
    setInternalTab(id)
    if (onTabChange) onTabChange(id)
  }

  return (
    <section
      aria-label="Department and Category Navigation"
      className="relative w-full z-30 bg-surface-container-lowest border-b border-border/70 transition-all duration-300"
    >
      {/* 1. Sleek Department Bar */}
      <div className="w-full bg-surface-container-low/50 border-b border-border/60 py-2.5 px-margin-mobile md:px-margin">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Department Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-label-caps text-[11px] text-muted-foreground uppercase tracking-widest mr-2 shrink-0 font-bold hidden sm:inline">
              Explore:
            </span>
            {DEPARTMENTS.map((dept) => {
              const active = dept.id === currentDept.id
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => handleTabClick(dept.id)}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-full font-label-sm text-xs shrink-0 transition-all flex items-center gap-1.5 cursor-pointer select-none",
                    active
                      ? "bg-foreground text-background shadow-xs font-bold ring-1 ring-foreground"
                      : "bg-surface-container-lowest hover:bg-surface-container-low text-muted-foreground hover:text-foreground border border-border/50"
                  )}
                >
                  {active && <span className="size-1.5 rounded-full bg-secondary animate-pulse" />}
                  <span>{dept.label}</span>
                </button>
              )
            })}
          </div>

          {/* Quick Actions (Lens / Collapse) */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {onToggleSearchLens && (
              <button
                type="button"
                onClick={onToggleSearchLens}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-sm text-xs transition-colors border cursor-pointer",
                  searchLensActive
                    ? "bg-secondary/15 text-secondary border-secondary/30 font-bold"
                    : "bg-surface-container-lowest text-muted-foreground hover:text-foreground border-border/60"
                )}
                title="Toggle search trends and instant suggestions"
              >
                <SparklesIcon className="size-3.5 text-secondary" />
                <span className="hidden sm:inline">Trend Lens</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 bg-surface-container-lowest text-muted-foreground hover:text-foreground font-label-sm text-xs transition-colors cursor-pointer"
              aria-label={collapsed ? "Expand category panel" : "Collapse category panel"}
            >
              <span>{collapsed ? "Expand" : "Collapse"}</span>
              {collapsed ? (
                <ChevronDownIcon className="size-3.5" />
              ) : (
                <ChevronUpIcon className="size-3.5" />
              )}
            </button>

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors"
                title="Dismiss category navigation"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Collapsible Visual Category Matrix */}
      {!collapsed && (
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Category Cards (1 - 4) */}
            {currentDept.categories.map((cat) => (
              <div
                key={cat.id}
                className="group relative flex flex-col rounded-xl border border-border/70 bg-surface-container-lowest overflow-hidden shadow-2xs hover:shadow-md hover:border-foreground/30 transition-all duration-300"
              >
                {/* Visual Image Header */}
                <LocalizedClientLink
                  href={cat.href}
                  className="relative h-36 w-full overflow-hidden bg-surface-container-low block"
                >
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 260px"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between text-white">
                    <div className="min-w-0 pr-2">
                      <span className="font-label-caps text-[9px] uppercase tracking-wider font-bold opacity-80 block truncate">
                        {cat.eyebrow}
                      </span>
                      <h3 className="font-headline-sm text-sm font-bold tracking-tight text-white leading-tight truncate">
                        {cat.title}
                      </h3>
                    </div>
                    <span className="font-label-caps text-[9px] bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                      {cat.count}
                    </span>
                  </div>
                </LocalizedClientLink>

                {/* Body Content & Curated Links */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-3 bg-surface-container-lowest">
                  <p className="font-body-sm text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>

                  <div className="flex flex-col gap-1">
                    {cat.links.map((link, idx) => (
                      <LocalizedClientLink
                        key={idx}
                        href={link.href}
                        className="group/link flex items-center justify-between py-1 px-1.5 rounded hover:bg-surface-container-low/70 transition-colors"
                      >
                        <span className="font-body-sm text-xs text-foreground group-hover/link:text-secondary transition-colors font-medium truncate">
                          {link.label}
                        </span>
                        {link.badge && (
                          <span className="font-label-caps text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
                            {link.badge}
                          </span>
                        )}
                      </LocalizedClientLink>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <LocalizedClientLink
                      href={cat.href}
                      className="inline-flex items-center gap-1.5 font-label-caps text-[11px] font-bold uppercase tracking-wider text-secondary hover:text-foreground hover:gap-2.5 transition-all"
                    >
                      <span>{cat.cta}</span>
                      <ArrowRightIcon className="size-3" />
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            ))}

            {/* Editorial Capsule Spotlight Card (Column 5) */}
            <div className="group relative flex flex-col rounded-xl overflow-hidden bg-foreground text-background shadow-md justify-between p-5 min-h-[360px]">
              <div className="absolute inset-0 pointer-events-none">
                <Image
                  src={currentDept.editorial.image}
                  alt={currentDept.editorial.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 300px"
                  className="object-cover object-center opacity-40 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
              </div>

              {/* Top Editorial Tag */}
              <div className="relative z-10 flex flex-col items-start gap-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                  <span className="size-1.5 rounded-full bg-secondary animate-pulse" />
                  <span className="font-label-caps text-[10px] uppercase tracking-wider text-white font-bold">
                    {currentDept.editorial.badge}
                  </span>
                </div>
                <h4 className="font-headline-sm text-lg font-bold text-white leading-tight mt-2">
                  {currentDept.editorial.title}
                </h4>
                <p className="font-body-sm text-xs text-white/80 mt-1 line-clamp-3 leading-relaxed">
                  {currentDept.editorial.description}
                </p>
              </div>

              {/* Bottom Privilege Box & CTA */}
              <div className="relative z-10 flex flex-col gap-3 mt-auto pt-4">
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15">
                  <span className="font-label-caps text-[9px] uppercase tracking-widest text-secondary block font-bold">
                    Privilege Unlocked
                  </span>
                  <p className="font-body-sm text-[11px] text-white/90 mt-0.5 leading-snug">
                    {currentDept.editorial.privilege}
                  </p>
                </div>

                <LocalizedClientLink
                  href={currentDept.editorial.href}
                  className="w-full h-10 px-4 rounded-lg bg-white text-foreground hover:bg-neutral-100 font-label-caps text-xs font-bold uppercase tracking-wider text-center transition-all shadow-sm flex items-center justify-center gap-2 group-hover:shadow-md"
                >
                  <span>{currentDept.editorial.ctaText}</span>
                  <ArrowUpRightIcon className="size-3.5" />
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
