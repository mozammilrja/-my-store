import LocalizedClientLink from "@modules/common/components/localized-client-link"

export function CategoryShortcuts() {
  return (
    <div className="w-full bg-surface-container-high py-3 px-margin-mobile md:px-margin shadow-sm">
      <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-on-surface-variant text-body-sm font-body-sm">
          <span className="font-label-caps text-label-caps uppercase text-on-surface font-bold tracking-wide">
            Category Shortcuts:
          </span>
          <LocalizedClientLink className="hover:text-on-surface transition-colors" href="/store">
            Sarees under ₹3,999
          </LocalizedClientLink>
          <span className="opacity-30">•</span>
          <LocalizedClientLink className="hover:text-on-surface transition-colors" href="/store">
            Trousers &amp; High-Waist Knits
          </LocalizedClientLink>
          <span className="opacity-30">•</span>
          <LocalizedClientLink className="hover:text-on-surface transition-colors" href="/store">
            Bridal Guest Lookbook
          </LocalizedClientLink>
          <span className="opacity-30">•</span>
          <LocalizedClientLink className="hover:text-on-surface transition-colors" href="/store">
            Pure Silver Jhumkas
          </LocalizedClientLink>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-label-caps text-[11px] text-on-tertiary-container font-semibold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
            Express Metro Dispatch: 24h
          </span>
        </div>
      </div>
    </div>
  )
}
