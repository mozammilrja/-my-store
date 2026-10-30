"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { toast } from "sonner"
import { useState } from "react"

export function Footer() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    toast.success("Thank you for joining The Weekly Editorial!")
    setEmail("")
  }
  return (
    <footer className="w-full bg-surface-container-low pt-space-xl pb-12 mt-space-xl border-t border-surface-container">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        {/* Top Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-lg pb-space-xl border-b border-surface-container">
          <div className="flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
              verified
            </span>
            <div>
              <h5 className="font-label-md text-label-md font-semibold text-on-surface">
                100% Genuine Curations
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sourced directly from verified atelier houses and certified partner labels.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
              published_with_changes
            </span>
            <div>
              <h5 className="font-label-md text-label-md font-semibold text-on-surface">
                Complimentary Exchanges
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Hassle-free 14-day doorstep pick-up across all pin-codes in India.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
              lock
            </span>
            <div>
              <h5 className="font-label-md text-label-md font-semibold text-on-surface">
                Encrypted Settlements
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                256-bit SSL secured payments with RBI tokenization compliance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
              loyalty
            </span>
            <div>
              <h5 className="font-label-md text-label-md font-semibold text-on-surface">
                Atelier Privilege Club
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Earn Tier Credits on every order for bespoke styling access.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Column Main Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-space-lg py-space-xl">
          <div className="flex flex-col gap-2">
            <h6 className="font-label-caps text-label-caps uppercase text-on-surface tracking-wider font-semibold mb-1">
              Online Store
            </h6>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/store">
              Men&apos;s Wardrobe
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/store">
              Women&apos;s Collection
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/store">
              Kids Edition
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/store">
              Home Decor &amp; Living
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/store">
              Beauty &amp; Fragrance
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-secondary hover:text-secondary-fixed-dim transition-colors font-medium" href="/store?sale=true">
              Archive Sale (Up to 50%)
            </LocalizedClientLink>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="font-label-caps text-label-caps uppercase text-on-surface tracking-wider font-semibold mb-1">
              Customer Concierge
            </h6>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Help Center &amp; FAQs
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/shipping">
              Track Consignment
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/returns">
              Initiate Return / Exchange
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/shipping">
              Shipping &amp; Delivery Terms
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/returns">
              Cancellations Policy
            </LocalizedClientLink>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="font-label-caps text-label-caps uppercase text-on-surface tracking-wider font-semibold mb-1">
              The Brand
            </h6>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Our Editorial Philosophy
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Sustainable Craftsmanship
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Careers at AVELIQ
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Press &amp; Publications
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Physical Flagships
            </LocalizedClientLink>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="font-label-caps text-label-caps uppercase text-on-surface tracking-wider font-semibold mb-1">
              AVELIQ Privilege
            </h6>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/account">
              Privilege Club Tiering
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/account">
              Digital Gift Cards
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Book Personal Stylist
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors" href="/contact">
              Corporate Wardrobe Solutions
            </LocalizedClientLink>
          </div>

          {/* The Weekly Editorial (2 columns) */}
          <div className="col-span-2 flex flex-col gap-4 bg-surface-container-lowest p-space-lg rounded-xl">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider font-semibold">
                The Weekly Editorial
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Curated styling insights, new designer arrivals, and private invitation previews delivered to your inbox.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                className="flex-1 bg-surface-container-low border border-outline-variant px-3 py-2 text-body-sm text-on-surface placeholder:text-outline rounded focus:outline-none focus:border-primary font-body-sm"
                placeholder="Enter your personal email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wide rounded hover:bg-surface-container-highest hover:text-on-surface transition-colors shrink-0 font-semibold cursor-pointer"
              >
                Join
              </button>
            </form>
            <span className="font-label-caps text-[10px] text-on-surface-variant">
              By subscribing, you agree to our Privacy Policy and consent to receive marketing communication.
            </span>
          </div>
        </div>

        {/* Bottom Legal & Payment Methods Strip */}
        <div className="pt-space-lg border-t border-surface-container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-on-surface-variant">
            <span className="font-body-sm text-body-sm">
              &copy; {new Date().getFullYear()} AVELIQ. All rights reserved.
            </span>
            <LocalizedClientLink className="font-body-sm text-body-sm hover:text-on-surface transition-colors" href="/terms">
              Terms of Service
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm hover:text-on-surface transition-colors" href="/privacy">
              Privacy Policy
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm hover:text-on-surface transition-colors" href="/terms">
              Security &amp; Compliance
            </LocalizedClientLink>
            <LocalizedClientLink className="font-body-sm text-body-sm hover:text-on-surface transition-colors" href="/store">
              Site Directory
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-3 text-on-surface-variant">
            <span className="font-label-caps text-label-caps uppercase">
              Payment Methods
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-1 bg-surface rounded text-[11px] font-semibold text-on-surface">
                UPI
              </span>
              <span className="px-2 py-1 bg-surface rounded text-[11px] font-semibold text-on-surface">
                VISA
              </span>
              <span className="px-2 py-1 bg-surface rounded text-[11px] font-semibold text-on-surface">
                MASTERCARD
              </span>
              <span className="px-2 py-1 bg-surface rounded text-[11px] font-semibold text-on-surface">
                RUPAY
              </span>
              <span className="px-2 py-1 bg-surface rounded text-[11px] font-semibold text-on-surface">
                NETBANKING
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
