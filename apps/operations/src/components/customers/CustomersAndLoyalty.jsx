import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  Select,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  PageBody,
  SkeletonPage,
  Thumbnail,
  SearchInput,
  EmptyState,
  Card,
  FilterBar,
  SectionCard,
  BarCell,
} from '../ui';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useCustomersQuery, useCustomerQuery } from '../../hooks/useAdminQueries';
import { useServerTable } from '../../hooks/useServerTable';
import { DataTable } from '../shared/DataTable';
import { PersonAvatar } from '../shared/PersonAvatar';
import { downloadCsv, datedFilename } from '../../lib/export';
import { useNavigate } from 'react-router';

export function CustomersAndLoyalty({ onNavigate, onShowToast }) {
  const navigate = useNavigate();
  // Segment and city are asked of the API. Filtering them here meant filtering
  // one page: a segment whose members all sat on page two came back empty.
  const table = useServerTable({ filters: { segment: 'all', city: 'all' } });
  const activeSegment = table.filters.segment;
  const setActiveSegment = (value) => table.setFilter('segment', value);
  const cityFilter = table.filters.city;
  const setCityFilter = (value) => table.setFilter('city', value);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const searchQuery = table.search;
  const setSearchQuery = table.setSearch;
  const [dbCustomers, setDbCustomers] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);

  // TanStack Query for customers list and individual customer details
  const {
    data: customersData,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomersQuery(table.params, { placeholderData: (prev) => prev });


  const targetDbCustomerId = selectedCustomerId?.startsWith('cus_') ? selectedCustomerId : null;
  const { data: singleCustomerData } = useCustomerQuery(targetDbCustomerId);

  useEffect(() => {
    if (customersData?.customers) {
      setDbCustomers(customersData.customers);
    }
  }, [customersData]);

  useEffect(() => {
    if (singleCustomerData?.orders) {
      setCustomerOrders(singleCustomerData.orders);
    } else if (!targetDbCustomerId) {
      setCustomerOrders([]);
    }
  }, [singleCustomerData, targetDbCustomerId]);

  /** The API reports each segment's size over the whole base, so the strip
      above the table is exact rather than a sample of the current page. */
  const rollStats = useMemo(() => {
    const counts = customersData?.segmentCounts;
    if (!counts) return { total: 0, ordered: 0, repeatRate: null, basis: 'Loading' };
    const ordered = (counts.repeat ?? 0) + (counts.ordered ?? 0);
    return {
      total: counts.all ?? 0,
      ordered,
      repeatRate: ordered ? ((counts.repeat ?? 0) / ordered) * 100 : null,
      basis: `Of ${counts.all ?? 0} accounts on record`,
    };
  }, [customersData]);

  const mergedCustomers = useMemo(() => {
    const fromDb = dbCustomers.map((c) => {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email.split('@')[0];
      const first = c.addresses?.[0];
      const geo = first
        ? [first.city, first.countryCode?.toUpperCase()].filter(Boolean).join(', ') || null
        : null;
      const orderCount = c.orderCount ?? 0;
      return {
        id: c.id,
        isDbCustomer: true,
        name,
        avatar: null,
        // Derived from the one customer metric the API reports, and labelled
        // as what it is rather than as an invented membership tier.
        tier: orderCount >= 3 ? 'Repeat' : orderCount > 0 ? 'Ordered' : 'No orders',
        tierVariant: orderCount >= 3 ? 'info' : orderCount > 0 ? 'success' : 'secondary',
        idBadge: c.id.slice(-6).toUpperCase(),
        email: c.email,
        phone: c.phone || null,
        geo,
        address: first?.address1 || null,
        tenure: `Customer since ${new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        orderCount,
        ordersCount: `${orderCount} ${orderCount === 1 ? 'order' : 'orders'}`,
        recentOrders: customerOrders.map((o) => ({
          key: o.id,
          id: `#${o.id.slice(-8).toUpperCase()}`,
          status: o.status,
          amount: formatMoney(o.totals?.total ?? 0, o.currency ?? 'inr'),
          title: o.items?.[0]?.title || 'Order',
          subtitle: `Ordered ${new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          image: o.items?.[0]?.thumbnail || null,
        })),
      };
    });

    return fromDb;
  }, [dbCustomers, customerOrders]);

  const selectedCustomer = useMemo(() => {
    return mergedCustomers.find(c => c.id === selectedCustomerId) || mergedCustomers[0];
  }, [mergedCustomers, selectedCustomerId]);

  // Search, segment, city and paging are all applied by the API now, so the
  // rows it returns are the rows to show.
  const filteredCustomers = mergedCustomers;

  /** The segment pills: what each one asks, and how many it holds. */
  const SEGMENTS = [
    { id: 'all', label: 'All customers' },
    { id: 'repeat', label: 'Repeat buyers', dot: 'bg-primary-container' },
    { id: 'ordered', label: 'One order only', dot: 'bg-status-success' },
    { id: 'none', label: 'Never ordered' },
  ];
  const segmentCounts = customersData?.segmentCounts ?? {};

  // No accounts on record at all, as against none matching the filters. The
  // segment counts are taken over the whole base, whatever is filtered.
  const noCustomers =
    customersData != null &&
    (customersData.segmentCounts
      ? (customersData.segmentCounts.all ?? 0) === 0
      : table.activeFilterCount === 0 && (customersData.count ?? 0) === 0);
  const noMatches = !noCustomers && customersData != null && filteredCustomers.length === 0;
  const cityOptions = customersData?.cities ?? [];

  /** Chips for the filters that are really on, each one clearable. */
  const activeFilters = [
    ...(activeSegment !== 'all'
      ? [{ id: 'segment', label: SEGMENTS.find((x) => x.id === activeSegment)?.label ?? activeSegment }]
      : []),
    ...(cityFilter !== 'all' ? [{ id: 'city', label: cityFilter }] : []),
    ...(searchQuery.trim() ? [{ id: 'search', label: `"${searchQuery.trim()}"` }] : []),
  ];
  const removeFilter = (id) => {
    if (id === 'segment') setActiveSegment('all');
    if (id === 'city') setCityFilter('all');
    if (id === 'search') setSearchQuery('');
  };


  /** Writes the customers currently listed, as the operator sees them. */
  const handleExportCustomers = () => {
    const written = downloadCsv({
      filename: datedFilename('customers'),
      columns: [
        { header: 'Name', value: (c) => c.name },
        { header: 'Email', value: (c) => c.email },
        { header: 'Phone', value: (c) => c.phone ?? '' },
        { header: 'City', value: (c) => c.geo ?? '' },
        { header: 'Orders', value: (c) => c.orderCount },
        { header: 'Customer since', value: (c) => c.tenure },
      ],
      rows: filteredCustomers,
    });
    onShowToast?.({
      type: 'success',
      title: 'Customers exported',
      message: `${written} ${written === 1 ? 'row' : 'rows'} written to a CSV file.`,
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveSegment('all');
    setCityFilter('all');
    if (onShowToast) onShowToast('All filters cleared.');
  };

  if (isCustomersLoading) {
    return <SkeletonPage variant="split" stats={6} statsCols={6} columns={6} label="Loading customers" />;
  }


  const customerColumns = [
    {
      key: 'customer',
      header: 'Customer',
      cell: (cust) => (
        <div className="flex min-w-0 items-center gap-space-sm">
          <PersonAvatar
            name={cust.name}
            email={cust.email}
            src={cust.avatar}
            className="h-8 w-8 shrink-0"
            fallbackClassName="text-label"
          />
          <div className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-label-lg text-primary" title={cust.name}>
                {cust.name}
              </span>
              <Badge variant={cust.tierVariant} size="sm" className="shrink-0">
                {cust.tier}
              </Badge>
            </span>
            <span className="truncate font-mono text-micro text-muted">{cust.idBadge}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (cust) => (
        <div className="flex min-w-0 flex-col">
          <span className="max-w-xs truncate text-meta text-primary">{cust.email}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-micro text-muted">
            {cust.geo && (
              <span className="flex items-center gap-1">
                <Icon name="location_on" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                {cust.geo}
              </span>
            )}
            {cust.geo && cust.phone && <span aria-hidden="true" className="text-faint">/</span>}
            {cust.phone && <span className="truncate">{cust.phone}</span>}
            {!cust.geo && !cust.phone && <span>No address or phone</span>}
          </span>
        </div>
      ),
    },
    {
      // Order count is the one lifetime figure the API reports. Lifetime GMV,
      // average order value, return rate and loyalty points were the same
      // numbers on every row, so those columns are gone rather than invented.
      key: 'orders',
      fit: true,
      header: 'Orders',
      align: 'right',
      cell: (cust) => <span className="text-num tabular-nums text-primary">{cust.orderCount}</span>,
    },
    {
      key: 'since',
      fit: true,
      header: 'Joined',
      cell: (cust) => (
        <span className="whitespace-nowrap text-meta text-secondary">
          {String(cust.tenure ?? '').replace(/^Customer since /i, '') || 'Not recorded'}
        </span>
      ),
    },
    {
      key: 'action',
      fit: true,
      header: <span className="sr-only">Action</span>,
      align: 'right',
      cell: (cust) => (
        <Button
          variant={cust.id === selectedCustomerId ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={cust.id === selectedCustomerId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCustomerId(cust.id);
          }}
        >
          {cust.id === selectedCustomerId ? 'Selected' : 'View'}
        </Button>
      ),
    },
  ];

  const segmentTabs = SEGMENTS.map((seg) => ({
    id: seg.id,
    label: seg.label,
    count: segmentCounts[seg.id] ?? undefined,
  }));

  return (
    <PageContainer>
      <PageHeader
        kicker="Settings & admin"
        title="Customers"
        description="Customer accounts and their order history."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm lg:shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCustomers}
            >
              <Icon name="file_download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />
      <PageBody
        error={customersError}
        hasData={customersData != null}
        title="Customers could not be loaded"
        onRetry={refetchCustomers}
      >

        <ContentGrid columns={3}>
          <StatsCard
            label="Total customers"
            value={rollStats.total || mergedCustomers.length}
            icon="groups"
            subtitle="Accounts on record"
          />
          <StatsCard
            label="Have ordered"
            value={String(rollStats.ordered)}
            icon="shopping_bag"
            subtitle={rollStats.basis}
          />
          <StatsCard
            label="Repeat purchase rate"
            value={rollStats.repeatRate == null ? 'Not recorded' : `${rollStats.repeatRate.toFixed(1)}%`}
            icon="repeat"
            subtitle="Of customers who ordered, those who ordered again"
          />
        </ContentGrid>

        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <div className={`${noCustomers || noMatches ? 'lg:col-span-12' : 'lg:col-span-8'} flex min-w-0 flex-col gap-space-md`}>
            {noCustomers ? (
              <EmptyState
                icon="groups"
                title="No customers yet"
                description="Customer accounts will be listed here as shoppers sign up or place their first order on the storefront."
                className="py-16"
              />
            ) : (
            <>
            {/* The cities the API reports as being on file, so every choice
                returns rows. */}
            <FilterBar
              tabs={segmentTabs}
              activeTab={activeSegment}
              onTabChange={setActiveSegment}
              search={
                <SearchInput
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
                  onClear={() => setSearchQuery('')}
                  placeholder="Search customers"
                  label="Search customers"
                  className="w-full sm:w-64"
                />
              }
              filters={
                <Select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  aria-label="City"
                  wrapperClassName="w-full sm:w-40"
                >
                  <option value="all">All cities</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </Select>
              }
              actions={
                activeFilters.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />

            <DataTable
              data={filteredCustomers}
              columns={customerColumns}
              keyField="id"
              activeRowId={selectedCustomerId}
              onRowClick={(cust) => setSelectedCustomerId(cust.id)}
              emptyIcon="search"
              emptyTitle="No customers match these filters"
              emptyMessage="No customer matches the current search, city or segment selection."
              emptyAction={
                <Button variant="outline" size="sm" onClick={table.resetFilters}>
                  Clear filters
                </Button>
              }
              pagination={{
                page: table.page,
                pageSize: table.limit,
                totalItems: customersData?.count ?? 0,
                onPageChange: table.setPage,
                onPageSizeChange: table.setLimit,
              }}
            />

            {/* How often customers order, counted across the whole roll. */}
            <SectionCard
              title="Order frequency"
              description={`Across ${segmentCounts.all ?? 0} accounts`}
              contentClassName="flex flex-col gap-space-md"
            >
              {SEGMENTS.filter((seg) => seg.id !== 'all').map((seg) => {
                const n = segmentCounts[seg.id] ?? 0;
                const pct = segmentCounts.all ? (n / segmentCounts.all) * 100 : 0;
                return (
                  <div key={seg.id} className="flex flex-col gap-1">
                    <div className="flex justify-between gap-space-md text-meta">
                      <span className="text-primary">{seg.label}</span>
                      <span className="tabular-nums text-secondary">
                        {n} <span className="text-muted">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <BarCell value={n} max={segmentCounts.all ?? 0} label={`${seg.label}: ${n} of ${segmentCounts.all ?? 0}`} />
                  </div>
                );
              })}
            </SectionCard>
            </>
            )}
          </div>

          {!noCustomers && !noMatches && (
          <div className="flex min-w-0 flex-col gap-space-md lg:col-span-4">
            {!selectedCustomer ? (
              <EmptyState
                icon="person_search"
                title={isCustomersError ? 'Customer profile unavailable' : 'No customer selected'}
                description={
                  isCustomersError
                    ? 'The directory could not be loaded, so there is no profile to inspect.'
                    : 'Pick a row from the directory to open the profile.'
                }
              />
            ) : (
            <Card className="flex flex-col gap-space-md p-space-md">
              <div className="flex items-start gap-space-md">
                <PersonAvatar
                  name={selectedCustomer.name}
                  email={selectedCustomer.email}
                  src={selectedCustomer.avatar}
                  className="h-12 w-12 shrink-0"
                  fallbackClassName="text-subheading"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center gap-space-sm">
                    <h2 className="truncate text-heading text-primary">{selectedCustomer.name}</h2>
                    <Badge variant={selectedCustomer.tierVariant} size="sm" className="shrink-0">
                      {selectedCustomer.tier}
                    </Badge>
                  </div>
                  <span className="text-meta text-muted">{selectedCustomer.tenure}</span>
                </div>
              </div>

              <dl className="flex flex-col gap-space-sm rounded-lg border border-subtle bg-surface-subtle p-space-md text-meta">
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Email</dt>
                  <dd className="min-w-0 truncate text-primary">{selectedCustomer.email}</dd>
                </div>
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Phone</dt>
                  <dd className="text-primary">{selectedCustomer.phone ?? 'Not on file'}</dd>
                </div>
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Address</dt>
                  <dd className="min-w-0 truncate text-right text-primary">
                    {[selectedCustomer.address, selectedCustomer.geo].filter(Boolean).join(', ') || 'Not on file'}
                  </dd>
                </div>
                <div className="flex justify-between gap-space-md">
                  <dt className="text-muted">Orders</dt>
                  <dd className="tabular-nums text-primary">{selectedCustomer.orderCount}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between gap-space-md">
                  <h3 className="text-subheading text-primary">Recent orders</h3>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() =>
                      navigate(`/admin/order-management?q=${encodeURIComponent(selectedCustomer.email)}`)
                    }
                  >
                    View all {selectedCustomer.ordersCount}
                  </Button>
                </div>

                {selectedCustomer.recentOrders.length === 0 ? (
                  <p className="text-meta text-muted">No orders on this account yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border-subtle rounded-lg border border-subtle">
                    {selectedCustomer.recentOrders.map((ord) => (
                      <li key={ord.key} className="flex items-center gap-space-sm p-space-sm">
                        <Thumbnail src={ord.image} alt="" className="h-10 w-10 rounded-md" imgClassName="object-cover" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-label text-primary">{ord.title}</span>
                          <span className="truncate text-micro text-muted">
                            <span className="font-mono">{ord.id}</span> · {ord.subtitle}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-num tabular-nums text-primary">{ord.amount}</span>
                          <StatusBadge status={ord.status} size="sm" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
            )}
          </div>
          )}
        </div>
      </PageBody>
    </PageContainer>
  );
}
