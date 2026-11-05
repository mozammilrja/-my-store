import React, { useState } from 'react';
import { AppDialog, Badge, Button, DataTable, Input, SectionCard, Select, StatusBadge, TableToolbar } from '../ui';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { fleetApi } from '../../lib/api-fleet';
import { useFleetAction, useFleetRoles } from './fleet-shared';

/*
 * Delivery zones (the PIN codes each hub's riders cover, and whether they
 * take cash) and the fleet settings: rider pay per delivery and per failed
 * attempt, how long an offer waits, attempts before return, load per rider.
 */

const parsePins = (text) => [...new Set(text.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean))];

export function ZonesPanel({ zones, warehouses, onShowToast }) {
  const { canDispatch } = useFleetRoles();
  const [editing, setEditing] = useState(null); // zone, or {} for a new one
  const hub = Object.fromEntries(warehouses.map((w) => [w._id, w.code]));

  const columns = [
    {
      key: 'code',
      header: 'Zone',
      cell: (z) => (
        <div className="flex flex-col">
          <span className="font-mono text-label font-semibold text-accent">{z.code}</span>
          <span className="text-micro text-muted">{z.name}</span>
        </div>
      ),
    },
    { key: 'hub', header: 'Hub', fit: true, cell: (z) => <span className="text-meta text-primary">{hub[z.warehouseId] ?? '?'}</span> },
    {
      key: 'pins',
      header: 'PIN codes',
      cell: (z) => (
        <span className="block max-w-80 truncate text-meta text-primary" title={z.pincodes.join(', ')}>
          {z.pincodes.length} · {z.pincodes.slice(0, 6).join(', ')}
          {z.pincodes.length > 6 ? '…' : ''}
        </span>
      ),
    },
    { key: 'cod', header: 'Cash', fit: true, cell: (z) => <span className="text-meta text-primary">{z.codAllowed ? 'Collects cash' : 'Prepaid only'}</span> },
    { key: 'active', header: 'Status', fit: true, cell: (z) => <StatusBadge status={z.active ? 'Active' : 'Paused'} variant={z.active ? 'success' : 'secondary'} /> },
    ...(canDispatch
      ? [
          {
            key: 'edit',
            header: <span className="sr-only">Edit</span>,
            fit: true,
            cell: (z) => (
              <Button size="sm" variant="ghost" aria-label={`Edit zone ${z.code}`} onClick={() => setEditing(z)}>
                Edit
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {zones.length === 0 ? (
        <EmptyState
          icon="pin_drop"
          title="No delivery zones yet"
          description="A zone is a hub's set of PIN codes its riders deliver to. Parcels outside every zone go by courier."
          className="py-16"
          action={
            canDispatch ? (
              <Button variant="primary" size="sm" onClick={() => setEditing({})}>
                Add a zone
              </Button>
            ) : null
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={zones}
          keyField="_id"
          caption="Delivery zones"
          toolbar={
            <TableToolbar
              left={
                <>
                  <h3 className="text-subheading text-primary">Delivery zones</h3>
                  <Badge variant="secondary" className="tabular-nums">
                    {zones.length}
                  </Badge>
                </>
              }
              right={
                canDispatch ? (
                  <Button variant="primary" size="sm" onClick={() => setEditing({})}>
                    Add a zone
                  </Button>
                ) : null
              }
            />
          }
        />
      )}
      {editing && <ZoneDialog zone={editing} warehouses={warehouses} onClose={() => setEditing(null)} onShowToast={onShowToast} />}
    </>
  );
}

function ZoneDialog({ zone, warehouses, onClose, onShowToast }) {
  const isNew = !zone._id;
  const act = useFleetAction(onShowToast);
  const [form, setForm] = useState({
    code: zone.code ?? '',
    name: zone.name ?? '',
    warehouseId: zone.warehouseId ?? warehouses[0]?._id ?? '',
    pins: (zone.pincodes ?? []).join(', '),
    codAllowed: zone.codAllowed ?? true,
    active: zone.active ?? true,
  });
  const [error, setError] = useState(null);
  const pins = parsePins(form.pins);
  const badPins = pins.filter((p) => !/^\d{6}$/.test(p));
  const set = (patch) => setForm({ ...form, ...patch });

  const save = () => {
    setError(null);
    const body = { name: form.name.trim(), pincodes: pins, codAllowed: form.codAllowed, active: form.active };
    act
      .mutateAsync({
        run: () => (isNew ? fleetApi.createZone({ ...body, code: form.code.trim(), warehouseId: form.warehouseId }) : fleetApi.updateZone(zone._id, body)),
        done: (r) => `Zone ${r.zone.code} saved`,
      })
      .then(onClose, (e) => setError(e.message));
  };

  return (
    <AppDialog
      isOpen
      onClose={onClose}
      title={isNew ? 'New delivery zone' : `Edit zone ${zone.code}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={act.isPending || !form.name.trim() || !pins.length || badPins.length > 0 || (isNew && (!form.code.trim() || !form.warehouseId))} onClick={save}>
            Save zone
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md pb-space-md">
        <div className="grid grid-cols-2 gap-space-sm">
          <label className="flex flex-col gap-1.5 text-label text-secondary">
            Code
            <Input value={form.code} disabled={!isNew} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="BLR-EAST" />
          </label>
          <label className="flex flex-col gap-1.5 text-label text-secondary">
            Name
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Bengaluru East" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-label text-secondary">
          Hub
          <Select value={form.warehouseId} disabled={!isNew} onChange={(e) => set({ warehouseId: e.target.value })}>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.code} · {w.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-label text-secondary">
          PIN codes (comma or space separated)
          <textarea
            className="min-h-24 rounded-lg border border-subtle bg-surface-container-lowest px-3 py-2 font-mono text-body text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.pins}
            onChange={(e) => set({ pins: e.target.value })}
            placeholder="560001, 560008, 560038"
          />
          <span className={badPins.length ? 'text-micro text-danger' : 'text-micro text-muted'}>{badPins.length ? `Not six-digit PIN codes: ${badPins.join(', ')}` : `${pins.length} PIN code${pins.length === 1 ? '' : 's'}`}</span>
        </label>
        <label className="flex items-center gap-space-sm text-label text-primary">
          <input type="checkbox" checked={form.codAllowed} onChange={(e) => set({ codAllowed: e.target.checked })} />
          Riders here collect cash on delivery
        </label>
        <label className="flex items-center gap-space-sm text-label text-primary">
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
          Active (new parcels go to riders here)
        </label>
        {error && (
          <p role="alert" className="text-meta text-danger">
            {error}
          </p>
        )}
      </div>
    </AppDialog>
  );
}

const SETTING_FIELDS = [
  { key: 'payoutPerDelivery', label: 'Rider pay per delivery (₹)', money: true },
  { key: 'payoutPerFailedAttempt', label: 'Rider pay per failed attempt (₹)', money: true },
  { key: 'offerTimeoutMinutes', label: 'Minutes a rider has to accept an offer' },
  { key: 'maxAttempts', label: 'Delivery attempts before return to hub' },
  { key: 'maxActiveTasks', label: 'Most parcels a rider carries at once' },
];

export function FleetSettingsPanel({ settingsQuery, onShowToast }) {
  const { canSettings } = useFleetRoles();
  const act = useFleetAction(onShowToast);
  const settings = settingsQuery.data?.settings;
  const [draft, setDraft] = useState({});
  if (!settings) return null;
  const shown = (f) => (draft[f.key] ?? (f.money ? String(settings[f.key] / 100) : String(settings[f.key])));
  const changes = Object.fromEntries(
    SETTING_FIELDS.filter((f) => draft[f.key] != null && draft[f.key] !== '').map((f) => [f.key, f.money ? Math.round(Number(draft[f.key]) * 100) : Number(draft[f.key])])
  );
  const invalid = Object.values(changes).some((v) => !Number.isFinite(v) || v < 0);

  return (
    <SectionCard title="Fleet settings" description={canSettings ? 'Changes apply to new deliveries and offers.' : 'Only the owner can change these.'}>
      <form
        className="flex max-w-xl flex-col gap-space-md"
        onSubmit={(e) => {
          e.preventDefault();
          act.mutateAsync({ run: () => fleetApi.updateSettings(changes), done: 'Fleet settings saved' }).then(() => setDraft({}), () => {});
        }}
      >
        {SETTING_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5 text-label text-secondary">
            {f.label}
            <Input type="number" min="0" step={f.money ? '0.01' : '1'} disabled={!canSettings} value={shown(f)} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
          </label>
        ))}
        {canSettings && (
          <Button type="submit" variant="primary" className="self-start" disabled={act.isPending || !Object.keys(changes).length || invalid}>
            Save settings
          </Button>
        )}
      </form>
    </SectionCard>
  );
}
