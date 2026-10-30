"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState } from "react"

export type CategoryLink = {
  href: string
  label: string
}

type DepartmentMenu = {
  id: string
  label: string
  badge?: string
  badgeClass?: string
  isSale?: boolean
  columns?: {
    title: string
    links: { label: string; href: string; badge?: string }[]
  }[]
  featured?: {
    eyebrow: string
    title: string
    description: string
    href: string
    cta: string
  }
}

const DEPARTMENTS: DepartmentMenu[] = [
  {
    id: "men",
    label: "Men",
    columns: [
      {
        title: "Apparel & Tailoring",
        links: [
          { label: "Oversized Tees & Polos", href: "/categories/sweatshirts" },
          { label: "Linen & Oxford Shirts", href: "/categories/shirts" },
          { label: "Structured Blazers", href: "/categories/shirts" },
          { label: "Pleated Trousers & Chinos", href: "/categories/pants" },
          { label: "Merino Knitwear", href: "/categories/sweatshirts" },
        ],
      },
      {
        title: "Footwear & Leather",
        links: [
          { label: "Handcrafted Loafers", href: "/store" },
          { label: "Minimalist Leather Sneakers", href: "/store" },
          { label: "Chelsea & Derby Boots", href: "/store" },
          { label: "Holdalls & Folios", href: "/store" },
          { label: "Calfskin Belts", href: "/store" },
        ],
      },
      {
        title: "Ethnic & Atelier",
        links: [
          { label: "Silk Blend Kurtas", href: "/store" },
          { label: "Bandhgala Jackets", href: "/store" },
          { label: "Textured Nehru Vests", href: "/store" },
          { label: "Occasion Sherwanis", href: "/store" },
        ],
      },
      {
        title: "Accessories & Watches",
        links: [
          { label: "Chronographs & Timepieces", href: "/store" },
          { label: "Titanium Sunglasses", href: "/store" },
          { label: "Artisanal Fragrance", href: "/store" },
          { label: "Sterling Silver Cuffs", href: "/store" },
        ],
      },
    ],
    featured: {
      eyebrow: "Curated Campaign",
      title: "The Minimalist Wardrobe",
      description: "24 foundational garments engineered for effortless versatility.",
      href: "/store",
      cta: "Explore Lookbook",
    },
  },
  {
    id: "women",
    label: "Women",
  },
  {
    id: "kids",
    label: "Kids",
  },
  {
    id: "home",
    label: "Home & Living",
  },
  {
    id: "beauty",
    label: "Beauty & Personal Care",
  },
  {
    id: "footwear",
    label: "Footwear",
  },
  {
    id: "accessories",
    label: "Accessories",
  },
  {
    id: "sports",
    label: "Sports & Activewear",
  },
  {
    id: "jewellery",
    label: "Jewellery",
  },
  {
    id: "new-arrivals",
    label: "New Arrivals",
  },
  {
    id: "trending",
    label: "Trending",
  },
  {
    id: "sale",
    label: "Sale",
    badge: "Up to 50%",
    isSale: true,
  },
]

export function MegaMenu({
  _catalogCategories = [],
}: {
  _catalogCategories?: { id: string; name: string; handle: string }[]
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  return (
    <nav
      aria-label="Department navigation"
      className="relative w-full bg-surface shadow-[0_1px_0_rgba(0,0,0,0.04)] select-none"
      onMouseLeave={() => setOpenMenu(null)}
    >
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between overflow-x-auto lg:overflow-x-visible no-scrollbar">
        <div className="flex items-center gap-space-lg py-2.5">
          {DEPARTMENTS.map((dept) => {
            const isMen = dept.id === "men"
            const hasFlyout = !!dept.columns && dept.columns.length > 0
            const isOpen = openMenu === dept.id
            const targetHref = dept.isSale
              ? "/store?sale=true"
              : dept.id === "new-arrivals"
                ? "/store?sort=newest"
                : dept.id === "trending"
                  ? "/store"
                  : `/store`

            return (
              <div
                key={dept.id}
                className="group static"
                onMouseEnter={() => hasFlyout && setOpenMenu(dept.id)}
              >
                <LocalizedClientLink
                  href={targetHref}
                  className={`uppercase tracking-wide transition-colors py-2 relative block font-label-sm text-label-sm ${
                    isMen
                      ? "text-on-surface font-semibold after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-100"
                      : dept.isSale
                        ? "text-on-secondary-container hover:text-secondary font-semibold flex items-center gap-1.5"
                        : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {dept.label}
                  {dept.badge && (
                    <span className="font-label-caps text-[9px] bg-secondary-container text-on-secondary-fixed px-1.5 py-0.2 rounded uppercase font-bold tracking-tight">
                      {dept.badge}
                    </span>
                  )}
                </LocalizedClientLink>

                {hasFlyout && (
                  <div
                    className={`${
                      isOpen ? "block" : "hidden group-hover:block"
                    } absolute top-full left-0 w-full bg-surface-container-lowest border-b border-border shadow-[0_20px_40px_-15px_rgba(24,24,27,0.08)] p-space-xl z-50 transition-all`}
                  >
                    <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-space-xl">
                      {dept.columns?.map((col, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
                            {col.title}
                          </span>
                          <div className="h-px w-8 bg-primary mb-2" />
                          {col.links.map((link, lIdx) => (
                            <LocalizedClientLink
                              key={lIdx}
                              href={link.href}
                              className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors py-0.5 flex items-center justify-between group/link"
                            >
                              <span className="group-hover/link:translate-x-0.5 transition-transform">
                                {link.label}
                              </span>
                              {link.badge && (
                                <span className="font-label-caps text-[9px] bg-secondary-container text-on-secondary-fixed px-1.5 rounded font-bold">
                                  {link.badge}
                                </span>
                              )}
                            </LocalizedClientLink>
                          ))}
                        </div>
                      ))}

                      {dept.featured && (
                        <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="font-label-caps text-label-caps text-on-tertiary-container uppercase font-bold">
                              {dept.featured.eyebrow}
                            </span>
                            <h4 className="font-headline-sm text-headline-sm text-on-surface font-light">
                              {dept.featured.title}
                            </h4>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                              {dept.featured.description}
                            </p>
                          </div>
                          <LocalizedClientLink
                            href={dept.featured.href}
                            className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all mt-4"
                          >
                            {dept.featured.cta}{" "}
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </LocalizedClientLink>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="hidden xl:flex items-center gap-4 text-on-surface-variant shrink-0 pl-4 font-label-caps text-label-caps uppercase">
          <LocalizedClientLink
            href="/shipping"
            className="hover:text-on-surface transition-colors"
          >
            Track Order
          </LocalizedClientLink>
          <span className="opacity-20">|</span>
          <LocalizedClientLink
            href="/contact"
            className="hover:text-on-surface transition-colors"
          >
            Find Atelier
          </LocalizedClientLink>
        </div>
      </div>
    </nav>
  )
}
