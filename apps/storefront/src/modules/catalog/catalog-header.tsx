import { Container } from "@/components/store/container"

/** Title block shared by every listing page. */
export function CatalogHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string | null
}) {
  return (
    <Container className="flex flex-col gap-4 border-b pt-12 pb-10 lg:pt-16">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-widest uppercase text-primary">{eyebrow}</p>
      )}
      <h1 className="font-display text-5xl tracking-tight sm:text-6xl" data-testid="store-page-title">
        {title}
      </h1>
      {description && <p className="max-w-2xl text-base text-muted-foreground">{description}</p>}
    </Container>
  )
}
