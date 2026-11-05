import React, { useMemo, useState } from 'react';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useCreateReturnMutation, useReturnActMutation, useReturnDetailQuery, useReturnsQuery } from '../../hooks/useAdminQueries';
import {
  Icon,
  Card,
  Button,
  Badge,
  Input,
  Select,
  Separator,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  SectionCard,
  FilterBar,
  SearchInput,
  DataTable,
  TableToolbar,
  AppDialog,
  PageBody,
  SkeletonPage,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { EmptyState } from '../shared/FeedbackAndOverlays';

/*
 * Returns and exchanges, from the returns API (/admin/returns): every row is
 * a return record with its own code, items, reasons, parcel and outcome.
 * Inspection happens at the warehouse (apps/warehouse); here the store
 * approves, books pickups, refunds, sends exchanges and rejects.
 */

const STATUS = {
  requested: { label: 'Requested', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  pickup_scheduled: { label: 'Pickup booked', variant: 'info' },
  in_transit: { label: 'On its way back', variant: 'info' },
  received: { label: 'Received', variant: 'warning' },
  inspected: { label: 'Inspected', variant: 'warning' },
  refund_pending: { label: 'Refund pending', variant: 'info' },
  refunded: { label: 'Refunded', variant: 'success' },
  exchanged: { label: 'Exchange sent', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

const TABS = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'approve', label: 'To approve', statuses: ['requested'] },
  { id: 'coming', label: 'On the way back', statuses: ['approved', 'pickup_scheduled', 'in_transit'] },
  { id: 'inspect', label: 'At the warehouse', statuses: ['received'] },
  { id: 'resolve', label: 'To resolve', statuses: ['inspected', 'refund_pending'] },
  { id: 'closed', label: 'Closed', statuses: ['refunded', 'exchanged', 'rejected', 'cancelled'] },
];

const REASONS = [
  ['too_small', 'Too small'],
  ['too_large', 'Too large'],
  ['not_as_pictured', 'Differs from the photos'],
  ['damaged', 'Arrived damaged or faulty'],
  ['wrong_item', 'Received the wrong item'],
  ['quality', 'Quality not as expected'],
  ['changed_mind', 'No longer needed'],
  ['other', 'Other'],
];
const REASON_TEXT = Object.fromEntries(REASONS);

const when = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const money = (minor, currency = 'inr') => formatMoney(minor ?? 0, currency);

export function ReturnsAndExchanges({ onShowToast }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const returnsQuery = useReturnsQuery({ limit: 500 });
  const all = returnsQuery.data?.returns ?? [];
  const byStatus = returnsQuery.data?.byStatus ?? {};

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.id === tab);
    const q = search.trim().toLowerCase();
    return all.filter(
      (r) =>
        (!t?.statuses || t.statuses.includes(r.status)) &&
        (!q || r.code.toLowerCase().includes(q) || String(r.displayId).includes(q) || r.items.some((i) => i.productTitle.toLowerCase().includes(q)))
    );
  }, [all, tab, search]);
  const pager = useClientTable(rows);
  const selected = all.find((r) => r._id === selectedId) ?? rows[0] ?? null;
  const count = (statuses) => statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0);
  const valueOf = (statuses) => all.filter((r) => statuses.includes(r.status)).reduce((n, r) => n + r.refundableAmount, 0);

  const exportCsv = () => {
    const head = ['Return', 'Order', 'Type', 'Status', 'Method', 'Items', 'Reasons', 'Refundable', 'Requested'];
    const lines = all.map((r) => [
      r.code,
      r.displayId,
      r.type,
      STATUS[r.status]?.label ?? r.status,
      r.method === 'pickup' ? 'Pickup' : 'Self ship',
      r.items.map((i) => `${i.quantity} x ${i.productTitle} ${i.variantTitle}${i.exchangeVariantTitle ? ` -> ${i.exchangeVariantTitle}` : ''}`).join('; '),
      r.items.map((i) => REASON_TEXT[i.reason] ?? i.reason).join('; '),
      (r.refundableAmount / 100).toFixed(2),
      new Date(r.requestedAt).toISOString(),
    ]);
    const csv = [head, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (returnsQuery.isLoading) return <SkeletonPage variant="table" stats={5} statsCols={5} columns={6} label="Loading returns" />;

  const columns = [
    {
      key: 'code',
      header: 'Return',
      cell: (r) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-mono text-label font-semibold text-accent">{r.code}</span>
          <span className="whitespace-nowrap text-micro text-muted">Order #{r.displayId}</span>
          <span className="whitespace-nowrap text-micro text-muted">{r.type === 'exchange' ? 'Exchange' : 'Refund'}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      cell: (r) => (
        <div className="flex min-w-40 max-w-64 flex-col">
          {r.items.map((i) => (
            <span key={i.itemId} className="truncate text-label text-primary" title={i.productTitle}>
              {i.quantity} × {i.productTitle} · {i.variantTitle}
              {i.exchangeVariantTitle ? ` → ${i.exchangeVariantTitle}` : ''}
            </span>
          ))}
          <span className="truncate text-micro text-muted">{[...new Set(r.items.map((i) => REASON_TEXT[i.reason]))].join(', ')}</span>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Coming back',
      cell: (r) => (
        <div className="flex flex-col">
          <span className="text-meta text-primary">{r.method === 'pickup' ? 'Courier pickup' : 'Customer ships'}</span>
          {r.selfShip && <span className="font-mono text-micro text-muted">{r.selfShip.carrier} #{r.selfShip.awb}</span>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', fit: true, cell: (r) => <StatusBadge status={STATUS[r.status]?.label ?? r.status} variant={STATUS[r.status]?.variant} /> },
    {
      key: 'value',
      header: 'Refundable',
      align: 'right',
      fit: true,
      cell: (r) => (
        <div className="flex flex-col items-end">
          <span className="text-meta font-semibold tabular-nums text-primary">{money(r.refundableAmount, r.currency)}</span>
          <span className="text-micro text-muted">{when(r.requestedAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Fulfillment & orders"
        title="Returns & exchanges"
        description="Requests, pickups, refunds and exchanges. Items are inspected at the warehouse."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!all.length}>
              <Icon name="file_download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Export CSV</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>File a return</span>
            </Button>
          </>
        }
      />
      <PageBody error={returnsQuery.error} hasData={returnsQuery.data != null} title="Returns could not be loaded" onRetry={returnsQuery.refetch}>
        <ContentGrid cols={5}>
          <StatsCard title="To approve" value={String(count(['requested']))} icon="pending_actions" iconColor="text-warning" trendLabel="Waiting for a decision" />
          <StatsCard title="On the way back" value={String(count(['approved', 'pickup_scheduled', 'in_transit']))} icon="local_shipping" iconColor="text-info" trendLabel="Approved, not yet received" />
          <StatsCard title="At the warehouse" value={String(count(['received']))} icon="rule" iconColor="text-accent" trendLabel="Received, to be inspected" />
          <StatsCard
            title="To resolve"
            value={String(count(['inspected', 'refund_pending']))}
            icon="account_balance_wallet"
            iconColor="text-danger"
            badge={valueOf(['inspected']) ? money(valueOf(['inspected'])) : undefined}
            badgeVariant="destructive"
            trendLabel="Inspected: refund, exchange or reject"
          />
          <StatsCard title="Closed" value={String(count(['refunded', 'exchanged', 'rejected', 'cancelled']))} icon="inventory_2" iconColor="text-success" trendLabel="Refunded, exchanged, rejected or cancelled" />
        </ContentGrid>

        {all.length > 0 && (
          <FilterBar
            tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.statuses ? count(t.statuses) : all.length }))}
            activeTab={tab}
            onTabChange={setTab}
            search={<SearchInput placeholder="Return code, order number or item" value={search} onChange={setSearch} onClear={() => setSearch('')} className="w-full sm:w-72" />}
          />
        )}

        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          {all.length === 0 ? (
            <EmptyState
              icon="assignment_return"
              title="No returns yet"
              description="Returns customers request from their account appear here. Support can also file one for a customer."
              className="py-16 lg:col-span-12"
              action={
                <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                  File a return
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState icon="search" title="No returns match" description="Clear the search or pick another tab." className="lg:col-span-12" />
          ) : (
            <>
              <div className="min-w-0 lg:col-span-7 xl:col-span-8">
                <DataTable
                  columns={columns}
                  data={pager.pageRows}
                  keyField="_id"
                  activeRowId={selected?._id}
                  onRowClick={(r) => setSelectedId(r._id)}
                  caption="Returns"
                  toolbar={
                    <TableToolbar
                      left={
                        <>
                          <h3 className="text-subheading text-primary">Return queue</h3>
                          <Badge variant="secondary" className="tabular-nums">
                            {rows.length} of {all.length}
                          </Badge>
                        </>
                      }
                      right={
                        <Button variant="ghost" size="iconSm" onClick={() => returnsQuery.refetch()} title="Refresh" aria-label="Refresh returns">
                          <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                        </Button>
                      }
                    />
                  }
                  pagination={{ page: pager.page, pageSize: pager.limit, totalItems: pager.total, onPageChange: pager.setPage, onPageSizeChange: pager.setLimit }}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-space-md lg:col-span-5 xl:col-span-4">
                {selected ? <ReturnPanel key={selected._id} id={selected._id} onShowToast={onShowToast} /> : null}
              </div>
            </>
          )}
        </div>

        <CreateReturnDialog open={createOpen} onClose={() => setCreateOpen(false)} onShowToast={onShowToast} />
      </PageBody>
    </PageContainer>
  );
}

/** One return: what came back, its parcel and history, and the decisions its status allows. */
function ReturnPanel({ id, onShowToast }) {
  const detail = useReturnDetailQuery(id);
  const act = useReturnActMutation();
  const [ask, setAsk] = useState(null); // { action, title, label } when a reason is needed
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  if (detail.isLoading) return <Card className="p-space-md text-body text-muted">Loading…</Card>;
  if (detail.isError) return <Card className="p-space-md text-body text-danger">{detail.error?.message}</Card>;
  const { return: r, history, shipment, refund, exchangeOrder } = detail.data;

  const run = (action, body = {}, done) =>
    act
      .mutateAsync({ id: r._id, action, body })
      .then((res) => {
        onShowToast?.({ type: 'success', title: done(res) });
        setAsk(null);
        setNote('');
      })
      .catch((err) => onShowToast?.({ type: 'error', title: 'Not done', message: err?.message ?? 'Nothing was changed.' }));

  const refundBody = () => (amount ? { amount: Math.round(Number(amount) * 100) } : {});
  const busy = act.isPending;
  const canCancel = ['requested', 'approved', 'pickup_scheduled'].includes(r.status);

  return (
    <>
      <Card className="flex flex-col gap-space-md p-space-md">
        <div className="flex flex-wrap items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-1">
            <StatusBadge status={STATUS[r.status]?.label ?? r.status} variant={STATUS[r.status]?.variant} className="self-start" />
            <h2 className="font-mono text-subheading text-primary">{r.code}</h2>
            <span className="text-body text-secondary">
              Order #{r.displayId} · {r.type === 'exchange' ? 'Exchange' : 'Refund'} · {r.method === 'pickup' ? 'courier pickup' : 'customer ships'}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-kpi-sm tabular-nums text-primary">{money(r.refundableAmount, r.currency)}</span>
            <span className="block text-meta text-muted">Paid for these items</span>
          </div>
        </div>

        <ul className="flex flex-col gap-space-sm rounded-lg border border-subtle bg-surface-subtle p-space-sm">
          {r.items.map((i) => (
            <li key={i.itemId} className="flex flex-col">
              <span className="text-label font-semibold text-primary">
                {i.quantity} × {i.productTitle} · {i.variantTitle}
                {i.exchangeVariantTitle ? ` → ${i.exchangeVariantTitle}` : ''}
              </span>
              <span className="text-micro text-muted">
                {REASON_TEXT[i.reason] ?? i.reason}
                {i.note ? `: ${i.note}` : ''}
              </span>
            </li>
          ))}
        </ul>

        {(shipment || r.selfShip) && (
          <p className="text-meta text-secondary">
            {shipment ? `${shipment.carrier || 'Courier'} pickup · AWB ${shipment.awb || 'not assigned yet'} · ${shipment.status.replace(/_/g, ' ')}` : `Sent by the customer with ${r.selfShip.carrier} · AWB ${r.selfShip.awb}`}
          </p>
        )}
        {r.inspection && (
          <p className="text-meta text-secondary">
            Inspected {when(r.inspection.at)}: {r.inspection.lines.map((l) => `${l.quantity} ${l.condition}${l.notes ? ` (${l.notes})` : ''}`).join(', ')}
          </p>
        )}
        {refund && (
          <p className="text-meta text-secondary">
            Refund {money(refund.amount, r.currency)} · {refund.status}
            {refund.failureReason ? ` · ${refund.failureReason}` : ''}
          </p>
        )}
        {exchangeOrder && <p className="text-meta text-secondary">Replacement order #{exchangeOrder.displayId} · {exchangeOrder.fulfillmentStatus}</p>}
        {r.rejectionReason && <p className="text-meta text-danger">Rejected: {r.rejectionReason}</p>}

        <Separator />

        <div className="flex flex-col gap-space-sm">
          {r.status === 'requested' && (
            <Button variant="primary" className="w-full" disabled={busy} onClick={() => run('approve', {}, () => `${r.code} approved`)}>
              Approve
            </Button>
          )}
          {r.status === 'approved' && r.method === 'pickup' && (
            <Button variant="primary" className="w-full" disabled={busy} onClick={() => run('pickup', {}, (res) => `Pickup booked${res.shipment?.carrier ? ` with ${res.shipment.carrier}` : ''}`)}>
              Book courier pickup
            </Button>
          )}
          {r.status === 'approved' && r.method === 'self_ship' && <p className="text-meta text-muted">Waiting for the customer to send it and add the AWB.</p>}
          {['approved', 'pickup_scheduled', 'in_transit'].includes(r.status) && (
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => run('receive', {}, () => `${r.code} marked received`)}>
              Mark received at the warehouse
            </Button>
          )}
          {r.status === 'received' && <p className="text-meta text-muted">The warehouse grades each unit in the warehouse app; stock comes back only then.</p>}
          {(r.status === 'inspected' || (r.status === 'received' && r.type === 'return')) && (
            <>
              {r.type === 'exchange' && r.status === 'inspected' && (
                <Button variant="primary" className="w-full" disabled={busy} onClick={() => run('exchange', {}, (res) => `Replacement order #${res.exchangeOrder.displayId} created`)}>
                  Send the exchange
                </Button>
              )}
              <div className="flex items-end gap-space-sm">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-micro text-muted" htmlFor={`amt-${r._id}`}>
                    Refund (₹), up to {money(r.refundableAmount, r.currency)}
                  </label>
                  <Input id={`amt-${r._id}`} type="number" min="0.01" step="0.01" max={r.refundableAmount / 100} placeholder={(r.refundableAmount / 100).toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <Button variant={r.type === 'exchange' ? 'outline' : 'primary'} disabled={busy} onClick={() => run('refund', refundBody(), (res) => `Refund ${money(res.refund.amount, r.currency)} ${res.refund.status}; credit note ${res.creditNoteNumber}`)}>
                  Refund
                </Button>
              </div>
            </>
          )}
          {(r.status === 'requested' || r.status === 'approved' || r.status === 'inspected') && (
            <Button variant="ghost" size="sm" className="w-full text-danger" disabled={busy} onClick={() => setAsk({ action: 'reject', title: `Reject ${r.code}`, label: 'Why (shown to the customer)' })}>
              Reject
            </Button>
          )}
          {canCancel && (
            <Button variant="ghost" size="sm" className="w-full" disabled={busy} onClick={() => setAsk({ action: 'cancel', title: `Cancel ${r.code}`, label: 'Why' })}>
              Cancel return
            </Button>
          )}
        </div>
      </Card>

      <SectionCard title="History">
        <ol className="flex flex-col gap-space-sm">
          {history.map((e) => (
            <li key={e._id} className="flex flex-col">
              <span className="text-label font-semibold text-primary">{STATUS[e.to]?.label ?? e.to}</span>
              <span className="text-micro text-muted">
                {when(e.at)} · {e.actor.name ?? e.actor.type}
                {e.reason ? ` · ${e.reason}` : ''}
              </span>
            </li>
          ))}
        </ol>
      </SectionCard>

      <AppDialog
        isOpen={!!ask}
        onClose={() => setAsk(null)}
        title={ask?.title}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAsk(null)}>
              Back
            </Button>
            <Button variant="primary" disabled={busy || note.trim().length < 3} onClick={() => run(ask.action, { note: note.trim() }, () => `${r.code} ${ask.action === 'reject' ? 'rejected' : 'cancelled'}`)}>
              Confirm
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5 text-label text-secondary">
          {ask?.label}
          <Input value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
        </label>
      </AppDialog>
    </>
  );
}

/** Support files a return for a customer: find the order, pick items and reasons, refund or exchange, pickup or self ship. */
function CreateReturnDialog({ open, onClose, onShowToast }) {
  const create = useCreateReturnMutation();
  const [number, setNumber] = useState('');
  const [found, setFound] = useState(null);
  const [error, setError] = useState(null);
  const [picks, setPicks] = useState({});
  const [type, setType] = useState('return');
  const [method, setMethod] = useState('pickup');

  const reset = () => {
    setNumber('');
    setFound(null);
    setError(null);
    setPicks({});
    setType('return');
    setMethod('pickup');
  };
  const close = () => {
    reset();
    onClose();
  };
  const lookup = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setFound(await adminApi.returnOptions(number.replace('#', '')));
      setPicks({});
    } catch (err) {
      setFound(null);
      setError(err?.message ?? 'Not found');
    }
  };
  const chosen = Object.entries(picks).filter(([, p]) => p.quantity > 0);
  const submit = () =>
    create
      .mutateAsync({
        orderId: found.order.id,
        body: { type, method, items: chosen.map(([itemId, p]) => ({ itemId, quantity: p.quantity, reason: p.reason, ...(p.note ? { note: p.note } : {}), ...(type === 'exchange' ? { exchangeVariantId: p.exchangeVariantId } : {}) })) },
      })
      .then((res) => {
        onShowToast?.({ type: 'success', title: `${res.return.code} filed for order #${found.order.displayId}` });
        close();
      })
      .catch((err) => setError(err?.message ?? 'Not filed'));

  return (
    <AppDialog
      isOpen={open}
      onClose={close}
      title="File a return for a customer"
      description="Same rules as the customer's own request: delivered, inside the window, one open return per order."
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!found || !chosen.length || create.isPending} onClick={submit}>
            File {type === 'exchange' ? 'exchange' : 'return'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md pb-space-md">
        <form onSubmit={lookup} className="flex items-end gap-space-sm">
          <label className="flex flex-1 flex-col gap-1.5 text-label text-secondary">
            Order number
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1042" inputMode="numeric" required />
          </label>
          <Button type="submit" variant="outline">
            Find
          </Button>
        </form>
        {error && <p role="alert" className="text-meta text-danger">{error}</p>}
        {found && (
          <>
            <p className="text-meta text-secondary">
              #{found.order.displayId} · {found.order.customer} · {found.order.email}
              {found.windowDays ? ` · window ${found.windowDays} days` : ''}
            </p>
            <ul className="flex flex-col gap-space-sm">
              {found.items.filter((i) => i.returnable > 0).map((i) => {
                const p = picks[i.itemId];
                const set = (patch) => setPicks({ ...picks, [i.itemId]: { ...p, ...patch } });
                return (
                  <li key={i.itemId} className="flex flex-col gap-space-xs rounded-lg border border-subtle p-space-sm">
                    <label className="flex items-center gap-space-sm text-label text-primary">
                      <input
                        type="checkbox"
                        checked={!!p}
                        onChange={() => {
                          const next = { ...picks };
                          if (p) delete next[i.itemId];
                          else next[i.itemId] = { quantity: i.returnable, reason: 'too_small', note: '', exchangeVariantId: i.exchangeFor[0]?.variantId ?? '' };
                          setPicks(next);
                        }}
                      />
                      {i.productTitle} · {i.variantTitle} · {money(i.refundPerUnit)} each ({i.returnable} returnable)
                    </label>
                    {p && (
                      <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
                        <Select aria-label="Quantity" value={p.quantity} onChange={(e) => set({ quantity: Number(e.target.value) })}>
                          {Array.from({ length: i.returnable }, (_, n) => (
                            <option key={n} value={n + 1}>
                              Qty {n + 1}
                            </option>
                          ))}
                        </Select>
                        <Select aria-label="Reason" value={p.reason} onChange={(e) => set({ reason: e.target.value })}>
                          {REASONS.map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </Select>
                        {type === 'exchange' ? (
                          <Select aria-label="Exchange for" value={p.exchangeVariantId} onChange={(e) => set({ exchangeVariantId: e.target.value })}>
                            {i.exchangeFor.length ? i.exchangeFor.map((v) => <option key={v.variantId} value={v.variantId}>{v.title}</option>) : <option value="">No other size in stock</option>}
                          </Select>
                        ) : (
                          <Input aria-label="Note" placeholder="Note" value={p.note} onChange={(e) => set({ note: e.target.value })} />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="grid grid-cols-2 gap-space-sm">
              <Select aria-label="Refund or exchange" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="return">Refund</option>
                <option value="exchange">Exchange</option>
              </Select>
              <Select aria-label="How it comes back" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="pickup">Courier pickup</option>
                <option value="self_ship">Customer ships it</option>
              </Select>
            </div>
          </>
        )}
      </div>
    </AppDialog>
  );
}
