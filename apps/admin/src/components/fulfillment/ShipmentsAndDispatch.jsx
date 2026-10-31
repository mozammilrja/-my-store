import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon, Button } from '../ui';
import {
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  SectionCard,
  DataTable,
  TablePagination,
  IconButton,
  FilterBar,
  SearchInput,
  FilterDropdown,
  StatusBadge,
  AppDrawer,
  EmptyState,
} from '../shared';
import { useShipmentsQuery } from '../../hooks/useAdminQueries';
import { useClientTable } from '../../hooks/useClientTable';

/**
 * Shipments and dispatch.
 *
 * Everything here comes from GET /admin/shipments. The shipment record carries
 * a carrier, an AWB, a status, a tracking history, the delivery contact and an
 * item count, so those are the columns. Package weight, dock bay, bag number
 * and SLA countdown are not in the model and are not shown: inventing them
 * made the board look busy while telling the operator nothing true.
 */

const CARRIER_LABELS = {
  delhivery: 'Delhivery',
  bluedart: 'BlueDart',
  custom: 'Direct dispatch',
};

/** The shipment statuses the API can return, in lifecycle order. */
const STATUS_META = {
  manifested: { label: 'Manifested', variant: 'neutral' },
  pickup_scheduled: { label: 'Pickup scheduled', variant: 'info' },
  in_transit: { label: 'In transit', variant: 'info' },
  out_for_delivery: { label: 'Out for delivery', variant: 'warning' },
  delivered: { label: 'Delivered', variant: 'success' },
  rto: { label: 'Returned to origin', variant: 'destructive' },
  canceled: { label: 'Cancelled', variant: 'destructive' },
};

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'In flight' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'exceptions', label: 'Exceptions' },
];

const OPEN_STATUSES = ['manifested', 'pickup_scheduled', 'in_transit', 'out_for_delivery'];
const EXCEPTION_STATUSES = ['rto', 'canceled'];

