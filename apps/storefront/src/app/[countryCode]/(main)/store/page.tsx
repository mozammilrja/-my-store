import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getRegion, listCategories } from "@lib/data/catalog"
import { getSiteOrigin } from "@lib/util/site"
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
    title: "Shop all",
    description: "Every product at Everwear. Filter by size, colour, material and category.",
    alternates: { canonical: `${origin}/${countryCode}/store` },
  }
}

export default async function StorePage(props: Props) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)
  if (!region) notFound()

  const categories = (await listCategories()).filter((c) => !c.parentId)

  return (
    <>
      <CatalogHeader eyebrow="Shop" title="All products" />
      <ProductListing
        countryCode={countryCode}
        path="/store"
        listing={parseListing(await props.searchParams)}
        categories={categories}
      />
    </>
  )
}
