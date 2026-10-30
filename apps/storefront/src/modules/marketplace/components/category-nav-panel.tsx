"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

const DEPARTMENT_TABS = [
  { id: "womens-atelier", label: "Women's Atelier", active: true },
  { id: "ethnic-heritage", label: "Ethnic & Heritage", active: false },
  { id: "contemporary-rtw", label: "Contemporary Ready-to-Wear", active: false },
  { id: "atelier-jewelry", label: "Atelier Jewelry", active: false },
]

export function CategoryNavPanel({
  activeTab,
  onTabChange,
  onToggleSearchLens,
  searchLensActive,
  onDismiss,
  dismissed,
}: {
  activeTab: string
  onTabChange: (id: string) => void
  onToggleSearchLens: () => void
  searchLensActive: boolean
  onDismiss: () => void
  dismissed: boolean
}) {
  if (dismissed) return null

  return (
    <div className="relative w-full z-40 bg-surface-container-lowest shadow-[0_24px_50px_-12px_rgba(27,28,27,0.14)] pb-8 transition-all">
      {/* Department Focus Top Bar */}
      <div className="w-full bg-surface-container-low py-2 px-margin-mobile md:px-margin">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mr-2 shrink-0">
              Department Focus
            </span>
            {DEPARTMENT_TABS.map((tab) => {
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-1 rounded font-label-sm text-label-sm shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold active:scale-95"
                      : "bg-transparent hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleSearchLens}
              className={`flex items-center gap-2 px-3 py-1 rounded font-label-sm text-label-sm transition-colors ${
                searchLensActive
                  ? "bg-surface-container text-on-surface font-semibold"
                  : "bg-surface text-on-surface hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Omnichannel Search Lens</span>
            </button>
            <button
              onClick={onDismiss}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface font-label-caps text-label-caps uppercase transition-colors"
            >
              <span>Dismiss</span>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Column Category Matrix */}
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-lg">
          {/* Column 1: Indian & Festive Wear */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-bold">
                  Indian &amp; Festive Wear
                </h3>
              </div>
              <span className="font-label-caps text-[10px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface">
                1,428 Styles
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant -mt-1">
              Heirloom weaves, fine Chanderi, and gilded motifs.
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Kurtas &amp; Co-ord Sets
                </span>
                <span className="font-label-caps text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                  NEW
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Sarees &amp; Modern Drapes
                </span>
                <span className="font-label-caps text-[10px] text-on-tertiary-container font-semibold">
                  TRENDING
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Lehenga Cholis
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Flared Anarkalis
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Zari Dupattas &amp; Stoles
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Tailored Saree Blouses
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Palazzos &amp; Tiered Skirts
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Unstitched Dress Materials
                </span>
              </LocalizedClientLink>
            </div>
            <div className="mt-auto pt-3">
              <LocalizedClientLink
                href="/categories/women"
                className="inline-flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-secondary font-bold hover:gap-2.5 transition-all"
              >
                <span>View Festive Catalog</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </LocalizedClientLink>
            </div>
          </div>

          {/* Column 2: Western & Modern */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-bold">
                  Western &amp; Modern
                </h3>
              </div>
              <span className="font-label-caps text-[10px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface">
                892 Styles
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant -mt-1">
              Architectural fits, structured poplins, and fluid drape.
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Dresses &amp; Sleek Jumpsuits
                </span>
                <span className="font-label-caps text-[10px] bg-secondary-container text-on-secondary-fixed px-1 py-0.2 rounded font-bold">
                  DROP 04
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Silk Tops &amp; Blouses
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Poplin Shirts &amp; Tunics
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Tailored Blazers &amp; Outerwear
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Pleated Trousers &amp; Culottes
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Selvedge Denims &amp; Jeggings
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Merino Sweaters &amp; Knits
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/categories/women"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Organic Cotton Loungewear
                </span>
              </LocalizedClientLink>
            </div>
            <div className="mt-auto pt-3">
              <LocalizedClientLink
                href="/categories/women"
                className="inline-flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-primary font-bold hover:gap-2.5 transition-all"
              >
                <span>Explore Contemporary</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </LocalizedClientLink>
            </div>
          </div>

          {/* Column 3: Footwear & Bags */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-bold">
                  Footwear &amp; Bags
                </h3>
              </div>
              <span className="font-label-caps text-[10px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface">
                340 Styles
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant -mt-1">
              Calfskin textures, handcrafted soles, and everyday luxury.
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Artisan Heels &amp; Stilettos
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Handmade Kolhapuris &amp; Juttis
                </span>
                <span className="font-label-caps text-[10px] text-on-surface-variant">HANDLOOM</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Pebbled Leather Totes
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Crossbody Sling Pouches
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Minimalist Court Sneakers
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Backless Mules &amp; Loafers
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Woven Raffia Baskets
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary group-hover:translate-x-1 transition-all">
                  Occasion Evening Clutches
                </span>
              </LocalizedClientLink>
            </div>
            <div className="mt-auto pt-3">
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-primary font-bold hover:gap-2.5 transition-all"
              >
                <span>Leather &amp; Sole Atelier</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </LocalizedClientLink>
            </div>
          </div>

          {/* Column 4: Jewellery & Beauty */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim" />
                <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-bold">
                  Jewellery &amp; Beauty
                </h3>
              </div>
              <span className="font-label-caps text-[10px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface">
                215 Items
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant -mt-1">
              Semi-precious stones, silver filigree, and plant botanicals.
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Fine Brass &amp; Silver Cuffs
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Heritage Chokers &amp; Necklaces
                </span>
                <span className="font-label-caps text-[10px] text-secondary font-bold">KUNDAN</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Clean Botanical Face Elixirs
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Signature Oud &amp; Floral Extrait
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Statement Enamel Rings
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Carved Pearl Drop Earrings
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Scented Amber Soy Candles
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/store"
                className="group flex items-center justify-between py-1 px-2 rounded hover:bg-surface-container-lowest transition-all"
              >
                <span className="font-body-sm text-body-sm text-on-surface group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  Hair Essences &amp; Tonics
                </span>
              </LocalizedClientLink>
            </div>
            <div className="mt-auto pt-3">
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-secondary font-bold hover:gap-2.5 transition-all"
              >
                <span>Visit Beauty Lounge</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </LocalizedClientLink>
            </div>
          </div>

          {/* Column 5: Editorial Capsule Card */}
          <div className="flex flex-col rounded-xl overflow-hidden bg-primary text-on-primary shadow-xl relative min-h-[380px] justify-between p-6">
            <div className="absolute inset-0 pointer-events-none">
              <Image
                src="/images/women/monsoon-capsule.jpg"
                alt="High editorial fashion photograph of an Indian model draped in an ethereal monsoon emerald green silk organza ensemble"
                fill
                sizes="(max-width: 1024px) 100vw, 300px"
                className="object-cover mix-blend-overlay opacity-40 hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="relative z-10 flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-surface/20 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
                <span className="font-label-caps text-[10px] uppercase tracking-wider text-surface-bright font-bold">
                  Editorial Capsule
                </span>
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-primary font-normal mt-2 leading-tight">
                The Monsoon Atelier Edit 2025
              </h4>
              <p className="font-body-sm text-body-sm text-primary-fixed opacity-90 mt-1">
                Raw silks, hand-pleated silhouettes, and saturated jewel tones calibrated for humidity
                and grace.
              </p>
            </div>
            <div className="relative z-10 flex flex-col gap-3 mt-auto pt-6">
              <div className="p-3 rounded-lg bg-surface-container-lowest/10 backdrop-blur-md">
                <span className="font-label-caps text-[10px] uppercase tracking-widest text-secondary-fixed block font-bold">
                  Privilege Unlocked
                </span>
                <p className="font-body-sm text-[12px] text-surface-bright mt-0.5 leading-snug">
                  Complimentary Pure Silk Scarf included on orders above ₹4,999.
                </p>
              </div>
              <LocalizedClientLink
                href="/store"
                className="w-full py-2.5 px-4 rounded bg-surface-container-lowest text-primary font-label-sm text-label-sm font-semibold uppercase tracking-wider text-center hover:bg-surface-container-low transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>Explore Capsule Drop</span>
                <span className="material-symbols-outlined text-[16px]">north_east</span>
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
