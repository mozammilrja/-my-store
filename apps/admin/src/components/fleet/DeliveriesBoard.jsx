import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, DataTable, FilterBar, Icon, SearchInput, SectionCard, Select, Separator, StatusBadge, TableToolbar } from '../ui';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { useClientTable } from '../../hooks/useClientTable';
import { fleetApi } from '../../lib/api-fleet';
import { FAIL_REASON, Fact, ReasonDialog, TASK_STATUS, money, useFleetAction, useFleetRoles, when } from './fleet-shared';

/*
 * The delivery board: every own-fleet parcel by status, with manual
 * assignment, automatic offer, unassigning and return to hub. A task's
 * panel shows its stop, cash, attempts, rider earnings, history and the
 * proof-of-delivery photo.
 */

const BOARD = [
  { id: 'waiting', label: 'Waiting', statuses: ['unassigned', 'offered'] },
  { id: 'assigned', label: 'Assigned', statuses: ['assigned'] },
  { id: 'moving', label: 'On the road', statuses: ['picked_up', 'out_for_delivery'] },
  { id: 'failed', label: 'Attempt failed', statuses: ['attempt_failed'] },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { id: 'rto', label: 'Return to hub', statuses: ['rto', 'returned'] },
  { id: 'all', label: 'All', statuses: null },
];

