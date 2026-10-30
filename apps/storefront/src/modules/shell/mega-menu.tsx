"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type CategoryLink = {
  href: string
  label: string
}

const MEN_COLUMNS = [
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
]

export function MegaMenu({
  _catalogCategories = [],
}: {
  _catalogCategories?: Array<{ id: string; name: string; handle: string }>
}) {
  return (
    <nav className="relative w-full bg-surface shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-space-lg py-2.5">
          {/* Men with Hover Flyout */}
          <div className="group static">
            <LocalizedClientLink
              href="/"
              className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2 relative block after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 group-hover:after:scale-x-100 after:transition-transform"
            >
              Men
            </LocalizedClientLink>

            <div className="hidden group-hover:block absolute top-full left-0 w-full bg-surface-container-lowest shadow-[0_20px_40px_-15px_rgba(24,24,27,0.07)] p-space-xl z-50 transition-all border-b border-border/40">
              <div className="max-w-[1440px] mx-auto grid grid-cols-5 gap-space-xl">
                {MEN_COLUMNS.map((col, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
                      {col.title}
                    </span>
                    <div className="h-px w-8 bg-primary mb-2" />
                    {col.links.map((link, lIdx) => (
                      <LocalizedClientLink
                        key={lIdx}
                        href={link.href}
                        className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors py-0.5"
                      >
                        {link.label}
                      </LocalizedClientLink>
                    ))}
                  </div>
                ))}

                {/* 5th Column: Minimalist Wardrobe Lookbook */}
                <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-caps text-label-caps text-on-tertiary-container uppercase font-semibold">
                      Curated Campaign
                    </span>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface font-light">
                      The Minimalist Wardrobe
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      24 foundational garments engineered for effortless versatility.
                    </p>
                  </div>
                  <LocalizedClientLink
                    href="/store"
                    className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all mt-4"
                  >
                    Explore Lookbook{" "}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </LocalizedClientLink>
                </div>
              </div>
            </div>
          </div>

          {/* Women - Active Page in this Design */}
          <LocalizedClientLink
            href="/"
            aria-current="page"
            className="font-label-sm text-label-sm uppercase tracking-wide transition-colors py-2 text-on-surface font-semibold relative block after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary"
          >
            Women
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Kids
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Home &amp; Living
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Beauty &amp; Personal Care
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Footwear
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Accessories
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Sports &amp; Activewear
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Jewellery
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            New Arrivals
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors py-2"
          >
            Trending
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/store?sale=true"
            className="font-label-sm text-label-sm uppercase tracking-wide text-on-secondary-container hover:text-secondary font-semibold py-2 flex items-center gap-1.5"
          >
            Sale{" "}
            <span className="font-label-caps text-[9px] bg-secondary-container text-on-secondary-fixed px-1.5 py-0.2 rounded uppercase font-bold tracking-tight">
              Up to 50%
            </span>
          </LocalizedClientLink>
        </div>

        {/* Right Shortcuts */}
        <div className="hidden xl:flex items-center gap-4 text-on-surface-variant shrink-0 pl-4">
          <LocalizedClientLink
            href="/order"
            className="font-label-caps text-label-caps uppercase hover:text-on-surface transition-colors font-medium"
          >
            Track Order
          </LocalizedClientLink>
          <span className="opacity-20">|</span>
          <LocalizedClientLink
            href="/contact"
            className="font-label-caps text-label-caps uppercase hover:text-on-surface transition-colors font-medium"
          >
            Find Atelier
          </LocalizedClientLink>
        </div>
      </div>
    </nav>
  )
}
