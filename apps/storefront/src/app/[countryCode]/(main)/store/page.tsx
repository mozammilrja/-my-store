import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getRegion, listCategories } from "@lib/data/catalog"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { CatalogHeader } from "@modules/catalog/catalog-header"
import { parseListing, type ListingParams } from "@modules/catalog/params"
import { ProductListing } from "@modules/catalog/product-listing"

type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<ListingParams>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const origin = await getSiteOrigin()
  return {
    title: `All Products | ${STORE_NAME}`,
    description: "Every product at Everwear. Heirloom weaves, fine Chanderi, handcrafted leather, and fine jewelry.",
    alternates: { canonical: `${origin}/${countryCode}/store` },
  }
}

export default async function StorePage(props: Props) {
  const { countryCode } = await props.params
  const [region, categories, searchParams] = await Promise.all([
    getRegion(countryCode),
    listCategories().catch(() => []),
    props.searchParams,
  ])
  if (!region) notFound()

  return (
    <>
      <CatalogHeader
        eyebrow="Catalog"
        title="All Garments & Artifacts"
        description="Curated luxury essentials, hand-tailored shirts, heirloom knitwear, and timeless silhouettes."
      />
      <ProductListing
        countryCode={countryCode}
        path="/store"
        listing={parseListing(searchParams)}
        categories={categories}
      />
    </>
  )
}
