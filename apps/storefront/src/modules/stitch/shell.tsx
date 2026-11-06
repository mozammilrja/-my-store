import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { ReactNode } from "react"
import { SearchField } from "./search-field"
import { HeaderIcons } from "@modules/shell/header-icons"
import { bagCount } from "@modules/shell/bag-count"
import { OrderHeaderFrame } from "./order-header-frame"

/*
 * The headers and footers of the Stitch page exports
 * (stitch_everwear_fashion_commerce_admin/*), ported markup-for-markup. Four
 * header variants and three footers appear across the designs:
 *
 *   CheckoutHeader: address, delivery, shipping, payment, payment declined
 *   SecureHeader (no footer):        3-D Secure / bank authentication
 *   TrackingHeader: live tracking, tax invoice
 *   OrderHeader:       order confirmed
 *
 * The exports link everything to "#"; here every link goes to the real page,
 * search submits to /search, and the bag/wishlist badges show real counts
 * (and are hidden at zero rather than showing the designs' sample numbers).
 */

/** Material Symbols glyph, as the exports use them. */
export function MIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  )
}

/** Wraps a migrated page: Stitch radius scale (see globals.css) and base canvas. */
export function StitchPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`stitch-page bg-background text-on-surface font-sans antialiased ${className}`}>
      {children}
    </div>
  )
}

const NAV = [
  { label: "New Arrivals", href: "/store?sort=newest" },
  { label: "Women", href: "/categories/women" },
  { label: "Men", href: "/categories/men" },
  { label: "Footwear", href: "/categories/footwear" },
  { label: "Accessories", href: "/categories/accessories" },
  { label: "Sale", href: "/store?sale=true" },
]


/* ------------------------------------------------------------------ headers */

/** Checkout header (address, delivery, shipping, payment, payment declined). */
export async function CheckoutHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-xl">
          <LocalizedClientLink
            className="font-headline-sm text-headline-sm uppercase tracking-wider text-primary font-medium"
            href="/"
            data-testid="nav-store-link"
          >
            Everwear
          </LocalizedClientLink>
          <nav className="hidden xl:flex items-center gap-space-lg" aria-label="Departments">
            {NAV.map((n) => (
              <LocalizedClientLink
                key={n.label}
                className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors duration-200"
                href={n.href}
              >
                {n.label}
              </LocalizedClientLink>
            ))}
          </nav>
        </div>
        <HeaderIcons initialBag={await bagCount()} />
      </div>
    </header>
  )
}

/** Minimal header for bank authentication: brand and the encryption note only. */
export function SecureHeader() {
  return (
    <header className="w-full bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between">
        <LocalizedClientLink className="font-headline-sm text-headline-sm uppercase tracking-wider text-primary font-medium" href="/">
          Everwear
        </LocalizedClientLink>
        <div className="flex items-center gap-space-xs font-label-caps text-label-caps uppercase text-on-surface-variant">
          <MIcon name="lock" className="text-[16px]" />
          <span>Encrypted Checkout</span>
        </div>
      </div>
    </header>
  )
}

/** Header of the tracking and invoice designs: nav, catalog search, concierge, wishlist, bag, account. */
export async function TrackingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] print:hidden">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-xl">
          <LocalizedClientLink
            className="font-headline-lg text-headline-lg tracking-tight uppercase text-primary font-medium hover:opacity-80 transition-opacity"
            href="/"
          >
            EVERWEAR
          </LocalizedClientLink>
          <nav className="hidden xl:flex items-center gap-space-lg" aria-label="Departments">
            {NAV.map((n) => (
              <LocalizedClientLink
                key={n.label}
                className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-on-surface transition-colors"
                href={n.href}
              >
                {n.label}
              </LocalizedClientLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-space-md flex-1 max-w-sm justify-end">
          <SearchField
            className="hidden md:flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded w-full max-w-xs transition-colors focus-within:bg-surface-container-lowest"
            iconClassName="text-[18px] text-on-surface-variant"
            inputClassName="bg-transparent w-full text-on-surface font-body-sm text-body-sm placeholder:text-outline focus:outline-none"
            placeholder="Search catalog..."
            kbd
          />
          <HeaderIcons initialBag={await bagCount()} />
        </div>
      </div>
    </header>
  )
}

const ORDER_NAV = [
  { label: "Men", href: "/categories/men" },
  { label: "Women", href: "/categories/women" },
  { label: "Clothing", href: "/store" },
  { label: "Footwear", href: "/categories/footwear" },
  { label: "Accessories", href: "/categories/accessories" },
  { label: "New Arrivals", href: "/store?sort=newest" },
  { label: "Trending", href: "/store?sort=bestseller" },
  { label: "Sale", href: "/store?sale=true" },
]

/** Header of the order-confirmed design: announcement bar, wordmark, search, icons, department rail. */
export async function OrderHeader() {
  return (
    <OrderHeaderFrame
      announcement={
        <>
          <span className="opacity-90">
            Mid-Season Spring Edit: Complimentary standard delivery across India on orders above ₹1,999 | Use code{" "}
          </span>
          <span className="font-label-caps text-label-caps tracking-wider font-semibold text-secondary-fixed">EVERSPRING</span>
        </>
      }
    >
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between gap-gutter">
        <div className="flex items-center gap-space-lg flex-shrink-0">
          <LocalizedClientLink className="flex flex-col group min-h-11 justify-center" href="/">
            {/* Phones: a smaller wordmark without the tagline, so the bag and account icons stay on screen. */}
            <span className="font-headline-lg text-headline-lg tracking-[0.2em] font-light text-primary uppercase max-sm:text-xl max-sm:tracking-[0.12em]">EVERWEAR</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.18em] -mt-1 max-sm:hidden">
              Everyday style. Your way.
            </span>
          </LocalizedClientLink>
        </div>
        <div className="hidden lg:flex flex-1 max-w-xl mx-space-md">
          <SearchField
            className="relative w-full flex items-center"
            iconClassName="absolute left-space-md text-on-surface-variant text-[20px] pointer-events-none"
            inputClassName="w-full h-11 pl-11 pr-space-md bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 font-body-sm text-body-sm rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.02)] focus:outline-none focus:bg-surface-container-lowest transition-all"
            placeholder="Search for kurtas, linen shirts, oversized tees, sneakers..."
          />
        </div>
        <div className="flex items-center gap-space-xs flex-shrink-0">
          <LocalizedClientLink aria-label="Search" className="lg:hidden p-2 min-h-11 min-w-11 text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center" href="/search">
            <MIcon name="search" className="text-[22px]" />
          </LocalizedClientLink>
          <HeaderIcons initialBag={await bagCount()} />
        </div>
      </div>
      <div className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-x-auto">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
          <nav className="flex items-center gap-space-lg h-11 whitespace-nowrap" aria-label="Departments">
            {ORDER_NAV.map((n) => (
              <LocalizedClientLink
                key={n.label}
                className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors py-1.5 px-space-xs"
                href={n.href}
              >
                {n.label}
              </LocalizedClientLink>
            ))}
          </nav>
        </div>
      </div>
    </OrderHeaderFrame>
  )
}

/* Footers: every page uses the store footer, @modules/shell/footer. */
