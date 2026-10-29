"use client"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Wordmark } from "@/components/store/wordmark"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { MenuIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { RegionSelect } from "./region-select"

export type NavLink = { href: string; label: string }

/** Small-screen navigation in a left-hand sheet. */
export function MobileNav({
  links,
  regions,
}: {
  links: NavLink[]
  regions: HttpTypes.StoreRegion[]
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu" data-testid="nav-menu-button">
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle asChild>
            <span>
              <Wordmark className="text-xl" />
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <LocalizedClientLink
                  href={link.href}
                  className="block py-2 font-display-tight text-5xl hover:text-muted-foreground"
                >
                  {link.label}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
          <ul className="mt-8 flex flex-col gap-3 border-t pt-6 text-sm">
            <li>
              <LocalizedClientLink href="/account" className="hover:text-primary">
                Account
              </LocalizedClientLink>
            </li>
            <li>
              <LocalizedClientLink href="/search" className="hover:text-primary">
                Search
              </LocalizedClientLink>
            </li>
          </ul>
        </nav>
        <div className="border-t p-4">
          <RegionSelect regions={regions} id="mobile-region-select" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
