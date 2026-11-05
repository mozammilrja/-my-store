import { Skeleton } from "@/components/ui/skeleton"

/** Between account pages: the sidebar stays, the content area shows this until the next page is ready. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
