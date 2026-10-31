import LocalizedClientLink from "@modules/common/components/localized-client-link"

export function BreadcrumbBar() {
  return (
    <section className="w-full px-margin-mobile md:px-margin pt-4 pb-2">
      <div className="flex items-center gap-2 font-label-caps text-label-caps tracking-wider uppercase text-on-surface-variant">
        <LocalizedClientLink className="hover:text-on-surface transition-colors" href="/">
          Home
        </LocalizedClientLink>
        <span>/</span>
        <span className="text-on-surface font-semibold">Men</span>
        <span>/</span>
        <span className="text-on-surface-variant/70">All Collections 2025</span>
      </div>
    </section>
  )
}
