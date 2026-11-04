import { cn } from "@/lib/utils"

/**
 * Placeholder for a listing card, matching its real geometry so a grid does
 * not shift when products arrive: 3:4 image, then brand, title and price.
 */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-surface-container-lowest",
        className
      )}
      data-testid="product-card-skeleton"
      aria-hidden
    >
      <div className="aspect-[3/4] w-full animate-pulse bg-muted" />
      <div className="flex flex-col gap-1.5 px-1 pb-1 pt-2.5">
        <div className="h-3 w-1/3 animate-pulse bg-muted" />
        <div className="h-3 w-4/5 animate-pulse bg-muted" />
        <div className="mt-1 h-3.5 w-1/2 animate-pulse bg-muted" />
      </div>
    </div>
  )
}

/** A full grid of placeholders, used by listing route `loading.tsx` files. */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5"
      data-testid="product-grid-skeleton"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  )
}
