import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Navigation, Phone } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { Button, Dialog, Input, Label, Notice, Panel, Select, Spinner, Textarea, formatTime } from "@/areas/shared/ui"
import { api, errorMessage } from "@/areas/delivery/lib/api"
import { currentPosition, money, REASON_LABEL, useSession } from "@/areas/delivery/lib/session"
import type { FailReason, Task } from "@/areas/delivery/lib/types"
import { StatusChip } from "./today"

/** Directions in Google Maps: to the pin when the address has one, else to the address text. */
const directions = (s: NonNullable<Task["stop"]>) =>
  `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : [s.address1, s.address2, s.city, s.postalCode, "India"].filter(Boolean).join(", "))}`

export function TaskScreen() {
  const { id = "" } = useParams()
  const task = useQuery({ queryKey: ["task", id], queryFn: () => api<{ task: Task }>(`/tasks/${id}`) })
  if (task.isPending) return <Spinner />
  if (task.isError) return <Notice>{errorMessage(task.error)}</Notice>
  const t = task.data.task
  const s = t.stop

  return (
    <div className="space-y-4">
      <Link to="/delivery" className="inline-flex items-center gap-1 text-sm text-ink-2">
        <ArrowLeft className="size-4" aria-hidden /> Today
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-mono text-lg font-semibold">{t.code}</h1>
        <StatusChip status={t.status} />
      </div>

      {s ? (
        <Panel>
          <p className="text-base font-semibold">{s.name}</p>
          <address className="mt-1 text-sm not-italic text-ink-2">
            {s.address1}
            {s.address2 ? <>, {s.address2}</> : null}
            <br />
            {s.city} {s.postalCode}
          </address>
          {s.instructions ? <p className="mt-3 rounded-control bg-warn-bg px-3 py-2 text-sm text-warn">Note from the customer: {s.instructions}</p> : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={directions(s)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-line text-sm font-medium hover:bg-panel-muted">
              <Navigation className="size-4" aria-hidden /> Navigate
            </a>
            {s.phone ? (
              <a href={`tel:+91${s.phone}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-line text-sm font-medium hover:bg-panel-muted">
                <Phone className="size-4" aria-hidden /> Call customer
              </a>
            ) : (
              <p className="flex items-center justify-center text-center text-xs text-ink-3">You can call once you're out for delivery.</p>
            )}
          </div>
        </Panel>
      ) : null}

      {t.cod ? (
        <Notice tone={t.cod.collected === null ? "warn" : "ok"}>{t.cod.collected === null ? `Collect ${money(t.cod.due)} in cash on delivery.` : `${money(t.cod.collected)} collected.`}</Notice>
      ) : (
        <Notice tone="info">Prepaid. Collect nothing.</Notice>
      )}

      <Actions t={t} />

      {t.attempts.length ? (
        <Panel title="Earlier attempts">
          <ul className="space-y-2 text-sm">
            {t.attempts.map((a, i) => (
              <li key={i}>
                <span className="text-ink-3">{formatTime(a.at)}</span> · {REASON_LABEL[a.reason]}
                {a.note ? <> · {a.note}</> : null}
                {a.rescheduledFor ? <> · rescheduled for {formatTime(a.rescheduledFor)}</> : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  )
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
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  switch (t.status) {
    case "assigned":
      return <Notice tone="info">Collect this parcel at the hub: scan its AWB on the Today screen.</Notice>
    case "picked_up":
    case "attempt_failed":
      return (
        <Button size="lg" className="w-full" busy={start.isPending} onClick={() => start.mutate()}>
          {t.status === "attempt_failed" ? "Try delivering again" : "Start delivery"}
        </Button>
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
      if (photo) form.set("photo", photo)
      return api(`/tasks/${t._id}/deliver`, { form })
    },
    onSuccess: () => {
      feedback.ok(`${t.code} delivered${t.cod ? `; ${money(t.cod.due)} collected` : ""}`)
      refresh()
      navigate("/delivery")
    },
    onError: (e) => feedback.bad(errorMessage(e)),
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
              className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
            />
            <p className="mt-1 text-xs text-ink-3">The customer sees it on their order page in the Everwear app or website.</p>
          </div>
          <div>
            <Label htmlFor="receiver">Received by</Label>
            <Input id="receiver" required minLength={2} value={receiver} onChange={(e) => setReceiver(e.target.value)} />
          </div>
          {t.cod ? (
            <label className="flex items-start gap-3 rounded-control border border-warn/40 bg-warn-bg p-3 text-sm text-warn">
              <input type="checkbox" required checked={cashConfirmed} onChange={(e) => setCashConfirmed(e.target.checked)} className="mt-0.5 size-5 accent-[rgb(var(--accent))]" />
              <span>
                I collected <strong>{money(t.cod.due)}</strong> in cash. (The amount can't be changed at the door.)
              </span>
            </label>
          ) : null}
          <div>
            <Label htmlFor="photo">Photo of the handover (optional)</Label>
            <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="block w-full text-sm text-ink-2 file:mr-3 file:h-10 file:rounded-control file:border file:border-line file:bg-panel file:px-3 file:text-sm file:font-medium" />
          </div>
          <Button type="submit" size="lg" className="w-full" busy={deliver.isPending} disabled={otp.length !== 6 || (!!t.cod && !cashConfirmed)}>
            Confirm delivery
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
    onError: (e) => feedback.bad(errorMessage(e)),
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
