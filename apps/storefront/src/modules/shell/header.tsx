import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { Wordmark } from "@/components/store/wordmark"
import { listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { UserIcon } from "lucide-react"
import { Announcement } from "./announcement"
import { CartDrawer } from "./cart-drawer"
import { MobileNav, NavLink } from "./mobile-nav"
import { SearchDialog } from "./search-dialog"

export async function Header({ countryCode }: { countryCode: string }) {
  const [regions, categories] = await Promise.all([
    listRegions().catch(() => []),
    listCategories({ fields: "id,name,handle,parent_category_id" }).catch(() => []),
  ])

  const links: NavLink[] = [
    { href: "/store", label: "Shop all" },
    ...categories
      .filter((c) => !c.parent_category_id)
      .slice(0, 5)
      .map((c) => ({ href: `/categories/${c.handle}`, label: c.name })),
  ]

  return (
    <>
      <Announcement countryCode={countryCode} />
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <Container className="flex h-16 items-center gap-6 lg:h-[72px]">
          <MobileNav links={links} regions={regions} />

          <LocalizedClientLink href="/" aria-label="Everwear home" data-testid="nav-store-link" className="max-lg:mx-auto">
            <Wordmark />
          </LocalizedClientLink>

          <nav aria-label="Main" className="hidden flex-1 lg:block">
            <ul className="flex items-center gap-7 text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  <LocalizedClientLink
                    href={link.href}
                    className="py-2 underline-offset-[6px] transition-colors hover:text-primary hover:underline"
                  >
                    {link.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
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
