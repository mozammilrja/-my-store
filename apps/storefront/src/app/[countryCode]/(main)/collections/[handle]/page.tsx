import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import { getSiteOrigin } from "@lib/util/site"
import { CatalogHeader } from "@modules/catalog/catalog-header"
import { parsePage, parseSort, ProductListing } from "@modules/catalog/product-listing"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<{ sortBy?: string; page?: string }>
}

const findCollection = (handle: string) => getCollectionByHandle(handle).catch(() => null)

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle, countryCode } = await props.params
  const collection = await findCollection(handle)

  if (!collection) {
    notFound()
  }

  const origin = await getSiteOrigin()
  return {
    title: collection.title,
    description: `Shop the ${collection.title} collection at My Store.`,
    alternates: { canonical: `${origin}/${countryCode}/collections/${handle}` },
  }
}

export default async function CollectionPage(props: Props) {
  const { handle, countryCode } = await props.params
  const { sortBy, page } = await props.searchParams
  const collection = await findCollection(handle)

  if (!collection) {
    notFound()
  }

  return (
    <>
      <CatalogHeader eyebrow="Collection" title={collection.title} />
      <ProductListing
        countryCode={countryCode}
        path={`/collections/${handle}`}
        query={{ collection_id: [collection.id] }}
        sortBy={parseSort(sortBy)}
        page={parsePage(page)}
      />
    </>
  )
}
