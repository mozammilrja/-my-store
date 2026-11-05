import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '../../lib/api-warehouses';
import { AppDialog, Badge, Button, Card, DataTable, FilterBar, Input, Select, StatusBadge, TableToolbar } from '../ui';
import { errorText, Field, FULFILMENT_STATUS, RoleNote, usePermissions, useWarehouses, when, WH_KEY } from './shared';

/*
 * The fulfilment board: each fulfilment is the part of an order one
 * warehouse picks, packs and dispatches. Staff work them in the warehouse
 * app; here the store watches the queue and, before picking starts, can move
 * one to another warehouse (released and re-reserved there, audited).
 */

const TABS = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'new', label: 'To start', statuses: ['assigned', 'picking_pending'] },
  { id: 'floor', label: 'On the floor', statuses: ['picking', 'picked', 'qc_passed', 'packed', 'label_generated', 'ready_to_dispatch', 'manifested'] },
  { id: 'gone', label: 'Dispatched', statuses: ['handed_over', 'dispatched'] },
  { id: 'closed', label: 'Rejected or cancelled', statuses: ['rejected', 'cancelled'] },
];
const REASSIGNABLE = ['assigned', 'picking_pending'];

export function FulfilmentsTab({ onShowToast }) {
  const warehouses = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const limit = 25;

  const tabStatuses = TABS.find((t) => t.id === tab)?.statuses;
  // The API filters by one status. A tab grouping several, with none picked, loads the latest 200 and filters here.
  const grouped = !!tabStatuses && !status;
  const board = useQuery({
    queryKey: [...WH_KEY, 'fulfilments', warehouseId, status, grouped ? 'grouped' : page],
    queryFn: () => warehousesApi.fulfilments({ warehouseId, status, page: grouped ? 1 : page, limit: grouped ? 200 : limit }),
    placeholderData: (prev) => prev,
  });
  const byStatus = board.data?.byStatus ?? {};
  const count = (statuses) => (statuses ? statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0) : Object.values(byStatus).reduce((a, b) => a + b, 0));
  const pickTab = (id) => {
    setTab(id);
    const t = TABS.find((x) => x.id === id);
    setStatus('');
    setPage(1);
  };
  const rows = (board.data?.fulfilments ?? []).filter((f) => !grouped || tabStatuses.includes(f.status));

  const columns = [
    {
      key: 'code',
      header: 'Fulfilment',
      grow: true,
      cell: (f) => (
        <div className="flex flex-col">
          <span className="font-mono text-label font-semibold text-primary">{f.code}</span>
          <span className="text-micro text-muted">
            Order #{f.displayId} · {f.lines.reduce((n, l) => n + l.quantity, 0)} unit(s) · {f.paymentMethod === 'cod' ? 'COD' : 'prepaid'}
          </span>
        </div>
      ),
    },
    { key: 'wh', header: 'Warehouse', fit: true, cell: (f) => <span className="font-mono text-meta">{f.warehouseCode}</span> },
    { key: 'to', header: 'Ships to', cell: (f) => <span className="text-meta text-secondary">{f.destination?.city} {f.destination?.postalCode}</span> },
    { key: 'awb', header: 'Parcel', cell: (f) => <span className="font-mono text-micro text-muted">{f.awb ? `${f.carrier} ${f.awb}` : '—'}</span> },
    { key: 'status', header: 'Status', fit: true, cell: (f) => <StatusBadge status={FULFILMENT_STATUS[f.status]?.label ?? f.status} variant={FULFILMENT_STATUS[f.status]?.variant} /> },
    { key: 'at', header: 'Assigned', fit: true, cell: (f) => <span className="text-micro text-muted">{when(f.createdAt)}</span> },
  ];

  const whList = warehouses.data?.warehouses ?? [];
  return (
    <div className="flex flex-col gap-space-md">
      <FilterBar
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: count(t.statuses) }))}
        activeTab={tab}
        onTabChange={pickTab}
        filters={
          <div className="flex flex-wrap gap-space-sm">
            <Select
              aria-label="Warehouse"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setPage(1);
              }}
              wrapperClassName="min-w-44"
            >
              <option value="">All warehouses</option>
              {whList.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.code}
                </option>
              ))}
            </Select>
            {tabStatuses ? (
              <Select
                aria-label="Status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                wrapperClassName="min-w-44"
              >
                <option value="">Every status here</option>
                {tabStatuses.map((s) => (
                  <option key={s} value={s}>
                    {FULFILMENT_STATUS[s]?.label ?? s}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        }
      />
      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <div className={selectedId ? 'min-w-0 lg:col-span-7 xl:col-span-8' : 'min-w-0 lg:col-span-12'}>
          <DataTable
            columns={columns}
            data={rows}
            keyField="_id"
            isLoading={board.isLoading}
            isError={board.isError}
            errorTitle="Fulfilments could not be loaded"
            errorMessage={board.error?.message}
            onRetry={board.refetch}
            activeRowId={selectedId}
            onRowClick={(f) => setSelectedId(f._id)}
            caption="Fulfilments"
            emptyTitle="Nothing here"
            emptyMessage="Orders are assigned to a warehouse when they are placed."
            toolbar={
              <TableToolbar
                left={
                  <>
                    <h2 className="text-subheading text-primary">Fulfilment board</h2>
                    <Badge variant="secondary" className="tabular-nums">
                      {grouped ? rows.length : board.data?.count ?? 0}
                    </Badge>
                  </>
                }
              />
            }
            clientPagination={grouped}
            pagination={grouped ? {} : { page, pageSize: limit, totalItems: board.data?.count ?? 0, onPageChange: setPage }}
          />
        </div>
        {selectedId ? (
          <div className="min-w-0 lg:col-span-5 xl:col-span-4">
            <FulfilmentPanel key={selectedId} id={selectedId} warehouses={whList} onClose={() => setSelectedId(null)} onShowToast={onShowToast} onMoved={setSelectedId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FulfilmentPanel({ id, warehouses, onClose, onShowToast, onMoved }) {
  const can = usePermissions();
  const detail = useQuery({ queryKey: [...WH_KEY, 'fulfilment', id], queryFn: () => warehousesApi.fulfilment(id) });
  const [reassigning, setReassigning] = useState(false);
  if (detail.isLoading) return <Card className="p-space-md text-body text-muted">Loading…</Card>;
  if (detail.isError) return <Card className="p-space-md text-body text-danger" role="alert">{errorText(detail.error)}</Card>;
  const { fulfilment: f, history } = detail.data;
  const movable = f.active && REASSIGNABLE.includes(f.status);

  return (
    <Card className="flex flex-col gap-space-md p-space-md" aria-label={`Fulfilment ${f.code}`}>
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col gap-1">
          <StatusBadge status={FULFILMENT_STATUS[f.status]?.label ?? f.status} variant={FULFILMENT_STATUS[f.status]?.variant} className="self-start" />
          <h2 className="font-mono text-subheading text-primary">{f.code}</h2>
          <span className="text-meta text-secondary">
            Order #{f.displayId} · {f.warehouseCode} · assigned {f.assignment?.method === 'manual' ? 'by hand' : 'automatically'}
          </span>
          {f.assignment?.reason ? <span className="text-micro text-muted">{f.assignment.reason}</span> : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <ul className="flex flex-col gap-1 rounded-lg border border-subtle bg-surface-subtle p-space-sm">
        {f.lines.map((l) => (
          <li key={`${l.itemId}-${l.variantId}`} className="flex justify-between gap-space-sm text-meta">
            <span className="text-primary">
              {l.quantity} × {l.productTitle} · {l.variantTitle} <span className="font-mono text-muted">{l.sku}</span>
            </span>
            <span className="shrink-0 text-muted">
              picked {l.picked}, packed {l.packed}
              {l.short ? `, short ${l.short}` : ''}
            </span>
          </li>
        ))}
      </ul>

      {f.rejectedBy?.length ? <p className="text-meta text-warning">Refused by {f.rejectedBy.length} warehouse(s) before this one.</p> : null}

      {movable ? (
        can.reassign ? (
          <Button variant="outline" onClick={() => setReassigning(true)}>
            Move to another warehouse
          </Button>
        ) : (
          <RoleNote>Moving an order to another warehouse needs an order manager, inventory manager, store admin or owner.</RoleNote>
        )
      ) : f.active ? (
        <p className="text-meta text-muted">Picking has started, so this order stays at {f.warehouseCode}.</p>
      ) : null}

      <div className="flex flex-col gap-space-xs">
        <h3 className="text-label font-semibold text-primary">History</h3>
        <ol className="flex flex-col gap-space-xs border-l border-subtle pl-space-sm">
          {history.map((e) => (
            <li key={e._id} className="flex flex-col">
              <span className="text-meta text-primary">
                {e.from ? `${FULFILMENT_STATUS[e.from]?.label ?? e.from} → ` : ''}
                {FULFILMENT_STATUS[e.to]?.label ?? e.to}
              </span>
              <span className="text-micro text-muted">
                {when(e.at)} · {e.actor?.name ?? e.actor?.type}
                {e.reason ? ` · ${e.reason}` : ''}
              </span>
            </li>
          ))}
          {!history.length ? <li className="text-meta text-muted">No status changes recorded yet.</li> : null}
        </ol>
      </div>

      {reassigning ? <ReassignDialog f={f} warehouses={warehouses} onClose={() => setReassigning(false)} onShowToast={onShowToast} onMoved={onMoved} /> : null}
    </Card>
  );
}

function ReassignDialog({ f, warehouses, onClose, onShowToast, onMoved }) {
  const qc = useQueryClient();
  const targets = warehouses.filter((w) => w._id !== f.warehouseId && w.status === 'active' && !w.sellerId);
  const [warehouseId, setWarehouseId] = useState(targets[0]?._id ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const move = useMutation({
    mutationFn: () => warehousesApi.reassign(f._id, { warehouseId, reason: reason.trim() }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: WH_KEY });
      onShowToast?.({ type: 'success', title: `Moved to ${r.fulfilment.warehouseCode}`, message: `${f.code} is cancelled; ${r.fulfilment.code} is the new fulfilment.` });
      onClose();
      onMoved?.(r.fulfilment._id);
    },
    onError: (e) => setError(errorText(e)),
  });
  return (
    <AppDialog
      isOpen
      onClose={onClose}
      title={`Move ${f.code}`}
      description="Its stock is released here and reserved at the new warehouse, which must hold enough. The change is audited."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!warehouseId || reason.trim().length < 3 || move.isPending} onClick={() => move.mutate()}>
            Move order
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-sm pb-space-md">
        <div className="flex flex-col gap-1.5 text-label text-secondary">
          <span>Move to</span>
          <Select aria-label="Move to warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="No other active warehouse">
            {targets.map((w) => (
              <option key={w._id} value={w._id}>
                {w.code} · {w.name}
              </option>
            ))}
          </Select>
        </div>
        <Field label="Reason" hint="Kept in the order's history and the audit log.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {error ? <p role="alert" className="text-meta text-danger">{error}</p> : null}
      </div>
    </AppDialog>
  );
}
