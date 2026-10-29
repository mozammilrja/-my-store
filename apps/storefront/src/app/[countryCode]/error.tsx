"use client"

import { Button } from "@/components/ui/button"
import { StatusPage } from "@/components/store/status-page"
import Link from "next/link"
import { useEffect } from "react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      code="Something went wrong"
      title="This page didn&apos;t load."
      actions={
        <>
          <Button size="lg" onClick={reset}>Try again</Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </>
      }
    >
      <p>
        It may be a temporary problem with the store. Your bag is saved.
        {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
      </p>
    </StatusPage>
  )
}
