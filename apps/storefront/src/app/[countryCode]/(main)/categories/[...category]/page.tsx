import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategory } from "@lib/data/catalog"
import { getSiteOrigin } from "@lib/util/site"
import { CatalogHeader } from "@modules/catalog/catalog-header"
import { parseListing, type ListingParams } from "@modules/catalog/params"
import { ProductListing } from "@modules/catalog/product-listing"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<ListingParams>
}

// Nested category URLs (/categories/a/b) resolve to the last handle.
const handleOf = (segments: string[]) => segments.at(-1) ?? ""

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, countryCode } = await props.params
  const found = await getCategory(handleOf(category))
  if (!found) notFound()
  const origin = await getSiteOrigin()
  return {
    title: found.name,
    description: found.description || `Shop ${found.name} at Everwear.`,
    alternates: { canonical: `${origin}/${countryCode}/categories/${category.join("/")}` },
  }
}

export default async function CategoryPage(props: Props) {
  const { category, countryCode } = await props.params
  const found = await getCategory(handleOf(category))
  if (!found) notFound()

  return (
    <>
      <CatalogHeader eyebrow="Category" title={found.name} description={found.description} />
      <ProductListing
        countryCode={countryCode}
        path={`/categories/${category.join("/")}`}
        listing={parseListing(await props.searchParams)}
        categoryIds={[found.id]}
      />
    </>
  )
}
