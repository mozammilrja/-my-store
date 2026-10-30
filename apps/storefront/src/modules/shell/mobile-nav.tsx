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
import type { Region } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ChevronRightIcon, HeadphonesIcon, MenuIcon, SearchIcon, TruckIcon } from "lucide-react"
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
  regions: Region[]
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
      <SheetContent side="left" className="flex w-full flex-col gap-0 sm:max-w-sm bg-surface-container-lowest border-r border-border p-0">
        <SheetHeader className="p-6 border-b border-border/60 bg-surface-container-low/40">
          <SheetTitle asChild>
            <div className="flex flex-col">
              <Wordmark className="text-xl" />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-bold">
              Collections & Departments
            </span>
            <ul className="flex flex-col divide-y divide-border/40">
              {links.map((link) => (
                <li key={link.href}>
                  <LocalizedClientLink
                    href={link.href}
                    className="block py-3 font-headline-sm text-lg font-medium text-foreground hover:text-secondary transition-colors"
                  >
                    {link.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 border-t border-border/60 pt-6 flex flex-col gap-3">
            <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Customer Services
            </span>
            <ul className="flex flex-col gap-2.5 text-sm font-body-sm">
              <li>
                <LocalizedClientLink href="/account" className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
                  <span>Account & Orders</span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/search" className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
                  <span>Search Catalog</span>
                  <SearchIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/shipping" className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
                  <span>Shipping & Returns</span>
                  <TruckIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/contact" className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
                  <span>Concierge Service</span>
                  <HeadphonesIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
            </ul>
          </div>
        </nav>
        <div className="border-t border-border/60 p-6 bg-surface-container-low/40">
          <RegionSelect regions={regions} id="mobile-region-select" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
