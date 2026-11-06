import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Navigation, Phone } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { shrinkPhoto } from "@/areas/shared/image"
import { useOnline } from "@/areas/shared/network"
import { Button, Dialog, Input, Label, Notice, Panel, Select, Spinner, Textarea, formatTime } from "@/areas/shared/ui"
import { api, ApiError, errorMessage } from "@/areas/delivery/lib/api"
import { currentPosition, money, REASON_LABEL, useSession } from "@/areas/delivery/lib/session"
import { directions } from "@/areas/delivery/lib/maps"
import { ErrorState, PageContainer, PageHeader } from "@/components/ui"
import type { FailReason, Task } from "@/areas/delivery/lib/types"
import { StatusChip } from "./today"

export function TaskScreen() {
  const { id = "" } = useParams()
  const task = useQuery({ queryKey: ["task", id], queryFn: () => api<{ task: Task }>(`/tasks/${id}`) })
  const back = (
    <Link to="/delivery" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-subtle bg-surface-container-lowest px-3 text-label font-medium text-primary shadow-xs hover:bg-surface-subtle sm:h-9">
      <ArrowLeft className="size-4" aria-hidden /> Today
    </Link>
  )
  if (task.isPending) return <Spinner />
  if (task.isError)
    return (
      <PageContainer>
        <PageHeader kicker="Delivery" title="Delivery" actions={back} />
        <ErrorState variant="page" error={task.error} title="This delivery couldn't be loaded" onRetry={() => void task.refetch()} />
      </PageContainer>
    )
  const t = task.data.task
  const s = t.stop

  return (
    <PageContainer>
      <PageHeader kicker="Delivery" title={<span className="font-mono">{t.code}</span>} description={`Order #${t.displayId}`} actions={back}>
        <div className="pt-1">
          <StatusChip status={t.status} />
        </div>
      </PageHeader>
      <div className="grid items-start gap-space-lg lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-space-lg lg:col-span-2">

      {s ? (
        <Panel>
          <p className="text-base font-semibold">{s.name}</p>
          <address className="mt-1 text-body not-italic text-secondary">
            {s.address1}
            {s.address2 ? <>, {s.address2}</> : null}
            <br />
            {s.city} {s.postalCode}
          </address>
          {s.instructions ? <p className="mt-3 rounded-lg bg-status-warning-bg px-3 py-2 text-body text-warning">Note from the customer: {s.instructions}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={directions(s)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-subtle text-body font-medium hover:bg-surface-subtle">
              <Navigation className="size-4" aria-hidden /> Navigate
            </a>
            {s.phone ? (
              <a href={`tel:+91${s.phone}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-subtle text-body font-medium hover:bg-surface-subtle">
                <Phone className="size-4" aria-hidden /> Call customer
              </a>
            ) : (
              <p className="flex items-center justify-center text-center text-meta text-muted">You can call once you're out for delivery.</p>
            )}
          </div>
        </Panel>
      ) : null}

      <Actions t={t} />
      </div>
      <div className="flex min-w-0 flex-col gap-space-lg">
      {t.cod ? (
        <Notice tone={t.cod.collected === null ? "warn" : "ok"}>{t.cod.collected === null ? `Collect ${money(t.cod.due)} in cash on delivery.` : `${money(t.cod.collected)} collected.`}</Notice>
      ) : (
        <Notice tone="info">Prepaid. Collect nothing.</Notice>
      )}

      {t.attempts.length ? (
        <Panel title="Earlier attempts">
          <ul className="space-y-2 text-body">
            {t.attempts.map((a, i) => (
              <li key={i}>
                <span className="text-muted">{formatTime(a.at)}</span> · {REASON_LABEL[a.reason]}
                {a.note ? <> · {a.note}</> : null}
                {a.rescheduledFor ? <> · rescheduled for {formatTime(a.rescheduledFor)}</> : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      </div>
      </div>
    </PageContainer>
  )
}

/**
 * What happened to a tap that hasn't gone through. Offline, the request waits
 * and goes out by itself on reconnect. If it failed in flight, the delivery is
 * re-read, because the server may have recorded it before the reply was lost;
 * the form keeps what was typed so "try again" needs no re-entry.
 */
function SendState({ m, what }: { m: { isPaused: boolean; isError: boolean; error: unknown; reset: () => void; mutate: () => void }; what: string }) {
  const online = useOnline()
  if (m.isPaused)
    return (
      <Notice tone="warn">
        No connection. {what} will be sent as soon as you're back online; keep this screen open.
      </Notice>
    )
  if (m.isError && m.error instanceof ApiError && m.error.status === 0)
    return (
      <Notice tone="warn">
        {what} didn't reach the server. Nothing was lost.{" "}
        {online ? (
          <button type="button" className="font-semibold underline" onClick={() => m.mutate()}>
            Try again
          </button>
        ) : (
          "It can be sent once you're back online."
        )}
      </Notice>
    )
  return null
}

function useRefresh() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: ["task"] })
    void client.invalidateQueries({ queryKey: ["tasks"] })
    void client.invalidateQueries({ queryKey: ["cash"] })
  }
}

function Actions({ t }: { t: Task }) {
  const feedback = useFeedback()
  const refresh = useRefresh()
  const start = useMutation({
    mutationFn: () => api("/tasks/start", { body: { taskIds: [t._id] } }),
    onSuccess: () => {
      feedback.ok("Out for delivery. The customer can now see their OTP.")
      refresh()
    },
    onError: (e) => {
      feedback.bad(errorMessage(e))
      refresh()
    },
  })
  switch (t.status) {
    case "assigned":
      return <Notice tone="info">Collect this parcel at the hub: scan its AWB on the Today screen.</Notice>
    case "picked_up":
    case "attempt_failed":
      return (
        <div className="space-y-3">
          <SendState m={start} what="Starting the delivery" />
          <Button size="lg" className="w-full" busy={start.isPending} onClick={() => start.mutate()}>
            {t.status === "attempt_failed" ? "Try delivering again" : "Start delivery"}
          </Button>
        </div>
      )
    case "out_for_delivery":
      return <Doorstep t={t} />
    case "rto":
      return <Notice tone="warn">Delivery wasn't possible. Bring this parcel back to the hub; they'll scan it in.</Notice>
    case "delivered":
      return <Notice tone="ok">Delivered to {t.delivered?.receiverName} on {formatTime(t.delivered?.at)}.</Notice>
    default:
      return null
  }
}

function Doorstep({ t }: { t: Task }) {
  const { me } = useSession()
  const feedback = useFeedback()
  const refresh = useRefresh()
  const navigate = useNavigate()
  const [otp, setOtp] = useState("")
  const [receiver, setReceiver] = useState(t.stop?.name ?? "")
  const [cashConfirmed, setCashConfirmed] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [failing, setFailing] = useState(false)

  const deliver = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set("otp", otp)
      form.set("receiverName", receiver)
      if (t.cod) form.set("codCollected", String(t.cod.due))
      const at = await currentPosition()
      if (at) {
        form.set("lat", String(at.lat))
        form.set("lng", String(at.lng))
      }
      if (photo) form.set("photo", await shrinkPhoto(photo))
      return api(`/tasks/${t._id}/deliver`, { form })
    },
    onSuccess: () => {
      feedback.ok(`${t.code} delivered${t.cod ? `; ${money(t.cod.due)} collected` : ""}`)
      refresh()
      navigate("/delivery")
    },
    onError: (e) => {
      feedback.bad(errorMessage(e))
      // It may have been recorded before the reply was lost: show the real state.
      refresh()
    },
  })
  const resend = useMutation({
    mutationFn: () => api(`/tasks/${t._id}/otp`, { body: {} }),
    onSuccess: () => feedback.ok("New OTP issued. Ask the customer to refresh their order page."),
    onError: (e) => feedback.bad(errorMessage(e)),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    deliver.mutate()
  }

  return (
    <>
      <Panel title="Hand over">
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <Label htmlFor="otp">Delivery OTP from the customer</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-14 text-center font-mono !text-2xl tracking-[0.5em]"
            />
            <p className="mt-1 text-meta text-muted">The customer sees it on their order page in the Everwear app or website.</p>
          </div>
          <div>
            <Label htmlFor="receiver">Received by</Label>
            <Input id="receiver" required minLength={2} value={receiver} onChange={(e) => setReceiver(e.target.value)} />
          </div>
          {t.cod ? (
            <label className="flex items-start gap-3 rounded-lg border border-status-warning/40 bg-status-warning-bg p-3 text-body text-warning">
              <input type="checkbox" required checked={cashConfirmed} onChange={(e) => setCashConfirmed(e.target.checked)} className="mt-0.5 size-5 accent-[rgb(var(--accent))]" />
              <span>
                I collected <strong>{money(t.cod.due)}</strong> in cash. (The amount can't be changed at the door.)
              </span>
            </label>
          ) : null}
          <div>
            <Label htmlFor="photo">Photo of the handover (optional)</Label>
            <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="block w-full text-body text-secondary file:mr-3 file:h-10 file:rounded-lg file:border file:border-subtle file:bg-surface-container-lowest file:px-3 file:text-body file:font-medium" />
          </div>
          <SendState m={deliver} what="The delivery" />
          <Button type="submit" size="lg" className="w-full" busy={deliver.isPending} disabled={otp.length !== 6 || (!!t.cod && !cashConfirmed)}>
            {deliver.isPaused ? "Waiting for network" : "Confirm delivery"}
          </Button>
        </form>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => resend.mutate()} busy={resend.isPending}>
            New OTP
          </Button>
          <Button variant="secondary" onClick={() => setFailing(true)}>
            Couldn't deliver
          </Button>
        </div>
      </Panel>
      <Dialog open={failing} onClose={() => setFailing(false)} title="Why couldn't you deliver?">
        <FailForm t={t} reasons={me.failedReasons} onDone={() => setFailing(false)} />
      </Dialog>
    </>
  )
}

function FailForm({ t, reasons, onDone }: { t: Task; reasons: FailReason[]; onDone: () => void }) {
  const feedback = useFeedback()
  const refresh = useRefresh()
  const [reason, setReason] = useState<FailReason>("customer_unavailable")
  const [note, setNote] = useState("")
  const [when, setWhen] = useState("")
  const fail = useMutation({
    mutationFn: async () => {
      const at = await currentPosition()
      return api<{ task: Task }>(`/tasks/${t._id}/fail`, { body: { reason, ...(note ? { note } : {}), ...(when ? { rescheduledFor: new Date(when).toISOString() } : {}), ...(at ?? {}) } })
    },
    onSuccess: (d) => {
      feedback.ok(d.task.status === "rto" ? "Recorded. This was the last attempt: bring the parcel back to the hub." : "Attempt recorded.")
      refresh()
      onDone()
    },
    onError: (e) => {
      feedback.bad(errorMessage(e))
      refresh()
    },
  })
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        fail.mutate()
      }}
    >
      <div>
        <Label htmlFor="reason">Reason</Label>
        <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value as FailReason)}>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {REASON_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="note">{reason === "other" ? "What happened" : "Note (optional)"}</Label>
        <Textarea id="note" required={reason === "other"} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {reason === "customer_rescheduled" ? (
        <div>
          <Label htmlFor="when">New time the customer asked for</Label>
          <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
      ) : null}
      <SendState m={fail} what="The attempt" />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Back
        </Button>
        <Button type="submit" variant="danger" busy={fail.isPending}>
          Record attempt
        </Button>
      </div>
    </form>
  )
}
