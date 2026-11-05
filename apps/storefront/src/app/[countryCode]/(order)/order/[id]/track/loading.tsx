import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="w-full pt-20 bg-surface min-h-screen" aria-busy="true" aria-label="Loading">
      <div className="max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col gap-space-xl">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
          <Skeleton className="lg:col-span-8 h-96 w-full rounded-xl" />
          <Skeleton className="lg:col-span-4 h-96 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
