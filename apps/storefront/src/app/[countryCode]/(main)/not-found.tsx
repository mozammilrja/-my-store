import { Button } from "@/components/ui/button"
import { StatusPage } from "@/components/store/status-page"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
}

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="We couldn&apos;t find that page."
      actions={
        <>
          <Button asChild size="lg">
            <LocalizedClientLink href="/store">Shop all</LocalizedClientLink>
          </Button>
          <Button asChild size="lg" variant="outline">
            <LocalizedClientLink href="/">Home</LocalizedClientLink>
          </Button>
        </>
      }
    >
      <p>The link may be out of date, or the product is no longer available.</p>
    </StatusPage>
  )
}
