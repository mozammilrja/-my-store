import { Container } from "@/components/store/container"

/** Full-width message page used by not-found and error boundaries. */
export function StatusPage({
  code,
  title,
  children,
  actions,
}: {
  code?: string
  title: string
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <Container className="flex min-h-[60vh] flex-col justify-center gap-6 py-20">
      {code && <p className="text-xs font-semibold tracking-widest uppercase text-primary">{code}</p>}
      <h1 className="max-w-3xl font-display-hero text-4xl sm:text-6xl font-light tracking-tight">{title}</h1>
      {children && <div className="max-w-xl text-muted-foreground">{children}</div>}
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </Container>
  )
}
