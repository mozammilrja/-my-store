import { useMutation } from "@tanstack/react-query"
import { BadgeCheck, Clock3, LogOut } from "lucide-react"
import { useState } from "react"
import { useFeedback } from "@/components/feedback"
import { Button, Input, Label, Panel, Select } from "@/components/ui"
import { api, errorMessage } from "@/lib/api"
import { money, useSession } from "@/lib/session"
import { DOCUMENT_TYPES, type DocumentType, type Shift } from "@/lib/types"

const DOC_LABEL: Record<DocumentType, string> = { driving_licence: "Driving licence", vehicle_rc: "Vehicle RC", aadhaar: "Aadhaar", pan: "PAN", insurance: "Vehicle insurance" }
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function Profile() {
  const { me, refresh, signOut } = useSession()
  const feedback = useFeedback()
  const r = me.rider
  const [docType, setDocType] = useState<DocumentType>("driving_licence")
  const [docNumber, setDocNumber] = useState("")
  const [shifts, setShifts] = useState<Shift[]>(r.shifts)

  const saveDoc = useMutation({
    mutationFn: () => api(`/me/documents/${docType}`, { method: "PUT", body: { number: docNumber } }),
    onSuccess: () => {
      feedback.ok(`${DOC_LABEL[docType]} saved. Your hub will verify it.`)
      setDocNumber("")
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const saveShifts = useMutation({
    mutationFn: () => api("/me", { method: "PATCH", body: { shifts } }),
    onSuccess: () => {
      feedback.ok("Shifts saved")
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Profile</h1>
      <Panel>
        <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
          <dt className="text-ink-3">Name</dt>
          <dd>{r.name}</dd>
          <dt className="text-ink-3">Mobile</dt>
          <dd>+91 {r.phone}</dd>
          <dt className="text-ink-3">Email</dt>
          <dd className="truncate">{r.email}</dd>
          <dt className="text-ink-3">Vehicle</dt>
          <dd className="capitalize">
            {r.vehicle.type}
            {r.vehicle.registration ? ` · ${r.vehicle.registration}` : ""}
          </dd>
          <dt className="text-ink-3">Hub</dt>
          <dd>{me.warehouse ? `${me.warehouse.name}, ${me.warehouse.city}` : "Not assigned yet"}</dd>
          <dt className="text-ink-3">Zones</dt>
          <dd>{me.zones.length ? me.zones.map((z) => z.name).join(", ") : "Not assigned yet"}</dd>
          <dt className="text-ink-3">Pay</dt>
          <dd>
            {money(me.payout.perDelivery)} per delivery · {money(me.payout.perFailedAttempt)} per attempted delivery
          </dd>
        </dl>
      </Panel>

      <Panel title="Documents">
        <ul className="mb-4 space-y-2 text-sm">
          {r.documents.length === 0 ? <li className="text-ink-3">No documents yet. Add your driving licence and Aadhaar to be approved.</li> : null}
          {r.documents.map((d) => (
            <li key={d.type} className="flex items-center justify-between gap-2">
              <span>
                {DOC_LABEL[d.type]} <span className="font-mono text-ink-3">{d.number}</span>
              </span>
              {d.verified ? (
                <span className="inline-flex items-center gap-1 text-ok">
                  <BadgeCheck className="size-4" aria-hidden /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warn">
                  <Clock3 className="size-4" aria-hidden /> Checking
                </span>
              )}
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            saveDoc.mutate()
          }}
        >
          <div>
            <Label htmlFor="doc-type">Document</Label>
            <Select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="doc-number">Number</Label>
            <Input id="doc-number" required minLength={4} value={docNumber} onChange={(e) => setDocNumber(e.target.value.toUpperCase())} className="font-mono" />
          </div>
          <Button type="submit" busy={saveDoc.isPending}>
            Save
          </Button>
        </form>
        <p className="mt-2 text-xs text-ink-3">Only the last four digits are shown back. Your hub checks the originals.</p>
      </Panel>

      <Panel title="Shifts">
        <ul className="space-y-2">
          {shifts.map((s, i) => (
            <li key={i} className="grid grid-cols-[5rem_1fr_1fr_auto] items-end gap-2">
              <Select aria-label="Day" value={s.day} onChange={(e) => setShifts((x) => x.map((y, j) => (j === i ? { ...y, day: Number(e.target.value) } : y)))}>
                {DAYS.map((d, n) => (
                  <option key={d} value={n}>
                    {d}
                  </option>
                ))}
              </Select>
              <Input aria-label="Start" type="time" value={s.start} onChange={(e) => setShifts((x) => x.map((y, j) => (j === i ? { ...y, start: e.target.value } : y)))} />
              <Input aria-label="End" type="time" value={s.end} onChange={(e) => setShifts((x) => x.map((y, j) => (j === i ? { ...y, end: e.target.value } : y)))} />
              <Button variant="ghost" onClick={() => setShifts((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${DAYS[s.day]} shift`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-3">With no shifts set, you can take deliveries whenever you're online.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => setShifts((x) => [...x, { day: 1, start: "09:00", end: "18:00" }])}>
            Add shift
          </Button>
          <Button onClick={() => saveShifts.mutate()} busy={saveShifts.isPending}>
            Save shifts
          </Button>
        </div>
      </Panel>

      <Button variant="secondary" className="w-full" onClick={signOut}>
        <LogOut className="size-4" aria-hidden /> Sign out
      </Button>
    </div>
  )
}
