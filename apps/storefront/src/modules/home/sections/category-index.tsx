import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowUpRightIcon } from "lucide-react"
import Image from "next/image"
import { Showcase } from "../data"

/** Categories as a numbered editorial index; a preview image appears on hover. */
export function CategoryIndex({ categories }: { categories: Showcase[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="category-index-title" className="py-20 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="category-index-title" className="font-display text-4xl tracking-tight lg:sticky lg:top-28">
            Shop by category
          </h2>
        </div>
        <ol className="border-t lg:col-span-8">
          {categories.map((category, index) => (
            <li key={category.id} className="border-b">
              <LocalizedClientLink
                href={category.href}
                className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 transition-colors hover:text-primary sm:grid-cols-[3rem_1fr_6rem_auto] sm:py-8"
              >
                <span className="text-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-3xl tracking-tight sm:text-5xl">
                  {category.title}
                </span>
                <span className="relative hidden aspect-[4/5] w-24 overflow-hidden bg-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                  {category.image && (
                    <Image src={category.image} alt="" fill sizes="96px" className="object-cover" />
                  )}
                </span>
                <span className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary">
                  <span className="tabular-nums">{category.count}</span>
                  <ArrowUpRightIcon className="size-4" aria-hidden />
                </span>
              </LocalizedClientLink>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
