import { Button } from "@/components/ui/button"
import { StatusPage } from "@/components/store/status-page"
import { Wordmark } from "@/components/store/wordmark"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
}

export default function NotFound() {
  return (
    <>
      <div className="border-b">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label="Everwear home">
            <Wordmark />
          </Link>
        </div>
      </div>
      <StatusPage
        code="404"
        title="We couldn&apos;t find that page."
        actions={
          <Button asChild size="lg">
            <Link href="/">Go to the store</Link>
          </Button>
        }
      />
    </>
  )
}
