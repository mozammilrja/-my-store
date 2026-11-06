import { Check, Download, KeyRound, LayoutGrid, LogOut, Share } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { AREA_HOME } from "./destinations"
import { useInstall } from "./pwa"
import { AREA_LABEL, ROLE_LABEL, usePortal, type Area } from "./session"

const initialsOf = (name: string) =>
  name
    .split(/[\s@._()-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")

/**
 * The account menu every area shows in its top bar: who is signed in, with
 * which roles, the workspaces their accounts open (and only those), account
 * and security, and sign out.
 */
export function PortalMenu({ compact = false }: { compact?: boolean }) {
  const { principal, signOut } = usePortal()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const location = useLocation()
  const navigate = useNavigate()
  const current = location.pathname.split("/")[1] as Area
  const { mode: installMode, install } = useInstall()
  const [iosHelp, setIosHelp] = useState(false)
  // With a mouse, the menu opens on hover and closes a moment after the
  // pointer leaves (time to cross into it). Touch and keyboard use the button.
  const hover = useRef(typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches)
  const closeTimer = useRef<number | undefined>(undefined)
  const enter = () => {
    if (!hover.current) return
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const leave = () => {
    if (!hover.current) return
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 200)
  }
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!principal) return null
  const name = principal.name ?? principal.email.split("@")[0]!

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        // A mouse has already opened it by hovering: a click keeps it open rather than toggling it shut.
        onClick={() => (hover.current ? setOpen(true) : setOpen((o) => !o))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        className="flex h-10 items-center gap-2 rounded-lg px-1.5 text-body text-secondary hover:bg-surface-subtle"
      >
        <span className="grid size-8 place-items-center rounded-full border border-subtle bg-surface-container text-label font-semibold text-secondary" aria-hidden>
          {initialsOf(name)}
        </span>
        {compact ? null : <span className="hidden max-w-32 truncate font-medium text-primary lg:inline">{name}</span>}
      </button>

      {open ? (
        <div id={menuId} role="menu" aria-label="Account" className="absolute right-0 top-full z-50 mt-2 w-72 animate-zoom-in rounded-xl border border-subtle bg-overlay p-1.5 text-primary shadow-lg before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-['']">
          <div className="border-b border-subtle px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-body font-semibold">{name}</p>
            <p className="truncate text-meta text-muted">{principal.email}</p>
            <p className="mt-2 flex flex-wrap gap-1">
              {principal.roles.map((r) => (
                <span key={r} className="rounded-full border border-subtle bg-surface-container px-2 py-0.5 text-micro text-secondary">
                  {ROLE_LABEL[r]}
                </span>
              ))}
            </p>
          </div>

          {principal.areas.length > 1 ? (
            <div className="border-b border-subtle py-1.5" role="group" aria-label="Workspaces">
              <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <LayoutGrid className="size-3.5" aria-hidden /> Workspaces
              </p>
              {principal.areas.map((a) => (
                <Link
                  key={a}
                  role="menuitem"
                  to={AREA_HOME[a]}
                  aria-current={a === current ? "page" : undefined}
                  className="flex h-11 md:h-9 items-center justify-between rounded-lg px-2.5 text-body hover:bg-surface-subtle aria-[current=page]:font-semibold aria-[current=page]:text-accent"
                >
                  {AREA_LABEL[a]}
                  {a === current ? <Check className="size-4" aria-hidden /> : null}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="pt-1.5">
            {installMode ? (
              <button
                role="menuitem"
                type="button"
                onClick={async () => {
                  if (installMode === "prompt") {
                    setOpen(false)
                    await install()
                  } else setIosHelp((v) => !v)
                }}
                className="flex h-11 md:h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-body hover:bg-surface-subtle"
              >
                <Download className="size-4 text-muted" aria-hidden /> Install app
              </button>
            ) : null}
            {iosHelp ? (
              <p className="px-2.5 pb-2 text-meta text-secondary">
                In Safari, tap <Share className="inline size-3.5 align-text-bottom" aria-label="Share" /> Share, then <strong>Add to Home Screen</strong>.
              </p>
            ) : null}
            <Link role="menuitem" to={AREA_HOME[current] ? `${AREA_HOME[current]}/account` : "/account"} className="flex h-11 md:h-9 items-center gap-2 rounded-lg px-2.5 text-body hover:bg-surface-subtle">
              <KeyRound className="size-4 text-muted" aria-hidden /> Account &amp; security
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={async () => {
                setOpen(false)
                await signOut()
                navigate("/login", { replace: true })
              }}
              className="flex h-11 md:h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-body text-danger hover:bg-status-danger-bg"
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
