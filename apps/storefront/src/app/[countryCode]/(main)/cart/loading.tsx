import { Container } from "@/components/store/container"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <Container className="flex flex-col gap-8 py-14" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-14 w-64" />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[6rem_1fr] gap-4">
              <Skeleton className="aspect-[4/5] w-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 lg:col-span-5" />
      </div>
    </Container>
  )
}
