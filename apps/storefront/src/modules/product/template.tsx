import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { Container } from "@/components/store/container"
import type { Category, Collection, Product, RegionPolicies } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Suspense } from "react"
import { Details } from "./details"
import { Gallery } from "./gallery"
import { PurchasePanel } from "./purchase-panel"
import { Related } from "./related"

export function ProductTemplate({
  product,
  category,
  collection,
  countryCode,
  policies,
  currencyCode,
}: {
  product: Product
  category: Category | null
  collection: Collection | null
  countryCode: string
  policies: RegionPolicies | null
  currencyCode: string
}) {
  return (
    <>
      <Container className="pt-4" data-testid="product-container">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <LocalizedClientLink href="/store">Home</LocalizedClientLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {category && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <LocalizedClientLink href={`/categories/${category.handle}`}>{category.name}</LocalizedClientLink>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            {collection && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <LocalizedClientLink href={`/collections/${collection.handle}`}>
                      {collection.title}
                    </LocalizedClientLink>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Container>

      <Container className="grid gap-6 pt-4 pb-16 lg:grid-cols-12 lg:gap-8 lg:pt-6">
        {/* Left: image mosaic */}
        <div className="min-w-0 lg:col-span-7">
          <Suspense fallback={<Skeleton className="aspect-[3/4] w-full" />}>
            <Gallery product={product} />
          </Suspense>
        </div>

        {/* Right: sticky buy column */}
        <div className="min-w-0 lg:col-span-5">
          <div className="flex flex-col gap-4 lg:sticky lg:top-28">
            <div className="flex flex-col gap-1">
              {collection ? (
                <LocalizedClientLink
                  href={`/collections/${collection.handle}`}
                  className="w-fit text-base font-bold text-foreground hover:underline"
                >
                  {collection.title}
                </LocalizedClientLink>
              ) : (
                <span className="text-base font-bold text-foreground">Everwear</span>
              )}
              <h1
                className="text-base font-normal text-muted-foreground leading-snug"
                data-testid="product-title"
              >
                {product.title}
                {product.subtitle ? ` · ${product.subtitle}` : ""}
              </h1>
            </div>

            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <PurchasePanel product={product} />
            </Suspense>

            <Details product={product} policies={policies} currencyCode={currencyCode} />
          </div>
        </div>
      </Container>

      <Suspense fallback={null}>
        <Related product={product} countryCode={countryCode} />
      </Suspense>
    </>
  )
}
