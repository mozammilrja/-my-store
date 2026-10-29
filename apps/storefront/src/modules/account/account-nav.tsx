"use client"

import { cn } from "@/lib/utils"
import { signout } from "@lib/data/account"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams, usePathname } from "next/navigation"

const LINKS = [
  { href: "/account", label: "Overview", testId: "overview-link" },
  { href: "/account/orders", label: "Orders", testId: "orders-link" },
  { href: "/account/profile", label: "Profile", testId: "profile-link" },
  { href: "/account/addresses", label: "Addresses", testId: "addresses-link" },
]

export function AccountNav() {
  const { countryCode } = useParams<{ countryCode: string }>()
  const path = usePathname().replace(`/${countryCode}`, "") || "/"

  return (
    <nav aria-label="Account" data-testid="account-nav">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0">
        {LINKS.map((link) => {
          const active = link.href === "/account" ? path === "/account" : path.startsWith(link.href)
          return (
            <li key={link.href}>
              <LocalizedClientLink
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap lg:border-b-0 lg:border-l-2 lg:px-4",
                  active ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                data-testid={link.testId}
              >
                {link.label}
              </LocalizedClientLink>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={() => signout(countryCode)}
            className="block shrink-0 px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground lg:px-4 lg:text-left"
            data-testid="logout-button"
          >
            Log out
          </button>
        </li>
      </ul>
    </nav>
  )
}
