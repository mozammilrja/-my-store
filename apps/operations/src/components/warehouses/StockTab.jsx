import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '../../lib/api-warehouses';
import { AppDialog, Badge, Button, DataTable, EmptyState, Icon, Input, SearchInput, Select, TableToolbar } from '../ui';
import { errorText, Field, RoleNote, usePermissions, useWarehouses, when, WH_KEY } from './shared';

/*
 * Stock per warehouse, by bucket, from the stock ledger. Every change goes
 * through a ledger move (receive, count correction, damage, write-off,
 * transfer); the screen never sets a number directly. A variant not yet
 * under warehouse tracking is brought in with an opening balance: its
 * current sellable count, at one warehouse.
 */

const OPS = {
  receive: { label: 'Goods in', hint: 'Units arrived from a supplier or purchase order.' },
  adjust: { label: 'Count correction', hint: 'A cycle count found more (+) or fewer (−) units than recorded.' },
  damage: { label: 'Mark damaged', hint: 'Sellable units found damaged on the shelf.' },
  write_off: { label: 'Write off damaged', hint: 'Damaged units disposed of or sent back to the supplier.' },
  transfer: { label: 'Transfer', hint: 'Units sent to another warehouse.' },
};

const REASON = {
  receive: 'Goods in',
  adjust: 'Correction',
  damage: 'Damaged',
  opening_balance: 'Opening balance',
  reserve: 'Reserved',
  release: 'Released',
  pick: 'Picked',
  pack: 'Packed',
  dispatch: 'Dispatched',
  unpick: 'Put back',
  qc_damage: 'Failed check',
  transfer_out: 'Transfer out',
  transfer_in: 'Transfer in',
  return_receive: 'Return received',
  return_restock: 'Return restocked',
  return_reject: 'Return rejected',
};

const BUCKET = { outside: 'outside', available: 'available', reserved: 'reserved', picked: 'picked', packed: 'packed', damaged: 'damaged', quarantine: 'quarantine' };

