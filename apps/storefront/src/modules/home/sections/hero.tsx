import { Button } from "@/components/ui/button"
import { Container } from "@/components/store/container"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRightIcon } from "lucide-react"
import Image from "next/image"

/** Asymmetric editorial hero: oversized type on the left, the newest product large on the right. */
export function Hero({ featured }: { featured?: HttpTypes.StoreProduct }) {
  const image = featured?.thumbnail ?? featured?.images?.[0]?.url

  return (
    <section aria-labelledby="hero-title" className="border-b">
      <Container className="grid gap-10 py-12 lg:grid-cols-12 lg:gap-8 lg:py-20">
        <div className="flex flex-col justify-between gap-10 lg:col-span-7">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">
            My Store / The everyday edit
          </p>
          <h1
            id="hero-title"
            className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.92] font-normal tracking-[-0.03em] text-balance"
          >
            Wear it often.
            <br />
            <em className="font-light italic text-primary">Keep it</em> for years.
          </h1>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-sm text-base text-muted-foreground">
              Shirts, sweats, pants and small goods in honest colours and
              comfortable cuts. Pick your size, we handle the rest.
            </p>
            <div className="flex gap-2">
              <Button asChild size="lg">
                <LocalizedClientLink href="/store">
                  Shop all <ArrowRightIcon data-icon="inline-end" aria-hidden />
                </LocalizedClientLink>
              </Button>
            </div>
          </div>
        </div>

        {featured && image && (
          <LocalizedClientLink
            href={`/products/${featured.handle}`}
            className="group relative block lg:col-span-5"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
              <Image
                src={image}
                alt={featured.title}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02] motion-reduce:transition-none"
              />
            </div>
            <div className="mt-3 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Just in</span>
              <span className="font-medium group-hover:underline group-hover:underline-offset-4">
                {featured.title}
              </span>
            </div>
          </LocalizedClientLink>
        )}
      </Container>
    </section>
  )
}
