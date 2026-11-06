import { ShieldAlert } from "lucide-react"
import type { ReactNode } from "react"
import { Link, Navigate, useLocation } from "react-router"
import { AREA_HOME } from "./destinations"
import { AREA_LABEL, usePortal, type Area } from "./session"

export function PortalSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-dvh place-items-center bg-surface-canvas text-body text-muted">
      <span className="flex items-center gap-2">
        <span className="size-4 animate-spin rounded-full border-2 border-subtle border-t-accent" aria-hidden />
        {label}
      </span>
    </div>
  )
}

/**
 * Renders an area only for a session whose accounts open it. Anyone else is
 * sent to sign in, or told the area isn't theirs; typing the URL changes
 * nothing, and the API refuses the area's calls regardless.
 */
export function RequireArea({ area, children }: { area: Area | "any"; children: ReactNode }) {
  const { status, principal, endedBy, error, refresh } = usePortal()
  const location = useLocation()
  if (status === "loading") return <PortalSpinner label="Signing in" />
  if (status === "error")
    return (
      <div className="mx-auto mt-24 max-w-sm space-y-3 px-4 text-center text-primary">
        <p>{error?.message ?? "Can't reach the server."}</p>
        <button className="text-body font-medium text-accent underline" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    )
  // A deliberate sign-out starts the next session at its dashboard; otherwise
  // (opened signed out, or the session expired) sign-in returns to this page.
  if (status !== "signedIn" || !principal) return <Navigate to="/login" replace state={endedBy === "user" ? undefined : { from: location, reason: endedBy === "expired" ? "expired" : undefined }} />
  if (area !== "any" && !principal.areas.includes(area)) return <NotAllowed area={area} />
  return <>{children}</>
}

export function NotAllowed({ area }: { area: Area }) {
  const { principal } = usePortal()
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-canvas px-4 text-primary">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-subtle bg-surface-container-lowest p-6">
        <ShieldAlert className="size-8 text-warning" aria-hidden />
        <h1 className="text-lg font-semibold">{AREA_LABEL[area]} isn't part of your account</h1>
        <p className="text-body text-secondary">
          {principal?.email} is signed in without a {AREA_LABEL[area].toLowerCase()} account. If you need access, ask an owner or store admin.
        </p>
        {principal?.areas.length ? (
          <div className="flex flex-wrap gap-2">
            {principal.areas.map((a) => (
              <Link key={a} to={AREA_HOME[a]} className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-body font-medium text-on-accent hover:bg-accent-hover">
                Go to {AREA_LABEL[a]}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  )
}

/** "/": the signed-in person's own dashboard. */
export function HomeRedirect() {
  const { status, principal } = usePortal()
  if (status === "loading") return <PortalSpinner />
  if (status === "signedIn" && principal?.home) return <Navigate to={principal.home} replace />
  return <Navigate to="/login" replace />
}
