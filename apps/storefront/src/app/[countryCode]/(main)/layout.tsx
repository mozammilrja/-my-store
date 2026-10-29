import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import { Footer } from "@modules/shell/footer"
import { Header } from "@modules/shell/header"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode; params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await props.params
  return (
    <>
      <Header countryCode={countryCode} />
      {props.children}
      <Footer />
    </>
  )
}
