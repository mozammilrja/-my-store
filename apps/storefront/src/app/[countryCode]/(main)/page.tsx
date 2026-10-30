import { Metadata } from "next"

import { getRegion, listRegions } from "@lib/data/catalog"
import { getSiteOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"
import { buildReturnPolicy } from "@lib/util/policies"
import { toJsonLd } from "@lib/util/product-structured-data"
import { notFound } from "next/navigation"

import { BreadcrumbBar } from "@modules/home/sections/breadcrumb"
import { Hero } from "@modules/home/sections/hero"
import { MetricsTicker } from "@modules/home/sections/metrics-ticker"
import { SubcategoryMatrix } from "@modules/home/sections/subcategory-matrix"
import { CuratedLookbooks } from "@modules/home/sections/curated-lookbooks"
import { TrendingGrid } from "@modules/home/sections/trending-grid"
import { WardrobeDirectory } from "@modules/home/sections/wardrobe-directory"
import { AtelierSpotlights } from "@modules/home/sections/atelier-spotlights"
import { BespokeService } from "@modules/home/sections/bespoke-service"


export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])

  return {
    title: { absolute: `${STORE_NAME} | Men's Fashion & Lifestyle Department` },
    description:
      "Explore contemporary masculine elegance at Everwear. Tailored essentials meet modern Indian craftsmanship, from heavyweight textured knits to breezy Maheshwari handspun silks.",
    openGraph: {
      title: `${STORE_NAME} | Men's Department`,
      description: "Contemporary Masculine Elegance. Tailored essentials meet modern craftsmanship.",
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

  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])
  const homeUrl = `${origin}/${countryCode}`
  const returnPolicies = regions.flatMap((r) =>
    r.policies ? r.countries.map((c) => buildReturnPolicy(r.policies!, c.code)) : []
  )
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: STORE_NAME,
      url: origin,
      ...(returnPolicies.length ? { hasMerchantReturnPolicy: returnPolicies } : {}),
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
      <div className="flex flex-col w-full bg-background font-body-md text-on-surface antialiased selection:bg-secondary-container selection:text-on-secondary-fixed">
        <BreadcrumbBar />
        <Hero />
        <MetricsTicker />
        <SubcategoryMatrix />
        <CuratedLookbooks />
        <TrendingGrid />
        <WardrobeDirectory />
        <AtelierSpotlights />
        <BespokeService />
      </div>
    </>
  )
}
