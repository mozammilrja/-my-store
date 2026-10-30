import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ProductListing } from "@modules/catalog/product-listing"
import type { Listing } from "@modules/catalog/params"
import type { Category } from "@lib/api/types"

const SUBCATEGORIES = [
  {
    title: "Tailored Shirts & Overshirts",
    price: "From ₹1,299",
    styles: "420 Styles",
    href: "/categories/shirts",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrBURcIN8ZKvh4QVlp4Uch0ZSNffqpLiFSK-y9OE86hb_e7oEGyWEYCw3_t2fCxR-RKoMNi_-fQ-N9LoixI_P7JFzwfaYiWjAMUMRD5p1tRF69QqTWCovQjRXi_35ZGRgUzwGqEvk77p-VScOQiDE0RpthaqK0itiL8XKIatwRIbh8F24DuckPMzmSTazNQE0Zdr4qEN51h96AXpqK0q9bFYRdEMH7gh3KZ_KMxQhN",
  },
  {
    title: "Casual Tees & Heavyweight Polos",
    price: "From ₹799",
    styles: "680 Styles",
    href: "/categories/sweatshirts",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8ENIJdFG-QYZd6czFrKT6o7XAWhDFB_pAVfLmDbTbCcVeOgh_-zmRxPg7tpKvYohdnMyrUC-3KWsGe_AMIIVqjSDdR8fUwhJmVqWCLuGh5ZmhmN0ceWa70I4gQcPdJ3V4ZvTXAXK_MMIcLve_L6UME4dGzg-btwyvAejRSSH8NPBsFT6ekv3tS9DDPeUUlLdzJZ8594pGzFRkzHLUY0esJ0-aeTJFJMhfyps596RQ",
  },
  {
    title: "Structured Trousers & Chinos",
    price: "From ₹1,899",
    styles: "310 Styles",
    href: "/categories/pants",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAm5beTwLBR8T7-7L80JueFkKK3Yoa60F3qeX2-_7exaRVlz9MrAvmT6qVlQtCYngoU0a-xATQPpz_kTsahuEtxXkSNk1q842Tn9HlJS9-0s1lSsyBr7OPmLXCFdXP5t_aa1xQirLR1trGQ_yqoMXN-UUV8l6uttBzxbLA9JOcPU5a-rJhJi_ATKgDbyo1Wbsz2YnG3WxB9xMklilVIUcU7FsS587XLqQKViqT0sMeT",
  },
  {
    title: "Artisanal Kurtas & Nehru Vests",
    price: "From ₹2,499",
    styles: "245 Styles",
    href: "/categories/men",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDyCkIkE4X7S1pOhNBT5rBN_swx7w5RDy4ydLD5BfRhQHE2_jMi1N9OTBaiUFsUOwk-8eU07dLohSx2Q2x2azASJ1EqVzvJhkIhUdNEA5g-8bGIzzBx1rbWCHNuJc2VbMte_jLo2G8YhzZY5B3AsAXesu5gWwbe3Rc0WpZ0-NR3ggRSaXz0urtOdR5J4slSzg-yHH73q59CDHDNrSMGVWnqg-NTau1o2BTskxGyvhpB",
  },
  {
    title: "Handcrafted Loafers & Boots",
    price: "From ₹3,499",
    styles: "180 Styles",
    href: "/categories/footwear",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBiXg5yBw1hVwVvJ_o4fQ4qXy5X9kI_6vI6z3N5w1J5Z6y7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9",
  },
  {
    title: "Minimal Horology & Leather",
    price: "From ₹1,499",
    styles: "120 Styles",
    href: "/categories/accessories",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCiXg5yBw1hVwVvJ_o4fQ4qXy5X9kI_6vI6z3N5w1J5Z6y7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9",
  },
]

