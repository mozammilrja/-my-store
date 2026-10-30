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
      <Container className="pt-6" data-testid="product-container">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <LocalizedClientLink href="/store">Shop</LocalizedClientLink>
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
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Container>

      <Container className="grid gap-10 pt-8 pb-24 lg:grid-cols-12 lg:gap-12 lg:py-10">
        <div className="lg:col-span-7">
          <Suspense fallback={<Skeleton className="aspect-[4/5] w-full" />}>
            <Gallery product={product} />
          </Suspense>
        </div>
        <div className="lg:col-span-5">
          <div className="flex flex-col gap-8 lg:sticky lg:top-28">
            <div className="flex flex-col gap-3">
              {collection && (
                <LocalizedClientLink
                  href={`/collections/${collection.handle}`}
                  className="w-fit font-label-caps text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase text-secondary hover:underline"
                >
                  {collection.title}
                </LocalizedClientLink>
              )}
              <h1 className="font-display-hero text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-foreground leading-[1.1]" data-testid="product-title">
                {product.title}
              </h1>
              {product.subtitle && <p className="text-muted-foreground">{product.subtitle}</p>}
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