export function DeliveriesBoard({ tasksQuery, riders, zones, onShowToast }) {
  const [tab, setTab] = useState('waiting');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const all = tasksQuery.data?.tasks ?? [];
  const byStatus = tasksQuery.data?.byStatus ?? {};
  const zoneName = useMemo(() => Object.fromEntries(zones.map((z) => [z._id, z.code])), [zones]);
  const riderName = useMemo(() => Object.fromEntries(riders.map((r) => [r._id, r.name])), [riders]);

  const rows = useMemo(() => {
    const t = BOARD.find((b) => b.id === tab);
    const q = search.trim().toLowerCase();
    return all.filter((x) => (!t?.statuses || t.statuses.includes(x.status)) && (!q || x.code.toLowerCase().includes(q) || String(x.displayId).includes(q) || x.stop.postalCode.includes(q) || (riderName[x.riderId] ?? '').toLowerCase().includes(q)));
  }, [all, tab, search, riderName]);
  const pager = useClientTable(rows);
  const selected = rows.find((x) => x._id === selectedId) ?? rows[0] ?? null;
  const count = (statuses) => (statuses ? statuses.reduce((n, s) => n + (byStatus[s] ?? 0), 0) : Object.values(byStatus).reduce((a, b) => a + b, 0));

  const columns = [
    {
      key: 'code',
      header: 'Parcel',
      cell: (t) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-mono text-label font-semibold text-accent">{t.code}</span>
          <span className="text-micro text-muted">Order #{t.displayId}</span>
        </div>
      ),
    },
    {
      key: 'stop',
      header: 'Deliver to',
      cell: (t) => (
        <div className="flex flex-col">
          <span className="text-label text-primary">
            {t.stop.city} {t.stop.postalCode}
          </span>
          <span className="text-micro text-muted">Zone {zoneName[t.zoneId] ?? '?'}</span>
        </div>
      ),
    },
    { key: 'rider', header: 'Rider', cell: (t) => <span className="text-label text-primary">{t.riderId ? riderName[t.riderId] ?? 'Unknown rider' : t.offer ? `Offered to ${riderName[t.offer.riderId] ?? 'a rider'}` : '—'}</span> },
    { key: 'cod', header: 'Cash', align: 'right', fit: true, cell: (t) => <span className="text-meta tabular-nums text-primary">{t.cod ? money(t.cod.due) : 'Prepaid'}</span> },
    { key: 'status', header: 'Status', fit: true, cell: (t) => <StatusBadge status={TASK_STATUS[t.status]?.label ?? t.status} variant={TASK_STATUS[t.status]?.variant} /> },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      <FilterBar
        tabsLabel="Delivery status"
        tabs={BOARD.map((b) => ({ id: b.id, label: b.label, count: count(b.statuses) }))}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id);
          setSelectedId(null);
        }}
        search={<SearchInput label="Search deliveries" placeholder="Parcel, order, PIN or rider" value={search} onChange={setSearch} onClear={() => setSearch('')} className="w-full sm:w-72" />}
      />
      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        {rows.length === 0 ? (
          <EmptyState
            icon="two_wheeler"
            title={all.length ? 'Nothing here' : 'No deliveries yet'}
            description={all.length ? 'Pick another status or clear the search.' : 'Parcels the warehouse books on Everwear Fleet appear here.'}
            className="py-16 lg:col-span-12"
          />
        ) : (
          <>
            <div className="min-w-0 lg:col-span-7 xl:col-span-8">
              <DataTable
                columns={columns}
                data={pager.pageRows}
                keyField="_id"
                activeRowId={selected?._id}
                onRowClick={(t) => setSelectedId(t._id)}
                caption="Deliveries"
                toolbar={
                  <TableToolbar
                    left={
                      <>
                        <h3 className="text-subheading text-primary">Deliveries</h3>
                        <Badge variant="secondary" className="tabular-nums">
                          {rows.length}
                        </Badge>
                      </>
                    }
                    right={
                      <Button variant="ghost" size="iconSm" onClick={() => tasksQuery.refetch()} aria-label="Refresh deliveries" title="Refresh">
                        <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                      </Button>
                    }
                  />
                }
                pagination={{ page: pager.page, pageSize: pager.limit, totalItems: pager.total, onPageChange: pager.setPage, onPageSizeChange: pager.setLimit }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-space-md lg:col-span-5 xl:col-span-4">
              {selected ? <TaskPanel key={selected._id} id={selected._id} riders={riders} zoneName={zoneName} riderName={riderName} onShowToast={onShowToast} /> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TaskPanel({ id, riders, zoneName, riderName, onShowToast }) {
  const detail = useQuery({ queryKey: ['fleet', 'task', id], queryFn: () => fleetApi.task(id) });
  const act = useFleetAction(onShowToast);
  const { canDispatch } = useFleetRoles();
  const [riderId, setRiderId] = useState('');
  const [ask, setAsk] = useState(null);
  const [photo, setPhoto] = useState({ url: null, error: null, loading: false });

  useEffect(() => () => photo.url && URL.revokeObjectURL(photo.url), [photo.url]);

  if (detail.isLoading) return <Card className="p-space-md text-body text-muted">Loading…</Card>;
  if (detail.isError) return <Card className="p-space-md text-body text-danger">{detail.error?.message}</Card>;
  const { task: t, history } = detail.data;
  const eligible = riders.filter((r) => r.status === 'approved' && r.zoneIds.includes(t.zoneId) && r._id !== t.riderId);
  const canAssign = ['unassigned', 'offered', 'assigned'].includes(t.status);
  const busy = act.isPending;

  const showPhoto = async () => {
    setPhoto({ url: null, error: null, loading: true });
    try {
      setPhoto({ url: await fleetApi.podPhoto(t._id), error: null, loading: false });
    } catch (e) {
      setPhoto({ url: null, error: e.message, loading: false });
    }
  };

  const confirm = (reason) =>
    act.mutateAsync(
      ask.kind === 'assign'
        ? { run: () => fleetApi.assignTask(t._id, riderId, reason), done: `${t.code} assigned to ${riderName[riderId]}` }
        : ask.kind === 'unassign'
          ? { run: () => fleetApi.unassignTask(t._id, reason), done: `${t.code} is back in the pool` }
          : { run: () => fleetApi.rtoTask(t._id, reason), done: `${t.code} is returning to the hub` }
    ).then(() => setAsk(null), () => {});

  return (
    <>
      <Card className="flex flex-col gap-space-md p-space-md" aria-label={`Delivery ${t.code}`}>
        <div className="flex flex-wrap items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-1">
            <StatusBadge status={TASK_STATUS[t.status]?.label ?? t.status} variant={TASK_STATUS[t.status]?.variant} className="self-start" />
            <h2 className="font-mono text-subheading text-primary">{t.code}</h2>
            <span className="text-body text-secondary">
              Order #{t.displayId} · zone {zoneName[t.zoneId] ?? '?'}
            </span>
          </div>
          {t.cod && (
            <div className="shrink-0 text-right">
              <span className="block text-kpi-sm tabular-nums text-primary">{money(t.cod.due)}</span>
              <span className="block text-meta text-muted">{t.cod.collected != null ? `Collected ${money(t.cod.collected)}` : 'Cash to collect'}</span>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-space-sm">
          <Fact label="Rider">{t.riderId ? riderName[t.riderId] ?? t.riderId : 'None'}</Fact>
          <Fact label="Deliver to">
            {t.stop.name}, {t.stop.city} {t.stop.postalCode}
          </Fact>
          {t.offer && <Fact label="Offer">To {riderName[t.offer.riderId] ?? 'a rider'} until {when(t.offer.expiresAt)}</Fact>}
          {t.cod?.remittanceId && <Fact label="Cash">Handed in</Fact>}
        </dl>

        {t.attempts.length > 0 && (
          <div className="flex flex-col gap-space-xs">
            <h3 className="text-label font-semibold text-primary">Failed attempts ({t.attempts.length})</h3>
            <ul className="flex flex-col gap-1">
              {t.attempts.map((a, i) => (
                <li key={i} className="text-meta text-secondary">
                  {when(a.at)} · {FAIL_REASON[a.reason] ?? a.reason}
                  {a.note ? ` · ${a.note}` : ''} · {riderName[a.riderId] ?? 'rider'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {t.earnings.length > 0 && (
          <div className="flex flex-col gap-space-xs">
            <h3 className="text-label font-semibold text-primary">Rider earnings</h3>
            <ul className="flex flex-col gap-1">
              {t.earnings.map((e, i) => (
                <li key={i} className="flex justify-between text-meta text-secondary">
                  <span>
                    {e.kind === 'delivery' ? 'Delivery' : 'Failed attempt'} · {riderName[e.riderId] ?? 'rider'}
                  </span>
                  <span className="tabular-nums">{money(e.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {t.pod && (
          <div className="flex flex-col gap-space-xs">
            <h3 className="text-label font-semibold text-primary">Proof of delivery</h3>
            <p className="text-meta text-secondary">
              Received by {t.pod.receiverName} · {when(t.pod.at)} · OTP verified
            </p>
            {t.pod.photo ? (
              photo.url ? (
                <img src={photo.url} alt={`Proof of delivery for ${t.code}`} className="max-h-64 w-full rounded-lg border border-subtle object-contain" />
              ) : (
                <Button variant="outline" size="sm" className="self-start" disabled={photo.loading} onClick={showPhoto}>
                  {photo.loading ? 'Loading photo…' : 'Show photo'}
                </Button>
              )
            ) : (
              <p className="text-meta text-muted">No photo was taken.</p>
            )}
            {photo.error && <p role="alert" className="text-meta text-danger">{photo.error}</p>}
          </div>
        )}

        {canDispatch ? (
          (canAssign || ['attempt_failed', 'picked_up'].includes(t.status)) && (
            <>
              <Separator />
              <div className="flex flex-col gap-space-sm">
                {canAssign && (
                  <>
                    <div className="flex items-end gap-space-sm">
                      <Select aria-label="Rider to assign" value={riderId} onChange={(e) => setRiderId(e.target.value)} wrapperClassName="flex-1">
                        <option value="">{eligible.length ? 'Choose a rider in this zone' : 'No approved rider covers this zone'}</option>
                        {eligible.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name} · {r.online ? 'online' : 'offline'} · {r.activeTasks} active
                          </option>
                        ))}
                      </Select>
                      <Button variant="primary" disabled={!riderId || busy} onClick={() => setAsk({ kind: 'assign', title: `Assign ${t.code} to ${riderName[riderId]}`, label: 'Why assign by hand', confirm: 'Assign' })}>
                        Assign
                      </Button>
                    </div>
                    {t.status === 'unassigned' && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          act.mutate({ run: () => fleetApi.offerTask(t._id), done: (r) => (r.offeredTo ? `Offered to ${r.offeredTo.name}` : 'No rider is online, on shift and free in this zone right now') })
                        }
                      >
                        Offer to the best rider now
                      </Button>
                    )}
                  </>
                )}
                {['offered', 'assigned'].includes(t.status) && (
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAsk({ kind: 'unassign', title: `Take ${t.code} back`, label: 'Why', confirm: 'Unassign' })}>
                    Unassign
                  </Button>
                )}
                {['attempt_failed', 'picked_up'].includes(t.status) && (
                  <Button variant="ghost" size="sm" className="text-danger" disabled={busy} onClick={() => setAsk({ kind: 'rto', title: `Return ${t.code} to the hub`, label: 'Why (recorded on the order)', confirm: 'Start return', danger: true })}>
                    Return to hub (RTO)
                  </Button>
                )}
              </div>
            </>
          )
        ) : (
          <p className="text-meta text-muted">Your role can view deliveries; dispatch is for store admins and order managers.</p>
        )}
      </Card>

      <SectionCard title="History">
        <ol className="flex flex-col gap-space-sm">
          {history.map((e) => (
            <li key={e._id} className="flex flex-col">
              <span className="text-label font-semibold text-primary">{TASK_STATUS[e.to]?.label ?? e.to}</span>
              <span className="text-micro text-muted">
                {when(e.at)} · {e.actor.name ?? e.actor.type}
                {e.reason ? ` · ${e.reason}` : ''}
              </span>
            </li>
          ))}
        </ol>
      </SectionCard>

      <ReasonDialog ask={ask} busy={busy} onClose={() => setAsk(null)} onConfirm={confirm} />
    </>
  );
}
