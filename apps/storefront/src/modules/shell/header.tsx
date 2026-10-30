import { listCategories, listRegions, getStorePolicies } from "@lib/data/catalog"
import { deliveryDays } from "@lib/util/policies"
import { Wordmark } from "@/components/store/wordmark"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Announcement } from "./announcement"
import { CartDrawer } from "./cart-drawer"
import { MegaMenu } from "./mega-menu"
import { MobileNav, NavLink } from "./mobile-nav"
import { SearchDialog } from "./search-dialog"

export const NEW_IN_HREF = "/store?sort=newest"

export async function Header({ countryCode }: { countryCode: string }) {
  const [regions, categories, policies] = await Promise.all([
    listRegions().catch(() => []),
    listCategories().catch(() => []),
    getStorePolicies(countryCode).catch(() => ({ current: null })),
  ])

  const links: NavLink[] = [
    { href: "/store", label: "Shop all" },
    { href: NEW_IN_HREF, label: "New in" },
    { href: "/store?sale=true", label: "Sale" },
    ...categories
      .filter((c) => !c.parentId)
      .slice(0, 6)
      .map((c) => ({ href: `/categories/${c.handle}`, label: c.name })),
  ]

  const deliveryInfo = policies.current
    ? {
        deliveryDays: String(deliveryDays(policies.current)),
        returnDays: policies.current.returnWindowDays,
        freeReturns: policies.current.freeReturns,
      }
    : null

  return (
    <>
      <Announcement countryCode={countryCode} deliveryInfo={deliveryInfo} />
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-border/60">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
          <div className="h-20 flex items-center justify-between gap-space-lg">
            {/* Left: Mobile Trigger & Brand Wordmark */}
            <div className="flex items-center gap-space-md shrink-0">
              <MobileNav links={links} regions={regions} />
              <LocalizedClientLink
                href="/"
                aria-label="Everwear home"
                data-testid="nav-store-link"
                className="flex items-center"
              >
                <Wordmark />
              </LocalizedClientLink>
            </div>

            {/* Center: Omnichannel Search Bar from Stitch */}
            <div className="flex-1 max-w-2xl hidden md:flex items-center">
              <SearchDialog desktopBar={true} />
            </div>

            {/* Right: Concierge, Wishlist, Search (mobile), Bag, Profile */}
            <div className="flex items-center gap-space-md shrink-0">
              <LocalizedClientLink
                href="/contact"
                className="hidden lg:flex flex-col items-center px-2 py-1 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">support_agent</span>
                <span className="font-label-caps text-label-caps uppercase mt-1">Concierge</span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account"
                className="relative flex flex-col items-center px-2 py-1 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">favorite</span>
                <span className="absolute top-0 right-1 w-4 h-4 bg-primary text-on-primary font-label-caps text-[9px] rounded-full flex items-center justify-center font-bold">
                  3
                </span>
                <span className="hidden lg:inline font-label-caps text-label-caps uppercase mt-1">
                  Wishlist
                </span>
              </LocalizedClientLink>

              <div className="md:hidden">
                <SearchDialog desktopBar={false} />
              </div>

              <CartDrawer />

              <div className="flex items-center gap-2 pl-2">
                <LocalizedClientLink
                  href="/account"
                  aria-label="Account profile"
                  data-testid="nav-account-link"
                  className="flex items-center gap-2 group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                  </div>
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Category Mega-Menu Navigation */}
        <div className="hidden lg:block">
          <MegaMenu _catalogCategories={categories} />
        </div>
      </header>
    </>
  )
}
