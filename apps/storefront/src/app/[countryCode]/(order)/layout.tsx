import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * Order confirmation, tracking and invoice are migrated from the Stitch page
 * exports, which define their own headers and footers. Each page renders its
 * own (see @modules/stitch/shell), so this layout adds nothing around them.
 */
export default function OrderLayout(props: { children: React.ReactNode }) {
  return <>{props.children}</>
}
