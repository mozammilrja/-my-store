import { Metadata } from "next"

import { getStorePolicies } from "@lib/data/catalog"
import {
  PoliciesUnavailable,
  PolicyPage,
  ShippingSummary,
} from "@modules/policies/templates"

export const dynamic = "force-static"
export const revalidate = 60

export const metadata: Metadata = {
  title: "Shipping information",
  description: "Shipping rates and delivery times.",
}

export default async function ShippingPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const { current, currency } = await getStorePolicies(countryCode)

  return (
    <PolicyPage title="Shipping information">
      {current ? (
        <>
          <p>
            Orders to {countryCode.toUpperCase()} ship with the following rates
            and delivery times.
          </p>
          <ShippingSummary policies={current} currency={currency} />
          <p className="text-muted-foreground">
            Available shipping methods and final costs are shown at checkout.
          </p>
        </>
      ) : (
        <PoliciesUnavailable />
      )}
    </PolicyPage>
  )
}
