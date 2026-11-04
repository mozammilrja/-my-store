import { Container } from "@/components/store/container"
import { ProductGridSkeleton } from "@/components/store/product-card-skeleton"

/** Holds the listing's geometry while products load, so nothing shifts. */
export default function Loading() {
  return (
    <Container className="py-8">
      <div className="mb-6 h-6 w-48 animate-pulse bg-muted" />
      <ProductGridSkeleton count={10} />
    </Container>
  )
}
