import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getRegion } from "@lib/data/catalog"
import { getSiteOrigin, STORE_NAME } from "@lib/util/site"
import { MarketplaceView } from "@modules/marketplace"

type Props = {
  params: Promise<{ countryCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const origin = await getSiteOrigin()
  return {
    title: `${STORE_NAME} | The Modern Heritage Wardrobe`,
    description: "Every product at Everwear. Heirloom weaves, fine Chanderi, handcrafted leather, and fine jewelry.",
    alternates: { canonical: `${origin}/${countryCode}/store` },
  }
}

export default async function StorePage(props: Props) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)
  if (!region) notFound()

  return <MarketplaceView />
}
