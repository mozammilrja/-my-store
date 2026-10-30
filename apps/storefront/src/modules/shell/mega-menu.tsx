"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon } from "lucide-react"
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
        title: "Accessories & Horology",
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
    columns: [
      {
        title: "Indian & Festive Wear",
        links: [
          { label: "Kurtas & Co-ord Sets", href: "/store", badge: "NEW" },
          { label: "Sarees & Modern Drapes", href: "/store", badge: "TRENDING" },
          { label: "Lehenga Cholis", href: "/store" },
          { label: "Flared Anarkalis", href: "/store" },
        ],
      },
      {
        title: "Western & Modern",
        links: [
          { label: "Dresses & Sleek Jumpsuits", href: "/store" },
          { label: "Poplin Shirts & Tunics", href: "/categories/shirts" },
          { label: "Tailored Blazers & Outerwear", href: "/store" },
          { label: "Pleated Trousers & Culottes", href: "/categories/pants" },
        ],
      },
      {
        title: "Footwear & Bags",
        links: [
          { label: "Artisan Heels & Stilettos", href: "/store" },
          { label: "Handmade Kolhapuris & Juttis", href: "/store" },
          { label: "Pebbled Leather Totes", href: "/store" },
          { label: "Crossbody Sling Pouches", href: "/store" },
        ],
      },
    ],
    featured: {
      eyebrow: "Atelier Edition",
      title: "Spring/Summer Edit",
      description: "Fluid drapes in Maheshwari silk, handspun linens and muted earth tones.",
      href: "/store",
      cta: "View Festive Catalog",
    },
  },
  {
    id: "kids",
    label: "Kids",
    columns: [
      {
        title: "Boys (2-14 Yrs)",
        links: [
          { label: "Cotton Shirts & Tees", href: "/store" },
          { label: "Chinos & Cargo Shorts", href: "/store" },
          { label: "Kurta Sets", href: "/store" },
        ],
      },
      {
        title: "Girls (2-14 Yrs)",
        links: [
          { label: "Dresses & Jumpsuits", href: "/store" },
          { label: "Festive Lehenga & Sets", href: "/store" },
          { label: "Comfort Loungewear", href: "/store" },
        ],
      },
    ],
  },
  {
    id: "beauty",
    label: "Beauty & Formulations",
    columns: [
      {
        title: "Botanical Skincare",
        links: [
          { label: "Barrier Cream with Ceramides", href: "/store" },
          { label: "Plant Squalane Elixirs", href: "/store" },
          { label: "Niacinamide Pore Serums", href: "/store" },
          { label: "Mineral Sunscreen SPF 50+", href: "/store" },
        ],
      },
      {
        title: "Clean Certifications",
        links: [
          { label: "100% Vegan Certified", href: "/store" },
          { label: "Cold-Pressed Botanicals", href: "/store" },
          { label: "Cruelty-Free (PETA)", href: "/store" },
        ],
      },
    ],
    featured: {
      eyebrow: "Diagnostic",
      title: "Everwear Dermal Diagnostic",
      description: "90-second skin analysis to pinpoint your active lipid deficit.",
      href: "/store",
      cta: "Start Diagnostic",
    },
  },
  {
    id: "home",
    label: "Home & Living",
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  // Merge real categories into default department list
  const activeDepartment = DEPARTMENTS.find((d) => d.id === activeMenu)

  return (
    <nav
      aria-label="Department navigation"
      className="relative w-full bg-surface-bright border-b border-border/60 z-30 select-none"
      onMouseLeave={() => setActiveMenu(null)}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-6 py-2.5">
          {DEPARTMENTS.map((dept) => {
            const hasFlyout = !!dept.columns && dept.columns.length > 0
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
                className="relative"
                onMouseEnter={() => hasFlyout && setActiveMenu(dept.id)}
              >
                <LocalizedClientLink
                  href={targetHref}
                  onFocus={() => hasFlyout && setActiveMenu(dept.id)}
                  className={`font-label-sm text-xs uppercase tracking-wider py-2 relative block transition-colors ${
                    dept.isSale
                      ? "text-secondary font-bold hover:text-secondary/80 flex items-center gap-1.5"
                      : activeMenu === dept.id
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {dept.label}
                  {dept.badge && (
                    <span className="font-label-caps text-[9px] bg-secondary-container text-on-secondary-fixed px-1.5 py-0.2 rounded uppercase font-bold tracking-tight">
                      {dept.badge}
                    </span>
                  )}
                  {activeMenu === dept.id && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-foreground" />
                  )}
                </LocalizedClientLink>
              </div>
            )
          })}
        </div>

        <div className="hidden xl:flex items-center gap-4 text-xs font-label-caps uppercase text-muted-foreground shrink-0 pl-6">
          <LocalizedClientLink
            href="/shipping"
            className="hover:text-foreground transition-colors"
          >
            Track Order
          </LocalizedClientLink>
          <span className="opacity-30">|</span>
          <LocalizedClientLink
            href="/contact"
            className="hover:text-foreground transition-colors"
          >
            Find Atelier
          </LocalizedClientLink>
        </div>
      </div>

      {/* Flyout Mega Menu Dropdown */}
      {activeDepartment && activeDepartment.columns && (
        <div
          className="absolute top-full left-0 w-full bg-surface-container-lowest border-b border-border shadow-[0_20px_40px_-15px_rgba(24,24,27,0.08)] py-8 px-4 sm:px-6 lg:px-10 z-40 transition-all duration-200"
          onMouseEnter={() => setActiveMenu(activeDepartment.id)}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {activeDepartment.columns.map((col, idx) => (
              <div key={idx} className="flex flex-col gap-2.5">
                <span className="font-label-caps text-[11px] uppercase tracking-wider text-foreground font-bold">
                  {col.title}
                </span>
                <div className="h-0.5 w-6 bg-primary mb-1" />
                {col.links.map((link, lIdx) => (
                  <LocalizedClientLink
                    key={lIdx}
                    href={link.href}
                    onClick={() => setActiveMenu(null)}
                    className="font-body-sm text-xs text-muted-foreground hover:text-foreground transition-colors py-1 flex items-center justify-between group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">
                      {link.label}
                    </span>
                    {link.badge && (
                      <span className="font-label-caps text-[9px] bg-secondary-container text-on-secondary-fixed px-1 rounded font-bold">
                        {link.badge}
                      </span>
                    )}
                  </LocalizedClientLink>
                ))}
              </div>
            ))}

            {activeDepartment.featured && (
              <div className="bg-surface-container-low p-5 rounded-lg flex flex-col justify-between border border-border/40">
                <div className="flex flex-col gap-1.5">
                  <span className="font-label-caps text-[10px] text-accent uppercase font-bold tracking-wider">
                    {activeDepartment.featured.eyebrow}
                  </span>
                  <h4 className="font-headline-sm text-base text-foreground font-medium">
                    {activeDepartment.featured.title}
                  </h4>
                  <p className="font-body-sm text-xs text-muted-foreground mt-1">
                    {activeDepartment.featured.description}
                  </p>
                </div>
                <LocalizedClientLink
                  href={activeDepartment.featured.href}
                  onClick={() => setActiveMenu(null)}
                  className="font-label-sm text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5 hover:gap-2.5 transition-all mt-4 pt-3 border-t border-border/60"
                >
                  {activeDepartment.featured.cta}
                  <ArrowRightIcon className="size-3.5" />
                </LocalizedClientLink>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
