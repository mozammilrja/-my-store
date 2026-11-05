import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { onSignedOut } from "@/portal/client"
import { QuickSwitch } from "@/portal/QuickSwitch"
import { ApiError } from "./api"
import { FeedbackProvider } from "./feedback"

/**
 * Each area keeps its own query cache, as it had as a separate app: the
 * warehouse's "me" and the rider's "me" are different records under the same
 * key. Every cache is emptied on sign-out.
 */
export function makeAreaClient(opts: { refetchOnWindowFocus?: boolean } = {}) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // A refusal (4xx) won't change on retry; a dropped connection might.
        retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 2,
        ...(opts.refetchOnWindowFocus === undefined ? {} : { refetchOnWindowFocus: opts.refetchOnWindowFocus }),
      },
    },
  })
  onSignedOut(() => client.clear())
  return client
}

/** The providers and page frame an area ran inside as its own app. */
export function AreaShell({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <FeedbackProvider>
        <div className="area-root min-h-dvh bg-canvas font-sans text-ink antialiased">
          {children}
          <QuickSwitch />
        </div>
      </FeedbackProvider>
    </QueryClientProvider>
  )
}
