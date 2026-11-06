import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Laptop, LogOut, Smartphone } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Navigate } from "react-router"
import { Alert, Badge, Button, Input, PageContainer, PageHeader, SectionCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui"
import { portalJson, PortalError } from "./client"
import { AREA_LABEL, ROLE_LABEL, usePortal } from "./session"

/*
 * Account & security, for whoever is signed in whatever their roles, built
 * from the admin components and shown inside the current workspace.
 */

type SessionRow = { id: string; createdAt: string; lastSeenAt: string; expiresAt: string; ip: string | null; userAgent: string | null; current: boolean }

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const device = (ua: string | null) => {
  if (!ua) return "Unknown device"
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : ""
  return [browser, os].filter(Boolean).join(" on ")
}
const isPhone = (ua: string | null) => !!ua && /Android|iPhone|iPad|Mobile/.test(ua)
/** Loopback addresses are this machine; anything else is shown as recorded. */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const place = (ip: string | null) => (!ip ? "Unknown" : ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1" ? "This computer" : ip.replace(/^::ffff:/, ""))

/**
 * The page's content, rendered inside whichever workspace it was opened from
 * (/warehouse/account, /delivery/account, /seller/account, /admin/account),
 * so the workspace's own navigation stays around it.
 */
export function AccountContent() {
  const { principal } = usePortal()
  if (!principal) return null
  const a = principal.accounts
  const rows: [string, string][] = [
    ["Name", principal.name ?? "—"],
    ["Email", principal.email],
    ["Roles", principal.roles.map((r) => ROLE_LABEL[r]).join(", ")],
    ["Workspaces", principal.areas.map((x) => AREA_LABEL[x]).join(", ")],
    ...(a.admin ? [["Admin role", sentence(a.admin.role.replace(/_/g, " "))] as [string, string]] : []),
    ...(a.warehouse ? [["Warehouse role", `${sentence(a.warehouse.role)}, ${a.warehouse.warehouseIds.length} warehouse${a.warehouse.warehouseIds.length === 1 ? "" : "s"}`] as [string, string]] : []),
    ...(a.rider ? [["Rider account", sentence(a.rider.status)] as [string, string]] : []),
    ...(a.seller ? [["Seller account", `${a.seller.displayName} (${a.seller.status})`] as [string, string]] : []),
  ]
  return (
    <PageContainer>
      <PageHeader kicker="Account" title="Account & security" description="Your profile, your password, and where you're signed in." />
      <div className="grid items-start gap-space-lg xl:grid-cols-2">
        <SectionCard title="Profile" description="Names and roles are managed by the store. Ask an owner or store admin to change them.">
          <dl className="grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)] gap-x-space-md gap-y-2.5 text-body">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 break-words text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
        <ChangePassword email={principal.email} />
      </div>
      <Sessions />
    </PageContainer>
  )
}

/** /account: the account page inside the person's own workspace. */
export function AccountRedirect() {
  const { principal } = usePortal()
  return <Navigate to={principal?.home ? `${principal.home}/account` : "/login"} replace />
}

function ChangePassword({ email }: { email: string }) {
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`pw-${k}`} className="text-label-lg text-primary">
        {label}
      </label>
      <Input id={`pw-${k}`} type="password" autoComplete={auto} value={f[k]} onChange={(e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))} />
    </div>
  )
  return (
    <SectionCard title="Password" description={`One password for every Everwear operations account on ${email}.`}>
      <form onSubmit={submit} className="flex flex-col gap-space-md">
        {msg ? (
          <Alert variant={msg.ok ? "success" : "destructive"} role={msg.ok ? "status" : "alert"}>
            {msg.text}
          </Alert>
        ) : null}
        {field("currentPassword", "Current password", "current-password")}
        <div className="grid gap-space-md sm:grid-cols-2">
          {field("newPassword", "New password (12 characters or more)", "new-password")}
          {field("confirm", "Type the new password again", "new-password")}
        </div>
        <div>
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? "Saving" : "Change password"}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}

const SHOWN = 10

function Sessions() {
  const client = useQueryClient()
  const [all, setAll] = useState(false)
  const sessions = useQuery({ queryKey: ["ops", "sessions"], queryFn: () => portalJson<{ sessions: SessionRow[] }>("/ops/auth/sessions") })
  const revoke = useMutation({
    mutationFn: (id: string) => portalJson(`/ops/auth/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["ops", "sessions"] }),
  })
  const others = useMutation({
    mutationFn: () => portalJson<{ revoked: number }>("/ops/auth/sessions/revoke-others", { method: "POST" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["ops", "sessions"] }),
  })
  // This device first, then the most recently active.
  const rows = [...(sessions.data?.sessions ?? [])].sort((x, y) => Number(y.current) - Number(x.current) || y.lastSeenAt.localeCompare(x.lastSeenAt))
  const shown = all ? rows : rows.slice(0, SHOWN)
  return (
    <SectionCard
      title="Signed-in devices"
      description={rows.length ? `${rows.length} active sign-in${rows.length === 1 ? "" : "s"} on your accounts. Each ends after 12 hours.` : undefined}
      action={
        rows.length > 1 ? (
          <Button variant="outline" onClick={() => others.mutate()} disabled={others.isPending}>
            <LogOut className="size-4" aria-hidden /> Sign out other devices
          </Button>
        ) : null
      }
      contentClassName="p-0"
    >
      {sessions.isPending ? (
        <p className="p-space-md text-body text-muted">Loading…</p>
      ) : sessions.isError ? (
        <p className="p-space-md text-body text-danger">{(sessions.error as Error).message}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead className="hidden md:table-cell">Signed in</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="hidden md:table-cell">From</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      {isPhone(s.userAgent) ? <Smartphone className="size-4 shrink-0 text-faint" aria-hidden /> : <Laptop className="size-4 shrink-0 text-faint" aria-hidden />}
                      <span className="whitespace-nowrap font-medium text-primary">{device(s.userAgent)}</span>
                      {s.current ? (
                        <Badge variant="success" size="sm">
                          This device
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap tabular-nums text-secondary md:table-cell">{when(s.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-secondary">{when(s.lastSeenAt)}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-secondary md:table-cell">{place(s.ip)}</TableCell>
                  <TableCell className="text-right">
                    {s.current ? null : (
                      <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => revoke.mutate(s.id)} aria-label={`Sign out ${device(s.userAgent)} signed in ${when(s.createdAt)}`}>
                        Sign out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length > SHOWN ? (
            <div className="border-t border-subtle p-space-sm text-center">
              <Button variant="ghost" size="sm" onClick={() => setAll((v) => !v)}>
                {all ? "Show fewer" : `Show all ${rows.length}`}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  )
}
