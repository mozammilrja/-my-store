import { Metadata } from "next"

import { getStorePolicies } from "@lib/data/store-policies"
import { getRegion, listRegions } from "@lib/data/regions"
import { getHomeData } from "@modules/home/data"
import { CategoryIndex } from "@modules/home/sections/category-index"
import { Collections } from "@modules/home/sections/collections"
import { Hero } from "@modules/home/sections/hero"
import { NewArrivals } from "@modules/home/sections/new-arrivals"
import { Promises } from "@modules/home/sections/promises"
import { notFound } from "next/navigation"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getSiteOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"
import { buildRegionsReturnPolicies } from "@lib/util/store-policies"

export const dynamic = "force-static"
export const revalidate = 60

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])

  return {
    title: { absolute: `${STORE_NAME} | Everyday clothing and essentials` },
    description:
      "Shop shirts, sweatshirts, pants and everyday essentials at Everwear. Prices and delivery shown for your region.",
    openGraph: {
      title: STORE_NAME,
      description: "Everyday clothing and essentials.",
      url: `${origin}/${countryCode}`,
      siteName: STORE_NAME,
      type: "website",
    },
    alternates: {
      canonical: `${origin}/${countryCode}`,
      languages: {
        ...Object.fromEntries(
          listCountryCodes(regions).map((code) => [
            `en-${code.toUpperCase()}`,
            `${origin}/${code}`,
          ])
        ),
        "x-default": origin,
      },
    },
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const [home, policies] = await Promise.all([
    getHomeData(countryCode),
    getStorePolicies(countryCode).catch(() => null),
  ])

  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])
  const homeUrl = `${origin}/${countryCode}`
  const returnPolicies = buildRegionsReturnPolicies(regions)
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: STORE_NAME,
      url: origin,
      ...(returnPolicies.length
        ? { hasMerchantReturnPolicy: returnPolicies }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: STORE_NAME,
      url: homeUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${homeUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(structuredData) }}
      />
      <Hero featured={home.latest[0]} />
      <NewArrivals products={home.latest} />
      <CategoryIndex categories={home.categories} />
      <Promises
        policies={policies?.current ?? null}
        currencyCode={policies?.currencyCode ?? region.currency_code}
      />
      <Collections collections={home.collections} />
    </>
  )
}
