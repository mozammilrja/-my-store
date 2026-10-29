import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getRegion } from "@lib/data/regions"
import { getSiteOrigin } from "@lib/util/site"
import { Browse } from "@modules/catalog/browse"
import { CatalogHeader } from "@modules/catalog/catalog-header"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const origin = await getSiteOrigin()
  return {
    title: "Shop all",
    description: "Every product at Everwear. Filter by size, colour, category and price.",
    alternates: { canonical: `${origin}/${countryCode}/store` },
  }
}

export default async function StorePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  return (
    <>
      <CatalogHeader eyebrow="Shop" title="All products" />
      {/* The faceted listing renders in the browser; reserving a screen of
          height keeps the footer from jumping when results arrive. */}
      <div className="min-h-[100svh]">
        <Browse currencyCode={region.currency_code} />
      </div>
    </>
  )
}
