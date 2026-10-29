import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { NEW_IN_HREF } from "@modules/shell/header"
import { ArrowRightIcon } from "lucide-react"
import Image from "next/image"
import heroImage from "../../../../public/images/editorial/hero-street.jpg"

/** Full-bleed lifestyle hero with a heavy condensed headline. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex h-[min(78svh,760px)] min-h-[520px] items-end overflow-hidden bg-invert text-invert-foreground lg:h-[min(86svh,860px)]">
      <Image
        src={heroImage}
        alt="A man in a black jacket and hood on a busy city street"
        fill
        preload
        loading="eager"
        fetchPriority="high"
        placeholder="blur"
        sizes="100vw"
        className="-z-10 object-cover object-[50%_35%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      <Container className="flex flex-col gap-6 pt-32 pb-12 lg:pb-20">
        <span className="w-fit bg-accent px-2.5 py-1 text-[11px] font-bold tracking-[0.14em] text-accent-foreground uppercase">
          New season
        </span>
        <h1 id="hero-title" className="max-w-4xl font-display-tight text-[clamp(3.5rem,11vw,9.5rem)] text-balance">
          Built for every day.
        </h1>
        <p className="max-w-md text-base text-white/85 sm:text-lg">
          Tees, sweats and pants cut for comfort and made to be worn on repeat.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-white text-black hover:bg-white/90">
            <LocalizedClientLink href="/store">
              Shop all <ArrowRightIcon data-icon="inline-end" aria-hidden />
            </LocalizedClientLink>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white hover:text-black">
            <LocalizedClientLink href={NEW_IN_HREF}>New in</LocalizedClientLink>
          </Button>
        </div>
      </Container>
    </section>
  )
}