export function StockTab({ onShowToast }) {
  const can = usePermissions();
  const warehouses = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [operation, setOperation] = useState(null); // null | { level? }
  const [opening, setOpening] = useState(false);

  const levels = useQuery({
    queryKey: [...WH_KEY, 'levels', warehouseId],
    queryFn: () => warehousesApi.stockLevels({ warehouseId, limit: 500 }),
  });
  const ledger = useQuery({
    queryKey: [...WH_KEY, 'ledger', selected?.warehouseId ?? warehouseId, selected?.variantId ?? ''],
    queryFn: () => warehousesApi.stockLedger({ warehouseId: selected?.warehouseId ?? warehouseId, variantId: selected?.variantId, limit: 100 }),
  });

  const all = levels.data?.stock ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toUpperCase();
    return q ? all.filter((l) => l.sku.toUpperCase().includes(q) || (l.binCode ?? '').toUpperCase().includes(q)) : all;
  }, [all, search]);
  const whList = warehouses.data?.warehouses ?? [];
  const codeOf = (id) => whList.find((w) => w._id === id)?.code ?? id;

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      grow: true,
      cell: (l) => (
        <div className="flex flex-col">
          <span className="font-mono text-label font-semibold text-primary">{l.sku}</span>
          <span className="text-micro text-muted">
            {l.warehouseCode}
            {l.binCode ? ` · bin ${l.binCode}` : ''}
          </span>
        </div>
      ),
    },
    { key: 'available', header: 'Available', align: 'right', fit: true, cell: (l) => <span className="tabular-nums font-semibold text-primary">{l.available}</span> },
    { key: 'reserved', header: 'Reserved', align: 'right', fit: true, cell: (l) => <span className="tabular-nums">{l.reserved}</span> },
    { key: 'inflight', header: 'Picked / packed', align: 'right', fit: true, cell: (l) => <span className="tabular-nums">{l.picked + l.packed}</span> },
    { key: 'damaged', header: 'Damaged', align: 'right', fit: true, cell: (l) => <span className={`tabular-nums ${l.damaged ? 'text-danger' : ''}`}>{l.damaged}</span> },
    { key: 'received', header: 'Received to date', align: 'right', fit: true, cell: (l) => <span className="tabular-nums text-muted">{l.receivedTotal}</span> },
    can.moveStock
      ? {
          key: 'act',
          header: <span className="sr-only">Actions</span>,
          fit: true,
          cell: (l) => (
            <Button
              variant="outline"
              size="sm"
              aria-label={`Move stock for ${l.sku} at ${l.warehouseCode}`}
              onClick={(e) => {
                e.stopPropagation();
                setOperation({ level: l });
              }}
            >
              Move stock
            </Button>
          ),
        }
      : null,
  ].filter(Boolean);

  const ledgerColumns = [
    { key: 'at', header: 'When', fit: true, cell: (e) => <span className="text-meta">{when(e.createdAt)}</span> },
    {
      key: 'sku',
      header: 'Item',
      cell: (e) => (
        <div className="flex flex-col">
          <span className="font-mono text-meta text-primary">{e.sku}</span>
          <span className="text-micro text-muted">{codeOf(e.warehouseId)}</span>
        </div>
      ),
    },
    {
      key: 'move',
      header: 'Movement',
      grow: true,
      cell: (e) => (
        <div className="flex flex-col">
          <span className="text-meta text-primary">
            {REASON[e.reason] ?? e.reason}: {e.quantity} {BUCKET[e.from] ?? e.from} → {BUCKET[e.to] ?? e.to}
          </span>
          <span className="text-micro text-muted">
            {e.ref?.type} {e.ref?.id}
            {e.note ? ` · ${e.note}` : ''}
          </span>
        </div>
      ),
    },
    { key: 'after', header: 'Available after', align: 'right', fit: true, cell: (e) => <span className="tabular-nums">{e.after?.available ?? '—'}</span> },
    { key: 'actor', header: 'By', fit: true, cell: (e) => <span className="text-micro text-muted">{e.actor?.name ?? e.actor?.type}</span> },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      {!can.moveStock ? <RoleNote>Your role can view stock. Moving stock needs an inventory manager, store admin or owner.</RoleNote> : null}
      <DataTable
        columns={columns}
        data={rows}
        keyField="_id"
        isLoading={levels.isLoading}
        isError={levels.isError}
        errorTitle="Stock could not be loaded"
        errorMessage={levels.error?.message}
        onRetry={levels.refetch}
        activeRowId={selected?._id}
        onRowClick={(l) => setSelected(selected?._id === l._id ? null : l)}
        clientPagination
        pagination={{}}
        caption="Stock levels"
        emptyTitle={all.length ? 'No stock matches' : 'No warehouse stock yet'}
        emptyMessage={all.length ? 'Clear the search.' : 'Receive goods, or bring existing items in with an opening balance.'}
        toolbar={
          <TableToolbar
            left={
              <>
                <h2 className="text-subheading text-primary">Stock levels</h2>
                <Badge variant="secondary" className="tabular-nums">
                  {rows.length}
                </Badge>
                <Select
                  aria-label="Warehouse"
                  value={warehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    setSelected(null);
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
                <SearchInput placeholder="SKU or bin" value={search} onChange={setSearch} onClear={() => setSearch('')} className="w-full sm:w-56" />
              </>
            }
            right={
              can.moveStock ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setOpening(true)}>
                    Opening balance
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setOperation({})}>
                    <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                    <span>Stock movement</span>
                  </Button>
                </>
              ) : null
            }
          />
        }
      />

      <DataTable
        columns={ledgerColumns}
        data={ledger.data?.entries ?? []}
        keyField="_id"
        isLoading={ledger.isLoading}
        isError={ledger.isError}
        errorTitle="The ledger could not be loaded"
        errorMessage={ledger.error?.message}
        onRetry={ledger.refetch}
        caption="Stock ledger"
        emptyTitle="No movements yet"
        emptyMessage="Every receipt, reservation, pick, dispatch and correction is recorded here."
        toolbar={
          <TableToolbar
            left={
              <>
                <h2 className="text-subheading text-primary">Ledger</h2>
                <span className="text-meta text-muted">
                  {selected ? `${selected.sku} at ${selected.warehouseCode}` : warehouseId ? `All items at ${codeOf(warehouseId)}` : 'All warehouses'} · latest 100
                </span>
              </>
            }
            right={
              selected ? (
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Show all items
                </Button>
              ) : null
            }
          />
        }
      />

      {operation ? <OperationDialog level={operation.level} warehouses={whList} defaultWarehouseId={warehouseId} onClose={() => setOperation(null)} onShowToast={onShowToast} /> : null}
      {opening ? <OpeningBalanceDialog warehouses={whList} defaultWarehouseId={warehouseId} onClose={() => setOpening(false)} onShowToast={onShowToast} /> : null}
    </div>
  );
}

