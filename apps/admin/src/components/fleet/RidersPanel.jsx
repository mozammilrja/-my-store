import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, DataTable, FilterBar, SearchInput, SectionCard, Select, Separator, StatusBadge, TableToolbar } from '../ui';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { useClientTable } from '../../hooks/useClientTable';
import { fleetApi } from '../../lib/api-fleet';
import { DOC_LABEL, Fact, RIDER_STATUS, ReasonDialog, money, useFleetAction, useFleetRoles, when } from './fleet-shared';

/*
 * Riders: sign-ups waiting for checks, document verification, the hub and
 * zones each rider covers, and approving, suspending or rejecting with a
 * reason. The API refuses approval until the licence and Aadhaar are
 * verified (not needed for bicycles) and a hub and zone are set; the panel
 * says which is missing before anyone presses the button.
 */

const TABS = [
  { id: 'pending', label: 'Awaiting checks' },
  { id: 'approved', label: 'Approved' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];
const VEHICLE = { bicycle: 'Bicycle', bike: 'Motorbike', scooter: 'Scooter', van: 'Van' };

export function RidersPanel({ ridersQuery, zones, warehouses, onShowToast }) {
  const all = ridersQuery.data?.riders ?? [];
  const [tab, setTab] = useState(all.some((r) => r.status === 'pending') ? 'pending' : 'approved');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => (tab === 'all' || r.status === tab) && (!q || r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.email.toLowerCase().includes(q)));
  }, [all, tab, search]);
  const pager = useClientTable(rows);
  const selected = rows.find((r) => r._id === selectedId) ?? rows[0] ?? null;
  const hub = Object.fromEntries(warehouses.map((w) => [w._id, w.code]));

  const columns = [
    {
      key: 'name',
      header: 'Rider',
      cell: (r) => (
        <div className="flex flex-col">
          <span className="text-label font-semibold text-primary">{r.name}</span>
          <span className="text-micro text-muted">
            {r.phone} · {VEHICLE[r.vehicle.type] ?? r.vehicle.type}
          </span>
        </div>
      ),
    },
    { key: 'hub', header: 'Hub and zones', cell: (r) => <span className="text-meta text-primary">{r.warehouseId ? `${hub[r.warehouseId] ?? '?'} · ${r.zoneIds.length} zone${r.zoneIds.length === 1 ? '' : 's'}` : 'Not set'}</span> },
    { key: 'docs', header: 'Documents', fit: true, cell: (r) => <span className="text-meta tabular-nums text-primary">{r.documents.filter((d) => d.verified).length}/{r.documents.length} verified</span> },
    { key: 'online', header: 'Now', fit: true, cell: (r) => (r.status === 'approved' ? <span className="text-meta text-primary">{r.online ? `Online · ${r.activeTasks} active` : 'Offline'}</span> : <span className="text-meta text-muted">—</span>) },
    { key: 'status', header: 'Status', fit: true, cell: (r) => <StatusBadge status={RIDER_STATUS[r.status]?.label ?? r.status} variant={RIDER_STATUS[r.status]?.variant} /> },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      <FilterBar
        tabsLabel="Rider status"
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.id === 'all' ? all.length : all.filter((r) => r.status === t.id).length }))}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id);
          setSelectedId(null);
        }}
        search={<SearchInput label="Search riders" placeholder="Name, phone or email" value={search} onChange={setSearch} onClear={() => setSearch('')} className="w-full sm:w-72" />}
      />
      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        {rows.length === 0 ? (
          <EmptyState icon="two_wheeler" title={all.length ? 'No riders here' : 'No riders yet'} description={all.length ? 'Pick another status or clear the search.' : 'Riders sign up in the rider app; they appear here for checks.'} className="py-16 lg:col-span-12" />
        ) : (
          <>
            <div className="min-w-0 lg:col-span-7">
              <DataTable
                columns={columns}
                data={pager.pageRows}
                keyField="_id"
                activeRowId={selected?._id}
                onRowClick={(r) => setSelectedId(r._id)}
                caption="Riders"
                toolbar={
                  <TableToolbar
                    left={
                      <>
                        <h3 className="text-subheading text-primary">Riders</h3>
                        <Badge variant="secondary" className="tabular-nums">
                          {rows.length}
                        </Badge>
                      </>
                    }
                  />
                }
                pagination={{ page: pager.page, pageSize: pager.limit, totalItems: pager.total, onPageChange: pager.setPage, onPageSizeChange: pager.setLimit }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-space-md lg:col-span-5">
              {selected ? <RiderDetail key={selected._id} id={selected._id} zones={zones} warehouses={warehouses} onShowToast={onShowToast} /> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RiderDetail({ id, zones, warehouses, onShowToast }) {
  const detail = useQuery({ queryKey: ['fleet', 'rider', id], queryFn: () => fleetApi.rider(id) });
  const act = useFleetAction(onShowToast);
  const { canDispatch } = useFleetRoles();
  const [ask, setAsk] = useState(null);
  const [draft, setDraft] = useState(null); // { warehouseId, zoneIds }

  if (detail.isLoading) return <Card className="p-space-md text-body text-muted">Loading…</Card>;
  if (detail.isError) return <Card className="p-space-md text-body text-danger">{detail.error?.message}</Card>;
  const { rider: r, last30Days, cashInHand } = detail.data;
  const busy = act.isPending;
  const assignment = draft ?? { warehouseId: r.warehouseId ?? '', zoneIds: r.zoneIds };
  const hubZones = zones.filter((z) => z.warehouseId === assignment.warehouseId);
  const docOk = (type) => r.documents.some((d) => d.type === type && d.verified);
  const blockers = [
    ...(r.vehicle.type !== 'bicycle' ? ['driving_licence', 'aadhaar'].filter((t) => !docOk(t)).map((t) => `${DOC_LABEL[t]} not verified`) : []),
    ...(!r.warehouseId || !r.zoneIds.length ? ['No hub and zone yet'] : []),
  ];
  const dirty = draft && (draft.warehouseId !== (r.warehouseId ?? '') || draft.zoneIds.join() !== r.zoneIds.join());

  const setStatus = (status) => (reason) =>
    act.mutateAsync({ run: () => fleetApi.setRiderStatus(r._id, status, reason), done: `${r.name} ${RIDER_STATUS[status].label.toLowerCase()}` }).then(() => setAsk(null), () => {});

  return (
    <>
      <Card className="flex flex-col gap-space-md p-space-md" aria-label={`Rider ${r.name}`}>
        <div className="flex flex-wrap items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-1">
            <StatusBadge status={RIDER_STATUS[r.status]?.label ?? r.status} variant={RIDER_STATUS[r.status]?.variant} className="self-start" />
            <h2 className="text-subheading text-primary">{r.name}</h2>
            <span className="text-body text-secondary">
              {r.phone} · {r.email}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-kpi-sm tabular-nums text-primary">{money(cashInHand)}</span>
            <span className="block text-meta text-muted">Cash in hand</span>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-space-sm">
          <Fact label="Delivered (30 days)">{last30Days.delivered}</Fact>
          <Fact label="Failed attempts">{last30Days.failed}</Fact>
          <Fact label="Returned to hub">{last30Days.rto}</Fact>
          <Fact label="Vehicle">
            {VEHICLE[r.vehicle.type] ?? r.vehicle.type}
            {r.vehicle.registration ? ` · ${r.vehicle.registration}` : ''}
          </Fact>
          <Fact label="Signed up">{when(r.createdAt)}</Fact>
          {r.statusReason && <Fact label="Last decision">{r.statusReason}</Fact>}
        </dl>
      </Card>

      <SectionCard title="Documents" description="Check each against the original before verifying.">
        {r.documents.length === 0 ? (
          <p className="text-meta text-muted">The rider hasn't added any documents yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-subtle">
            {r.documents.map((d) => (
              <li key={d.type} className="flex flex-wrap items-center justify-between gap-space-sm py-space-xs">
                <span className="flex flex-col">
                  <span className="text-label text-primary">{DOC_LABEL[d.type] ?? d.type}</span>
                  <span className="font-mono text-micro text-muted">{d.number}</span>
                </span>
                {d.verified ? (
                  <Badge variant="success">Verified {when(d.verifiedAt)}</Badge>
                ) : canDispatch ? (
                  <Button size="sm" variant="outline" disabled={busy} aria-label={`Verify ${DOC_LABEL[d.type] ?? d.type}`} onClick={() => act.mutate({ run: () => fleetApi.verifyDocument(r._id, d.type), done: `${DOC_LABEL[d.type]} verified` })}>
                    Verify
                  </Button>
                ) : (
                  <Badge variant="warning">Not verified</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Hub and zones" description="A rider is offered parcels only in the zones they cover.">
        <div className="flex flex-col gap-space-sm">
          <Select aria-label="Hub" value={assignment.warehouseId} disabled={!canDispatch} onChange={(e) => setDraft({ warehouseId: e.target.value, zoneIds: [] })}>
            <option value="">Choose a hub</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.code} · {w.name}
              </option>
            ))}
          </Select>
          {assignment.warehouseId && (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-micro text-muted">Zones</legend>
              {hubZones.length === 0 ? (
                <p className="text-meta text-muted">This hub has no delivery zones yet. Add one under Zones.</p>
              ) : (
                hubZones.map((z) => (
                  <label key={z._id} className="flex items-center gap-space-sm text-label text-primary">
                    <input
                      type="checkbox"
                      disabled={!canDispatch}
                      checked={assignment.zoneIds.includes(z._id)}
                      onChange={(e) => setDraft({ ...assignment, zoneIds: e.target.checked ? [...assignment.zoneIds, z._id] : assignment.zoneIds.filter((x) => x !== z._id) })}
                    />
                    {z.code} · {z.name} ({z.pincodes.length} PINs)
                  </label>
                ))
              )}
            </fieldset>
          )}
          {canDispatch && dirty && (
            <Button
              variant="primary"
              size="sm"
              className="self-start"
              disabled={busy || !assignment.warehouseId}
              onClick={() => act.mutateAsync({ run: () => fleetApi.assignRider(r._id, assignment.warehouseId, assignment.zoneIds), done: `${r.name}'s hub and zones saved` }).then(() => setDraft(null), () => {})}
            >
              Save hub and zones
            </Button>
          )}
        </div>
      </SectionCard>

      {canDispatch ? (
        <Card className="flex flex-col gap-space-sm p-space-md">
          {r.status !== 'approved' && r.status !== 'rejected' && blockers.length > 0 && (
            <ul className="flex flex-col gap-1" aria-label="Before approval">
              {blockers.map((b) => (
                <li key={b} className="text-meta text-warning">
                  {b}
                </li>
              ))}
            </ul>
          )}
          {r.status !== 'approved' && (
            <Button variant="primary" disabled={busy || blockers.length > 0} onClick={() => setAsk({ run: setStatus('approved'), title: `Approve ${r.name}`, label: 'Note for the record', confirm: 'Approve' })}>
              Approve rider
            </Button>
          )}
          {r.status === 'approved' && (
            <Button variant="outline" className="text-danger" disabled={busy} onClick={() => setAsk({ run: setStatus('suspended'), title: `Suspend ${r.name}`, description: 'They go offline at once and get no new parcels.', label: 'Reason', confirm: 'Suspend', danger: true })}>
              Suspend
            </Button>
          )}
          {r.status === 'pending' && (
            <Button variant="ghost" size="sm" className="text-danger" disabled={busy} onClick={() => setAsk({ run: setStatus('rejected'), title: `Reject ${r.name}`, label: 'Reason', confirm: 'Reject', danger: true })}>
              Reject sign-up
            </Button>
          )}
        </Card>
      ) : (
        <p className="text-meta text-muted">Your role can view riders; approvals are for store admins and order managers.</p>
      )}

      <ReasonDialog ask={ask} busy={busy} onClose={() => setAsk(null)} onConfirm={(reason) => ask.run(reason)} />
    </>
  );
}
