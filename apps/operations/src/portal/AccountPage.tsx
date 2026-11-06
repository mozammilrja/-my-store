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
    <section className="rounded-xl border border-subtle bg-surface-container-lowest">
      <header className="flex items-center justify-between gap-3 border-b border-subtle px-5 py-3">
        <h2 className="text-body font-semibold">{title}</h2>
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
    <div className="min-h-dvh bg-surface-canvas text-primary">
      <header className="sticky top-0 z-30 border-b border-subtle bg-surface-container-lowest/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to={principal.home ?? "/"} className="flex h-11 items-center gap-2 rounded-lg px-2 text-body text-secondary hover:bg-surface-subtle sm:h-10">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Link>
          <p className="flex-1 text-body font-semibold">Account &amp; security</p>
          <PortalMenu />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <h1 className="sr-only">Account and security</h1>
        <Panel title="Profile">
          <dl className="grid gap-x-6 gap-y-3 text-body sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">Name</dt>
            <dd>{principal.name ?? "—"}</dd>
            <dt className="text-muted">Email</dt>
            <dd>{principal.email}</dd>
            <dt className="text-muted">Roles</dt>
            <dd>{principal.roles.map((r) => ROLE_LABEL[r]).join(", ")}</dd>
            <dt className="text-muted">Workspaces</dt>
            <dd>{principal.areas.map((x) => AREA_LABEL[x]).join(", ")}</dd>
            {a.admin ? (
              <>
                <dt className="text-muted">Admin role</dt>
                <dd className="capitalize">{a.admin.role.replace(/_/g, " ")}</dd>
              </>
            ) : null}
            {a.warehouse ? (
              <>
                <dt className="text-muted">Warehouse role</dt>
                <dd className="capitalize">
                  {a.warehouse.role}, {a.warehouse.warehouseIds.length} warehouse{a.warehouse.warehouseIds.length === 1 ? "" : "s"}
                </dd>
              </>
            ) : null}
            {a.rider ? (
              <>
                <dt className="text-muted">Rider account</dt>
                <dd className="capitalize">{a.rider.status}</dd>
              </>
            ) : null}
            {a.seller ? (
              <>
                <dt className="text-muted">Seller account</dt>
                <dd>
                  {a.seller.displayName} <span className="capitalize text-muted">({a.seller.status})</span>
                </dd>
              </>
            ) : null}
          </dl>
          <p className="mt-4 text-meta text-muted">Names and roles are managed by the store. Ask an owner or store admin to change them.</p>
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
      <label htmlFor={`pw-${k}`} className="mb-1.5 block text-body font-medium text-secondary">
        {label}
      </label>
      <input
        id={`pw-${k}`}
        type="password"
        autoComplete={auto}
        value={f[k]}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        className="h-11 w-full rounded-lg border border-strong bg-surface-container-lowest px-3 text-base text-primary sm:h-10 sm:text-body"
      />
    </div>
  )
  return (
    <Panel title="Password">
      <form onSubmit={submit} className="grid gap-4 sm:max-w-sm">
        <p className="text-body text-secondary">One password for every Everwear operations account on {principal?.email}.</p>
        {msg ? (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "rounded-lg bg-status-success-bg px-3 py-2 text-body text-success" : "rounded-lg bg-status-danger-bg px-3 py-2 text-body text-danger"}>
            {msg.text}
          </p>
        ) : null}
        {field("currentPassword", "Current password", "current-password")}
        {field("newPassword", "New password (12 characters or more)", "new-password")}
        {field("confirm", "Type the new password again", "new-password")}
        <button type="submit" disabled={change.isPending} className="h-11 rounded-lg bg-accent px-4 sm:h-10 text-body font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60">
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
          <button type="button" onClick={() => others.mutate()} disabled={others.isPending} className="flex h-11 items-center gap-1.5 rounded-lg border sm:h-9 border-subtle px-3 text-body text-secondary hover:bg-surface-subtle">
            <LogOut className="size-4" aria-hidden /> Sign out other devices
          </button>
        ) : null
      }
    >
      {sessions.isPending ? (
        <p className="text-body text-muted">Loading…</p>
      ) : sessions.isError ? (
        <p className="text-body text-danger">{(sessions.error as Error).message}</p>
      ) : (
        <ul className="divide-y divide-subtle">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Laptop className="size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1 text-body">
                <p className="font-medium">
                  {device(s.userAgent)} {s.current ? <span className="ml-1 rounded-full bg-status-success-bg px-2 py-0.5 text-meta text-success">This device</span> : null}
                </p>
                <p className="text-meta text-muted">
                  Signed in {when(s.createdAt)} · last active {when(s.lastSeenAt)}
                  {s.ip ? ` · ${s.ip}` : ""}
                </p>
              </div>
              {s.current ? null : (
                <button type="button" onClick={() => revoke.mutate(s.id)} className="h-11 rounded-lg px-3 text-body text-danger sm:h-9 hover:bg-status-danger-bg" aria-label={`Sign out ${device(s.userAgent)} signed in ${when(s.createdAt)}`}>
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
