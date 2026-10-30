import { listCategories, listRegions, getStorePolicies } from "@lib/data/catalog"
import { deliveryDays } from "@lib/util/policies"
import { Wordmark } from "@/components/store/wordmark"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HeadphonesIcon, HeartIcon, UserIcon } from "lucide-react"
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
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-border/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="h-20 flex items-center justify-between gap-4 lg:gap-8">
            {/* Left: Mobile Trigger & Brand Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
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
            <div className="flex-1 max-w-xl hidden md:flex items-center">
              <SearchDialog desktopBar={true} />
            </div>

            {/* Right: Concierge, Wishlist, Search (mobile), Bag, Profile */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <LocalizedClientLink
                href="/contact"
                className="hidden lg:flex flex-col items-center px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HeadphonesIcon className="size-4.5" aria-hidden />
                <span className="font-label-caps text-[9px] uppercase mt-1 font-bold">
                  Concierge
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="/account"
                className="relative hidden sm:flex flex-col items-center px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HeartIcon className="size-4.5" aria-hidden />
                <span className="font-label-caps text-[9px] uppercase mt-1 font-bold">
                  Wishlist
                </span>
              </LocalizedClientLink>

              <div className="md:hidden">
                <SearchDialog desktopBar={false} />
              </div>

              <CartDrawer />

              <LocalizedClientLink
                href="/account"
                aria-label="Account profile"
                data-testid="nav-account-link"
                className="flex items-center justify-center size-8 sm:size-9 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity ml-1"
              >
                <UserIcon className="size-4" aria-hidden />
              </LocalizedClientLink>
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
