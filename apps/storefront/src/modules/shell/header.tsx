import { listCategories, getStorePolicies } from "@lib/data/catalog"
import { deliveryDays } from "@lib/util/policies"
import { Wordmark } from "@/components/store/wordmark"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Announcement } from "./announcement"
import { HeaderIcons } from "./header-icons"
import { bagCount } from "./bag-count"
import { MegaMenu } from "./mega-menu"
import { MobileNav, NavLink } from "./mobile-nav"
import { SearchDialog } from "./search-dialog"

export const NEW_IN_HREF = "/store?sort=newest"

export async function Header({ countryCode }: { countryCode: string }) {
  const [categories, policies] = await Promise.all([
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
      <Announcement deliveryInfo={deliveryInfo} />
      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-border/60">
        <div className="w-full px-margin-mobile md:px-margin">
          <div className="h-20 flex items-center justify-between gap-space-sm md:gap-space-lg">
            {/* Left: Mobile Trigger & Brand Wordmark */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3 shrink-0">
              <MobileNav links={links} />
              <LocalizedClientLink
                href="/"
                aria-label="EVERWEAR home"
                data-testid="nav-store-link"
                className="flex items-center min-h-11"
              >
                <Wordmark showMark />
              </LocalizedClientLink>
            </div>

            {/* Center: Omnichannel Search Bar from Stitch */}
            <div className="flex-1 max-w-2xl hidden lg:flex items-center min-w-0">
              <SearchDialog desktopBar={true} />
            </div>

            {/* Right: search (below lg) + the shared header icon row, identical on every route. */}
            <div className="flex items-center gap-1 sm:gap-space-sm shrink-0">
              <div className="lg:hidden">
                <SearchDialog desktopBar={false} />
              </div>
              <HeaderIcons initialBag={await bagCount()} />
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
