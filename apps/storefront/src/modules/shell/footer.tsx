import { Container } from "@/components/store/container"
import { Wordmark } from "@/components/store/wordmark"
import { listCategories, listCollections, listRegions } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { RegionSelect } from "./region-select"

const help = [
  { href: "/shipping", label: "Shipping & Dispatch" },
  { href: "/returns", label: "14-Day Doorstep Returns" },
  { href: "/contact", label: "Client Concierge" },
  { href: "/account", label: "Your Account" },
]

const legal = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
]

function Column({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string }[]
}) {
  if (links.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-label-caps text-xs font-bold tracking-widest uppercase text-white/90">
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5 text-xs sm:text-sm font-body-sm">
        {links.map((link) => (
          <li key={link.href}>
            <LocalizedClientLink
              href={link.href}
              className="text-stone-400 hover:text-white transition-colors"
            >
              {link.label}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function Footer() {
  const [regions, categories, collections] = await Promise.all([
    listRegions().catch(() => []),
    listCategories().catch(() => []),
    listCollections().catch(() => []),
  ])

  return (
    <footer className="mt-20 sm:mt-28 bg-[#18181b] text-white border-t border-stone-800">
      {/* Top Concierge & Newsletter Strip */}
      <div className="border-b border-stone-800/80 bg-stone-900/60 py-8">
        <Container className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <span className="font-label-caps text-[10px] text-secondary-fixed uppercase tracking-widest font-semibold">
              Everwear Atelier Club
            </span>
            <span className="font-headline-sm text-base sm:text-lg font-medium text-white">
              Complimentary seasonal lookbook &amp; private drop access.
            </span>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            <input
              type="email"
              placeholder="Enter your email address"
              className="h-10 flex-1 rounded-md bg-stone-800 border border-stone-700 px-3.5 text-xs text-white placeholder:text-stone-400 focus:outline-none focus:border-white"
            />
            <button
              type="button"
              className="h-10 px-4 rounded-md bg-white text-black font-label-sm text-xs font-bold tracking-wider uppercase hover:bg-stone-200 transition-colors shrink-0 cursor-pointer"
            >
              Join Club
            </button>
          </div>
        </Container>
      </div>

      {/* Main Footer Links */}
      <Container className="grid gap-12 py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-4">
          <Wordmark className="text-white [&_*]:text-white" />
          <p className="max-w-xs text-xs sm:text-sm text-stone-400 font-body-sm leading-relaxed">
            Contemporary fashion and everyday essentials engineered for European and Indian lifestyles. Handcrafted fabrics, calibrated sizing, zero friction.
          </p>
          <div className="pt-2">
            <span className="font-label-caps text-[10px] text-stone-400 uppercase tracking-widest block mb-2 font-bold">
              Shipping Destination:
            </span>
            <RegionSelect regions={regions} id="footer-region-select" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
          <Column
            title="Shop Catalog"
            links={[
              { href: "/store", label: "All Collections" },
              { href: "/store?sort=newest", label: "New Season Drops" },
              { href: "/store?sale=true", label: "Sale (Up to 50%)" },
              ...categories
                .filter((c) => !c.parentId)
                .map((c) => ({ href: `/categories/${c.handle}`, label: c.name })),
            ]}
          />
          <Column
            title="Curated Edits"
            links={collections.map((c) => ({ href: `/collections/${c.handle}`, label: c.title }))}
          />
          <Column title="Client Care" links={help} />
          <Column title="Policies" links={legal} />
        </div>
      </Container>

      {/* Bottom Legal & Currency Bar */}
      <div className="border-t border-stone-800 bg-stone-950/60 py-6 text-xs text-stone-400 font-body-sm">
        <Container className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Everwear Inc. Everyday Style. Your Way.</span>
          <div className="flex items-center gap-4 text-[11px] font-label-caps uppercase">
            <span>Prices inclusive of regional duties &amp; taxes</span>
            <span className="opacity-30">|</span>
            <span>Fast Express Dispatch</span>
          </div>
        </Container>
      </div>
    </footer>
  )
}
