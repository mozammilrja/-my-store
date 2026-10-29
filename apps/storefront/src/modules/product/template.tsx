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
import { StorePolicies } from "@lib/util/store-policies"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Suspense } from "react"
import { Details } from "./details"
import { Gallery } from "./gallery"
import { PurchasePanel } from "./purchase-panel"
import { Related } from "./related"

export function ProductTemplate({
  product,
  countryCode,
  policies,
  currencyCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
  policies: StorePolicies | null
  currencyCode: string
}) {
  const category = product.categories?.[0]

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

      <Container className="grid gap-10 py-8 lg:grid-cols-12 lg:gap-12 lg:py-10">
        <div className="lg:col-span-7">
          <Suspense fallback={<Skeleton className="aspect-[4/5] w-full" />}>
            <Gallery product={product} />
          </Suspense>
        </div>
        <div className="lg:col-span-5">
          <div className="flex flex-col gap-8 lg:sticky lg:top-28">
            <div className="flex flex-col gap-3">
              {product.collection && (
                <LocalizedClientLink
                  href={`/collections/${product.collection.handle}`}
                  className="w-fit text-xs font-semibold tracking-widest uppercase text-primary hover:underline"
                >
                  {product.collection.title}
                </LocalizedClientLink>
              )}
              <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl" data-testid="product-title">
                {product.title}
              </h1>
              {product.subtitle && <p className="text-muted-foreground">{product.subtitle}</p>}
            </div>
            <PurchasePanel product={product} />
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
