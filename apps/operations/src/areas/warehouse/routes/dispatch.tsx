import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { ScanField } from "@/areas/shared/scan-field"
import { Button, cn, Dialog, Empty, formatTime, Input, Label, Notice, Panel, Spinner } from "@/areas/warehouse/components/ui"
import { api, errorMessage } from "@/areas/warehouse/lib/api"
import { useSession } from "@/areas/warehouse/lib/session"
import type { Fulfilment, Manifest } from "@/areas/warehouse/lib/types"

/*
 * Dispatch: labelled parcels are gathered per courier into a manifest (the
 * courier pickup is requested then), scanned one by one as the courier's
 * executive takes them, and the manifest is closed with their name.
 */

export function Dispatch() {
  const { warehouseId, can } = useSession()
  const client = useQueryClient()
  const feedback = useFeedback()
  const ready = useQuery({
    queryKey: ["queue", warehouseId, "ready"],
    queryFn: () => api<{ fulfilments: Fulfilment[] }>("/fulfilments", { query: { warehouseId, status: "ready_to_dispatch", limit: 200 } }),
    refetchInterval: 15_000,
  })
  const manifests = useQuery({ queryKey: ["manifests", warehouseId], queryFn: () => api<{ manifests: Manifest[] }>("/manifests"), refetchInterval: 15_000 })
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["manifests"] })
    void client.invalidateQueries({ queryKey: ["queue"] })
    void client.invalidateQueries({ queryKey: ["summary"] })
  }
  const create = useMutation({
    mutationFn: (carrier: string) => api<{ manifest: Manifest }>("/manifests", { body: { warehouseId, carrier } }),
    onSuccess: (d) => {
      feedback.ok(`Manifest ${d.manifest.code}: ${d.manifest.awbs.length} parcel(s). Courier pickup requested.`)
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })

  const byCarrier = new Map<string, Fulfilment[]>()
  for (const f of ready.data?.fulfilments ?? []) byCarrier.set(f.carrier ?? "", [...(byCarrier.get(f.carrier ?? "") ?? []), f])
  const mine = (manifests.data?.manifests ?? []).filter((m) => m.warehouseId === warehouseId)
  const open = mine.filter((m) => m.status === "open")
  const closed = mine.filter((m) => m.status === "closed").slice(0, 10)

  if (!can("dispatch")) return <Notice tone="info">Dispatch is done by dispatchers and supervisors.</Notice>

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Dispatch</h1>

      <Panel title="Ready to dispatch">
        {ready.isPending ? (
          <Spinner />
        ) : ready.isError ? (
          <Notice>{errorMessage(ready.error)}</Notice>
        ) : byCarrier.size === 0 ? (
          <Empty title="No labelled parcels waiting">Parcels appear here once their label is checked.</Empty>
        ) : (
          <ul className="space-y-3">
            {[...byCarrier].map(([carrier, list]) => (
              <li key={carrier} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3">
                <div>
                  <p className="font-medium">{carrier || "Courier"}</p>
                  <p className="text-sm text-ink-3">
                    {list.length} parcel{list.length === 1 ? "" : "s"} · {list.map((f) => f.awb).join(", ")}
                  </p>
                </div>
                <Button busy={create.isPending && create.variables === carrier} onClick={() => create.mutate(carrier)}>
                  Create manifest
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {open.map((m) => (
        <OpenManifest key={m._id} m={m} onChange={refresh} />
      ))}

      {closed.length ? (
        <Panel title="Recently closed">
          <ul className="divide-y divide-line text-sm">
            {closed.map((m) => (
              <li key={m._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-mono font-medium">{m.code}</span> · {m.carrier} · {m.awbs.length} parcel(s) · {m.courierExecutive}
                </span>
                <span className="text-ink-3">{formatTime(m.closedAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  )
}

function OpenManifest({ m, onChange }: { m: Manifest; onChange: () => void }) {
  const feedback = useFeedback()
  const [closing, setClosing] = useState(false)
  const [executive, setExecutive] = useState("")
  const scan = useMutation({
    mutationFn: (awb: string) => api<{ manifest: Manifest }>(`/manifests/${m._id}/scan`, { body: { awb } }),
    onSuccess: (d, awb) => {
      feedback.ok(`${awb} handed over (${d.manifest.scannedAwbs.length}/${d.manifest.awbs.length})`)
      onChange()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const close = useMutation({
    mutationFn: () => api<{ manifest: Manifest }>(`/manifests/${m._id}/close`, { body: { courierExecutive: executive } }),
    onSuccess: (d) => {
      feedback.ok(`${d.manifest.code} closed: ${d.manifest.awbs.length} parcel(s) dispatched.`)
      setClosing(false)
      onChange()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const missing = m.awbs.filter((a) => !m.scannedAwbs.includes(a))

  return (
    <Panel
      title={
        <>
          <span className="font-mono">{m.code}</span> · {m.carrier}
        </>
      }
      action={
        m.manifestUrls[0] ? (
          <a href={m.manifestUrls[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-accent">
            <ExternalLink className="size-4" aria-hidden /> Courier manifest
          </a>
        ) : null
      }
    >
      <div className="space-y-4">
        <ScanField label={`Scan each parcel as the courier takes it (${m.scannedAwbs.length}/${m.awbs.length})`} onScan={(awb) => scan.mutateAsync(awb).then(() => {}, () => {})} autoFocus={false} />
        <ul className="grid gap-2 sm:grid-cols-2">
          {m.awbs.map((awb) => {
            const done = m.scannedAwbs.includes(awb)
            return (
              <li key={awb} className={cn("flex justify-between rounded-control border px-3 py-2 font-mono text-sm", done ? "border-ok/40 bg-ok-bg text-ok" : "border-line")}>
                {awb}
                <span className="font-sans text-xs">{done ? "Handed over" : "Waiting"}</span>
              </li>
            )
          })}
        </ul>
        <Button size="lg" disabled={!m.scannedAwbs.length} onClick={() => setClosing(true)}>
          Close manifest
        </Button>
      </div>
      <Dialog open={closing} onClose={() => setClosing(false)} title={`Close ${m.code}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            close.mutate()
          }}
        >
          {missing.length ? (
            <Notice tone="warn">
              {missing.length} parcel(s) weren't scanned ({missing.join(", ")}). They stay here, ready for the next manifest.
            </Notice>
          ) : null}
          <div>
            <Label htmlFor={`exec-${m._id}`}>Courier executive's name</Label>
            <Input id={`exec-${m._id}`} required minLength={2} maxLength={100} value={executive} onChange={(e) => setExecutive(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setClosing(false)}>
              Not yet
            </Button>
            <Button type="submit" busy={close.isPending}>
              Dispatch {m.scannedAwbs.length} parcel(s)
            </Button>
          </div>
        </form>
      </Dialog>
      <p className="mt-3 text-xs text-ink-3">
        Parcels on a manifest can't be cancelled from the admin until they're taken off it. Need to check a parcel? <Link to="/warehouse?stage=dispatch" className="underline">See the dispatch queue</Link>.
      </p>
    </Panel>
  )
}
