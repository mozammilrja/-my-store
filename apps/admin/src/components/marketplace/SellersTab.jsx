import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../../lib/api-marketplace';
import { useClientTable } from '../../hooks/useClientTable';
import { AppDialog, Badge, Button, Card, DataTable, EmptyState, Icon, Input, SearchInput, SectionCard, Select, StatusBadge, TableToolbar } from '../ui';
import { BUSINESS_TYPE, SELLER_STATUS, day, marketplaceRights, money, when } from './shared';

/*
 * Seller review: every seller by status, and for one seller their KYC with a
 * check per item, the bank account (full number only on an audited request),
 * approval with a commission override and courier pickup names, suspension
 * or rejection with a reason, and how they're doing.
 */

const STATUS_FILTERS = [
  ['', 'All statuses'],
  ['submitted', 'Awaiting review'],
  ['approved', 'Approved'],
  ['suspended', 'Suspended'],
  ['rejected', 'Rejected'],
  ['draft', 'Filling in details'],
];

export function SellersTab({ sellersQuery, role, onShowToast }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const all = sellersQuery.data?.sellers ?? [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (s) =>
        (!status || s.status === status) &&
        (!q || [s.code, s.displayName, s.legalName, s.email, s.gstin, s.pan].some((v) => v && String(v).toLowerCase().includes(q)))
    );
  }, [all, status, search]);
  const pager = useClientTable(rows);
  const selected = rows.find((s) => s._id === selectedId) ?? rows[0] ?? null;

  if (!all.length) {
    return <EmptyState icon="storefront" title="No sellers yet" description="Sellers sign up in the Seller Hub. Once they submit their details, they wait for review here." className="py-16" />;
  }

  const columns = [
    {
      key: 'seller',
      header: 'Seller',
      cell: (s) => (
        <div className="flex min-w-40 flex-col">
          <span className="text-label font-semibold text-primary">{s.displayName}</span>
          <span className="font-mono text-micro text-muted">
            {s.code} · {s.fulfilmentModel === 'seller' ? 'Ships own orders' : 'Everwear ships'}
          </span>
        </div>
      ),
    },
    {
      key: 'kyc',
      header: 'Checks',
      cell: (s) => (
        <span className="flex flex-col text-meta text-secondary">
          {['pan', 'gstin', 'bank']
            .filter((k) => k !== 'gstin' || s.gstin)
            .map((k) => (
              <span key={k} className="whitespace-nowrap">
                {k.toUpperCase()} {s.verified?.[k] ? '✓' : '·'}
              </span>
            ))}
        </span>
      ),
    },
    { key: 'status', header: 'Status', fit: true, cell: (s) => <StatusBadge status={SELLER_STATUS[s.status]?.label ?? s.status} variant={SELLER_STATUS[s.status]?.variant} /> },
    { key: 'since', header: 'Joined', fit: true, cell: (s) => <span className="text-meta text-muted">{day(s.createdAt)}</span> },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-7">
        <DataTable
          columns={columns}
          data={pager.pageRows}
          keyField="_id"
          activeRowId={selected?._id}
          onRowClick={(s) => setSelectedId(s._id)}
          caption="Sellers"
          toolbar={
            <TableToolbar
              left={
                <div className="flex flex-wrap items-center gap-space-sm">
                  <Select aria-label="Seller status" value={status} onChange={(e) => setStatus(e.target.value)} wrapperClassName="min-w-44">
                    {STATUS_FILTERS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                  <SearchInput placeholder="Name, code, PAN or GSTIN" value={search} onChange={setSearch} onClear={() => setSearch('')} className="w-full sm:w-64" />
                </div>
              }
              right={
                <Button variant="ghost" size="iconSm" onClick={() => sellersQuery.refetch()} title="Refresh" aria-label="Refresh sellers">
                  <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                </Button>
              }
            />
          }
          emptyMessage="No sellers match."
          pagination={{ page: pager.page, pageSize: pager.limit, totalItems: pager.total, onPageChange: pager.setPage, onPageSizeChange: pager.setLimit }}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-space-md lg:col-span-5">
        {selected ? <SellerPanel key={selected._id} id={selected._id} role={role} onShowToast={onShowToast} /> : <EmptyState icon="search" title="No sellers match" description="Clear the search or pick another status." />}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <dt className="text-micro text-muted">{label}</dt>
      <dd className="break-words text-meta text-primary">{children || <span className="text-muted">Not given</span>}</dd>
    </div>
  );
}

const address = (a) => (a ? [a.line1, a.city, a.state, a.postalCode].filter(Boolean).join(', ') : '');

