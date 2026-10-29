import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle } from "@lib/data/categories"
import { getSiteOrigin } from "@lib/util/site"
import { CatalogHeader } from "@modules/catalog/catalog-header"
import { parsePage, parseSort, ProductListing } from "@modules/catalog/product-listing"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{ sortBy?: string; page?: string }>
}

const findCategory = (handle: string[]) => getCategoryByHandle(handle).catch(() => null)

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category, countryCode } = await props.params
  const productCategory = await findCategory(category)

  if (!productCategory) {
    notFound()
  }

  const origin = await getSiteOrigin()
  return {
    title: productCategory.name,
    description: productCategory.description || `Shop ${productCategory.name} at My Store.`,
    alternates: { canonical: `${origin}/${countryCode}/categories/${category.join("/")}` },
  }
}

export default async function CategoryPage(props: Props) {
  const { category, countryCode } = await props.params
  const { sortBy, page } = await props.searchParams
  const productCategory = await findCategory(category)

  if (!productCategory) {
    notFound()
  }

  const filter = new URLSearchParams({ "product[refinementList][category][0]": productCategory.name })

  return (
    <>
      <CatalogHeader
        eyebrow={productCategory.parent_category?.name ?? "Category"}
        title={productCategory.name}
        description={productCategory.description}
      />
      <ProductListing
        countryCode={countryCode}
        path={`/categories/${category.join("/")}`}
        query={{ category_id: [productCategory.id] }}
        sortBy={parseSort(sortBy)}
        page={parsePage(page)}
        filterHref={`/store?${filter.toString()}`}
      />
    </>
  )
}
