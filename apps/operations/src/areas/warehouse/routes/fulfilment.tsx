import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ExternalLink, Printer } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { ScanField } from "@/areas/shared/scan-field"
import { Barcode, Button, cn, Dialog, formatTime, Input, Label, Notice, Panel, Select, Spinner, STATUS_LABEL, StatusBadge, Textarea } from "@/areas/warehouse/components/ui"
import { api, ApiError, errorMessage } from "@/areas/warehouse/lib/api"
import { useSession } from "@/areas/warehouse/lib/session"
import type { Fulfilment, FulfilmentLine, Label as CourierLabel, Permission, StatusEvent } from "@/areas/warehouse/lib/types"

type OwnFleet = { zone: string; codAllowed: boolean } | null
type Detail = { fulfilment: Fulfilment; history: StatusEvent[]; label: CourierLabel; ownFleet: OwnFleet }
type OwnLabel = { awb: string; orderNumber: number; warehouse: string; to: { name: string; address1: string; address2: string | null; city: string; postalCode: string }; cod: { amount: number; currency: string } | null; weightKg: number | null }

const norm = (s: string) => s.trim().toUpperCase()
const units = (f: Fulfilment) => f.lines.reduce((n, l) => n + l.quantity, 0)

/** Posts a floor action, reports the outcome with tone and toast, and refreshes the order and queues. */
function useAction(id: string) {
  const client = useQueryClient()
  const feedback = useFeedback()
  return useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown; ok?: string }) => api<{ fulfilment: Fulfilment }>(`/fulfilments/${id}${path}`, { body: body ?? {} }),
    onSuccess: (_d, v) => {
      if (v.ok) feedback.ok(v.ok)
      void client.invalidateQueries({ queryKey: ["fulfilment", id] })
      void client.invalidateQueries({ queryKey: ["queue"] })
      void client.invalidateQueries({ queryKey: ["summary"] })
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
}

export function FulfilmentWork() {
  const { id = "" } = useParams()
  const detail = useQuery({ queryKey: ["fulfilment", id], queryFn: () => api<Detail>(`/fulfilments/${id}`) })
  const [printing, setPrinting] = useState<"slip" | "package" | null>(null)

  if (detail.isPending) return <Spinner />
  if (detail.isError) return <Notice>{errorMessage(detail.error)}</Notice>
  const { fulfilment: f, history, label, ownFleet } = detail.data

  const print = (what: "slip" | "package") => {
    setPrinting(what)
    // Let the print area render before the dialog opens.
    requestAnimationFrame(() => {
      window.print()
      setPrinting(null)
    })
  }

  return (
    <div className="space-y-5">
      <Link to="/warehouse" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold">{f.code}</h1>
            <StatusBadge status={f.status} />
            {f.paymentMethod === "cod" ? <span className="rounded-full bg-warn-bg px-2 py-0.5 text-xs font-medium text-warn">Cash on delivery</span> : null}
          </div>
          <p className="mt-1 text-sm text-ink-3">
            Order #{f.displayId} · {units(f)} unit{units(f) === 1 ? "" : "s"} · to {f.destination.city}, {f.destination.state} {f.destination.postalCode}
          </p>
        </div>
        <Button variant="secondary" onClick={() => print("slip")}>
          <Printer className="size-4" aria-hidden /> Pick slip
        </Button>
      </div>

      <Step f={f} label={label} ownFleet={ownFleet} onPrintPackage={() => print("package")} />

      <Panel title="Items">
        <Lines f={f} />
      </Panel>

      <Panel title="History">
        <ol className="space-y-2 text-sm">
          {history.map((e) => (
            <li key={e._id} className="flex flex-wrap gap-x-2">
              <span className="text-ink-3 tabular-nums">{formatTime(e.at)}</span>
              <span className="font-medium">{STATUS_LABEL[e.to as keyof typeof STATUS_LABEL] ?? e.to}</span>
              <span className="text-ink-3">by {e.actor.name ?? e.actor.type}</span>
              {e.reason ? <span className="w-full text-ink-2 sm:w-auto">· {e.reason}</span> : null}
            </li>
          ))}
        </ol>
      </Panel>

      {printing === "slip" ? <PickSlip f={f} /> : null}
      {printing === "package" && f.package ? <PackageLabel f={f} /> : null}
    </div>
  )
}

