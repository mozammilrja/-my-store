import { Metadata } from "next"

import { getCategory, listCategories } from "@lib/data/catalog"
import { getSiteOrigin } from "@lib/util/site"
import { CatalogHeader } from "@modules/catalog/catalog-header"
import { parseListing, type ListingParams } from "@modules/catalog/params"
import { ProductListing } from "@modules/catalog/product-listing"
import { MenDepartmentLanding } from "@modules/department/men-landing"
import { WomenDepartmentLanding } from "@modules/department/women-landing"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<ListingParams>
}

// Nested category URLs (/categories/a/b) resolve to the last handle.
const handleOf = (segments: string[]) => segments.at(-1) ?? ""

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, countryCode } = await props.params
  const handle = handleOf(category)
  const found = await getCategory(handle)
  const title = found ? found.name : handle.charAt(0).toUpperCase() + handle.slice(1).replace(/-/g, " ")
  const origin = await getSiteOrigin()
  return {
    title,
    description: found?.description || `Explore ${title} collection at Everwear.`,
    alternates: { canonical: `${origin}/${countryCode}/categories/${category.join("/")}` },
  }
}

export default async function CategoryPage(props: Props) {
  const { category, countryCode } = await props.params
  const handle = handleOf(category)
  const [found, allCategories, searchParams] = await Promise.all([
    getCategory(handle),
    listCategories().catch(() => []),
    props.searchParams,
  ])
  const title = found ? found.name : handle.charAt(0).toUpperCase() + handle.slice(1).replace(/-/g, " ")
  const description = found?.description || `Curated selections and timeless craftsmanship for ${title}.`
  const listing = parseListing(searchParams)

  if (handle === "men" && found) {
    return (
      <MenDepartmentLanding
        countryCode={countryCode}
        category={found}
        categories={allCategories}
        listing={listing}
      />
    )
  }

  if (handle === "women" && found) {
    return (
      <WomenDepartmentLanding
        countryCode={countryCode}
        category={found}
        categories={allCategories}
        listing={listing}
      />
    )
  }

  return (
    <>
      <CatalogHeader eyebrow="Category" title={title} description={description} />
      <ProductListing
        countryCode={countryCode}
        path={`/categories/${category.join("/")}`}
        listing={listing}
        categoryIds={found ? [found.id] : undefined}
        categories={allCategories}
      />
    </>
  )
}
