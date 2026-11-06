import type { LucideIcon } from "lucide-react"
import { Moon } from "lucide-react"
import type { ReactNode } from "react"
import { NavLink } from "react-router"
import { BrandMark } from "@/components/layout/BrandMark"
import { Breadcrumbs } from "@/portal/Breadcrumbs"
import { PortalMenu } from "@/portal/PortalMenu"
import { toggleThemeGlobal } from "@/lib/theme"
import { cn } from "./ui"

/*
 * The frame every workspace (warehouse, delivery, seller) sits in: the
 * admin's shell, same geometry and tokens. A 17rem sidebar from `lg`, a 4rem
 * header across the top, and full-width content with the admin's padding.
 * Below `lg` the sidebar gives way to a bottom tab bar (handheld workspaces)
 * or a row of tabs under the header. Each workspace keeps its own navigation,
 * header controls and footer.
 */

export type WorkspaceNavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number }

type Props = {
  /** "Delivery", "Warehouse", "Seller Hub": the sidebar's section title. */
  area: string
  nav: readonly WorkspaceNavItem[]
  /** Left side of the header: a workspace selector or the person's name. */
  headerStart?: ReactNode
  /** Workspace controls in the header, before the theme and account buttons. */
  headerActions?: ReactNode
  /** Who is signed in and how, at the bottom of the sidebar. */
  sidebarFooter?: ReactNode
  /** Below `lg`: "bottom" tab bar for one-handed use, or "tabs" under the header. */
  mobileNav?: "bottom" | "tabs"
  /** A full-width strip under the header (e.g. "sharing your location"). */
  strip?: ReactNode
  children: ReactNode
}

const today = () => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date())

export function WorkspaceShell({ area, nav, headerStart, headerActions, sidebarFooter, mobileNav = "bottom", strip, children }: Props) {
  return (
    <div className="min-h-dvh bg-surface-canvas text-primary antialiased">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-overlay focus:rounded-lg focus:bg-surface-container-lowest focus:px-3 focus:py-2">
        Skip to content
      </a>

      <aside aria-label="Primary" className="fixed inset-y-0 left-0 z-sidebar hidden w-sidebar flex-col border-r border-subtle bg-surface-container-lowest lg:flex">
        <div className="flex h-header shrink-0 items-center gap-2.5 border-b border-subtle px-4">
          <BrandMark src="/brand/aveliq-monogram-mark.svg" label="AVELIQ" className="h-7 w-7" />
          <BrandMark src="/brand/aveliq-wordmark-mark.svg" label="" aria-hidden="true" align="left" className="h-4 w-24" />
        </div>
        <div className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          <div className="px-2.5 py-0.5 text-caption uppercase tracking-wider text-faint">{area}</div>
          <nav aria-label="Main" className="flex flex-col gap-0.5">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-body transition-colors",
                    isActive ? "bg-primary-fixed font-semibold text-on-primary-fixed" : "text-muted hover:bg-surface-subtle hover:text-primary"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon className={cn("size-[18px] shrink-0", isActive ? "text-accent" : "text-faint group-hover:text-primary")} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{n.label}</span>
                    {n.badge ? <span className="shrink-0 rounded-full border border-status-info/20 bg-status-info-bg px-1.5 py-px text-micro tabular-nums text-info">{n.badge}</span> : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        {sidebarFooter ? <div className="shrink-0 border-t border-subtle bg-surface-container-lowest p-3">{sidebarFooter}</div> : null}
      </aside>

      <header className="fixed inset-x-0 top-0 z-header border-b border-subtle bg-surface-container-lowest/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:left-sidebar">
        <div className="flex h-header items-center gap-2 px-4 md:gap-space-md md:px-space-xl">
          <span className="lg:hidden">
            <BrandMark src="/brand/aveliq-monogram-mark.svg" label="AVELIQ" className="h-7 w-7" />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">{headerStart}</div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-subtle bg-surface-subtle px-space-sm py-1.5 text-label font-medium tabular-nums text-primary xl:flex">{today()}</span>
            {headerActions}
            <button
              type="button"
              onClick={toggleThemeGlobal}
              className="grid size-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-primary sm:size-9"
              aria-label="Switch light or dark theme"
            >
              <Moon className="size-[18px]" aria-hidden />
            </button>
            <PortalMenu compact />
          </div>
        </div>
        {mobileNav === "tabs" ? (
          <nav aria-label="Sections" className="no-scrollbar flex gap-1 overflow-x-auto border-t border-subtle px-2 lg:hidden">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn("flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-body font-medium", isActive ? "border-accent text-accent" : "border-transparent text-muted")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <main
        id="main"
        className={cn(
          "w-full lg:pl-sidebar",
          // Clear the fixed header (and the tab row under it below lg).
          mobileNav === "tabs" ? "pt-[calc(theme(spacing.header)+2.75rem+env(safe-area-inset-top))] lg:pt-header" : "pt-[calc(theme(spacing.header)+env(safe-area-inset-top))] lg:pt-header"
        )}
      >
        {strip}
        <div className={cn("w-full px-4 py-space-lg md:px-space-xl md:py-space-xl", mobileNav === "bottom" && "pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-space-xl")}>
          <Breadcrumbs className="mb-space-md" />
          {children}
        </div>
      </main>

      {mobileNav === "bottom" ? (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-header border-t border-subtle bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn("flex h-16 flex-col items-center justify-center gap-1 text-label font-medium", isActive ? "text-accent" : "text-muted")}>
                <n.icon className="size-5" aria-hidden />
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
