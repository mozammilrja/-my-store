import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Icon } from "@/components/ui/icon"

const PILLARS = [
  {
    icon: "checkroom",
    title: "Apparel & Tailoring",
    items: [
      { name: "T-Shirts (Oversized & Fitted)", count: 320, href: "/store?category=sweatshirts" },
      { name: "Casual & Resort Shirts", count: 280, href: "/store?category=shirts" },
      { name: "Formal Business Shirts", count: 140, href: "/store?category=shirts" },
      { name: "Knit & Heavyweight Polos", count: 190, href: "/store?category=sweatshirts" },
      { name: "Hoodies & Sweatshirts", count: 110, href: "/store?category=sweatshirts" },
      { name: "Deconstructed Blazers & Suits", count: 85, href: "/store" },
      { name: "Selvedge Jeans & Denims", count: 165, href: "/store?category=pants" },
      { name: "Pleated Chinos & Trousers", count: 145, href: "/store?category=pants" },
      { name: "Utility Cargos & Joggers", count: 95, href: "/store?category=pants" },
      { name: "Artisanal Kurtas & Sherwanis", count: 180, href: "/store" },
      { name: "Nehru Jackets & Vests", count: 65, href: "/store" },
      { name: "Innerwear & Loungewear", count: 90, href: "/store" },
    ],
  },
  {
    icon: "steps",
    title: "Footwear & Soles",
    items: [
      { name: "Handcrafted Penny Loafers", count: 68, href: "/store" },
      { name: "Minimalist Leather Sneakers", count: 120, href: "/store" },
      { name: "Casual Canvas Trainers", count: 54, href: "/store" },
      { name: "Chelsea & Derby Leather Boots", count: 42, href: "/store" },
      { name: "Traditional Mojaris & Juttis", count: 48, href: "/store" },
      { name: "Leather Slides & Sandals", count: 35, href: "/store" },
    ],
  },
  {
    icon: "watch",
    title: "Accessories & Horology",
    items: [
      { name: "Chronographs & Automatic Watches", count: 72, href: "/store" },
      { name: "Titanium Sunglasses & Frames", count: 55, href: "/store" },
      { name: "Full-Grain Leather Belts", count: 48, href: "/store" },
      { name: "Bifold Wallets & Card Holders", count: 60, href: "/store" },
      { name: "Duffels, Folios & Backpacks", count: 38, href: "/store" },
      { name: "Curated Sterling Silver Cuffs", count: 24, href: "/store" },
    ],
  },
  {
    icon: "spa",
    title: "Apothecary & Grooming",
    items: [
      { name: "Artisanal Extrait de Parfum", count: 45, href: "/store" },
      { name: "Beard Conditioning Oils & Balms", count: 28, href: "/store" },
      { name: "Minimal Routine Skincare Kits", count: 32, href: "/store" },
      { name: "Solid Shaving Soaps & Razors", count: 19, href: "/store" },
      { name: "Travel Grooming Organizers", count: 14, href: "/store" },
    ],
  },
]

export function WardrobeDirectory() {
  return (
    <section className="w-full px-margin-mobile md:px-margin my-12" id="category-directory">
      <div className="bg-surface-container-low rounded-xl p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-surface-container">
          <div>
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
              Complete Taxonomy
            </span>
            <h2 className="font-headline-lg text-headline-lg font-normal tracking-tight text-on-surface mt-1">
              Men&apos;s Wardrobe Directory
            </h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
            Navigate 4 flagship classifications covering 24 distinct sartorial categories.
          </p>
        </div>

        {/* 4 Column Taxonomic Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((pillar, idx) => (
            <div key={idx} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2">
                <Icon name={pillar.icon} size={20} className="text-primary" />
                <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">
                  {pillar.title}
                </h3>
              </div>
              <ul className="flex flex-col gap-1.5">
                {pillar.items.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <LocalizedClientLink
                      href={item.href}
                      className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface hover:translate-x-1 transition-all flex items-center justify-between group"
                    >
                      <span className="group-hover:text-on-surface transition-colors">
                        {item.name}
                      </span>
                      <span className="font-label-caps text-[10px] text-outline">
                        {item.count}
                      </span>
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
