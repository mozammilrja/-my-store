import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '../../lib/api-warehouses';
import { AppDialog, Badge, Button, DataTable, EmptyState, Icon, Input, Select, StatusBadge, TableToolbar } from '../ui';
import { errorText, Field, useWarehouses, WH_KEY } from './shared';

/*
 * The buildings orders ship from. Each has the names the courier
 * integrations know it by (a Shiprocket pickup nickname, a registered
 * Delhivery warehouse name); without them parcels are booked from the
 * account's default pickup address. A marketplace seller's own dispatch
 * location is created when the seller is approved and is shown read-only.
 */

const EMPTY = {
  code: '',
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  leadDispatcher: '',
  serviceAreas: '',
  priority: '',
  acceptsOrders: true,
  status: 'active',
  isDefault: false,
  shiprocketPickupLocation: '',
  delhiveryPickupLocation: '',
};

const formOf = (w) => ({
  ...EMPTY,
  ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, w[k] ?? EMPTY[k]])),
  serviceAreas: (w.serviceAreas ?? []).join(', '),
  priority: w.priority ?? '',
  acceptsOrders: w.acceptsOrders !== false,
});

/** The API's body: blanks left out (or null for GSTIN), PIN prefixes split into a list. */
const bodyOf = (f, creating) => {
  const trim = (v) => String(v ?? '').trim();
  const body = {
    name: trim(f.name),
    address: trim(f.address),
    city: trim(f.city),
    state: trim(f.state),
    pincode: trim(f.pincode),
    gstin: trim(f.gstin) || null,
    serviceAreas: trim(f.serviceAreas) ? trim(f.serviceAreas).split(/[\s,]+/).filter(Boolean) : [],
    acceptsOrders: !!f.acceptsOrders,
    status: f.status,
    isDefault: !!f.isDefault,
  };
  if (creating) body.code = trim(f.code);
  if (trim(f.leadDispatcher)) body.leadDispatcher = trim(f.leadDispatcher);
  if (trim(f.priority) !== '') body.priority = Number(f.priority);
  if (trim(f.shiprocketPickupLocation)) body.shiprocketPickupLocation = trim(f.shiprocketPickupLocation);
  if (trim(f.delhiveryPickupLocation)) body.delhiveryPickupLocation = trim(f.delhiveryPickupLocation);
  return body;
};

/** The API's rules (routes/admin/warehouses.ts), checked first so the message names the field. */
const problemOf = (f, creating) => {
  const t = (v) => String(v ?? '').trim();
  if (creating && (t(f.code).length < 3 || t(f.code).length > 20)) return 'Code: use 3 to 20 characters.';
  if (t(f.name).length < 2) return 'Name: at least 2 characters.';
  if (t(f.address).length < 5) return 'Address: at least 5 characters.';
  if (t(f.city).length < 2 || t(f.state).length < 2) return 'Enter the city and state.';
  if (!/^\d{4,10}$/.test(t(f.pincode))) return 'PIN code: digits only.';
  if (t(f.gstin) && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(t(f.gstin).toUpperCase())) return 'GSTIN: enter a valid 15-character GSTIN, or leave it empty.';
  const areas = t(f.serviceAreas) ? t(f.serviceAreas).split(/[\s,]+/).filter(Boolean) : [];
  if (areas.some((a) => !/^\d{1,6}$/.test(a))) return 'Ships to: use PIN codes or their first digits, separated by commas.';
  if (t(f.priority) !== '' && !(Number.isInteger(Number(f.priority)) && Number(f.priority) >= 0 && Number(f.priority) <= 1000)) return 'Priority: a whole number from 0 to 1000.';
  return null;
};

