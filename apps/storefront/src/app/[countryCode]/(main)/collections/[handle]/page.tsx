import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollection } from "@lib/data/catalog"
import { getSiteOrigin } from "@lib/util/site"
import { CatalogHeader } from "@modules/catalog/catalog-header"
import { parseListing, type ListingParams } from "@modules/catalog/params"
import { ProductListing } from "@modules/catalog/product-listing"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<ListingParams>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle, countryCode } = await props.params
  const collection = await getCollection(handle)
  if (!collection) notFound()
  const origin = await getSiteOrigin()
  return {
    title: collection.title,
    description: `Shop the ${collection.title} collection at Everwear.`,
    alternates: { canonical: `${origin}/${countryCode}/collections/${handle}` },
  }
}

export default async function CollectionPage(props: Props) {
  const { handle, countryCode } = await props.params
  const collection = await getCollection(handle)
  if (!collection) notFound()

  return (
    <>
      <CatalogHeader eyebrow="Collection" title={collection.title} />
      <ProductListing
        countryCode={countryCode}
        path={`/collections/${handle}`}
        listing={parseListing(await props.searchParams)}
        collectionIds={[collection.id]}
      />
    </>
  )
}
