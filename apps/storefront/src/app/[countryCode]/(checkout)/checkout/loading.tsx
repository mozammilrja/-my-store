import { Skeleton } from "@/components/ui/skeleton"

/** Between checkout steps: the 8 + 4 layout every step uses, so nothing jumps when the step arrives. */
export default function Loading() {
  return (
    <div className="w-full pt-20 bg-background min-h-screen" aria-busy="true" aria-label="Loading checkout">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-xl">
        <Skeleton className="h-6 w-80 mx-auto mb-space-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-10 w-96 max-w-full" />
            <Skeleton className="h-36 w-full rounded-lg" />
            <Skeleton className="h-36 w-full rounded-lg" />
          </div>
          <Skeleton className="lg:col-span-4 h-[28rem] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
