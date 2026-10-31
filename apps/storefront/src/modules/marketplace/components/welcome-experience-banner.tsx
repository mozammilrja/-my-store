"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { toast } from "sonner"

export function WelcomeExperienceBanner() {
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText("WELCOME15")
      setCopied(true)
      toast.success("Code WELCOME15 copied! Applied to your first order at checkout.")
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.info("Use code WELCOME15 at checkout for 15% off!")
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("aveliq_welcome_banner_dismissed", "true")
      }
    } catch {
      // storage unavailable
    }
  }

  return (
    <section
      aria-label="Welcome to AVELIQ Atelier"
      className="w-full px-margin-mobile md:px-margin my-3 md:my-5 animate-fade-in"
    >
      <div className="relative w-full rounded-2xl overflow-hidden bg-primary text-white border border-border/40 shadow-md">
        {/* Editorial Background Image with Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: "url('/images/editorial/hero-editorial.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/40 sm:to-black/30" />
        <div className="absolute inset-0 bg-radial-[at_top_right] from-secondary/15 via-transparent to-transparent pointer-events-none" />

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 size-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="Dismiss welcome banner"
          aria-label="Dismiss welcome banner"
        >
          <Icon name="close" size={18} />
        </button>

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-8 md:p-12 flex flex-col justify-between min-h-[380px] md:min-h-[440px]">
          {/* Top Overline and Welcome Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md font-label-caps text-[11px] uppercase tracking-widest text-accent font-semibold border border-white/10">
              <Icon name="auto_awesome" size={14} className="text-accent" />
              First-Time Visitor Welcome
            </span>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-white/40" />
            <span className="hidden sm:inline font-label-sm text-xs text-white/80 tracking-wide">
              Everwear Spring / Summer &apos;25 Edit
            </span>
          </div>

          {/* Main Headline & Descriptive Text */}
          <div className="max-w-3xl my-6 flex flex-col gap-3">
            <h1 className="font-display-hero text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
              The Art of Considered Dressing
            </h1>
            <p className="font-body-lg text-sm sm:text-base md:text-lg text-white/90 font-normal leading-relaxed max-w-2xl">
              Welcome to Everwear. Discover architectural tailoring, handspun heirloom silks, and effortless contemporary luxury. As our welcome to your wardrobe, enjoy <strong className="font-semibold text-white">15% off your inaugural curation</strong>.
            </p>
          </div>

          {/* Bottom Actions Row: Promo Voucher Pill + CTAs */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Interactive Voucher Pill */}
              <button
                type="button"
                onClick={handleCopyCode}
                className="group relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 transition-all cursor-pointer select-none"
                title="Click to copy promotional code"
              >
                <span className="font-label-caps text-[10px] text-white/70 uppercase tracking-wider">
                  Promo Code:
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-accent tracking-wider bg-black/40 px-2 py-0.5 rounded border border-accent/30">
                  WELCOME15
                </span>
                <span className="inline-flex items-center gap-1 font-label-sm text-xs text-white font-medium pl-1">
                  <Icon
                    name={copied ? "check" : "content_copy"}
                    size={16}
                    className={copied ? "text-emerald-400" : "text-white/80 group-hover:text-white"}
                  />
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </span>
              </button>

              {/* Primary CTA */}
              <LocalizedClientLink
                href="/store?sort=newest"
                className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-100 font-label-md text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Shop New Arrivals</span>
                <Icon name="arrow_forward" size={16} />
              </LocalizedClientLink>

              {/* Secondary CTAs */}
              <div className="flex items-center gap-2">
                <LocalizedClientLink
                  href="/categories/women"
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-label-sm text-xs font-medium tracking-wide transition-colors"
                >
                  Women&apos;s Atelier
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/categories/men"
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-label-sm text-xs font-medium tracking-wide transition-colors"
                >
                  Men&apos;s Sartorial
                </LocalizedClientLink>
              </div>
            </div>

            {/* Three Reassuring Feel-Good Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/15">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-accent">
                  <Icon name="verified" size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-xs font-semibold text-white">100% Heirloom Certified</span>
                  <span className="font-body-sm text-[11px] text-white/70">Master weavers &amp; ethical ateliers</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-accent">
                  <Icon name="checkroom" size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-xs font-semibold text-white">Doorstep Try &amp; Exchange</span>
                  <span className="font-body-sm text-[11px] text-white/70">14-day zero-hassle complimentary pickup</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-accent">
                  <Icon name="local_shipping" size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-xs font-semibold text-white">Complimentary Metro Dispatch</span>
                  <span className="font-body-sm text-[11px] text-white/70">Same-day dispatch in 18 metro pincodes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
