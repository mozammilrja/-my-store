import { Button } from "@/components/ui/button"
import { StatusPage } from "@/components/store/status-page"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Bag not found", robots: { index: false } }

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="We couldn&apos;t find your bag."
      actions={
        <Button asChild size="lg">
          <LocalizedClientLink href="/store">Shop all</LocalizedClientLink>
        </Button>
      }
    >
      <p>It may have expired. Anything you add now starts a new bag.</p>
    </StatusPage>
  )
}
