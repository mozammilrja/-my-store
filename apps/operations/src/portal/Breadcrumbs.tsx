import { ChevronRight } from "lucide-react"
import { Link, useLocation } from "react-router"
import { MODULE_ROUTES } from "@/routes"
import { AREA_HOME, pageLabel } from "./destinations"
import { AREA_LABEL, usePortal, type Area } from "./session"

/** Operations › Area › Page, from the URL. The last step is the current page and isn't a link. */
export function Breadcrumbs({ className = "" }: { className?: string }) {
  const { principal } = usePortal()
  const { pathname } = useLocation()
  const area = pathname.split("/")[1] as Area
  if (!AREA_LABEL[area]) return null
  const page = pageLabel(pathname, MODULE_ROUTES as { path: string; label: string }[])
  const atAreaHome = pathname === AREA_HOME[area] || pathname === `${AREA_HOME[area]}/`
  const steps: { label: string; to?: string }[] = [
    { label: "Operations", to: principal?.home ?? "/" },
    { label: AREA_LABEL[area], to: atAreaHome ? undefined : AREA_HOME[area] },
    ...(page && !atAreaHome ? [{ label: page }] : []),
  ]
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-meta text-muted">
        {steps.map((s, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 shrink-0" aria-hidden /> : null}
            {s.to && i < steps.length - 1 ? (
              <Link to={s.to} className="truncate hover:text-primary hover:underline">
                {s.label}
              </Link>
            ) : (
              <span aria-current={i === steps.length - 1 ? "page" : undefined} className="truncate font-medium text-secondary">
                {s.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
