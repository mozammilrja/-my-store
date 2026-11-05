"use client"

import type { Customer } from "@lib/api/types"
import { signout } from "@lib/data/account"
import { notifyCartUpdated } from "@lib/util/cart-events"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  BellIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  HeartIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MapPinIcon,
  PackageIcon,
  RotateCcwIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/account/profile", label: "My Profile", icon: CircleUserRoundIcon },
  { href: "/account/orders", label: "Orders", icon: PackageIcon },
  { href: "/account/track-orders", label: "Track Orders", icon: TruckIcon },
  { href: "/account/returns", label: "Returns", icon: RotateCcwIcon },
  { href: "/account/wishlist", label: "Wishlist", icon: HeartIcon },
  { href: "/account/addresses", label: "Saved Addresses", icon: MapPinIcon },
  { href: "/account/payments", label: "Saved Cards & Wallet", icon: CreditCardIcon },
  { href: "/account/notifications", label: "Notifications", icon: BellIcon },
  { href: "/account/support", label: "Help & Support", icon: LifeBuoyIcon },
]

/** How long the menu waits before closing, so the pointer can cross the gap. */
const CLOSE_DELAY_MS = 150

/**
 * The header's profile icon with a "Your Account" menu that opens on hover
 * (and on keyboard focus). Signed in, it greets the customer and offers
 * Logout; signed out, it offers Login / Sign up. Who is signed in is looked
 * up when the menu opens, so the header itself stays static.
 */
export function AccountMenu() {
  const { countryCode } = useParams<{ countryCode: string }>()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const root = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    // /api/me, not the retrieveCustomer server action: hovering the icon on
    // the way to a link must not queue work in front of that click.
    fetch("/api/me", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ customer: Customer | null }>) : { customer: null }))
      .then((r) => setCustomer(r.customer))
      .catch(() => setCustomer(null))
  }, [])

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (!open) load()
    setOpen(true)
  }
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        root.current?.querySelector<HTMLElement>("[data-testid=nav-account-link]")?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const logout = async () => {
    setOpen(false)
    const next = await signout(countryCode)
    setCustomer(null)
    notifyCartUpdated()
    router.replace(next)
    router.refresh()
  }

  const name = customer ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") : ""

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide()
      }}
    >
      <LocalizedClientLink
        href="/account"
        aria-label="Account profile"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="nav-account-link"
        className="flex items-center gap-2 group"
      >
        {/* Black rounded square, the same on every route (fixed radius so the
            Stitch pages' radius scale doesn't change its shape). */}
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-on-primary transition-transform group-hover:scale-105">
          <span aria-hidden className="material-symbols-outlined text-[18px]">person</span>
        </span>
      </LocalizedClientLink>

      {open && (
        <div className="absolute right-0 top-full z-50 pt-2" data-testid="account-menu">
          <div
            role="menu"
            aria-label="Your Account"
            className="w-64 overflow-hidden rounded-xl border border-border/70 bg-surface-container-lowest py-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]"
          >
            <div className="px-5 pb-2 pt-1">
              {customer === undefined ? (
                <div className="h-10 animate-pulse rounded bg-surface-container-low" />
              ) : customer ? (
                <>
                  <p className="text-[15px] font-bold text-foreground">
                    Hello{name ? `, ${customer.firstName ?? name}` : ""}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground" title={customer.email}>
                    {customer.email}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-bold text-foreground">Welcome</p>
                  <p className="text-[12px] text-muted-foreground">
                    To access your account and manage orders
                  </p>
                  <LocalizedClientLink
                    href="/account"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="mt-3 flex h-9 items-center justify-center rounded-md border border-[#ff3f6c] text-[13px] font-bold uppercase tracking-wide text-[#ea0037] transition-colors hover:bg-[#ff3f6c] hover:text-white"
                    data-testid="account-menu-login"
                  >
                    Login / Sign up
                  </LocalizedClientLink>
                </>
              )}
            </div>

            <div className="my-1 border-t border-border/60" />
            <p className="px-5 pb-1 pt-2 text-[14px] font-bold text-foreground">Your Account</p>

            <ul>
              {LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <LocalizedClientLink
                    href={href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3.5 px-5 py-2.5 text-[14px] text-foreground transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none"
                  >
                    <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
                    {label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>

            {customer && (
              <>
                <div className="my-1 border-t border-border/60" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="flex w-full cursor-pointer items-center gap-3.5 px-5 py-2.5 text-left text-[14px] text-foreground transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none"
                  data-testid="account-menu-logout"
                >
                  <LogOutIcon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
