import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ProductListing } from "@modules/catalog/product-listing"
import type { Listing } from "@modules/catalog/params"
import type { Category } from "@lib/api/types"

const WOMEN_SUBCATEGORIES = [
  {
    title: "Handloom Sarees & Festive Sets",
    price: "From ₹2,499",
    styles: "1,428 Styles",
    href: "/categories/women",
    image: "/images/women/product-2-emerald-zari-kurta.jpg",
  },
  {
    title: "Sculpted Linen Blazers & Co-ords",
    price: "From ₹3,299",
    styles: "892 Styles",
    href: "/categories/women",
    image: "/images/women/product-1-sculpted-linen-blazer.jpg",
  },
  {
    title: "Artisan Kolhapuris & Leather Mules",
    price: "From ₹1,499",
    styles: "340 Styles",
    href: "/categories/footwear",
    image: "/images/women/product-3-woven-kolhapuri-mule.jpg",
  },
  {
    title: "Heritage Tourmaline & Polki Jewellery",
    price: "From ₹2,199",
    styles: "215 Items",
    href: "/categories/jewellery",
    image: "/images/women/product-4-baroque-tourmaline-choker.jpg",
  },
]

export function WomenDepartmentLanding({
  countryCode,
  category,
  categories,
  listing,
}: {
  countryCode: string
  category: Category
  categories?: Category[]
  listing: Listing
}) {
  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Breadcrumb Bar */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin pt-4 pb-2">
        <div className="flex items-center gap-2 font-label-caps text-label-caps tracking-wider uppercase text-on-surface-variant">
          <LocalizedClientLink className="hover:text-on-surface transition-colors" href="/">
            Home
          </LocalizedClientLink>
          <span>/</span>
          <span className="text-on-surface font-semibold">Women</span>
          <span>/</span>
          <span className="text-on-surface-variant/70">Atelier Edit 2025</span>
        </div>
      </section>

      {/* Editorial Department Hero */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-4">
        <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-high shadow-md">
          <div
            className="w-full min-h-[460px] md:min-h-[520px] bg-cover bg-center flex flex-col justify-end p-6 sm:p-10 md:p-14 relative"
            style={{
              backgroundImage: "url('/images/women/monsoon-capsule.jpg')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="relative z-10 max-w-3xl flex flex-col gap-3 text-white">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-white/20 backdrop-blur-md font-label-caps text-label-caps uppercase tracking-widest text-white font-semibold">
                  Summer &apos;25 Atelier Campaign
                </span>
                <span className="hidden sm:inline font-label-sm text-xs text-white/80">
                  Curated for Everwear India
                </span>
              </div>
              <h1 className="font-display-hero text-3xl sm:text-5xl font-light tracking-tight text-white leading-tight max-w-2xl">
                Modern Heritage &amp; Fluid Silhouettes
              </h1>
              <p className="font-body-lg text-sm sm:text-base text-white/90 max-w-xl font-normal leading-relaxed">
                Heirloom Chanderi weaves, sculpted linen tailoring, and architectural drapes crafted for effortless versatility and quiet confidence.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#women-catalog"
                  className="px-6 py-3 rounded-lg bg-white text-black font-label-md text-xs sm:text-sm tracking-wider uppercase hover:bg-neutral-200 transition-all shadow-md flex items-center gap-2 font-semibold"
                >
                  Shop New Season
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
                <LocalizedClientLink
                  href="/categories/women"
                  className="px-6 py-3 rounded-lg bg-white/15 backdrop-blur-md text-white hover:bg-white/25 font-label-md text-xs sm:text-sm tracking-wider uppercase transition-colors flex items-center gap-2 font-medium"
                >
                  Explore Sarees &amp; Co-ords
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Badges Ticker */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container-low/70 rounded-xl p-3.5 flex items-center gap-3 border border-border/40">
            <span className="material-symbols-outlined text-primary text-[24px]">dry_cleaning</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Pure Handspun Silks</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Zari &amp; organic linen weaves</span>
            </div>
          </div>
          <div className="bg-surface-container-low/70 rounded-xl p-3.5 flex items-center gap-3 border border-border/40">
            <span className="material-symbols-outlined text-primary text-[24px]">straighten</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Architectural Tailoring</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Precision drape sized XS to 3XL</span>
            </div>
          </div>
          <div className="bg-surface-container-low/70 rounded-xl p-3.5 flex items-center gap-3 border border-border/40">
            <span className="material-symbols-outlined text-primary text-[24px]">local_shipping</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Same-Day Dispatch</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">In 18 metro hub pincodes</span>
            </div>
          </div>
          <div className="bg-surface-container-low/70 rounded-xl p-3.5 flex items-center gap-3 border border-border/40">
            <span className="material-symbols-outlined text-primary text-[24px]">swap_horizontal_circle</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Doorstep Try &amp; Exchange</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">14-day zero hassle pickup</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Subcategory Discovery Matrix */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant font-semibold">
                Department Taxonomy
              </span>
            </div>
            <h2 className="font-headline-lg text-2xl font-normal tracking-tight text-on-surface">
              Visual Subcategory Discovery
            </h2>
          </div>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant max-w-md">
            Select a design capsule to inspect curated silhouetted patterns, textile weights, and daily coordinates.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {WOMEN_SUBCATEGORIES.map((sub, idx) => (
            <LocalizedClientLink
              key={idx}
              href={sub.href}
              className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-border/60"
            >
              <div className="relative w-full aspect-[4/3] bg-surface-container-low overflow-hidden">
                <Image
                  src={sub.image}
                  alt={sub.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2.5 left-2.5 bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded font-label-caps text-[10px] uppercase text-on-surface font-semibold">
                  {sub.styles}
                </span>
              </div>
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {sub.title}
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant mt-1">{sub.price}</span>
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      </section>

      {/* Live Catalog for Women */}
      <div id="women-catalog" className="pt-4">
        <ProductListing
          countryCode={countryCode}
          path="/categories/women"
          listing={listing}
          categoryIds={[category.id]}
          categories={categories}
        />
      </div>
    </div>
  )
}