function SellerPanel({ id, role, onShowToast }) {
  const qc = useQueryClient();
  const rights = marketplaceRights(role);
  const detail = useQuery({ queryKey: ['admin', 'marketplace', 'seller', id], queryFn: () => marketplaceApi.seller(id) });
  const [dialog, setDialog] = useState(null); // 'approve' | 'suspend' | 'reject' | 'bank'

  const done = (title) => (res) => {
    qc.invalidateQueries({ queryKey: ['admin', 'marketplace'] });
    onShowToast?.({ type: 'success', title });
    setDialog(null);
    return res;
  };
  const failed = (err) => onShowToast?.({ type: 'error', title: 'Not done', message: err?.message ?? 'Nothing was changed.' });
  const verify = useMutation({ mutationFn: (item) => marketplaceApi.verify(id, item), onError: failed });

  if (detail.isLoading) return <Card className="p-space-md text-body text-muted">Loading seller…</Card>;
  if (detail.isError) return <Card className="p-space-md text-body text-danger" role="alert">{detail.error?.message}</Card>;
  const { seller: s, listings, balance } = detail.data;
  const reviewable = s.status === 'submitted' || s.status === 'suspended';
  const items = [
    ['pan', 'PAN', s.pan],
    ...(s.gstin ? [['gstin', 'GSTIN', s.gstin]] : []),
    ['bank', 'Bank account', s.bank ? `${s.bank.accountName} · ending ${s.bank.last4} · ${s.bank.ifsc}` : ''],
  ];
  const missing = ['pan', 'bank', ...(s.gstin ? ['gstin'] : [])].filter((k) => !s.verified?.[k]);

  return (
    <>
      <Card className="flex flex-col gap-space-md p-space-md">
        <div className="flex flex-wrap items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-1">
            <StatusBadge status={SELLER_STATUS[s.status]?.label ?? s.status} variant={SELLER_STATUS[s.status]?.variant} className="self-start" />
            <h2 className="text-subheading text-primary">{s.displayName}</h2>
            <span className="text-meta text-secondary">
              <span className="font-mono">{s.code}</span> · {s.fulfilmentModel === 'seller' ? 'Ships its own orders' : 'Stock kept and shipped by Everwear'}
            </span>
          </div>
          {balance && (
            <div className="shrink-0 text-right">
              <span className="block text-kpi-sm tabular-nums text-primary">{money(balance.payableNow)}</span>
              <span className="block text-micro text-muted">Payable now · {money(balance.waiting)} waiting</span>
            </div>
          )}
        </div>
        {s.statusReason && (s.status === 'suspended' || s.status === 'rejected') && <p className="text-meta text-danger">Reason: {s.statusReason}</p>}

        <dl className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
          <Field label="Legal name">{s.legalName}</Field>
          <Field label="Business type">{BUSINESS_TYPE[s.businessType] ?? s.businessType}</Field>
          <Field label="Email">{s.email}</Field>
          <Field label="Phone">{s.phone}</Field>
          <Field label="Registered address">{address(s.registeredAddress)}</Field>
          {s.fulfilmentModel === 'seller' && <Field label="Pickup address">{address(s.pickupAddress)}</Field>}
          <Field label="Commission">{s.commissionPct != null ? `${s.commissionPct}% (override)` : 'Store default'}</Field>
          <Field label="Listings">
            {Object.keys(listings ?? {}).length ? Object.entries(listings).map(([k, n]) => `${n} ${k === 'pending' ? 'in review' : k === 'approved' ? 'live' : k}`).join(', ') : 'None yet'}
          </Field>
        </dl>

        <hr className="border-subtle" />

        <div className="flex flex-col gap-space-sm">
          <h3 className="text-label font-semibold text-primary">Checks</h3>
          <p className="text-micro text-muted">Format checks ran when the seller entered these. Check each against the seller's documents before marking it verified.</p>
          <ul className="flex flex-col gap-space-xs">
            {items.map(([key, label, value]) => (
              <li key={key} className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg border border-subtle p-space-sm">
                <span className="flex min-w-0 flex-col">
                  <span className="text-micro text-muted">{label}</span>
                  <span className="break-all font-mono text-meta text-primary">{value || 'Not given'}</span>
                </span>
                <span className="flex items-center gap-space-xs">
                  {key === 'bank' && s.bank && rights.finance && (
                    <Button size="sm" variant="ghost" onClick={() => setDialog('bank')}>
                      Show full number
                    </Button>
                  )}
                  {s.verified?.[key] ? (
                    <Badge variant="success">Verified</Badge>
                  ) : rights.verify && value ? (
                    <Button size="sm" variant="outline" disabled={verify.isPending} onClick={() => verify.mutateAsync(key).then(done(`${label} verified`))} aria-label={`Mark ${label} verified`}>
                      Mark verified
                    </Button>
                  ) : (
                    <Badge variant="warning">Not verified</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {s.bank && !rights.finance && <p className="text-micro text-muted">Only finance and the owner can see the full account number.</p>}
        </div>

        {rights.review && (
          <>
            <hr className="border-subtle" />
            <div className="flex flex-col gap-space-sm">
              {reviewable && (
                <>
                  <Button variant="primary" className="w-full" disabled={missing.length > 0} onClick={() => setDialog('approve')}>
                    {s.status === 'suspended' ? 'Reinstate seller' : 'Approve seller'}
                  </Button>
                  {missing.length > 0 && <p className="text-micro text-muted">Verify the {missing.map((m) => m.toUpperCase()).join(' and ')} first.</p>}
                </>
              )}
              {s.status === 'approved' && (
                <Button variant="outline" className="w-full text-danger" onClick={() => setDialog('suspend')}>
                  Suspend seller
                </Button>
              )}
              {s.status === 'submitted' && (
                <Button variant="ghost" size="sm" className="w-full text-danger" onClick={() => setDialog('reject')}>
                  Reject application
                </Button>
              )}
            </div>
          </>
        )}
      </Card>

      {(s.status === 'approved' || s.status === 'suspended') && <PerformancePanel id={s._id} />}

      <ApproveDialog open={dialog === 'approve'} seller={s} onClose={() => setDialog(null)} onDone={done} onFailed={failed} />
      <ReasonDialog open={dialog === 'suspend' || dialog === 'reject'} action={dialog} seller={s} onClose={() => setDialog(null)} onDone={done} onFailed={failed} />
      {dialog === 'bank' && <BankDialog seller={s} onClose={() => setDialog(null)} onFailed={failed} />}
    </>
  );
}

function ApproveDialog({ open, seller: s, onClose, onDone, onFailed }) {
  const [commission, setCommission] = useState(s.commissionPct != null ? String(s.commissionPct) : '');
  const [shiprocket, setShiprocket] = useState('');
  const [delhivery, setDelhivery] = useState('');
  const approve = useMutation({
    mutationFn: () =>
      marketplaceApi.approve(s._id, {
        commissionPct: commission.trim() === '' ? null : Number(commission),
        ...(shiprocket.trim() ? { shiprocketPickupLocation: shiprocket.trim() } : {}),
        ...(delhivery.trim() ? { delhiveryPickupLocation: delhivery.trim() } : {}),
      }),
    onSuccess: onDone(`${s.displayName} ${s.status === 'suspended' ? 'reinstated' : 'approved'}`),
    onError: onFailed,
  });
  const badCommission = commission.trim() !== '' && !(Number(commission) >= 0 && Number(commission) <= 60);
  return (
    <AppDialog
      isOpen={open}
      onClose={onClose}
      title={`${s.status === 'suspended' ? 'Reinstate' : 'Approve'} ${s.displayName}`}
      description={s.fulfilmentModel === 'seller' ? 'Their pickup address becomes a warehouse that receives their orders.' : 'They can list at once; their stock comes in through shipping notices.'}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button variant="primary" disabled={approve.isPending || badCommission} onClick={() => approve.mutate()}>
            {s.status === 'suspended' ? 'Reinstate' : 'Approve'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md pb-space-md">
        <label className="flex flex-col gap-1.5 text-label text-secondary">
          Commission override (%)
          <Input type="number" min="0" max="60" step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="Blank: the store default" aria-invalid={badCommission || undefined} />
          {badCommission && <span className="text-micro text-danger">Between 0 and 60.</span>}
        </label>
        {s.fulfilmentModel === 'seller' && (
          <>
            <label className="flex flex-col gap-1.5 text-label text-secondary">
              Shiprocket pickup location name
              <Input value={shiprocket} onChange={(e) => setShiprocket(e.target.value)} placeholder="Exactly as in Shiprocket > Pickup Addresses" maxLength={100} />
            </label>
            <label className="flex flex-col gap-1.5 text-label text-secondary">
              Delhivery warehouse name
              <Input value={delhivery} onChange={(e) => setDelhivery(e.target.value)} placeholder="Exactly as registered on Delhivery" maxLength={100} />
            </label>
            <p className="text-micro text-muted">Add the seller's address on each courier's panel first. Leave a name blank to use the store's default pickup.</p>
          </>
        )}
      </div>
    </AppDialog>
  );
}

function ReasonDialog({ open, action, seller: s, onClose, onDone, onFailed }) {
  const [reason, setReason] = useState('');
  const run = useMutation({
    mutationFn: () => marketplaceApi.setStatus(s._id, action, reason.trim()),
    onSuccess: (res) => {
      setReason('');
      return onDone(`${s.displayName} ${action === 'suspend' ? 'suspended' : 'rejected'}`)(res);
    },
    onError: onFailed,
  });
  return (
    <AppDialog
      isOpen={open}
      onClose={onClose}
      title={action === 'suspend' ? `Suspend ${s.displayName}` : `Reject ${s.displayName}`}
      description={action === 'suspend' ? 'Their listings come off sale at once and their location stops taking orders.' : 'They can correct their details and submit again.'}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button variant="primary" disabled={run.isPending || reason.trim().length < 3} onClick={() => run.mutate()}>
            {action === 'suspend' ? 'Suspend' : 'Reject'}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5 pb-space-md text-label text-secondary">
        Reason (the seller sees this)
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
      </label>
    </AppDialog>
  );
}

/** The full account number, fetched only on request and kept only while the dialog is open. */
function BankDialog({ seller: s, onClose, onFailed }) {
  const [bank, setBank] = useState(null);
  const reveal = useMutation({ mutationFn: () => marketplaceApi.sellerBank(s._id), onSuccess: setBank, onError: onFailed });
  const close = () => {
    setBank(null);
    reveal.reset();
    onClose();
  };
  return (
    <AppDialog
      isOpen
      onClose={close}
      title={`${s.displayName}: bank account`}
      maxWidth="max-w-md"
      footer={
        bank ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close}>
              Back
            </Button>
            <Button variant="primary" disabled={reveal.isPending} onClick={() => reveal.mutate()}>
              Show the number
            </Button>
          </>
        )
      }
    >
      <div className="pb-space-md">
        {bank ? (
          <dl className="grid grid-cols-1 gap-space-sm">
            <Field label="Account holder">{bank.accountName}</Field>
            <Field label="Account number">
              <span className="font-mono text-body">{bank.accountNumber}</span>
            </Field>
            <Field label="IFSC">
              <span className="font-mono">{bank.ifsc}</span>
            </Field>
          </dl>
        ) : (
          <p className="text-body text-secondary">Viewing the full account number is recorded in the audit log under your name. Use it only to verify the account or make a payout.</p>
        )}
      </div>
    </AppDialog>
  );
}

const pct = (n, of) => (of ? `${Math.round((n / of) * 1000) / 10}%` : '–');

function PerformancePanel({ id }) {
  const [days, setDays] = useState(30);
  const from = useMemo(() => new Date(Date.now() - days * 86_400_000).toISOString(), [days]);
  const perf = useQuery({ queryKey: ['admin', 'marketplace', 'performance', id, days], queryFn: () => marketplaceApi.performance(id, from) });
  const p = perf.data;
  const f = p?.fulfilment;
  return (
    <SectionCard
      title="Performance"
      action={
        <Select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} wrapperClassName="w-36">
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </Select>
      }
    >
      {perf.isLoading ? (
        <p className="text-meta text-muted">Loading…</p>
      ) : perf.isError ? (
        <p className="text-meta text-danger" role="alert">{perf.error?.message}</p>
      ) : (
        <div className="flex flex-col gap-space-md">
          <dl className="grid grid-cols-2 gap-space-sm">
            <Field label="Sales">{money(p.sales.gross)}</Field>
            <Field label="Units sold / returned">{`${p.sales.unitsSold} / ${p.sales.unitsReturned} (${p.sales.returnRate}%)`}</Field>
            <Field label="Fees and deductions">{money(p.fees.commission + p.fees.commissionGst + p.fees.fulfilment + p.fees.tcs + p.fees.tds)}</Field>
            <Field label="Net to seller">{money(p.net)}</Field>
          </dl>
          {f ? (
            <dl className="grid grid-cols-2 gap-space-sm border-t border-subtle pt-space-sm">
              <Field label="Orders">{String(f.orders)}</Field>
              <Field label={`Accepted within ${p.sla.acceptHours} h`}>{`${pct(f.accepted - f.acceptedLate, f.accepted)} · median ${f.medianAcceptHours ?? '–'} h`}</Field>
              <Field label={`Shipped within ${p.sla.dispatchHours} h`}>{`${pct(f.dispatched - f.dispatchedLate, f.dispatched)} · median ${f.medianDispatchHours ?? '–'} h`}</Field>
              <Field label="Declined / undelivered">{`${f.declined} / ${f.undelivered}`}</Field>
              <Field label="Waiting to accept">{String(f.waitingToAccept)}</Field>
            </dl>
          ) : (
            <p className="text-micro text-muted">Everwear ships this seller's orders, so fulfilment speed isn't theirs to measure.</p>
          )}
          <p className="text-micro text-muted">From {when(p.from)} to {when(p.to)}.</p>
        </div>
      )}
    </SectionCard>
  );
}
