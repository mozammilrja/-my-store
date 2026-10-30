import LocalizedClientLink from "@modules/common/components/localized-client-link"

export function Hero() {
  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-4">
      <div className="relative w-full rounded-xl overflow-hidden bg-surface-container-high shadow-sm">
        <div
          className="w-full min-h-[520px] md:min-h-[580px] bg-cover bg-center flex flex-col justify-end p-6 sm:p-10 md:p-16 relative"
          style={{ backgroundImage: "url('/images/men/hero.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-3xl flex flex-col gap-4 text-on-primary">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-surface-container-lowest/20 backdrop-blur-md font-label-caps text-label-caps uppercase tracking-widest text-surface-bright font-semibold">
                Spring / Summer &apos;25 Campaign
              </span>
              <span className="hidden sm:inline font-label-sm text-label-sm text-surface-variant">
                Curated for Everwear India
              </span>
            </div>

            <h1 className="font-display-hero text-headline-xl sm:text-display-hero font-light tracking-tight text-surface-bright leading-tight max-w-2xl">
              Contemporary Masculine Elegance
            </h1>

            <p className="font-body-lg text-body-md sm:text-body-lg text-surface-container-highest max-w-xl font-normal leading-relaxed">
              Tailored essentials meet modern Indian craftsmanship. From 350 GSM heavyweight textured knits to breezy Maheshwari handspun silks crafted for elevated, effortless daily rituals.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <LocalizedClientLink
                href="/store"
                className="px-6 py-3 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md tracking-wider uppercase hover:bg-surface-container-high transition-all shadow-md flex items-center gap-2 group font-semibold cursor-pointer"
              >
                Shop New Season
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </LocalizedClientLink>

              <LocalizedClientLink
                href="#category-directory"
                className="px-6 py-3 rounded-lg bg-surface-container-lowest/15 backdrop-blur-md text-surface-bright hover:bg-surface-container-lowest/25 font-label-md text-label-md tracking-wider uppercase transition-colors flex items-center gap-2 cursor-pointer"
              >
                Explore Kurta Sets &amp; Nehru Vests
              </LocalizedClientLink>

              <span className="hidden lg:inline text-surface-container-high/60 ml-4 font-label-caps text-label-caps uppercase tracking-widest">
                Free Express Delivery above ₹1,999
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
