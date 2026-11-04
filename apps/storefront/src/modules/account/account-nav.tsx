"use client"

import { cn } from "@/lib/utils"
import type { Customer } from "@lib/api/types"
import { signout } from "@lib/data/account"
import { notifyCartUpdated } from "@lib/util/cart-events"
import { useWishlist } from "@lib/util/wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const NAV_ITEMS = [
  { href: "/account", label: "Overview", icon: "dashboard", testId: "overview-link", exact: true },
  { href: "/account/orders", label: "My Orders", icon: "inventory_2", testId: "orders-link" },
  { href: "/account/track-orders", label: "Track Orders", icon: "local_shipping", testId: "track-link" },
  { href: "/account/returns", label: "Returns & Refunds", icon: "published_with_changes", testId: "returns-link" },
  { href: "/account/wishlist", label: "Wishlist", icon: "favorite", testId: "wishlist-link", badge: "wishlist" },
  { href: "/account/addresses", label: "Saved Addresses", icon: "pin_drop", testId: "addresses-link" },
  { href: "/account/profile", label: "Profile Information", icon: "account_circle", testId: "profile-link" },
  { href: "/account/payments", label: "Payment Methods", icon: "credit_card", testId: "payments-link" },
  { href: "/account/notifications", label: "Notifications", icon: "notifications", testId: "notifications-link", badge: "2" },
  { href: "/account/support", label: "Help & Support", icon: "help_outline", testId: "support-link" },
]

