import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, ContentGrid, DataTable, FilterBar, Icon, Input, PageBody, PageContainer, PageHeader, SectionCard, Separator, SkeletonPage, StatsCard, StatusBadge, TableToolbar } from '../ui';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { useClientTable } from '../../hooks/useClientTable';
import { fleetApi } from '../../lib/api-fleet';
import { Fact, REMITTANCE_STATUS, money, useFleetAction, useFleetRoles, when } from './fleet-shared';

/*
 * Cash our riders collected on delivery (apps/backend/src/lib/fleet/cod.ts):
 * what each rider holds now, and the hand-overs finance counts. Only an
 * exact count reconciles a hand-over and marks its orders paid; any
 * difference is a mismatch, kept open until it's recounted. Courier COD is
 * settled in the courier's own dashboard and isn't shown here.
 */

const TABS = [
  { id: 'submitted', label: 'To count', statuses: ['submitted'] },
  { id: 'mismatch', label: 'Mismatches', statuses: ['mismatch'] },
  { id: 'reconciled', label: 'Reconciled', statuses: ['reconciled'] },
  { id: 'all', label: 'All', statuses: null },
];

export function CashOnDelivery({ onShowToast }) {
  const remittances = useQuery({ queryKey: ['fleet', 'remittances'], queryFn: () => fleetApi.remittances() });
  const riders = useQuery({ queryKey: ['fleet', 'riders'], queryFn: () => fleetApi.riders() });
  const [tab, setTab] = useState('submitted');
  const [selectedId, setSelectedId] = useState(null);

  const all = remittances.data?.remittances ?? [];
  const withRiders = remittances.data?.cashWithRiders ?? [];
  const riderName = useMemo(() => Object.fromEntries((riders.data?.riders ?? []).map((r) => [r._id, r.name])), [riders.data]);
  const rows = useMemo(() => {
    const t = TABS.find((x) => x.id === tab);
    return all.filter((r) => !t?.statuses || t.statuses.includes(r.status));
  }, [all, tab]);
  const pager = useClientTable(rows);
  const selected = rows.find((r) => r._id === selectedId) ?? rows[0] ?? null;

  if (remittances.isLoading || riders.isLoading) return <SkeletonPage variant="table" stats={4} statsCols={4} columns={5} label="Loading cash on delivery" />;

  const onHand = withRiders.reduce((n, r) => n + r.amount, 0);
  const toCount = all.filter((r) => r.status === 'submitted');
  const mismatches = all.filter((r) => r.status === 'mismatch');
  const gap = mismatches.reduce((n, r) => n + ((r.counted ?? 0) - r.expected), 0);
  const since = Date.now() - 30 * 86_400_000;
  const reconciled30 = all.filter((r) => r.status === 'reconciled' && new Date(r.reconciledAt).getTime() >= since);

  const columns = [
    {
      key: 'code',
      header: 'Hand-over',
      cell: (r) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-mono text-label font-semibold text-accent">{r.code}</span>
          <span className="text-micro text-muted">{when(r.submittedAt)}</span>
        </div>
      ),
    },
    { key: 'rider', header: 'Rider', cell: (r) => <span className="text-label text-primary">{riderName[r.riderId] ?? r.riderId}</span> },
    { key: 'parcels', header: 'Parcels', align: 'right', fit: true, cell: (r) => <span className="text-meta tabular-nums text-primary">{r.taskIds.length}</span> },
    {
      key: 'amount',
      header: 'Collected / counted',
      align: 'right',
      fit: true,
      cell: (r) => (
        <div className="flex flex-col items-end">
          <span className="text-meta font-semibold tabular-nums text-primary">{money(r.expected)}</span>
          <span className={r.status === 'mismatch' ? 'text-micro font-semibold tabular-nums text-danger' : 'text-micro tabular-nums text-muted'}>{r.counted != null ? `Counted ${money(r.counted)}` : `Declared ${money(r.declared)}`}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', fit: true, cell: (r) => <StatusBadge status={REMITTANCE_STATUS[r.status]?.label ?? r.status} variant={REMITTANCE_STATUS[r.status]?.variant} /> },
  ];

  return (
    <PageContainer>
      <PageHeader kicker="Finance & compliance" title="Cash on delivery" description="Cash our riders collected, and the hand-overs finance counts. Orders are marked paid only on an exact count." />
      <PageBody error={remittances.error ?? riders.error} hasData={!remittances.isError && !riders.isError} title="Cash on delivery could not be loaded" onRetry={() => (remittances.refetch(), riders.refetch())}>
        <ContentGrid cols={4}>
          <StatsCard title="With riders now" value={money(onHand)} icon="payments" iconColor="text-warning" trendLabel={`${withRiders.reduce((n, r) => n + r.parcels, 0)} parcels not yet handed in`} />
          <StatsCard title="To count" value={money(toCount.reduce((n, r) => n + r.expected, 0))} icon="pending" iconColor="text-info" trendLabel={`${toCount.length} hand-over${toCount.length === 1 ? '' : 's'} waiting`} />
          <StatsCard
            title="Mismatches"
            value={String(mismatches.length)}
            icon="report_problem"
            iconColor="text-danger"
            badge={mismatches.length ? `${gap < 0 ? 'short' : 'over'} ${money(Math.abs(gap))}` : undefined}
            badgeVariant="destructive"
            trendLabel="Counted differs from collected"
          />
          <StatsCard title="Reconciled (30 days)" value={money(reconciled30.reduce((n, r) => n + (r.counted ?? 0), 0))} icon="task_alt" iconColor="text-success" trendLabel={`${reconciled30.length} hand-overs`} />
        </ContentGrid>

        <SectionCard title="Cash with riders" description="Collected on delivery and not yet handed in.">
          {withRiders.length === 0 ? (
            <p className="text-meta text-muted">No rider is holding cash.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-subtle" aria-label="Cash with riders">
              {[...withRiders]
                .sort((a, b) => b.amount - a.amount)
                .map((r) => (
                  <li key={r.riderId} className="flex items-center justify-between gap-space-sm py-space-xs">
                    <span className="text-label text-primary">{riderName[r.riderId] ?? r.riderId}</span>
                    <span className="text-meta tabular-nums text-secondary">
                      {r.parcels} parcel{r.parcels === 1 ? '' : 's'} · <span className="font-semibold text-primary">{money(r.amount)}</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </SectionCard>

        <FilterBar
          tabsLabel="Hand-over status"
          tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.statuses ? all.filter((r) => t.statuses.includes(r.status)).length : all.length }))}
          activeTab={tab}
          onTabChange={(id) => {
            setTab(id);
            setSelectedId(null);
          }}
        />

        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          {rows.length === 0 ? (
            <EmptyState icon="payments" title={all.length ? 'Nothing here' : 'No hand-overs yet'} description={all.length ? 'Pick another tab.' : 'When a rider hands in cash from the rider app, it appears here to count.'} className="py-16 lg:col-span-12" />
          ) : (
            <>
              <div className="min-w-0 lg:col-span-7 xl:col-span-8">
                <DataTable
                  columns={columns}
                  data={pager.pageRows}
                  keyField="_id"
                  activeRowId={selected?._id}
                  onRowClick={(r) => setSelectedId(r._id)}
                  rowClassName={(r) => (r.status === 'mismatch' ? 'bg-status-danger-bg' : '')}
                  caption="Cash hand-overs"
                  toolbar={
                    <TableToolbar
                      left={
                        <>
                          <h3 className="text-subheading text-primary">Hand-overs</h3>
                          <Badge variant="secondary" className="tabular-nums">
                            {rows.length}
                          </Badge>
                        </>
                      }
                      right={
                        <Button variant="ghost" size="iconSm" onClick={() => remittances.refetch()} aria-label="Refresh hand-overs" title="Refresh">
                          <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                        </Button>
                      }
                    />
                  }
                  pagination={{ page: pager.page, pageSize: pager.limit, totalItems: pager.total, onPageChange: pager.setPage, onPageSizeChange: pager.setLimit }}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-space-md lg:col-span-5 xl:col-span-4">
                {selected ? <RemittancePanel key={`${selected._id}:${selected.status}`} r={selected} riderName={riderName[selected.riderId] ?? selected.riderId} onShowToast={onShowToast} /> : null}
              </div>
            </>
          )}
        </div>
      </PageBody>
    </PageContainer>
  );
}

function RemittancePanel({ r, riderName, onShowToast }) {
  const { canReconcile } = useFleetRoles();
  const act = useFleetAction(onShowToast);
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const countedPaise = counted === '' ? null : Math.round(Number(counted) * 100);
  const diff = countedPaise == null ? null : countedPaise - r.expected;
  const open = r.status !== 'reconciled';

  const submit = (e) => {
    e.preventDefault();
    act
      .mutateAsync({
        run: () => fleetApi.reconcile(r._id, countedPaise, note.trim() || undefined),
        done: (res) => (res.remittance.status === 'reconciled' ? `${r.code} reconciled; its orders are paid` : `${r.code} flagged: counted ${money(res.remittance.counted)} of ${money(r.expected)}`),
      })
      .then(() => {
        setCounted('');
        setNote('');
      }, () => {});
  };

  return (
    <Card className="flex flex-col gap-space-md p-space-md" aria-label={`Hand-over ${r.code}`}>
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col gap-1">
          <StatusBadge status={REMITTANCE_STATUS[r.status]?.label ?? r.status} variant={REMITTANCE_STATUS[r.status]?.variant} className="self-start" />
          <h2 className="font-mono text-subheading text-primary">{r.code}</h2>
          <span className="text-body text-secondary">
            {riderName} · {r.taskIds.length} parcel{r.taskIds.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-kpi-sm tabular-nums text-primary">{money(r.expected)}</span>
          <span className="block text-meta text-muted">Collected on delivery</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-space-sm">
        <Fact label="Rider says">{money(r.declared)}</Fact>
        <Fact label="Handed in">{when(r.submittedAt)}</Fact>
        {r.counted != null && <Fact label="Finance counted">{money(r.counted)}</Fact>}
        {r.reconciledAt && <Fact label="Counted on">{when(r.reconciledAt)}</Fact>}
      </dl>
      {r.status === 'mismatch' && (
        <p className="rounded-lg border border-status-danger/30 bg-status-danger-bg p-space-sm text-meta text-danger">
          {r.counted < r.expected ? 'Short' : 'Over'} by {money(Math.abs(r.counted - r.expected))}
          {r.note ? `: ${r.note}` : ''}. Its orders stay unpaid until a recount matches.
        </p>
      )}
      {r.declared !== r.expected && r.status === 'submitted' && <p className="text-meta text-warning">The rider declared {money(r.declared)}, not the {money(r.expected)} collected.</p>}

      {open &&
        (canReconcile ? (
          <>
            <Separator />
            <form onSubmit={submit} className="flex flex-col gap-space-sm">
              <label className="flex flex-col gap-1.5 text-label text-secondary">
                {r.status === 'mismatch' ? 'Recount (₹)' : 'Cash counted (₹)'}
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder={(r.expected / 100).toFixed(2)} required />
              </label>
              {diff != null && diff !== 0 && Number.isFinite(diff) && (
                <p className="text-meta text-danger">
                  {diff < 0 ? 'Short' : 'Over'} by {money(Math.abs(diff))}: this will be recorded as a mismatch.
                </p>
              )}
              <label className="flex flex-col gap-1.5 text-label text-secondary">
                Note
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={diff ? 'What the difference is' : 'Optional'} maxLength={300} />
              </label>
              <Button type="submit" variant="primary" disabled={act.isPending || countedPaise == null || !Number.isFinite(countedPaise) || countedPaise < 0}>
                {diff === 0 ? 'Reconcile' : 'Record count'}
              </Button>
            </form>
          </>
        ) : (
          <p className="text-meta text-muted">Counting is for finance and the owner.</p>
        ))}
    </Card>
  );
}