const CARRIER_OPTIONS = [
  { value: 'all', label: 'All carriers' },
  ...Object.entries(CARRIER_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

/** The most recent tracking event, which is what "where is it" means here. */
const latestEvent = (shipment) => {
  const events = shipment.trackingEvents ?? [];
  if (!events.length) return null;
  return [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
};

export function ShipmentsAndDispatch({ onShowToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAwb, setSelectedAwb] = useState(null);

  // Tab, filters and search live in the URL, so a filtered board can be
  // refreshed, shared and reached from browser history.
  const activeTab = searchParams.get('tab') ?? 'all';
  const carrierFilter = searchParams.get('carrier') ?? 'all';
  const statusFilter = searchParams.get('status') ?? 'all';
  const searchQuery = searchParams.get('q') ?? '';

  const setParam = (key, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
        // A narrower result set invalidates the page number.
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  };

  const clearFilters = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        ['tab', 'carrier', 'status', 'q', 'page'].forEach((k) => next.delete(k));
        return next;
      },
      { replace: true }
    );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useShipmentsQuery();

  const shipments = useMemo(() => data?.shipments ?? [], [data]);

  const counts = useMemo(
    () => ({
      all: shipments.length,
      open: shipments.filter((s) => OPEN_STATUSES.includes(s.status)).length,
      delivered: shipments.filter((s) => s.status === 'delivered').length,
      exceptions: shipments.filter((s) => EXCEPTION_STATUSES.includes(s.status)).length,
      awaitingPickup: shipments.filter((s) => s.status === 'manifested').length,
      outForDelivery: shipments.filter((s) => s.status === 'out_for_delivery').length,
    }),
    [shipments]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter((s) => {
      if (activeTab === 'open' && !OPEN_STATUSES.includes(s.status)) return false;
      if (activeTab === 'delivered' && s.status !== 'delivered') return false;
      if (activeTab === 'exceptions' && !EXCEPTION_STATUSES.includes(s.status)) return false;
      if (carrierFilter !== 'all' && s.carrier !== carrierFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (q) {
        const haystack = [
          s.awb,
          `EVR-${s.displayId}`,
          s.customer?.name,
          s.customer?.city,
          s.customer?.postalCode,
          CARRIER_LABELS[s.carrier],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [shipments, activeTab, carrierFilter, statusFilter, searchQuery]);

  const pager = useClientTable(filtered);
  const selected = shipments.find((s) => s.awb === selectedAwb) ?? null;
  const activeFilterCount =
    (activeTab !== 'all' ? 1 : 0) +
    (carrierFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const columns = [
    {
      key: 'awb',
      header: 'AWB & carrier',
      accessor: (s) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-num text-primary">{s.awb}</span>
          <span className="truncate text-meta text-muted">
            {CARRIER_LABELS[s.carrier] ?? s.carrier}
            {s.isReturn ? ' / return leg' : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Order & destination',
      accessor: (s) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body text-primary">EVR-{s.displayId}</span>
          <span className="truncate text-meta text-muted">
            {[s.customer?.city, s.customer?.postalCode].filter(Boolean).join(' ') || 'No address on file'}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      fit: true,
      header: 'Items',
      align: 'right',
      accessor: (s) => s.itemsCount ?? 0,
    },
    {
      key: 'pickup',
      header: 'Pickup',
      accessor: (s) =>
        formatDate(s.pickupDate) ?? <span className="text-faint">Not scheduled</span>,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (s) => {
        const meta = STATUS_META[s.status] ?? { label: s.status, variant: 'neutral' };
        return <StatusBadge status={meta.label} variant={meta.variant} />;
      },
    },
    {
      key: 'lastScan',
      header: 'Last update',
      accessor: (s) => {
        const event = latestEvent(s);
        if (!event) return <span className="text-faint">No scans yet</span>;
        return (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-meta text-secondary">{event.status}</span>
            <span className="truncate text-micro text-faint">
              {[event.location, formatDateTime(event.timestamp)].filter(Boolean).join(' / ')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      fit: true,
      header: 'Actions',
      align: 'right',
      accessor: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon="visibility"
            title="View tracking"
            onClick={() => setSelectedAwb(s.awb)}
          />
          {s.labelUrl && (
            <IconButton
              icon="download"
              title="Open carrier label"
              onClick={() => window.open(s.labelUrl, '_blank', 'noopener')}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Fulfillment & orders"
        title="Shipments & dispatch"
        description="Every parcel handed to a carrier, with its live tracking history."
        breadcrumb="Fulfillment & Orders / Shipments & Dispatch"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <Icon
              name="refresh"
              aria-hidden="true"
              className="material-symbols-outlined text-icon-sm"
            />
            <span>{isFetching ? 'Refreshing' : 'Refresh'}</span>
          </Button>
        }
      />

      <ContentGrid columns={4}>
        <StatsCard
          title="Shipments"
          value={counts.all}
          icon="local_shipping"
          subtitle={`${counts.delivered} delivered so far`}
        />
        <StatsCard
          title="In flight"
          value={counts.open}
          icon="flight_takeoff"
          iconColor="text-info"
          subtitle={`${counts.awaitingPickup} still awaiting pickup`}
        />
        <StatsCard
          title="Out for delivery"
          value={counts.outForDelivery}
          icon="electric_moped"
          iconColor="text-warning"
          subtitle="With a delivery associate today"
        />
        <StatsCard
          title="Exceptions"
          value={counts.exceptions}
          icon="report_problem"
          iconColor="text-danger"
          subtitle="Returned to origin or cancelled"
        />
      </ContentGrid>

      <FilterBar
        tabs={STATUS_TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        activeTab={activeTab}
        onTabChange={(tab) => setParam('tab', tab)}
        search={
          <SearchInput
            value={searchQuery}
            onChange={(value) => setParam('q', value)}
            onClear={() => setParam('q', '')}
            label="Search shipments"
            placeholder="AWB, order, city or PIN"
          />
        }
        filters={
          <>
            <FilterDropdown
              value={carrierFilter}
              onChange={(value) => setParam('carrier', value)}
              options={CARRIER_OPTIONS}
              label="Carrier"
            />
            <FilterDropdown
              value={statusFilter}
              onChange={(value) => setParam('status', value)}
              options={STATUS_OPTIONS}
              label="Status"
            />
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </>
        }
      />

      <DataTable
  hugContent
        columns={columns}
        data={pager.pageRows}
        keyField="awb"
        isLoading={isLoading}
        isError={isError}
        errorTitle="Shipments could not be loaded"
        errorMessage={error?.message}
        onRetry={() => refetch()}
        activeRowId={selectedAwb}
        onRowClick={(s) => setSelectedAwb(s.awb)}
        emptyIcon="local_shipping"
        emptyTitle={activeFilterCount ? 'No shipments match these filters' : 'No shipments yet'}
        emptyMessage={
          activeFilterCount
            ? 'Clear the filters to see the full dispatch board.'
            : 'A shipment appears here once an order is handed to a carrier.'
        }
        emptyAction={
          activeFilterCount ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
        caption="Shipments and their latest carrier scan"
      />

      {filtered.length > 0 && (
        <TablePagination
          currentPage={pager.page}
          pageSize={pager.limit}
          totalItems={pager.total}
          onPageChange={pager.setPage}
          onPageSizeChange={pager.setLimit}
        />
      )}

      <AppDrawer
        isOpen={Boolean(selected)}
        onClose={() => setSelectedAwb(null)}
        title={selected ? `AWB ${selected.awb}` : 'Shipment'}
        subtitle={
          selected
            ? `${CARRIER_LABELS[selected.carrier] ?? selected.carrier} / order EVR-${selected.displayId}`
            : undefined
        }
      >
        {selected && (
          <div className="flex flex-col gap-space-md">
            <SectionCard title="Delivery">
              <dl className="grid grid-cols-2 gap-space-sm text-body">
                <div className="flex flex-col">
                  <dt className="text-meta text-muted">Recipient</dt>
                  <dd className="text-primary">{selected.customer?.name ?? 'Not recorded'}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-meta text-muted">Phone</dt>
                  <dd className="text-primary">{selected.customer?.phone ?? 'Not recorded'}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-meta text-muted">City</dt>
                  <dd className="text-primary">{selected.customer?.city ?? 'Not recorded'}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-meta text-muted">PIN</dt>
                  <dd className="font-mono text-num text-primary">
                    {selected.customer?.postalCode ?? '-'}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-meta text-muted">Items</dt>
                  <dd className="text-primary tabular-nums">{selected.itemsCount ?? 0}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-meta text-muted">Pickup</dt>
                  <dd className="text-primary">{formatDate(selected.pickupDate) ?? 'Not scheduled'}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Tracking history">
              {(selected.trackingEvents ?? []).length === 0 ? (
                <EmptyState
                  icon="pin_drop"
                  title="No scans yet"
                  message="The carrier has not reported movement for this parcel."
                />
              ) : (
                <ol className="flex flex-col gap-space-sm">
                  {[...selected.trackingEvents]
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map((event, idx) => (
                      <li key={`${event.timestamp}-${idx}`} className="flex gap-space-sm">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-status-info-solid"
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-body text-primary">{event.status}</span>
                          <span className="text-meta text-muted">
                            {[event.location, formatDateTime(event.timestamp)]
                              .filter(Boolean)
                              .join(' / ')}
                          </span>
                          {event.note && <span className="text-meta text-faint">{event.note}</span>}
                        </div>
                      </li>
                    ))}
                </ol>
              )}
            </SectionCard>

            {selected.labelUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(selected.labelUrl, '_blank', 'noopener')}
              >
                <Icon
                  name="download"
                  aria-hidden="true"
                  className="material-symbols-outlined text-icon-sm"
                />
                <span>Open carrier label</span>
              </Button>
            )}
          </div>
        )}
      </AppDrawer>
    </PageContainer>
  );
}

export default ShipmentsAndDispatch;
