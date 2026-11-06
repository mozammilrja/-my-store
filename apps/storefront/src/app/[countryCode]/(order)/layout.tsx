import { getBaseURL } from "@lib/util/env"
import { Footer } from "@modules/shell/footer"
import { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * Order confirmation, tracking and invoice render their own headers (see
 * @modules/stitch/shell). The footer is the store's one footer, the same as on
 * every other page (hidden when an invoice is printed).
 */
export default function OrderLayout(props: { children: React.ReactNode }) {
  return (
    <>
      {props.children}
      <Footer />
    </>
  )
}
