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
import {
  ChevronDownIcon,
  ChevronRightIcon,
  HeadphonesIcon,
  MenuIcon,
  SearchIcon,
  TruckIcon,
} from "lucide-react"
import { useState } from "react"
import { RegionSelect } from "./region-select"
import { DEPARTMENTS_DATA } from "./mega-menu"
import { cn } from "@/lib/utils"

export type NavLink = { href: string; label: string }

export function MobileNav({
  _links,
  regions,
}: {
  links?: NavLink[]
  _links?: NavLink[]
  regions: Region[]
}) {
  const [open, setOpen] = useState(false)
  const [expandedDept, setExpandedDept] = useState<string | null>(null)

  const toggleDept = (id: string) => {
    setExpandedDept((prev) => (prev === id ? null : id))
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Open menu"
          data-testid="nav-menu-button"
        >
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-full flex-col gap-0 sm:max-w-sm bg-surface-container-lowest border-r border-border p-0"
      >
        <SheetHeader className="p-5 border-b border-border/60 bg-surface-container-low/40">
          <SheetTitle asChild>
            <div className="flex flex-col">
              <Wordmark className="text-xl" />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>

        <nav aria-label="Mobile Navigation" className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-bold">
              Departments &amp; Categories
            </span>

            <ul className="flex flex-col divide-y divide-border/40">
              {DEPARTMENTS_DATA.map((dept) => {
                const isExpanded = expandedDept === dept.id
                return (
                  <li key={dept.id} className="py-1">
                    <div className="flex items-center justify-between">
                      <LocalizedClientLink
                        href={dept.href}
                        onClick={() => setOpen(false)}
                        className="py-2.5 font-headline-sm text-base font-semibold text-foreground hover:text-secondary transition-colors"
                      >
                        {dept.label}
                      </LocalizedClientLink>
                      <button
                        type="button"
                        onClick={() => toggleDept(dept.id)}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Toggle ${dept.label} categories`}
                      >
                        <ChevronDownIcon
                          className={cn(
                            "size-4 transition-transform duration-200",
                            isExpanded && "rotate-180 text-secondary"
                          )}
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pl-3 pb-3 pt-1 flex flex-col gap-4 border-l-2 border-secondary/40 ml-1.5 my-1 bg-surface-container-low/20 rounded-r-lg">
                        {dept.columns.map((col, cIdx) => (
                          <div key={cIdx} className="flex flex-col gap-3">
                            {col.map((section, sIdx) => (
                              <div key={sIdx} className="flex flex-col gap-1">
                                <LocalizedClientLink
                                  href={section.href || dept.href}
                                  onClick={() => setOpen(false)}
                                  className="font-label-caps text-[11px] font-bold text-secondary uppercase tracking-tight hover:underline"
                                >
                                  {section.title}
                                </LocalizedClientLink>

                                {section.links.length > 0 && (
                                  <ul className="flex flex-col gap-1 pl-2 pt-0.5">
                                    {section.links.map((link, lIdx) => (
                                      <li key={lIdx}>
                                        <LocalizedClientLink
                                          href={link.href}
                                          onClick={() => setOpen(false)}
                                          className="text-xs text-muted-foreground hover:text-foreground py-0.5 block truncate"
                                        >
                                          {link.label}
                                        </LocalizedClientLink>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}

              {/* Quick Direct Links */}
              <li className="py-2.5">
                <LocalizedClientLink
                  href="/store?sort=newest"
                  onClick={() => setOpen(false)}
                  className="font-headline-sm text-base font-medium text-foreground hover:text-secondary transition-colors"
                >
                  New Arrivals
                </LocalizedClientLink>
              </li>

              <li className="py-2.5">
                <LocalizedClientLink
                  href="/store?sale=true"
                  onClick={() => setOpen(false)}
                  className="font-headline-sm text-base font-bold text-secondary flex items-center justify-between"
                >
                  <span>Sale</span>
                  <span className="font-label-caps text-[9px] bg-secondary-container text-on-secondary-fixed px-1.5 py-0.2 rounded uppercase font-bold tracking-tight">
                    Up to 50%
                  </span>
                </LocalizedClientLink>
              </li>
            </ul>
          </div>

          <div className="mt-8 border-t border-border/60 pt-5 flex flex-col gap-3">
            <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Customer Services
            </span>
            <ul className="flex flex-col gap-2.5 text-sm font-body-sm">
              <li>
                <LocalizedClientLink
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between"
                >
                  <span>Account &amp; Orders</span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/search"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between"
                >
                  <span>Search Catalog</span>
                  <SearchIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/shipping"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between"
                >
                  <span>Shipping &amp; Returns</span>
                  <TruckIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between"
                >
                  <span>Concierge Service</span>
                  <HeadphonesIcon className="size-4 text-muted-foreground" />
                </LocalizedClientLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="border-t border-border/60 p-5 bg-surface-container-low/40">
          <RegionSelect regions={regions} id="mobile-region-select" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
