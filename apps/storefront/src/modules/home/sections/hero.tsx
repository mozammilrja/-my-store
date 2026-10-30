import { Button } from "@/components/ui/button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { NEW_IN_HREF } from "@modules/shell/header"
import { ArrowRightIcon } from "lucide-react"
import Image from "next/image"
import heroImage from "../../../../public/images/editorial/hero-editorial.jpg"

/**
 * Stitch Editorial Hero Banner:
 * High-impact campaign photography, architectural typography,
 * negative letter spacing, and refined CTA actions.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 my-4 sm:my-6">
      <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-high shadow-sm">
        <div className="w-full min-h-[520px] md:min-h-[620px] flex flex-col justify-end p-6 sm:p-10 md:p-16 relative">
          <Image
            src={heroImage}
            alt="Editorial portrait of Everwear modern collection in warm courtyard light"
            fill
            priority
            loading="eager"
            placeholder="blur"
            sizes="(min-width: 1440px) 1440px, 100vw"
            className="object-cover object-[50%_25%]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-transparent" />

          <div className="relative z-10 max-w-3xl flex flex-col gap-4 text-white">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded bg-white/20 backdrop-blur-md font-label-caps text-[10px] sm:text-[11px] uppercase tracking-widest text-white font-semibold">
                Spring / Summer &apos;25 Campaign
              </span>
              <span className="hidden sm:inline font-label-sm text-xs text-surface-container-high">
                Curated for Everwear Europe &amp; India
              </span>
            </div>

            <h1
              id="hero-title"
              className="font-display-hero text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-tight max-w-2xl"
            >
              Contemporary Masculine Elegance
            </h1>

            <p className="font-body-lg text-sm sm:text-base lg:text-lg text-surface-container-highest max-w-xl font-normal leading-relaxed opacity-95">
              Tailored essentials meet modern craftsmanship. From 350 GSM heavyweight textured knits to breezy Maheshwari handspun silks crafted for elevated, effortless daily rituals.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Button asChild size="lg" className="rounded-lg bg-white text-black hover:bg-surface-container-high font-label-md tracking-wider uppercase shadow-md font-semibold">
                <LocalizedClientLink href="/store" className="flex items-center gap-2 group">
                  Shop New Season
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </LocalizedClientLink>
              </Button>

              <Button asChild size="lg" variant="outline" className="rounded-lg bg-white/15 backdrop-blur-md border-white/30 text-white hover:bg-white/25 hover:text-white font-label-md tracking-wider uppercase transition-colors">
                <LocalizedClientLink href={NEW_IN_HREF}>
                  Explore Collections
                </LocalizedClientLink>
              </Button>

              <span className="hidden lg:inline text-surface-container-high/80 ml-4 font-label-caps text-[11px] uppercase tracking-widest">
                Free Express Delivery above ₹1,999 / €49
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
