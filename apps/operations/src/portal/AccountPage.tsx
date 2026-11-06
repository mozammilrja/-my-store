import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Laptop, LogOut } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router"
import { PortalMenu } from "./PortalMenu"
import { portalJson, PortalError } from "./client"
import { AREA_LABEL, ROLE_LABEL, usePortal } from "./session"

type SessionRow = { id: string; createdAt: string; lastSeenAt: string; expiresAt: string; ip: string | null; userAgent: string | null; current: boolean }

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const device = (ua: string | null) => {
  if (!ua) return "Unknown device"
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : ""
  return [browser, os].filter(Boolean).join(" on ")
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-panel">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

/** Profile, password and signed-in devices for whoever is signed in, whatever their roles. */
export function AccountPage() {
  const { principal } = usePortal()
  if (!principal) return null
  const a = principal.accounts
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to={principal.home ?? "/"} className="flex h-11 items-center gap-2 rounded-control px-2 text-sm text-ink-2 hover:bg-panel-muted sm:h-10">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Link>
          <p className="flex-1 text-sm font-semibold">Account &amp; security</p>
          <PortalMenu />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <h1 className="sr-only">Account and security</h1>
        <Panel title="Profile">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-ink-3">Name</dt>
            <dd>{principal.name ?? "—"}</dd>
            <dt className="text-ink-3">Email</dt>
            <dd>{principal.email}</dd>
            <dt className="text-ink-3">Roles</dt>
            <dd>{principal.roles.map((r) => ROLE_LABEL[r]).join(", ")}</dd>
            <dt className="text-ink-3">Workspaces</dt>
            <dd>{principal.areas.map((x) => AREA_LABEL[x]).join(", ")}</dd>
            {a.admin ? (
              <>
                <dt className="text-ink-3">Admin role</dt>
                <dd className="capitalize">{a.admin.role.replace(/_/g, " ")}</dd>
              </>
            ) : null}
            {a.warehouse ? (
              <>
                <dt className="text-ink-3">Warehouse role</dt>
                <dd className="capitalize">
                  {a.warehouse.role}, {a.warehouse.warehouseIds.length} warehouse{a.warehouse.warehouseIds.length === 1 ? "" : "s"}
                </dd>
              </>
            ) : null}
            {a.rider ? (
              <>
                <dt className="text-ink-3">Rider account</dt>
                <dd className="capitalize">{a.rider.status}</dd>
              </>
            ) : null}
            {a.seller ? (
              <>
                <dt className="text-ink-3">Seller account</dt>
                <dd>
                  {a.seller.displayName} <span className="capitalize text-ink-3">({a.seller.status})</span>
                </dd>
              </>
            ) : null}
          </dl>
          <p className="mt-4 text-xs text-ink-3">Names and roles are managed by the store. Ask an owner or store admin to change them.</p>
        </Panel>
        <ChangePassword />
        <Sessions />
      </main>
    </div>
  )
}

function ChangePassword() {
  const { principal } = usePortal()
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const client = useQueryClient()
  const change = useMutation({
    mutationFn: () => portalJson<{ changed: string[] }>("/ops/auth/password", { body: { currentPassword: f.currentPassword, newPassword: f.newPassword } }),
    onSuccess: () => {
      setF({ currentPassword: "", newPassword: "", confirm: "" })
      setMsg({ ok: true, text: "Password changed. Your other devices have been signed out." })
      void client.invalidateQueries({ queryKey: ["ops", "sessions"] })
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof PortalError ? e.message : "Couldn't change the password." }),
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (f.newPassword.length < 12) return setMsg({ ok: false, text: "Use at least 12 characters for the new password." })
    if (f.newPassword !== f.confirm) return setMsg({ ok: false, text: "The new passwords don't match." })
    setMsg(null)
    change.mutate()
  }
  const field = (k: keyof typeof f, label: string, auto: string) => (
    <div>
      <label htmlFor={`pw-${k}`} className="mb-1.5 block text-sm font-medium text-ink-2">
        {label}
      </label>
      <input
        id={`pw-${k}`}
        type="password"
        autoComplete={auto}
        value={f[k]}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        className="h-11 w-full rounded-control border border-line-strong bg-panel px-3 text-base text-ink sm:h-10 sm:text-sm"
      />
    </div>
  )
  return (
    <Panel title="Password">
      <form onSubmit={submit} className="grid gap-4 sm:max-w-sm">
        <p className="text-sm text-ink-2">One password for every Everwear operations account on {principal?.email}.</p>
        {msg ? (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "rounded-control bg-ok-bg px-3 py-2 text-sm text-ok" : "rounded-control bg-bad-bg px-3 py-2 text-sm text-bad"}>
            {msg.text}
          </p>
        ) : null}
        {field("currentPassword", "Current password", "current-password")}
        {field("newPassword", "New password (12 characters or more)", "new-password")}
        {field("confirm", "Type the new password again", "new-password")}
        <button type="submit" disabled={change.isPending} className="h-11 rounded-control bg-accent px-4 sm:h-10 text-sm font-medium text-area-on-accent hover:bg-accent-hover disabled:opacity-60">
          {change.isPending ? "Saving" : "Change password"}
        </button>
      </form>
    </Panel>
  )
}

function Sessions() {
  const client = useQueryClient()
  const sessions = useQuery({ queryKey: ["ops", "sessions"], queryFn: () => portalJson<{ sessions: SessionRow[] }>("/ops/auth/sessions") })
  const revoke = useMutation({
    mutationFn: (id: string) => portalJson(`/ops/auth/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["ops", "sessions"] }),
  })
  const others = useMutation({
    mutationFn: () => portalJson<{ revoked: number }>("/ops/auth/sessions/revoke-others", { method: "POST" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["ops", "sessions"] }),
  })
  const rows = sessions.data?.sessions ?? []
  return (
    <Panel
      title="Signed-in devices"
      action={
        rows.length > 1 ? (
          <button type="button" onClick={() => others.mutate()} disabled={others.isPending} className="flex h-11 items-center gap-1.5 rounded-control border sm:h-9 border-line px-3 text-sm text-ink-2 hover:bg-panel-muted">
            <LogOut className="size-4" aria-hidden /> Sign out other devices
          </button>
        ) : null
      }
    >
      {sessions.isPending ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : sessions.isError ? (
        <p className="text-sm text-bad">{(sessions.error as Error).message}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Laptop className="size-5 shrink-0 text-ink-3" aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  {device(s.userAgent)} {s.current ? <span className="ml-1 rounded-full bg-ok-bg px-2 py-0.5 text-xs text-ok">This device</span> : null}
                </p>
                <p className="text-xs text-ink-3">
                  Signed in {when(s.createdAt)} · last active {when(s.lastSeenAt)}
                  {s.ip ? ` · ${s.ip}` : ""}
                </p>
              </div>
              {s.current ? null : (
                <button type="button" onClick={() => revoke.mutate(s.id)} className="h-11 rounded-control px-3 text-sm text-bad sm:h-9 hover:bg-bad-bg" aria-label={`Sign out ${device(s.userAgent)} signed in ${when(s.createdAt)}`}>
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
