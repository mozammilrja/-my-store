import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { ReactNode } from "react"
import { NewsletterForm } from "./newsletter-form"
import { SearchField } from "./search-field"
import { HeaderIcons } from "@modules/shell/header-icons"
import { bagCount } from "@modules/shell/bag-count"
import { OrderHeaderFrame } from "./order-header-frame"

/*
 * The headers and footers of the Stitch page exports
 * (stitch_everwear_fashion_commerce_admin/*), ported markup-for-markup. Four
 * header variants and three footers appear across the designs:
 *
 *   CheckoutHeader / CheckoutFooter: address, delivery, shipping, payment, payment declined
 *   SecureHeader (no footer):        3-D Secure / bank authentication
 *   TrackingHeader / TrackingFooter: live tracking, tax invoice
 *   OrderHeader / OrderFooter:       order confirmed
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
          <LocalizedClientLink className="flex flex-col group" href="/">
            <span className="font-headline-lg text-headline-lg tracking-[0.2em] font-light text-primary uppercase">EVERWEAR</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.18em] -mt-1">
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
          <LocalizedClientLink aria-label="Search" className="lg:hidden p-2 text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center" href="/search">
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

/* ------------------------------------------------------------------ footers */

const year = new Date().getFullYear()

/** Checkout footer (address, delivery, shipping, payment, payment declined). */
export function CheckoutFooter() {
  const care = [
    { label: "Concierge Assistance", href: "/concierge" },
    { label: "Bespoke Appointments", href: "/concierge" },
    { label: "Complimentary Shipping & Returns", href: "/shipping" },
    { label: "Garment Preservation Guide", href: "/contact" },
    { label: "Authentication & Archive", href: "/contact" },
  ]
  return (
    <footer className="w-full bg-surface-container-low">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-margin">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter mb-margin">
          <div className="lg:col-span-4">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface mb-space-sm block">Editorial Dispatch</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md max-w-sm">
              Receive curated releases, private archive previews, and quarterly monographs directly to your correspondence.
            </p>
            <NewsletterForm
              source="footer:checkout"
              className="flex max-w-md"
              inputClassName="w-full min-w-0 h-11 px-space-md bg-surface-container-lowest font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-colors"
              buttonClassName="h-11 px-space-lg bg-primary text-on-primary font-label-caps text-label-caps uppercase hover:bg-surface-variant hover:text-on-surface transition-colors"
              placeholder="Enter your email address"
              label="Subscribe"
            />
          </div>
          <div className="lg:col-span-3 lg:col-start-6">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface mb-space-sm block">Client Relations</span>
            <ul className="space-y-space-xs">
              {care.map((c) => (
                <li key={c.label} className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors">
                  <LocalizedClientLink className="inline-flex min-h-6 items-center" href={c.href}>{c.label}</LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-4">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface mb-space-sm block">Manifesto</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-space-md">
              Everwear approaches everyday wardrobing as quiet architectural artifacts. We engineer limited capsule iterations using ethical raw loomed textiles, prioritizing endurance over temporal seasonality.
            </p>
            <div className="flex items-center gap-space-lg text-on-surface-variant font-label-sm text-label-sm">
              <div className="flex items-center gap-space-xs">
                <MIcon name="verified" className="text-[18px]" />
                <span>Climate Neutral</span>
              </div>
              <div className="flex items-center gap-space-xs">
                <MIcon name="lock" className="text-[18px]" />
                <span>Encrypted Checkout</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-space-md">
            <LocalizedClientLink className="hover:text-primary transition-colors" href="/privacy">Privacy Policy</LocalizedClientLink>
            <LocalizedClientLink className="hover:text-primary transition-colors" href="/terms">Terms of Service</LocalizedClientLink>
            <LocalizedClientLink className="hover:text-primary transition-colors" href="/contact">Accessibility</LocalizedClientLink>
          </div>
          <p>© {year} EVERWEAR S.A. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  )
}

/** Footer of the tracking and invoice designs. */
export function TrackingFooter() {
  const departments = [
    { label: "New Arrivals", href: "/store?sort=newest" },
    { label: "Womenswear", href: "/categories/women" },
    { label: "Menswear", href: "/categories/men" },
    { label: "Footwear Suite", href: "/categories/footwear" },
    { label: "Artifacts & Accessories", href: "/categories/accessories" },
    { label: "Archive Sales", href: "/store?sale=true" },
  ]
  const care = [
    { label: "Private Concierge", href: "/concierge" },
    { label: "Bespoke Fitting", href: "/concierge" },
    { label: "Global Shipping", href: "/shipping" },
    { label: "Returns & Exchanges", href: "/returns" },
    { label: "Authentication Seal", href: "/contact" },
  ]
  const li = "font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface"
  return (
    <footer className="w-full bg-surface-container-low mt-space-xl print:hidden">
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-margin">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-space-xl mb-margin">
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            <span className="font-headline-sm text-headline-sm uppercase tracking-tight text-primary font-medium">EVERWEAR</span>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Contemporary editorial collections engineered with deliberate craftsmanship. Certified authentic archival pieces curated for lasting distinction.
            </p>
            <div className="flex flex-col gap-space-xs mt-space-sm">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Private Dispatch</span>
              <NewsletterForm
                source="footer:tracking"
                className="flex items-center gap-space-xs max-w-md"
                inputClassName="bg-surface-container-lowest px-space-md py-space-sm rounded font-body-sm text-body-sm text-on-surface placeholder:text-outline w-full min-w-0 focus:outline-none"
                buttonClassName="bg-primary text-on-primary font-label-md text-label-md px-space-lg py-space-sm rounded hover:bg-primary-container hover:text-on-primary-container transition-colors whitespace-nowrap"
                placeholder="Enter your correspondence email"
                label="Subscribe"
              />
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            <span className="font-label-caps text-label-caps uppercase text-primary">Departments</span>
            <ul className="flex flex-col gap-space-sm">
              {departments.map((d) => (
                <li key={d.label} className={li}><LocalizedClientLink className="inline-flex min-h-6 items-center" href={d.href}>{d.label}</LocalizedClientLink></li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            <span className="font-label-caps text-label-caps uppercase text-primary">Client Care</span>
            <ul className="flex flex-col gap-space-sm">
              {care.map((c) => (
                <li key={c.label} className={li}><LocalizedClientLink className="inline-flex min-h-6 items-center" href={c.href}>{c.label}</LocalizedClientLink></li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-space-md">
            <span className="font-label-caps text-label-caps uppercase text-primary">Our Commitment</span>
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-start gap-space-xs">
                <MIcon name="verified" className="text-[20px] text-primary" />
                <div>
                  <p className="font-label-md text-label-md text-on-surface">100% Verified Provenance</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Every garment undergoes rigorous physical archival validation.</p>
                </div>
              </div>
              <div className="flex items-start gap-space-xs">
                <MIcon name="local_shipping" className="text-[20px] text-primary" />
                <div>
                  <p className="font-label-md text-label-md text-on-surface">Climate-Neutral Transit</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">White-glove dispatch with responsible offsets.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex flex-wrap items-center justify-center gap-space-lg">
            <span className="font-body-sm text-body-sm text-on-surface-variant">© {year} EVERWEAR S.A. All rights reserved.</span>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface" href="/privacy">Privacy</LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface" href="/terms">Terms of Service</LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface" href="/privacy">Cookie Policy</LocalizedClientLink>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Secure Settlement</span>
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <MIcon name="lock" className="text-[20px]" />
              <MIcon name="credit_card" className="text-[20px]" />
              <MIcon name="account_balance_wallet" className="text-[20px]" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

/** Footer of the order-confirmed design. */
export function OrderFooter() {
  const a = "inline-flex min-h-6 items-center font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
  const care = [
    { label: "Customer Support", href: "/contact" },
    { label: "Shipping & Delivery", href: "/shipping" },
    { label: "Returns & Exchange", href: "/returns" },
    { label: "Size & Fit Guide", href: "/contact" },
    { label: "Track Order", href: "/order" },
  ]
  const legal = [
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Preferences", href: "/privacy" },
    { label: "Responsible Sourcing", href: "/terms" },
  ]
  return (
    <footer className="w-full bg-surface-container-low mt-space-xl">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter mb-space-xl">
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <span className="font-headline-sm text-headline-sm tracking-[0.16em] uppercase text-primary font-light">EVERWEAR</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              Crafting timeless, contemporary capsule apparel for the modern individual. Designed with understated structural aesthetics, deliberate fabric curation, and uncompromising longevity.
            </p>
            <div className="flex items-center gap-space-sm pt-space-xs text-on-surface-variant">
              <MIcon name="verified" className="text-[20px]" />
              <span className="font-label-sm text-label-sm font-medium text-on-surface">100% Authentic Products Guaranteed</span>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps uppercase text-on-surface tracking-wider font-semibold mb-space-xs">Customer Care</span>
            {care.map((c) => (
              <LocalizedClientLink key={c.label} className={a} href={c.href}>{c.label}</LocalizedClientLink>
            ))}
          </div>
          <div className="lg:col-span-2 flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps uppercase text-on-surface tracking-wider font-semibold mb-space-xs">Legal &amp; Policies</span>
            {legal.map((c) => (
              <LocalizedClientLink key={c.label} className={a} href={c.href}>{c.label}</LocalizedClientLink>
            ))}
          </div>
          <div className="lg:col-span-4 flex flex-col gap-space-sm">
            <span className="font-label-caps text-label-caps uppercase text-on-surface tracking-wider font-semibold mb-space-xs">Editorial Gazette</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Subscribe to the Everwear Editorial newsletter for seasonal preview drops, archival curations, and private salon invites.
            </p>
            <NewsletterForm
              source="footer:order"
              className="flex items-center gap-space-xs mt-space-xs"
              inputClassName="flex-1 min-w-0 h-11 px-space-md bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 font-body-sm text-body-sm rounded-lg focus:outline-none focus:bg-surface-container-lowest"
              buttonClassName="h-11 px-space-lg bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider rounded-lg hover:bg-primary-container transition-colors"
              placeholder="Enter your email address"
              label="Join"
            />
          </div>
        </div>
        <div className="pt-space-lg bg-surface-container/60 rounded-xl px-space-lg py-space-md flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center flex-wrap gap-space-md">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Secured Payments:</span>
            {["UPI", "Visa", "Mastercard", "NetBanking", "RuPay"].map((m) => (
              <span key={m} className="font-label-sm text-label-sm px-space-sm py-1 bg-surface-container-lowest text-on-surface rounded-lg">{m}</span>
            ))}
          </div>
          <div className="text-center md:text-right">
            <p className="font-body-sm text-body-sm text-on-surface-variant">© {year} Everwear Studios India Private Limited. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
