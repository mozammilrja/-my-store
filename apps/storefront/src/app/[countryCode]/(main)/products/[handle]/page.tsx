import { Metadata } from "next"
import { notFound } from "next/navigation"

import type { Product, Region } from "@lib/api/types"
import { getProduct, getRegion, listCategories, listCollections, listRegions } from "@lib/data/catalog"
import { buildProductStructuredData, toJsonLd } from "@lib/util/product-structured-data"
import { getSiteOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"
import { ProductTemplate } from "@modules/product/template"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
}

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode, handle } = await props.params
  const [region, product] = await Promise.all([getRegion(countryCode), getProduct(handle, countryCode)])
  if (!region || !product) notFound()

  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])
  const path = `/products/${product.handle}`
  const productUrl = `${origin}/${countryCode}${path}`
  const description = product.description || product.title

  return {
    title: product.title,
    description,
    alternates: {
      canonical: productUrl,
      languages: Object.fromEntries(listCountryCodes(regions).map((code) => [`en-${code.toUpperCase()}`, `${origin}/${code}${path}`])),
      types: { "text/markdown": `${productUrl}.md` },
    },
    openGraph: {
      title: `${product.title} | ${STORE_NAME}`,
      description,
      url: productUrl,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "isk", "huf"])

/** Open Graph product price and availability tags, from catalog data only. */
const ProductMetaTags = ({ product, region }: { product: Product; region: Region }) => {
  const min = product.priceRange?.min
  const amount = min === undefined ? null : (min / (ZERO_DECIMAL.has(region.currency) ? 1 : 100)).toFixed(2)
  const currency = region.currency.toUpperCase()
  return (
    <>
      <meta property="og:type" content="product" />
      {amount && (
        <>
          <meta property="product:price:amount" content={amount} />
          <meta property="product:price:currency" content={currency} />
          <meta property="og:price:amount" content={amount} />
          <meta property="og:price:currency" content={currency} />
        </>
      )}
      <meta property="product:availability" content={product.variants.some((v) => v.inStock) ? "in stock" : "out of stock"} />
    </>
  )
}

export default async function ProductPage(props: Props) {
  const { countryCode, handle } = await props.params
  const [region, product] = await Promise.all([getRegion(countryCode), getProduct(handle, countryCode)])
  if (!region || !product) notFound()

  const [origin, categories, collections] = await Promise.all([getSiteOrigin(), listCategories(), listCollections()])
  const structuredData = buildProductStructuredData({
    product,
    region,
    countryCode,
    productUrl: `${origin}/${countryCode}/products/${product.handle}`,
  })

  return (
    <>
      <ProductMetaTags product={product} region={region} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }} />
      <ProductTemplate
        product={product}
        category={categories.find((c) => product.categoryIds.includes(c.id)) ?? null}
        collection={collections.find((c) => c.id === product.collectionId) ?? null}
        countryCode={countryCode}
        policies={region.policies}
        currencyCode={region.currency}
      />
    </>
  )
}
