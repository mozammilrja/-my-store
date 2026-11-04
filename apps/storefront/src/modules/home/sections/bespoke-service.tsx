import LocalizedClientLink from "@modules/common/components/localized-client-link"

export function BespokeService() {
  return (
    <section className="w-full px-margin-mobile md:px-margin mb-8">
      <div className="bg-primary text-on-primary rounded-xl p-8 sm:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="max-w-xl flex flex-col gap-3 relative z-10">
          <span className="px-2.5 py-1 rounded bg-surface-container-lowest/15 backdrop-blur-md w-fit font-label-caps text-label-caps uppercase tracking-widest text-surface-container-high font-semibold">
            Everwear Bespoke Service
          </span>
          <h3 className="font-headline-xl text-headline-lg sm:text-headline-xl font-light tracking-tight text-surface-bright">
            Need Guidance Finding Your Proportion?
          </h3>
          <p className="font-body-md text-body-md text-surface-variant">
            Connect via complimentary video consultation with an Everwear Menswear Stylist in Mumbai. Receive custom size maps, palette matching, and capsule blueprints.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full lg:w-auto">
          <LocalizedClientLink
            href="/contact"
            className="w-full sm:w-auto px-6 py-3.5 rounded bg-surface-container-lowest text-primary font-label-md text-label-md tracking-wider uppercase font-semibold hover:bg-surface-container-high transition-colors text-center cursor-pointer"
          >
            Book 15-Min Styling Session
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/contact"
            className="w-full sm:w-auto px-6 py-3.5 rounded bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 text-surface-bright font-label-md text-label-md tracking-wider uppercase transition-colors text-center cursor-pointer"
          >
            View Size &amp; Fit Guide
          </LocalizedClientLink>
        </div>

        {/* Subtle background ambient design */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />
      </div>
    </section>
  )
}