export function WarehousesTab({ onShowToast }) {
  const list = useWarehouses();
  const [editing, setEditing] = useState(null); // null | 'new' | warehouse
  const warehouses = list.data?.warehouses ?? [];

  const columns = [
    {
      key: 'code',
      header: 'Warehouse',
      grow: true,
      cell: (w) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-label font-semibold text-primary">{w.code}</span>
          <span className="truncate text-meta text-secondary">{w.name}</span>
        </div>
      ),
    },
    {
      key: 'place',
      header: 'Location',
      cell: (w) => (
        <span className="flex flex-col text-meta text-secondary">
          <span className="whitespace-nowrap">{w.city}, {w.state}</span>
          <span className="whitespace-nowrap tabular-nums">{w.pincode}</span>
        </span>
      ),
    },
    {
      key: 'serves',
      header: 'Ships to',
      cell: (w) => <span className="text-meta text-secondary">{w.serviceAreas?.length ? `PIN ${w.serviceAreas.join(', ')}` : 'Anywhere'}</span>,
    },
    {
      key: 'couriers',
      header: 'Courier pickup names',
      cell: (w) => (
        <div className="flex flex-col text-micro text-muted">
          <span>Shiprocket: {w.shiprocketPickupLocation || 'account default'}</span>
          <span>Delhivery: {w.delhiveryPickupLocation || 'account default'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      fit: true,
      cell: (w) => (
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={w.status === 'active' ? 'Active' : 'Inactive'} variant={w.status === 'active' ? 'success' : 'secondary'} />
          {w.isDefault ? <Badge variant="info">Default</Badge> : null}
          {w.sellerId ? <Badge variant="secondary">Seller</Badge> : null}
          {w.acceptsOrders === false ? <Badge variant="warning">No new orders</Badge> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      {list.isSuccess && !warehouses.length ? (
        <EmptyState
          icon="warehouse"
          title="No warehouses yet"
          description="Add the building orders ship from. Its PIN code decides which orders it is nearest to."
          action={
            <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
              Add warehouse
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={warehouses}
          keyField="_id"
          isLoading={list.isLoading}
          isError={list.isError}
          errorTitle="Warehouses could not be loaded"
          errorMessage={list.error?.message}
          onRetry={list.refetch}
          onRowClick={(w) => setEditing(w)}
          caption="Warehouses"
          toolbar={
            <TableToolbar
              left={
                <>
                  <h2 className="text-subheading text-primary">Warehouses</h2>
                  <Badge variant="secondary" className="tabular-nums">
                    {warehouses.length}
                  </Badge>
                </>
              }
              right={
                <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
                  <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>Add warehouse</span>
                </Button>
              }
            />
          }
        />
      )}
      {editing ? (
        <WarehouseDialog key={editing === 'new' ? 'new' : editing._id} warehouse={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onShowToast={onShowToast} />
      ) : null}
    </div>
  );
}

function WarehouseDialog({ warehouse, onClose, onShowToast }) {
  const qc = useQueryClient();
  const creating = !warehouse;
  const readOnly = !!warehouse?.sellerId;
  const [form, setForm] = useState(() => (warehouse ? formOf(warehouse) : EMPTY));
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });

  const submit = () => {
    const problem = problemOf(form, creating);
    if (problem) return setError(problem);
    setError(null);
    save.mutate();
  };
  const save = useMutation({
    mutationFn: () => (creating ? warehousesApi.createWarehouse(bodyOf(form, true)) : warehousesApi.updateWarehouse(warehouse._id, bodyOf(form, false))),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: WH_KEY });
      onShowToast?.({ type: 'success', title: creating ? `${r.warehouse.code} added` : `${r.warehouse.code} saved` });
      onClose();
    },
    onError: (e) => setError(errorText(e)),
  });

  const title = creating ? 'Add a warehouse' : readOnly ? `${warehouse.code} (seller location)` : `Edit ${warehouse.code}`;
  return (
    <AppDialog
      isOpen
      onClose={onClose}
      title={title}
      description={
        readOnly
          ? "A marketplace seller's own dispatch location, created when the seller was approved. Change it from the seller's record."
          : 'Orders go to the nearest active warehouse that ships to the PIN code and has the stock.'
      }
      maxWidth="max-w-2xl"
      footer={
        readOnly ? (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              {creating ? 'Add warehouse' : 'Save'}
            </Button>
          </>
        )
      }
    >
      <form
        className="grid grid-cols-1 gap-space-sm pb-space-md sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!readOnly) submit();
        }}
      >
        <fieldset disabled={readOnly} className="contents">
          <Field label="Code" hint={creating ? 'Short and unique, e.g. BLR-FC1. Printed on pick lists.' : 'Fixed once created.'}>
            <Input value={form.code} onChange={set('code')} disabled={!creating} required className="font-mono uppercase" />
          </Field>
          <Field label="Name">
            <Input value={form.name} onChange={set('name')} required />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={set('address')} required />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={set('city')} required />
          </Field>
          <Field label="State">
            <Input value={form.state} onChange={set('state')} required />
          </Field>
          <Field label="PIN code">
            <Input value={form.pincode} onChange={set('pincode')} inputMode="numeric" required />
          </Field>
          <Field label="GSTIN" hint="This building's GST registration, printed on invoices dispatched from it.">
            <Input value={form.gstin} onChange={set('gstin')} className="font-mono uppercase" />
          </Field>
          <Field label="Ships to PIN codes" hint="PIN codes or their first digits, comma-separated. Empty: anywhere." className="sm:col-span-2">
            <Input value={form.serviceAreas} onChange={set('serviceAreas')} placeholder="560, 562, 635109" />
          </Field>
          <Field label="Priority" hint="Lower goes first between equally near warehouses (default 100).">
            <Input type="number" min={0} max={1000} value={form.priority} onChange={set('priority')} />
          </Field>
          <Field label="Lead dispatcher">
            <Input value={form.leadDispatcher} onChange={set('leadDispatcher')} />
          </Field>
          <Field label="Shiprocket pickup nickname" hint="Exactly as in Shiprocket > Settings > Pickup Addresses.">
            <Input value={form.shiprocketPickupLocation} onChange={set('shiprocketPickupLocation')} />
          </Field>
          <Field label="Delhivery warehouse name" hint="Exactly as registered on Delhivery One.">
            <Input value={form.delhiveryPickupLocation} onChange={set('delhiveryPickupLocation')} />
          </Field>
          <div className="flex flex-col gap-1.5 text-label text-secondary">
            <span id="wh-status-label">Status</span>
            <Select aria-label="Status" value={form.status} onChange={set('status')} disabled={readOnly}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-space-xs">
            <label className="flex items-center gap-space-sm text-label text-primary">
              <input type="checkbox" checked={form.acceptsOrders} onChange={set('acceptsOrders')} />
              Takes new orders
            </label>
            <label className="flex items-center gap-space-sm text-label text-primary">
              <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} />
              Default warehouse (returns and invoices fall back to it)
            </label>
          </div>
        </fieldset>
        {error ? (
          <p role="alert" className="text-meta text-danger sm:col-span-2">
            {error}
          </p>
        ) : null}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </AppDialog>
  );
}
