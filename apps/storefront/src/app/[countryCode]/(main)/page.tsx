import { Metadata } from "next"

import { getRegion, getStorePolicies, listRegions } from "@lib/data/catalog"
import { getHomeData } from "@modules/home/data"
import { CategoryChips } from "@modules/home/sections/category-chips"
import { CategoryTiles } from "@modules/home/sections/category-tiles"
import { CollectionBand } from "@modules/home/sections/collection-band"
import { Hero } from "@modules/home/sections/hero"
import { ProductRow } from "@modules/home/sections/product-row"
import { PromoSplit } from "@modules/home/sections/promo-split"
import { NEW_IN_HREF } from "@modules/shell/header"
import { Promises } from "@modules/home/sections/promises"
import { notFound } from "next/navigation"
import { toJsonLd } from "@lib/util/product-structured-data"
import { getSiteOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"
import { buildReturnPolicy } from "@lib/util/policies"

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
  const returnPolicies = regions.flatMap((r) => (r.policies ? r.countries.map((c) => buildReturnPolicy(r.policies!, c.code)) : []))
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
      <Hero />
      <CategoryChips categories={home.categories} />
      <ProductRow
        id="bestsellers-title"
        eyebrow={home.bestsellersTagged ? "Most wanted" : "Shop the range"}
        title={home.bestsellersTagged ? "Bestsellers" : "More to explore"}
        products={home.bestsellers}
        href="/store"
        linkLabel="Shop all"
      />
      <PromoSplit categories={home.categories} />
      <ProductRow
        id="new-in-title"
        eyebrow="Just landed"
        title="New in"
        products={home.latest}
        href={NEW_IN_HREF}
        linkLabel="View all new"
      />
      <CategoryTiles categories={home.categories} />
      <CollectionBand collections={home.collections} />
      <Promises
        policies={policies?.current ?? null}
        currencyCode={policies?.currency || region.currency}
      />
    </>
  )
}