/** Finds variants by product title, handle or exact SKU. */
function VariantPicker({ multiple = false, value, onChange }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const found = useQuery({ queryKey: [...WH_KEY, 'find', term], queryFn: () => warehousesApi.findProducts(term), enabled: term.length >= 2 });
  const variants = (found.data?.products ?? []).flatMap((p) => p.variants.map((v) => ({ ...v, productTitle: p.title })));
  const chosen = multiple ? value : value ? [value] : [];
  const toggle = (v) => {
    if (!multiple) return onChange(v);
    onChange(chosen.some((c) => c.id === v.id) ? chosen.filter((c) => c.id !== v.id) : [...chosen, v]);
  };
  return (
    <div className="flex flex-col gap-space-xs">
      <div className="flex items-end gap-space-sm">
        <Field label="Find an item" className="flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setTerm(q.trim());
              }
            }}
            placeholder="Product name or exact SKU"
          />
        </Field>
        <Button variant="outline" onClick={() => setTerm(q.trim())} disabled={q.trim().length < 2}>
          Search
        </Button>
      </div>
      {found.isFetching ? <p className="text-meta text-muted">Searching…</p> : null}
      {found.isError ? <p role="alert" className="text-meta text-danger">{errorText(found.error)}</p> : null}
      {term && found.isSuccess && !variants.length ? <p className="text-meta text-muted">No items match “{term}”.</p> : null}
      {variants.length ? (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-subtle p-space-xs" aria-label="Matching items">
          {variants.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-center gap-space-sm rounded px-space-xs py-1 text-meta text-primary hover:bg-surface-subtle">
                <input type={multiple ? 'checkbox' : 'radio'} name="variant" checked={chosen.some((c) => c.id === v.id)} onChange={() => toggle(v)} />
                <span>
                  {v.productTitle} · {v.title} <span className="font-mono text-muted">{v.sku ?? ''}</span>
                  {multiple ? <span className="text-muted"> · {v.stock ?? 0} on hand</span> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OperationDialog({ level, warehouses, defaultWarehouseId, onClose, onShowToast }) {
  const qc = useQueryClient();
  const active = warehouses.filter((w) => w.status === 'active');
  const [type, setType] = useState('receive');
  const [warehouseId, setWarehouseId] = useState(level?.warehouseId ?? defaultWarehouseId ?? active[0]?._id ?? '');
  const [variant, setVariant] = useState(level ? { id: level.variantId, sku: level.sku } : null);
  const [quantity, setQuantity] = useState('');
  const [toWarehouseId, setTo] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const noteRequired = ['adjust', 'damage', 'write_off'].includes(type);
  const body = () => {
    const n = Number(quantity);
    const base = { type, warehouseId, variantId: variant?.id };
    if (type === 'adjust') return { ...base, delta: n, note: note.trim() };
    if (type === 'transfer') return { ...base, toWarehouseId, quantity: n, ...(note.trim() ? { note: note.trim() } : {}) };
    if (type === 'receive') return { ...base, quantity: n, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
    return { ...base, quantity: n, note: note.trim() };
  };
  const run = useMutation({
    mutationFn: () => warehousesApi.stockOperation(body()),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: WH_KEY });
      onShowToast?.({ type: 'success', title: 'Stock updated', message: r.level ? `${r.level.sku}: ${r.level.available} available at ${r.level.warehouseCode}` : `Transfer ${r.reference}` });
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });
  const ready = warehouseId && variant && quantity !== '' && Number(quantity) !== 0 && (!noteRequired || note.trim().length >= 3) && (type !== 'transfer' || toWarehouseId);

  return (
    <AppDialog
      isOpen
      onClose={onClose}
      title="Stock movement"
      description={OPS[type].hint}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!ready || run.isPending} onClick={() => run.mutate()}>
            Record
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-sm pb-space-md">
        <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
          <Select aria-label="Movement" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(OPS).map(([v, o]) => (
              <option key={v} value={v}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select aria-label="At warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={!!level}>
            {active.map((w) => (
              <option key={w._id} value={w._id}>
                {w.code} · {w.name}
              </option>
            ))}
          </Select>
        </div>
        {level ? (
          <p className="text-meta text-secondary">
            Item <span className="font-mono text-primary">{level.sku}</span> · {level.available} available, {level.damaged} damaged
          </p>
        ) : (
          <>
            <VariantPicker value={variant} onChange={setVariant} />
            {variant ? <p className="text-meta text-secondary">Chosen: <span className="font-mono text-primary">{variant.sku ?? variant.id}</span></p> : null}
          </>
        )}
        <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
          <Field label={type === 'adjust' ? 'Change in units (+ or −)' : 'Units'}>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={type === 'adjust' ? undefined : 1} step={1} />
          </Field>
          {type === 'transfer' ? (
            <div className="flex flex-col gap-1.5 text-label text-secondary">
              <span>To warehouse</span>
              <Select aria-label="To warehouse" value={toWarehouseId} onChange={(e) => setTo(e.target.value)} placeholder="Choose a warehouse">
                {active
                  .filter((w) => w._id !== warehouseId)
                  .map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.code} · {w.name}
                    </option>
                  ))}
              </Select>
            </div>
          ) : type === 'receive' ? (
            <Field label="Reference" hint="Supplier invoice, GRN or PO number.">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          ) : null}
        </div>
        <Field label={noteRequired ? 'Note (required)' : 'Note'}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error ? <p role="alert" className="text-meta text-danger">{error}</p> : null}
      </div>
    </AppDialog>
  );
}