export function MenDepartmentLanding({
  countryCode,
  category,
  categories,
  listing,
}: {
  countryCode: string
  category: Category
  categories?: Category[]
  listing: Listing
}) {
  return (
    <div className="flex flex-col w-full pb-16">
      {/* Top Breadcrumb Bar */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin pt-4 pb-2">
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

      {/* Editorial Department Hero */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-4">
        <div className="relative w-full rounded-xl overflow-hidden bg-surface-container-high shadow-sm">
          <div
            className="w-full min-h-[460px] md:min-h-[520px] bg-cover bg-center flex flex-col justify-end p-6 sm:p-10 md:p-14 relative"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCzqUXOFmVxm6XaUacY1AaebD0txecB7VRDI3z6koI5xSI3VhoBSbvIyxRtgJBV1ACKMZPVJt_S88WhsEtd8KGFVgaAGb8FSn0ItRI_cTVoGWbhj_Bu_Si0zKlhj_YCABbzTHZxU_jN-6St1uqthOpe321ImQziOToesB-kR6xLBT1l6hahuZlnoHQb-q9qa1HJdcGR1z7s9DkuNbJsHPVGPFLi8yfi5NJ1mTF9YjXT')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="relative z-10 max-w-3xl flex flex-col gap-3 text-white">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-white/20 backdrop-blur-md font-label-caps text-label-caps uppercase tracking-widest text-white font-semibold">
                  Spring / Summer &apos;25 Campaign
                </span>
                <span className="hidden sm:inline font-label-sm text-xs text-white/80">
                  Curated for Everwear India
                </span>
              </div>
              <h1 className="font-display-hero text-3xl sm:text-5xl font-light tracking-tight text-white leading-tight max-w-2xl">
                Contemporary Masculine Elegance
              </h1>
              <p className="font-body-lg text-sm sm:text-base text-white/90 max-w-xl font-normal leading-relaxed">
                Tailored essentials meet modern Indian craftsmanship. From 350 GSM heavyweight textured knits to breezy Maheshwari handspun silks crafted for elevated, effortless daily rituals.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#men-catalog"
                  className="px-6 py-3 rounded-lg bg-white text-black font-label-md text-xs sm:text-sm tracking-wider uppercase hover:bg-neutral-200 transition-all shadow-md flex items-center gap-2 font-semibold"
                >
                  Shop New Season
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
                <LocalizedClientLink
                  href="/categories/shirts"
                  className="px-6 py-3 rounded-lg bg-white/15 backdrop-blur-md text-white hover:bg-white/25 font-label-md text-xs sm:text-sm tracking-wider uppercase transition-colors flex items-center gap-2 font-medium"
                >
                  Explore Shirts &amp; Trousers
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Badges Ticker */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 border border-border/60">
            <span className="material-symbols-outlined text-primary text-[24px]">dry_cleaning</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Pre-Shrunk 100% Cotton</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Lab-tested color fastness</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 border border-border/60">
            <span className="material-symbols-outlined text-primary text-[24px]">straighten</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Calibrated Indian Fit</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">Sized XS to 4XL tailored precision</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 border border-border/60">
            <span className="material-symbols-outlined text-primary text-[24px]">local_shipping</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Same-Day Dispatch</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">In 18 metro hub pincodes</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 border border-border/60">
            <span className="material-symbols-outlined text-primary text-[24px]">swap_horizontal_circle</span>
            <div>
              <span className="font-label-sm text-xs font-semibold text-on-surface block">Doorstep Try &amp; Exchange</span>
              <span className="font-body-sm text-[11px] text-on-surface-variant">14-day zero hassle pickup</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Subcategory Discovery Matrix */}
      <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin my-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant font-semibold">
                Department Taxonomy
              </span>
            </div>
            <h2 className="font-headline-lg text-2xl font-normal tracking-tight text-on-surface">
              Visual Subcategory Discovery
            </h2>
          </div>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant max-w-md">
            Select a design capsule to inspect curated silhouetted patterns, textile weights, and daily coordinates.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SUBCATEGORIES.slice(0, 4).map((sub, idx) => (
            <LocalizedClientLink
              key={idx}
              href={sub.href}
              className="group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-border/60"
            >
              <div className="relative w-full aspect-[4/3] bg-surface-container-low overflow-hidden">
                <Image
                  src={sub.image}
                  alt={sub.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2.5 left-2.5 bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded font-label-caps text-[10px] uppercase text-on-surface font-semibold">
                  {sub.styles}
                </span>
              </div>
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {sub.title}
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant mt-1">{sub.price}</span>
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      </section>

      {/* Live Catalog for Men */}
      <div id="men-catalog" className="pt-6">
        <ProductListing
          countryCode={countryCode}
          path="/categories/men"
          listing={listing}
          categoryIds={[category.id]}
          categories={categories}
        />
      </div>
    </div>
  )
}
