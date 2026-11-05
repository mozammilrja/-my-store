import { useMutation, useQuery } from "@tanstack/react-query"
import { BadgeCheck, Clock3 } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"
import { useFeedback } from "@/areas/shared/feedback"
import { Button, Input, Label, Notice, Panel, Select, Spinner } from "@/areas/shared/ui"
import { api, errorMessage } from "@/areas/seller/lib/api"
import { money, useSession } from "@/areas/seller/lib/session"
import type { Balance, Listing, Performance, Seller, SellerOrder } from "@/areas/seller/lib/types"

export function Overview() {
  const { approved } = useSession()
  return approved ? <Dashboard /> : <Onboarding />
}

/* ---------- Onboarding: business, tax, bank, pickup ---------- */

function Onboarding() {
  const { me, refresh } = useSession()
  const s = me.seller
  const feedback = useFeedback()
  const editable = s.status === "draft" || s.status === "rejected"
  const [f, setF] = useState({
    businessType: s.businessType ?? "proprietorship",
    legalName: s.legalName ?? "",
    pan: s.pan ?? "",
    gstin: s.gstin ?? "",
    reg: s.registeredAddress ?? { line1: "", city: "", state: "", postalCode: "" },
    bankName: s.bank?.accountName ?? "",
    accountNumber: "",
    ifsc: s.bank?.ifsc ?? "",
    pickup: s.pickupAddress ?? { line1: "", city: "", state: "", postalCode: "", phone: "" },
  })
  const save = useMutation({
    mutationFn: () =>
      api<{ seller: Seller }>("/me/kyc", {
        method: "PUT",
        body: {
          businessType: f.businessType,
          legalName: f.legalName,
          pan: f.pan,
          gstin: f.gstin.trim() || null,
          registeredAddress: f.reg,
          ...(f.accountNumber ? { bank: { accountName: f.bankName, accountNumber: f.accountNumber, ifsc: f.ifsc } } : {}),
          ...(s.fulfilmentModel === "seller" ? { pickupAddress: f.pickup } : {}),
        },
      }),
    onSuccess: () => {
      feedback.ok("Saved")
      setF((x) => ({ ...x, accountNumber: "" }))
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const submit = useMutation({
    mutationFn: () => api("/me/kyc/submit", { body: {} }),
    onSuccess: () => {
      feedback.ok("Sent for review. We'll check your details and approve your account.")
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const addr = (key: "reg" | "pickup", field: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [key]: { ...x[key], [field]: e.target.value } }))
  const onSave = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }
  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <BadgeCheck className="size-4 text-ok" aria-hidden /> : <Clock3 className="size-4 text-warn" aria-hidden />}
      {label} {ok ? "verified" : s.status === "submitted" ? "being checked" : "to verify"}
    </li>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Set up your seller account</h1>
        <p className="text-sm text-ink-3">We need your business, tax and bank details before you can sell. Each one is checked by our team.</p>
      </div>
      {s.status === "submitted" ? <Notice tone="info">Thanks. Your details are with us for review. You can prepare listings meanwhile; they go live once you're approved.</Notice> : null}
      <Panel title="Verification">
        <ul className="space-y-1.5">
          <Check ok={s.verified.pan} label="PAN" />
          {s.gstin ? <Check ok={s.verified.gstin} label="GSTIN" /> : <li className="text-sm text-ink-3">No GSTIN given. Most sellers of taxable goods online need one.</li>}
          <Check ok={s.verified.bank} label="Bank account" />
        </ul>
      </Panel>
      <form onSubmit={onSave} className="space-y-5">
        <Panel title="Business">
          <fieldset disabled={!editable} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="bt">Business type</Label>
              <Select id="bt" value={f.businessType} onChange={(e) => setF((x) => ({ ...x, businessType: e.target.value as typeof f.businessType }))}>
                <option value="individual">Individual</option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="llp">LLP</option>
                <option value="company">Company</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ln">Legal name (as on PAN)</Label>
              <Input id="ln" required value={f.legalName} onChange={(e) => setF((x) => ({ ...x, legalName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="pan">PAN</Label>
              <Input id="pan" required value={f.pan} onChange={(e) => setF((x) => ({ ...x, pan: e.target.value.toUpperCase() }))} className="font-mono uppercase" placeholder="ABCPE1234F" />
            </div>
            <div>
              <Label htmlFor="gstin">GSTIN (optional)</Label>
              <Input id="gstin" value={f.gstin} onChange={(e) => setF((x) => ({ ...x, gstin: e.target.value.toUpperCase() }))} className="font-mono uppercase" placeholder="29ABCPE1234F1Z5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="r1">Registered address</Label>
              <Input id="r1" required value={f.reg.line1} onChange={addr("reg", "line1")} />
            </div>
            <div>
              <Label htmlFor="rc">City</Label>
              <Input id="rc" required value={f.reg.city} onChange={addr("reg", "city")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rs">State</Label>
                <Input id="rs" required value={f.reg.state} onChange={addr("reg", "state")} />
              </div>
              <div>
                <Label htmlFor="rp">PIN</Label>
                <Input id="rp" required pattern="\d{6}" value={f.reg.postalCode} onChange={addr("reg", "postalCode")} />
              </div>
            </div>
          </fieldset>
        </Panel>
        <Panel title="Bank account for payouts">
          <fieldset disabled={!editable} className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="ban">Account holder</Label>
              <Input id="ban" required={!s.bank} value={f.bankName} onChange={(e) => setF((x) => ({ ...x, bankName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="acc">Account number{s.bank ? ` (ending ${s.bank.last4})` : ""}</Label>
              <Input id="acc" inputMode="numeric" required={!s.bank} value={f.accountNumber} onChange={(e) => setF((x) => ({ ...x, accountNumber: e.target.value.replace(/\D/g, "") }))} placeholder={s.bank ? "Leave empty to keep" : ""} className="font-mono" />
            </div>
            <div>
              <Label htmlFor="ifsc">IFSC</Label>
              <Input id="ifsc" required={!s.bank} value={f.ifsc} onChange={(e) => setF((x) => ({ ...x, ifsc: e.target.value.toUpperCase() }))} className="font-mono uppercase" placeholder="HDFC0001234" />
            </div>
          </fieldset>
          <p className="mt-2 text-xs text-ink-3">Stored encrypted. Only the last four digits are shown back to you.</p>
        </Panel>
        {s.fulfilmentModel === "seller" ? (
          <Panel title="Pickup address (where couriers collect your parcels)">
            <fieldset disabled={!editable} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="p1">Address</Label>
                <Input id="p1" required value={f.pickup.line1} onChange={addr("pickup", "line1")} />
              </div>
              <div>
                <Label htmlFor="pc">City</Label>
                <Input id="pc" required value={f.pickup.city} onChange={addr("pickup", "city")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ps">State</Label>
                  <Input id="ps" required value={f.pickup.state} onChange={addr("pickup", "state")} />
                </div>
                <div>
                  <Label htmlFor="pp">PIN</Label>
                  <Input id="pp" required pattern="\d{6}" value={f.pickup.postalCode} onChange={addr("pickup", "postalCode")} />
                </div>
              </div>
              <div>
                <Label htmlFor="ph">Contact phone at pickup</Label>
                <Input id="ph" type="tel" required value={f.pickup.phone} onChange={addr("pickup", "phone")} />
              </div>
            </fieldset>
          </Panel>
        ) : null}
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" busy={save.isPending}>
              Save details
            </Button>
            <Button type="button" busy={submit.isPending} onClick={() => submit.mutate()}>
              Submit for review
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  )
}

/* ---------- Dashboard ---------- */

function Tile({ label, value, note, to }: { label: string; value: string; note?: string; to?: string }) {
  const inner = (
    <>
      <p className="text-sm text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-xs text-ink-3">{note}</p> : null}
    </>
  )
  return to ? (
    <Link to={to} className="rounded-panel border border-line bg-panel p-4 hover:bg-panel-muted">
      {inner}
    </Link>
  ) : (
    <div className="rounded-panel border border-line bg-panel p-4">{inner}</div>
  )
}

function Dashboard() {
  const { me, selfShip } = useSession()
  const perf = useQuery({ queryKey: ["performance", 30], queryFn: () => api<Performance>("/performance") })
  const balance = useQuery({ queryKey: ["balance"], queryFn: () => api<Balance>("/balance") })
  const listings = useQuery({ queryKey: ["listings"], queryFn: () => api<{ listings: Listing[] }>("/listings") })
  const orders = useQuery({ queryKey: ["orders", "todo"], queryFn: () => api<{ orders: SellerOrder[] }>("/orders", { query: {} }), enabled: selfShip })
  if (perf.isPending || balance.isPending) return <Spinner />
  if (perf.isError) return <Notice>{errorMessage(perf.error)}</Notice>
  const p = perf.data
  const todo = (st: string[]) => orders.data?.orders.filter((o) => st.includes(o.status)).length ?? 0
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{me.seller.displayName}</h1>
        <p className="text-sm text-ink-3">
          Commission {me.terms.commissionPct}% + {me.terms.feeGstPct}% GST{me.terms.fulfilmentFeePerUnit ? ` · fulfilment ${money(me.terms.fulfilmentFeePerUnit)} per unit` : ""} · TCS {me.terms.tcsPct}% · TDS {me.terms.tdsPct}%
        </p>
      </div>
      {selfShip ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="To accept" value={String(todo(["assigned"]))} note={`Within ${me.terms.acceptSlaHours} h`} to="/seller/orders" />
          <Tile label="To pack" value={String(todo(["picking_pending", "picking", "picked", "qc_passed"]))} to="/seller/orders" />
          <Tile label="To ship" value={String(todo(["packed", "label_generated"]))} to="/seller/orders" />
          <Tile label="Ready for pickup" value={String(todo(["ready_to_dispatch"]))} note={`Hand over within ${me.terms.dispatchSlaHours} h of accepting`} to="/seller/orders" />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Sales, last 30 days" value={money(p.sales.gross)} note={`${p.sales.unitsSold} units`} to="/seller/reports" />
        <Tile label="Return rate" value={`${p.sales.returnRate}%`} note={`${p.sales.unitsReturned} units returned`} to="/seller/returns" />
        <Tile label="Payable now" value={money(balance.data?.payableNow ?? 0)} note="Paid in the next settlement" to="/seller/payments" />
        <Tile label="Waiting" value={money(balance.data?.waiting ?? 0)} note="Inside the return window or unpaid" to="/seller/payments" />
      </div>
      <Panel title="Listings">
        <p className="text-sm text-ink-2">
          {listings.data?.listings.filter((l) => l.review.status === "approved").length ?? 0} live · {listings.data?.listings.filter((l) => l.review.status === "pending").length ?? 0} in review ·{" "}
          {listings.data?.listings.filter((l) => l.review.status === "rejected").length ?? 0} need changes ·{" "}
          <Link to="/seller/listings" className="font-medium text-accent underline">
            Manage listings
          </Link>
        </p>
      </Panel>
    </div>
  )
}