export function AccountNav({ customer }: { customer?: Customer | null }) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const router = useRouter()
  const signOut = async () => {
    const next = await signout(countryCode)
    // The bag cookie is gone; tell the header's bag count to reload.
    notifyCartUpdated()
    router.replace(next)
    router.refresh()
  }
  const pathname = usePathname()
  const path = pathname.replace(`/${countryCode}`, "") || "/"
  const { count: wishlistCount } = useWishlist()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("/images/default-avatar.svg")
  const [avatarStyle, setAvatarStyle] = useState<"default" | "initials" | "custom">("default")

  const initials = customer?.firstName
    ? `${customer.firstName[0]}${customer.lastName?.[0] ?? ""}`.toUpperCase()
    : (customer?.email?.[0] ?? "V").toUpperCase()

  useEffect(() => {
    const loadAvatar = () => {
      try {
        if (!customer?.id) return
        const stored = localStorage.getItem(`ew_avatar_${customer.id}`)
        const style =
          (localStorage.getItem(`ew_avatar_style_${customer.id}`) as "default" | "initials" | "custom") ?? "default"
        setAvatarStyle(style)
        if (stored && style === "custom") {
          setAvatarUrl(stored)
        } else {
          setAvatarUrl("/images/default-avatar.svg")
        }
      } catch {
        // ignore
      }
    }
    loadAvatar()
    window.addEventListener("avatar-changed", loadAvatar)
    return () => window.removeEventListener("avatar-changed", loadAvatar)
  }, [customer?.id])

  const displayName = customer?.firstName
    ? `${customer.firstName} ${customer.lastName ?? ""}`.trim()
    : customer?.email
    ? customer.email.split("@")[0]
    : "Valued Client"

  const isLinkActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.exact) {
      return path === "/account" || path === "/account/"
    }
    return path.startsWith(item.href)
  }

  const currentItem = NAV_ITEMS.find(isLinkActive) ?? NAV_ITEMS[0]

  return (
    <>
      {/* Mobile Bar & Dropdown for Small Screens */}
      <div className="w-full lg:hidden mb-6 flex flex-col gap-2">
        <div className="flex items-center justify-between p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-container-high border border-surface-container-high relative flex items-center justify-center shrink-0">
              {avatarStyle === "initials" ? (
                <div className="w-full h-full bg-primary text-on-primary flex items-center justify-center font-label-md font-bold">
                  {initials}
                </div>
              ) : (
                <Image src={avatarUrl} alt={displayName} fill sizes="36px" className="object-cover" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-on-surface font-semibold line-clamp-1">{displayName}</span>
              <span className="font-label-caps text-[9px] text-secondary font-bold uppercase">Privilege Member</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-sm border border-outline-variant shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">{currentItem.icon}</span>
            <span>{currentItem.label}</span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              {mobileMenuOpen ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="p-space-md bg-surface-container-low rounded-xl border border-surface-container-high shadow-md animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col gap-1">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isLinkActive(item)
                return (
                  <LocalizedClientLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all font-label-md text-label-md",
                      active
                        ? "bg-secondary text-on-secondary font-semibold shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    )}
                    data-testid={item.testId}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge === "wishlist" && wishlistCount > 0 && (
                      <span
                        className={cn(
                          "font-label-caps text-label-caps px-2 py-0.5 rounded-full text-[10px]",
                          active ? "bg-on-secondary/20 text-on-secondary" : "bg-surface-container text-on-surface-variant"
                        )}
                      >
                        {wishlistCount}
                      </span>
                    )}
                    {item.badge === "2" && (
                      <span className="font-label-caps text-label-caps bg-secondary text-on-secondary px-2 py-0.5 rounded-full font-bold text-[10px]">
                        2
                      </span>
                    )}
                  </LocalizedClientLink>
                )
              })}
            </nav>
            <div className="pt-2 mt-2 border-t border-surface-container-high">
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-error hover:bg-error-container hover:text-on-error-container transition-all font-label-md text-label-md w-full"
                data-testid="logout-button"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Persistent Stitch Sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 sticky top-28 self-start max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar bg-surface-container-low p-space-md rounded-2xl flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.02)] border border-surface-container-high/60">
        <div className="flex flex-col gap-space-md">
          {/* Customer Avatar & Member Badge Card */}
          <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container-high border-2 border-surface-container-lowest shadow-inner relative flex items-center justify-center mb-space-sm">
              {avatarStyle === "initials" ? (
                <div className="w-full h-full bg-primary text-on-primary flex items-center justify-center font-headline-sm font-semibold tracking-wider">
                  {initials}
                </div>
              ) : (
                <Image src={avatarUrl} alt={displayName} fill sizes="64px" className="object-cover" />
              )}
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold capitalize truncate max-w-[220px]">
              {displayName}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[220px] mt-0.5">
              {customer?.email ?? "atelier.client@everwear.com"}
            </p>
            <div className="mt-space-sm px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase font-bold flex items-center gap-1 shadow-2xs">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>Atelier Privilege Gold Member</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1" data-testid="account-nav">
            {NAV_ITEMS.map((item) => {
              const active = isLinkActive(item)
              return (
                <LocalizedClientLink
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all font-label-md text-label-md group",
                    active
                      ? "bg-secondary text-on-secondary font-semibold shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  )}
                  data-testid={item.testId}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "material-symbols-outlined text-[20px] transition-transform group-hover:scale-105",
                        active ? "text-on-secondary" : "text-on-surface-variant"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge === "wishlist" && wishlistCount > 0 && (
                    <span
                      className={cn(
                        "font-label-caps text-label-caps px-2 py-0.5 rounded-full text-[10px]",
                        active
                          ? "bg-on-secondary/20 text-on-secondary font-bold"
                          : "bg-surface-container text-on-surface-variant"
                      )}
                    >
                      {wishlistCount}
                    </span>
                  )}
                  {item.badge === "2" && (
                    <span
                      className={cn(
                        "font-label-caps text-label-caps px-2 py-0.5 rounded-full text-[10px] font-bold",
                        active
                          ? "bg-on-secondary text-secondary"
                          : "bg-secondary text-on-secondary"
                      )}
                    >
                      2
                    </span>
                  )}
                </LocalizedClientLink>
              )
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="pt-space-md border-t border-surface-container-high mt-space-md">
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-error hover:bg-error-container hover:text-on-error-container transition-all font-label-md text-label-md w-full cursor-pointer text-left"
            data-testid="logout-button"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