function Lines({ f }: { f: Fulfilment }) {
  const showPick = ["picking", "picked", "qc_passed"].includes(f.status) || f.lines.some((l) => l.short > 0)
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="text-left text-xs text-ink-3">
          <tr>
            <th className="px-4 pb-2 font-medium">Item</th>
            <th className="px-2 pb-2 font-medium">SKU</th>
            <th className="px-2 pb-2 font-medium">Bin</th>
            <th className="px-2 pb-2 text-right font-medium">Qty</th>
            {showPick ? <th className="px-4 pb-2 text-right font-medium">Picked</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {f.lines.map((l, i) => (
            <tr key={`${l.itemId}-${i}`}>
              <td className="px-4 py-2.5">
                <p className="font-medium">{l.productTitle}</p>
                <p className="text-xs text-ink-3">{Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(" · ") || l.variantTitle}</p>
                {l.short > 0 ? <p className="mt-1 text-xs font-medium text-bad">Short by {l.short}: none left on the shelf. Ask an admin to move this order.</p> : null}
              </td>
              <td className="px-2 py-2.5 font-mono text-xs">{l.sku}</td>
              <td className="px-2 py-2.5 font-mono text-xs">{l.binCode ?? "–"}</td>
              <td className="px-2 py-2.5 text-right tabular-nums">{l.quantity}</td>
              {showPick ? (
                <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", l.picked >= l.quantity - l.short ? "text-ok" : "text-ink-2")}>
                  {l.picked}/{l.quantity - l.short}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NotAllowed({ what }: { what: string }) {
  const { me } = useSession()
  return <Notice tone="info">This order is waiting to {what}. Your role ({me.user.role}) can't do that step.</Notice>
}

function Step({ f, label, ownFleet, onPrintPackage }: { f: Fulfilment; label: CourierLabel; ownFleet: OwnFleet; onPrintPackage: () => void }) {
  const { can } = useSession()
  const gate = (p: Permission, what: string, el: ReactNode) => (can(p) ? el : <NotAllowed what={what} />)
  switch (f.status) {
    case "assigned":
      return gate("accept", "be accepted", <AcceptStep f={f} />)
    case "picking_pending":
    case "picking":
      return gate("pick", "be picked", <PickStep f={f} />)
    case "picked":
      return gate("qc", "be inspected", <QcStep f={f} />)
    case "qc_passed":
      return gate("pack", "be packed", <PackStep f={f} />)
    case "packed":
      return gate("label", "be labelled", <LabelStep f={f} ownFleet={ownFleet} onPrintPackage={onPrintPackage} />)
    case "label_generated":
      return gate("label", "have its label checked", <VerifyStep f={f} label={label} />)
    case "ready_to_dispatch":
    case "manifested":
    case "handed_over":
      return (
        <Notice tone="ok">
          Packed and labelled ({f.carrier} {f.awb}).{" "}
          <Link to="/warehouse/dispatch" className="font-medium underline">
            Go to dispatch
          </Link>
        </Notice>
      )
    case "dispatched":
      return <Notice tone="ok">Handed to {f.carrier} on {formatTime(f.dispatchedAt)}. Tracking now comes from the courier.</Notice>
    case "rejected":
    case "cancelled":
      return <Notice tone="warn">{f.status === "rejected" ? "Declined" : "Cancelled"}: {f.cancelReason}. Any stock it held is back on the shelf.</Notice>
  }
}

function AcceptStep({ f }: { f: Fulfilment }) {
  const act = useAction(f._id)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState("")
  return (
    <Panel title="New order for this warehouse">
      <p className="mb-4 text-sm text-ink-2">Accept it to put it in the pick queue, or decline it if it can't ship from here. A declined order goes to the next warehouse that has the stock.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" busy={act.isPending} onClick={() => act.mutate({ path: "/accept", ok: `${f.code} accepted` })}>
          Accept order
        </Button>
        <Button size="lg" variant="secondary" onClick={() => setDeclining(true)}>
          Decline
        </Button>
      </div>
      <Dialog open={declining} onClose={() => setDeclining(false)} title={`Decline ${f.code}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            act.mutate({ path: "/reject", body: { reason }, ok: `${f.code} declined` }, { onSuccess: () => setDeclining(false) })
          }}
        >
          <div>
            <Label htmlFor="decline-reason">Why can't it ship from here?</Label>
            <Textarea id="decline-reason" required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Stock not found in the bin, dock closed..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeclining(false)}>
              Keep it
            </Button>
            <Button type="submit" variant="danger" busy={act.isPending}>
              Decline order
            </Button>
          </div>
        </form>
      </Dialog>
    </Panel>
  )
}

function PickStep({ f }: { f: Fulfilment }) {
  const act = useAction(f._id)
  const [perScan, setPerScan] = useState(1)
  if (f.status === "picking_pending") {
    return (
      <Panel title="Ready to pick">
        <p className="mb-4 text-sm text-ink-2">Print the pick slip if you work from paper, then start. Each unit is scanned off the shelf.</p>
        <Button size="lg" busy={act.isPending} onClick={() => act.mutate({ path: "/picking/start" })}>
          Start picking
        </Button>
      </Panel>
    )
  }
  const remaining = f.lines.reduce((n, l) => n + l.quantity - l.short - l.picked, 0)
  const short = f.lines.some((l) => l.short > 0)
  const scan = async (code: string) => {
    const line = f.lines.find((l) => norm(l.sku) === norm(code))
    await act.mutateAsync({ path: "/picking/scan", body: { barcode: code, quantity: perScan }, ok: line ? `${line.sku}: ${line.picked + perScan}/${line.quantity - line.short}` : "Picked" }).catch(() => {})
  }
  return (
    <Panel title={`Picking · ${remaining} to go`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <ScanField className="min-w-0 flex-1" label="Scan each item's SKU barcode" onScan={scan} disabled={remaining === 0} />
          <div className="w-28">
            <Label htmlFor="per-scan">Units per scan</Label>
            <Input id="per-scan" type="number" min={1} max={100} value={perScan} onChange={(e) => setPerScan(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
          </div>
        </div>
        {short ? <Notice tone="warn">Part of this order is short. It can't finish picking here until an admin moves it to another warehouse.</Notice> : null}
        <Button size="lg" disabled={remaining > 0 || short} busy={act.isPending} onClick={() => act.mutate({ path: "/picking/complete", ok: "Picking complete" })}>
          Picking complete
        </Button>
      </div>
    </Panel>
  )
}

function QcStep({ f }: { f: Fulfilment }) {
  const act = useAction(f._id)
  const [failing, setFailing] = useState(false)
  const [notes, setNotes] = useState("")
  const [failures, setFailures] = useState<Record<string, { quantity: number; reason: string }>>({})
  const submitFail = (e: FormEvent) => {
    e.preventDefault()
    const list = Object.entries(failures)
      .filter(([, v]) => v.quantity > 0)
      .map(([itemId, v]) => ({ itemId, quantity: v.quantity, reason: v.reason }))
    act.mutate({ path: "/qc", body: { result: "failed", notes: notes || undefined, failures: list }, ok: "Recorded. The order goes back to be picked again." }, { onSuccess: () => setFailing(false) })
  }
  return (
    <Panel title="Quality check">
      <p className="mb-4 text-sm text-ink-2">Check each unit: right item, size and colour, no stains, tears or missing tags.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" busy={act.isPending} onClick={() => act.mutate({ path: "/qc", body: { result: "passed" }, ok: "Passed inspection" })}>
          All units pass
        </Button>
        <Button size="lg" variant="secondary" onClick={() => setFailing(true)}>
          Report a problem
        </Button>
      </div>
      <Dialog open={failing} onClose={() => setFailing(false)} title="Units that failed inspection">
        <form className="space-y-4" onSubmit={submitFail}>
          {f.lines.map((l: FulfilmentLine) => (
            <fieldset key={l.itemId} className="space-y-2 rounded-control border border-line p-3">
              <legend className="px-1 text-sm font-medium">
                {l.productTitle} · {l.variantTitle} <span className="font-mono text-xs text-ink-3">{l.sku}</span>
              </legend>
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <div>
                  <Label htmlFor={`fq-${l.itemId}`}>Failed</Label>
                  <Select id={`fq-${l.itemId}`} value={failures[l.itemId]?.quantity ?? 0} onChange={(e) => setFailures((x) => ({ ...x, [l.itemId]: { reason: x[l.itemId]?.reason ?? "", quantity: Number(e.target.value) } }))}>
                    {Array.from({ length: l.picked + 1 }, (_, n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`fr-${l.itemId}`}>What's wrong</Label>
                  <Input
                    id={`fr-${l.itemId}`}
                    required={(failures[l.itemId]?.quantity ?? 0) > 0}
                    minLength={3}
                    value={failures[l.itemId]?.reason ?? ""}
                    onChange={(e) => setFailures((x) => ({ ...x, [l.itemId]: { quantity: x[l.itemId]?.quantity ?? 0, reason: e.target.value } }))}
                    placeholder="Stain on the collar"
                  />
                </div>
              </div>
            </fieldset>
          ))}
          <div>
            <Label htmlFor="qc-notes">Notes (optional)</Label>
            <Textarea id="qc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-xs text-ink-3">Failed units are booked as damaged. A replacement is reserved from this warehouse's shelf where there is one.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFailing(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" busy={act.isPending} disabled={!Object.values(failures).some((v) => v.quantity > 0)}>
              Record failure
            </Button>
          </div>
        </form>
      </Dialog>
    </Panel>
  )
}

function PackStep({ f }: { f: Fulfilment }) {
  const act = useAction(f._id)
  const feedback = useFeedback()
  const [slip, setSlip] = useState(false)
  const [scans, setScans] = useState<string[]>([])
  const [dims, setDims] = useState({ weightKg: "", lengthCm: "", breadthCm: "", heightCm: "" })

  const expected = new Map<string, number>()
  for (const l of f.lines) expected.set(norm(l.sku), (expected.get(norm(l.sku)) ?? 0) + l.quantity)
  const got = (sku: string) => scans.filter((s) => s === sku).length
  const complete = [...expected].every(([sku, n]) => got(sku) === n)

  const scanSlip = (code: string) => {
    if (norm(code) !== norm(f.code)) return feedback.bad(`That slip is for another order; this is ${f.code}.`)
    setSlip(true)
    feedback.ok("Slip matched. Scan each unit as it goes in the box.")
  }
  const scanUnit = (code: string) => {
    const sku = norm(code)
    if (!expected.has(sku)) return feedback.bad(`${sku} doesn't belong in this parcel. Check the size and colour.`)
    if (got(sku) >= expected.get(sku)!) return feedback.bad(`All ${expected.get(sku)} of ${sku} are already in the box.`)
    setScans((s) => [...s, sku])
    feedback.ok(`${sku} ${got(sku) + 1}/${expected.get(sku)}`)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    act.mutate({
      path: "/pack",
      body: { orderCode: f.code, scans, weightKg: Number(dims.weightKg), lengthCm: Number(dims.lengthCm), breadthCm: Number(dims.breadthCm), heightCm: Number(dims.heightCm) },
      ok: "Packed. Print the parcel label next.",
    })
  }

  return (
    <Panel title="Packing station">
      <div className="space-y-5">
        <ol className="flex gap-2 text-xs font-medium">
          {["Scan slip", "Scan units", "Weigh & measure"].map((s, i) => {
            const done = i === 0 ? slip : i === 1 ? complete : false
            const now = i === 0 ? !slip : i === 1 ? slip && !complete : slip && complete
            return (
              <li key={s} className={cn("flex-1 rounded-control px-2 py-1.5 text-center", done ? "bg-ok-bg text-ok" : now ? "bg-accent-soft text-accent" : "bg-panel-muted text-ink-3")}>
                {i + 1}. {s}
              </li>
            )
          })}
        </ol>

        {!slip ? (
          <ScanField label="Scan the pick slip" placeholder={f.code} onScan={scanSlip} />
        ) : !complete ? (
          <div className="space-y-3">
            <ScanField label="Scan each unit into the box" onScan={scanUnit} />
            <ul className="grid gap-2 sm:grid-cols-2">
              {[...expected].map(([sku, n]) => (
                <li key={sku} className={cn("flex justify-between rounded-control border px-3 py-2 font-mono text-sm", got(sku) === n ? "border-ok/40 bg-ok-bg text-ok" : "border-line")}>
                  <span>{sku}</span>
                  <span className="tabular-nums">
                    {got(sku)}/{n}
                  </span>
                </li>
              ))}
            </ul>
            {scans.length ? (
              <Button variant="ghost" onClick={() => setScans([])}>
                Start the box again
              </Button>
            ) : null}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Notice tone="ok">All {scans.length} units scanned. Seal the box, then weigh and measure it.</Notice>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["weightKg", "Weight (kg)", "0.01", "100"],
                  ["lengthCm", "Length (cm)", "0.1", "300"],
                  ["breadthCm", "Breadth (cm)", "0.1", "300"],
                  ["heightCm", "Height (cm)", "0.1", "300"],
                ] as const
              ).map(([k, label, step, max]) => (
                <div key={k}>
                  <Label htmlFor={k}>{label}</Label>
                  <Input id={k} type="number" inputMode="decimal" required min={step} max={max} step={step} value={dims[k]} onChange={(e) => setDims((d) => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <Button type="submit" size="lg" busy={act.isPending}>
              Finish packing
            </Button>
          </form>
        )}
      </div>
    </Panel>
  )
}

function LabelStep({ f, ownFleet, onPrintPackage }: { f: Fulfilment; ownFleet: OwnFleet; onPrintPackage: () => void }) {
  const act = useAction(f._id)
  // Our riders can take it when the destination is in one of this warehouse's zones (and cash is collected there, for COD).
  const fleetOk = !!ownFleet && (f.paymentMethod !== "cod" || ownFleet.codAllowed)
  const [via, setVia] = useState<"fleet" | "courier">(fleetOk ? "fleet" : "courier")
  const [packageCode, setPackageCode] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const [carrier, setCarrier] = useState("")
  const [awb, setAwb] = useState("")

  const book = async (code: string) => {
    setPackageCode(code)
    try {
      if (via === "fleet") {
        await act.mutateAsync({ path: "/label", body: { packageCode: code, ownFleet: true }, ok: "Booked on Everwear Fleet. Print and apply our label." })
        return
      }
      await act.mutateAsync({ path: "/label", body: { packageCode: code }, ok: "Booked with the courier. Print and apply the courier label." })
    } catch (e) {
      // No courier integration here: the AWB comes from wherever the parcel was booked.
      if (e instanceof ApiError && e.code === "shipping_unconfigured") setManual(true)
    }
  }

  return (
    <Panel title="Label and AWB">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {f.package ? <Barcode value={f.package.code} height={48} /> : null}
          <div className="space-y-2 text-sm text-ink-2">
            <p>
              {f.package?.weightKg} kg · {f.package?.lengthCm}×{f.package?.breadthCm}×{f.package?.heightCm} cm
            </p>
            <Button variant="secondary" onClick={onPrintPackage}>
              <Printer className="size-4" aria-hidden /> Print parcel label
            </Button>
          </div>
        </div>
        {fleetOk && !manual ? (
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1.5 text-sm font-medium text-ink-2">Deliver with</legend>
            {(
              [
                ["fleet", "Everwear Fleet", `Our riders · ${ownFleet!.zone}`],
                ["courier", "Courier", "Shiprocket, Delhivery or a courier's portal"],
              ] as const
            ).map(([value, title, hint]) => (
              <label key={value} className={cn("flex cursor-pointer items-start gap-3 rounded-control border p-3", via === value ? "border-accent bg-accent-soft" : "border-line")}>
                <input type="radio" name="via" value={value} checked={via === value} onChange={() => setVia(value)} className="mt-1 accent-[rgb(var(--accent))]" />
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="text-xs text-ink-3">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {!manual ? (
          <ScanField label={via === "fleet" ? "Scan the parcel label to book Everwear Fleet" : "Scan the parcel label to book the courier"} placeholder="PKG-..." onScan={book} />
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              act.mutate({ path: "/label", body: { packageCode, manual: { carrier, awb } }, ok: "AWB recorded" })
            }}
          >
            <Notice tone="info">No courier integration is set up. Book the parcel on the courier's portal and enter the AWB it gave you.</Notice>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="carrier">Courier</Label>
                <Input id="carrier" required minLength={2} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Delhivery" />
              </div>
              <div>
                <Label htmlFor="awb">AWB</Label>
                <Input id="awb" required minLength={4} value={awb} onChange={(e) => setAwb(e.target.value)} className="font-mono" />
              </div>
            </div>
            <Button type="submit" size="lg" busy={act.isPending}>
              Record AWB
            </Button>
          </form>
        )}
      </div>
    </Panel>
  )
}

function VerifyStep({ f, label }: { f: Fulfilment; label: CourierLabel }) {
  const act = useAction(f._id)
  const feedback = useFeedback()
  const [own, setOwn] = useState<OwnLabel | null>(null)
  const [printingOwn, setPrintingOwn] = useState(false)
  // Our label carries the address, so it's fetched only to print, never kept on screen.
  const printOwn = async () => {
    setPrintingOwn(true)
    try {
      const { label: l } = await api<{ label: OwnLabel }>(`/fulfilments/${f._id}/own-label`)
      setOwn(l)
      requestAnimationFrame(() => {
        window.print()
        setOwn(null)
      })
    } catch (e) {
      feedback.bad(errorMessage(e))
    } finally {
      setPrintingOwn(false)
    }
  }
  return (
    <Panel title={label?.provider === "own_fleet" ? "Apply the Everwear Fleet label" : "Apply the courier label"}>
      {own ? <OwnFleetLabel l={own} /> : null}
      <div className="space-y-4">
        <p className="text-sm text-ink-2">
          {f.carrier} · AWB <span className="font-mono font-semibold">{f.awb}</span>
        </p>
        {label?.provider === "own_fleet" ? (
          <Button variant="secondary" busy={printingOwn} onClick={printOwn}>
            <Printer className="size-4" aria-hidden /> Print Everwear Fleet label
          </Button>
        ) : label?.labelUrl ? (
          <a href={label.labelUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-control border border-line px-4 text-sm font-medium hover:bg-panel-muted">
            <ExternalLink className="size-4" aria-hidden /> Open courier label (PDF)
          </a>
        ) : (
          <Notice tone="info">Use the label the courier issued for this AWB.</Notice>
        )}
        <ScanField label="Scan the AWB on the applied label" onScan={(code) => act.mutateAsync({ path: "/label/verify", body: { awb: code }, ok: "Label checked. Ready to dispatch." }).then(() => {}, () => {})} />
      </div>
    </Panel>
  )
}

/* ---------- Printouts ---------- */

function OwnFleetLabel({ l }: { l: OwnLabel }) {
  return (
    <div className="print-area print-only w-[100mm] space-y-2 p-4 font-sans">
      <p className="text-sm font-bold">Everwear Fleet · from {l.warehouse}</p>
      <Barcode value={l.awb} height={70} />
      <div className="border-t border-black pt-2 text-sm">
        <p className="font-bold">{l.to.name}</p>
        <p>{l.to.address1}</p>
        {l.to.address2 ? <p>{l.to.address2}</p> : null}
        <p className="font-semibold">
          {l.to.city} {l.to.postalCode}
        </p>
      </div>
      <p className="border-t border-black pt-2 text-sm font-bold">{l.cod ? `COLLECT CASH ₹${(l.cod.amount / 100).toFixed(2)}` : "PREPAID · collect nothing"}</p>
      <p className="text-xs">
        Order #{l.orderNumber}
        {l.weightKg ? ` · ${l.weightKg} kg` : ""}
      </p>
    </div>
  )
}

function PickSlip({ f }: { f: Fulfilment }) {
  return (
    <div className="print-area print-only p-6 font-sans">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Pick slip · {f.warehouseCode}</h1>
          <p className="text-sm">
            Order #{f.displayId} · {f.paymentMethod === "cod" ? "COD" : "Prepaid"} · to {f.destination.city} {f.destination.postalCode}
          </p>
        </div>
        <Barcode value={f.code} height={60} />
      </div>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-1">Bin</th>
            <th>SKU</th>
            <th>Item</th>
            <th className="text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {[...f.lines]
            .sort((a, b) => (a.binCode ?? "~").localeCompare(b.binCode ?? "~"))
            .map((l, i) => (
              <tr key={i} className="border-b border-black/30">
                <td className="py-2 font-mono">{l.binCode ?? "–"}</td>
                <td className="font-mono">{l.sku}</td>
                <td>
                  {l.productTitle} · {l.variantTitle}
                </td>
                <td className="text-right text-lg font-bold">{l.quantity}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

function PackageLabel({ f }: { f: Fulfilment }) {
  return (
    <div className="print-area print-only w-[100mm] p-4 font-sans">
      <p className="text-xs">Everwear · {f.warehouseCode}</p>
      <Barcode value={f.package!.code} height={70} />
      <p className="mt-2 text-sm">
        {f.code} · {f.lines.reduce((n, l) => n + l.quantity, 0)} units · {f.package!.weightKg} kg
      </p>
      <p className="text-sm font-semibold">
        {f.destination.city} {f.destination.postalCode}
      </p>
    </div>
  )
}
