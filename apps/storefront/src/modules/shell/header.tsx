import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { Wordmark } from "@/components/store/wordmark"
import { listCategories, listRegions } from "@lib/data/catalog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { UserIcon } from "lucide-react"
import { Announcement } from "./announcement"
import { CartDrawer } from "./cart-drawer"
import { MobileNav, NavLink } from "./mobile-nav"
import { SearchDialog } from "./search-dialog"

export const NEW_IN_HREF = "/store?sort=newest"

export async function Header({ countryCode }: { countryCode: string }) {
  const [regions, categories] = await Promise.all([
    listRegions().catch(() => []),
    listCategories().catch(() => []),
  ])

  const links: NavLink[] = [
    { href: NEW_IN_HREF, label: "New in" },
    { href: "/store", label: "Shop all" },
    ...categories
      .filter((c) => !c.parentId)
      .slice(0, 5)
      .map((c) => ({ href: `/categories/${c.handle}`, label: c.name })),
  ]

  return (
    <>
      <Announcement countryCode={countryCode} />
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[72px]">
          <div className="flex items-center gap-2">
            <MobileNav links={links} regions={regions} />
            <LocalizedClientLink href="/" aria-label="Everwear home" data-testid="nav-store-link" className="max-lg:hidden">
              <Wordmark />
            </LocalizedClientLink>
          </div>

          <LocalizedClientLink href="/" aria-label="Everwear home" className="lg:hidden">
            <Wordmark className="text-2xl" />
          </LocalizedClientLink>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-8 text-xs font-bold tracking-[0.12em] uppercase">
              {links.map((link) => (
                <li key={link.href}>
                  <LocalizedClientLink
                    href={link.href}
                    className="relative py-6 after:absolute after:inset-x-0 after:bottom-4 after:h-0.5 after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-300 hover:after:scale-x-100"
                  >
                    {link.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center justify-end gap-1">
            <SearchDialog />
            <Button variant="ghost" size="icon-sm" asChild className="max-sm:hidden">
              <LocalizedClientLink href="/account" aria-label="Account" data-testid="nav-account-link">
                <UserIcon aria-hidden />
              </LocalizedClientLink>
            </Button>
            <CartDrawer />
          </div>
        </Container>
      </header>
    </>
  )
}