function OpeningBalanceDialog({ warehouses, defaultWarehouseId, onClose, onShowToast }) {
  const qc = useQueryClient();
  const store = warehouses.filter((w) => w.status === 'active');
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId || store.find((w) => w.isDefault)?._id || store[0]?._id || '');
  const [variants, setVariants] = useState([]);
  const [error, setError] = useState(null);
  const run = useMutation({
    mutationFn: () => warehousesApi.openingBalance({ warehouseId, variantIds: variants.map((v) => v.id) }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: WH_KEY });
      const units = r.results.reduce((n, x) => n + x.quantity, 0);
      onShowToast?.({ type: 'success', title: 'Opening balance recorded', message: `${r.results.length} item(s), ${units} unit(s) now tracked at this warehouse.` });
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });
  return (
    <AppDialog
      isOpen
      onClose={onClose}
      title="Opening balance"
      description="Brings items under warehouse tracking: each item's current on-hand count becomes its stock at one warehouse. Items already tracked are refused."
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!warehouseId || !variants.length || run.isPending} onClick={() => run.mutate()}>
            Record opening balance
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-sm pb-space-md">
        <Select aria-label="Warehouse for the opening balance" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          {store.map((w) => (
            <option key={w._id} value={w._id}>
              {w.code} · {w.name}
            </option>
          ))}
        </Select>
        <VariantPicker multiple value={variants} onChange={setVariants} />
        {variants.length ? <p className="text-meta text-secondary">{variants.length} item(s) chosen</p> : null}
        {!store.length ? <EmptyState icon="warehouse" title="No active warehouse" description="Add a warehouse first." /> : null}
        {error ? <p role="alert" className="text-meta text-danger">{error}</p> : null}
      </div>
    </AppDialog>
  );
}
