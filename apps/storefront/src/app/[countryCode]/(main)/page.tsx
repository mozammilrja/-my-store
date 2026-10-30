import { Metadata } from "next"

import { getRegion, listRegions } from "@lib/data/catalog"
import { getSiteOrigin, listCountryCodes, STORE_NAME } from "@lib/util/site"
import { notFound } from "next/navigation"

import { MarketplaceView } from "@modules/marketplace"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const [origin, regions] = await Promise.all([getSiteOrigin(), listRegions()])

  return {
    title: { absolute: `${STORE_NAME} | Modern Heritage Wardrobe & Category Navigation` },
    description:
      "Explore the Modern Heritage Wardrobe at Everwear. Heirloom weaves, fine Chanderi, handcrafted leather, and fine jewelry.",
    openGraph: {
      title: `${STORE_NAME} | The Modern Heritage Wardrobe`,
      description: "Heirloom weaves, fine Chanderi, handcrafted leather, and fine jewelry.",
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

  return <MarketplaceView />
}
