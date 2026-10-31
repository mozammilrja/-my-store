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
  ErrorState,
  SkeletonPage,
  Thumbnail,
  SearchInput,
  EmptyState,
} from '../ui';
import { customerList } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useCustomersQuery, useCustomerQuery } from '../../hooks/useAdminQueries';
import { useServerTable } from '../../hooks/useServerTable';
import { TablePagination } from '../shared/DataTable';

export function CustomersAndLoyalty({ onNavigate, onShowToast }) {
  const table = useServerTable();
  const [activeSegment, setActiveSegment] = useState('all'); // 'all', 'vip', 'dormant'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const searchQuery = table.search;
  const setSearchQuery = table.setSearch;
  const [tierFilter, setTierFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [activeFilters, setActiveFilters] = useState([
    { id: 'f-tier', label: 'VIP Club Couture' },
    { id: 'f-ret', label: 'Return Rate < 10%' }
  ]);
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

  const mergedCustomers = useMemo(() => {
    const fromDb = dbCustomers.map((c, idx) => {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email.split('@')[0];
      const address = c.addresses?.[0] ? `${c.addresses[0].city || ''}, ${c.addresses[0].countryCode?.toUpperCase() || ''}` : 'India';
      return {
        id: c.id,
        isDbCustomer: true,
        name,
        avatar: null,
        heroAvatar: null,
        tier: (c.orderCount ?? 0) >= 3 ? 'VIP COUTURE' : 'Gold Tier Member',
        tierBadge: (c.orderCount ?? 0) >= 3 ? 'bg-primary-container text-on-accent' : 'bg-surface-subtle text-primary',
        badgeIcon: (c.orderCount ?? 0) >= 3 ? 'diamond' : 'workspace_premium',
        idBadge: `ID #${c.id.slice(-6).toUpperCase()}`,
        email: c.email,
        phone: c.phone || '+91 98450 00000',
        geo: address,
        address: c.addresses?.[0]?.address1 || 'Verified Address On File',
        birthday: 'Aug 18',
        tenure: `Customer since ${new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        gmv: '₹48,900',
        orderCount: c.orderCount ?? 0,
        ordersCount: `${c.orderCount ?? 0} Orders`,
        aov: '₹6,400',
        returnRate: '2.4% (Low)',
        returnRateColor: 'text-success',
        points: '4,800 Pts',
        pointsValue: 'Worth ₹480',
        storeCredit: '₹0.00',
        openReturns: 'No open returns',
        lastActive: 'Active recently',
        lastActiveSub: 'Session Online',
        isOnline: true,
        rfmScore: 'Score: 4-5-4 (Loyal Customer)',
        recency: 'Recent',
        recencySub: 'Active',
        frequency: String(c.orderCount ?? 1),
        frequencySub: 'Verified shopper',
        monetary: '₹48.9K',
        monetarySub: 'Omnichannel',
        favCategory: "Women's Sartorial & Silk",
        kurtaSize: 'M',
        blouseSize: '38',
        textiles: 'Mulberry Silk, Cotton',
        discountPrivilege: '10% Member Privileges',
        recentOrders: customerOrders.map(o => ({
          id: `Order #${o.id.slice(-8).toUpperCase()}`,
          status: o.status,
          statusColor: o.status === 'delivered' ? 'bg-status-success-bg text-success' : 'bg-status-info-bg text-info',
          amount: formatMoney(o.totals?.total ?? 0, o.currency ?? 'inr'),
          title: o.items?.[0]?.title || 'Artisanal Apparel Garment',
          subtitle: `Ordered on ${new Date(o.createdAt).toLocaleDateString()}`,
          image: o.items?.[0]?.thumbnail || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=200',
        })),
      };
    });

    return fromDb;
  }, [dbCustomers, customerOrders]);

  const selectedCustomer = useMemo(() => {
    return mergedCustomers.find(c => c.id === selectedCustomerId) || mergedCustomers[0];
  }, [mergedCustomers, selectedCustomerId]);

  // Search and paging are applied by the API. Segment and tier read the
  // customer's real order count, so they stay client-side over the page.
  const filteredCustomers = useMemo(() => {
    return mergedCustomers.filter((c) => {
      const orders = c.orderCount ?? 0;
      if (activeSegment === 'vip' && orders < 3) return false;
      if (activeSegment === 'dormant' && orders !== 0) return false;

      if (tierFilter === 'vip' && orders < 3) return false;
      if (tierFilter === 'gold' && (orders === 0 || orders >= 3)) return false;
      if (tierFilter === 'new' && orders !== 0) return false;

      if (cityFilter !== 'ALL' && !String(c.geo || '').toLowerCase().includes(cityFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [mergedCustomers, activeSegment, tierFilter, cityFilter]);

  const removeFilter = (id) => {
    setActiveFilters(prev => prev.filter(f => f.id !== id));
    if (onShowToast) onShowToast('Filter removed.');
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
    setTierFilter('ALL');
    setCityFilter('ALL');
    setLtvFilter('ALL');
    if (onShowToast) onShowToast('All filters cleared.');
  };

  if (isCustomersLoading) {
    return <SkeletonPage variant="split" stats={6} statsCols={6} columns={6} label="Loading customers" />;
  }

  return (
    <PageContainer>
      {customersError && (
        <ErrorState
          title="Customers could not be loaded"
          message={customersError?.message}
          onRetry={() => refetchCustomers()}
        />
      )}
      <PageHeader
        breadcrumb="EVERWEAR ADMIN / SETTINGS & ADMIN / CUSTOMERS & LOYALTY"
        title="Customer Intelligence, VIP Tiers & Loyalty Operations"
        badge={<Badge variant="info">CRM v4.8</Badge>}
        description="Comprehensive customer 360 profiles, RFM segment analytics, omnichannel loyalty point ledger, and VIP concierge management."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm lg:shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast && onShowToast("Exporting Customer & Loyalty Ledger as CSV...")}
              icon="file_download"
            >
              Export Ledger (CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast && onShowToast("Segment campaign configuration modal opened.")}
              icon="campaign"
            >
              Trigger Segment Campaign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast && onShowToast("Concierge note modal initialized for " + selectedCustomer.name)}
              icon="person_add"
            >
              + Add Concierge Note
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onShowToast && onShowToast("Loyalty tier rules & multiplier engine configuration open.")}
              icon="tune"
            >
              Adjust Loyalty Rules
            </Button>
          </div>
        }
      />

      {/* KPI / Performance Matrix Strip (5 Cards) */}
      <ContentGrid columns={5}>
        <StatsCard
          label="Total Customers"
          value="148,290"
          change="+12.4% MoM"
          changeType="positive"
          icon="groups"
          subtitle="Omnichannel active pan-India"
        />
        <StatsCard
          label="VIP Club Couture"
          value="4,820"
          change="Tier 1 HNW"
          changeType="neutral"
          icon="diamond"
          subtitle="Avg annual spend > ₹1.25L"
        />
        <StatsCard
          label="Repeat Purchase Rate"
          value="41.8%"
          change="+3.2pp YoY"
          changeType="positive"
          icon="repeat"
          subtitle="30-day cohort retention window"
        />
        <StatsCard
          label="Loyalty Points In Float"
          value="18.4M Pts"
          change="Valuation ₹18.4L"
          changeType="neutral"
          icon="toll"
          subtitle="Redemption rate: 76.4%"
        />
        <StatsCard
          label="Store Credit Liability"
          value="₹4.12 Lakhs"
          change="Pending"
          changeType="warning"
          icon="account_balance_wallet"
          subtitle="From returns/exchanges"
        />
      </ContentGrid>

      {/* Primary Split Workflow Canvas (8 Cols Directory + 4 Cols 360 Profile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Central Directory / Table Column (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-space-md min-w-0">
          {/* Segment Navigation Pills */}
          <div className="bg-surface-container-lowest rounded-xl p-1.5 shadow-sm flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 min-w-max">
              <button
                onClick={() => setActiveSegment('all')}
                className={`px-3.5 py-1.5 rounded-lg text-label font-semibold flex items-center gap-2 transition-all cursor-pointer ${
 activeSegment === 'all'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                type="button"
              >
                <span>All Customers</span>
                <span className={`px-1.5 py-px rounded-full text-micro ${
 activeSegment === 'all' ? 'bg-scrim/25 text-on-accent' : 'bg-surface-subtle text-muted'
 }`}>
                  148,290
                </span>
              </button>
              <button
                onClick={() => setActiveSegment('vip')}
                className={`px-3.5 py-1.5 rounded-lg text-label font-medium flex items-center gap-2 transition-all cursor-pointer ${
 activeSegment === 'vip'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                type="button"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                <span>VIP Club Couture</span>
                <span className="px-1.5 py-px rounded-full bg-surface-subtle text-muted text-micro">
                  4,820
                </span>
              </button>
              <button
                onClick={() => setActiveSegment('risk')}
                className={`px-3.5 py-1.5 rounded-lg text-label font-medium flex items-center gap-2 transition-all cursor-pointer ${
 activeSegment === 'risk'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                type="button"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-danger"></span>
                <span>High Return Risk</span>
                <span className="px-1.5 py-px rounded-full bg-status-danger-bg text-danger text-micro">
                  890
                </span>
              </button>
              <button
                onClick={() => setActiveSegment('dormant')}
                className={`px-3.5 py-1.5 rounded-lg text-label font-medium flex items-center gap-2 transition-all cursor-pointer ${
 activeSegment === 'dormant'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                type="button"
              >
                <span>Dormant Reactivation</span>
                <span className="px-1.5 py-px rounded-full bg-surface-subtle text-muted text-micro">
                  12,400
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveSegment('rfm');
                  if (onShowToast) onShowToast('RFM 3D matrix filter activated.');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-label font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
 activeSegment === 'rfm'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                type="button"
              >
                <Icon name="pie_chart" className="material-symbols-outlined text-icon" />
                <span>RFM Segments</span>
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-1 shrink-0 pl-2">
              <button
                onClick={() => onShowToast && onShowToast('Configuring column visibility...')}
                className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-subtle transition-all cursor-pointer"
                title="View Options"
                type="button"
              >
                <Icon name="view_column" className="material-symbols-outlined text-icon-md" />
              </button>
              <button
                onClick={() => onShowToast && onShowToast('Row density toggled.')}
                className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-subtle transition-all cursor-pointer"
                title="Density Toggle"
                type="button"
              >
                <Icon name="density_medium" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search customer, phone, email or order ID"
                label="Search customers"
                className="min-w-[15rem] flex-1"
              />
              <div className="min-w-[11rem]">
                <Select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="h-9"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="vip">VIP Club Couture (Tier 1)</option>
                  <option value="gold">Gold Atelier (Tier 2)</option>
                  <option value="silver">Silver Silk (Tier 3)</option>
                  <option value="new">New Shopper</option>
                </Select>
              </div>
              <div className="min-w-[10.5rem]">
                <Select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="h-9"
                >
                  <option value="ALL">City / Region</option>
                  <option value="Mumbai">Mumbai, MH</option>
                  <option value="Bengaluru">Bengaluru, KA</option>
                  <option value="Delhi">Delhi, NCR</option>
                  <option value="Kolkata">Kolkata, WB</option>
                  <option value="Chennai">Chennai, TN</option>
                </Select>
              </div>
            </div>

            {/* Filter Tags Bar */}
            <div className="flex items-center justify-between pt-1 text-caption text-muted flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Active filters:</span>
                {activeFilters.map(filter => (
                  <span
                    key={filter.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-subtle text-primary text-micro"
                  >
                    {filter.label}
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="hover:text-danger cursor-pointer ml-0.5"
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-micro">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:opacity-70 cursor-pointer ml-0.5" type="button">
                      ×
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={clearAllFilters}
                className="text-accent hover:underline lowercase text-micro cursor-pointer"
                type="button"
              >
                Clear all filters
              </button>
            </div>
          </div>

          {/* Directory Data Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-subtle">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-surface-subtle text-muted text-caption uppercase tracking-wider border-b border-subtle select-none sticky top-0 z-10">
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Customer &amp; Tier</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Contact &amp; Geo</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Lifetime Orders / GMV</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">AOV / Ret Rate</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Loyalty Float</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Last Active</th>
                    <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-body text-primary">
                  {filteredCustomers.map(cust => {
                    const isSelected = cust.id === selectedCustomerId;
                    return (
                      <tr
                        key={cust.id}
                        onClick={() => setSelectedCustomerId(cust.id)}
                        className={`transition-colors cursor-pointer group ${
 isSelected ? 'bg-primary-fixed/30 hover:bg-primary-fixed/40' : 'hover:bg-surface-subtle'
 }`}
                      >
                        {/* Customer & Tier */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative shrink-0">
                              {cust.avatar ? (
                                <Thumbnail src={cust.avatar} alt={cust.name} className="w-8 h-8 rounded-full shadow-sm" imgClassName="object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-surface-subtle text-muted text-subheading flex items-center justify-center font-semibold">
                                  {cust.initials}
                                </div>
                              )}
                              {cust.tier.includes('COUTURE') && (
                                <span
                                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary-container flex items-center justify-center text-on-accent shadow-xs"
                                  title="VIP Couture"
                                >
                                  <Icon name="star" className="material-symbols-outlined text-icon-sm" />
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-label-lg font-semibold text-primary flex items-center gap-1.5 flex-wrap">
                                {cust.name}
                                <span className={`px-1.5 py-px rounded-full text-caption tracking-wider uppercase ${cust.tierBadge}`}>
                                  {cust.tier}
                                </span>
                              </span>
                              <span className="text-micro text-muted truncate">
                                {cust.idBadge}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Geo */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-primary font-medium text-meta truncate max-w-[170px]">
                              {cust.email}
                            </span>
                            <span className="text-muted text-micro flex items-center gap-1">
                              <Icon name="location_on" className="material-symbols-outlined text-icon-sm" />
                              {cust.geo}
                            </span>
                          </div>
                        </td>

                        {/* Lifetime Orders / GMV */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-primary text-num">
                              {cust.gmv}
                            </span>
                            <span className="text-muted text-micro">{cust.ordersCount}</span>
                          </div>
                        </td>

                        {/* AOV / Ret Rate */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-primary text-meta">
                              {cust.aov}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 text-micro font-semibold ${cust.returnRateColor}`}>
                              {cust.returnRate.includes('Low') && <span className="w-1.5 h-1.5 rounded-full bg-status-success mr-0.5"></span>}
                              {cust.returnRate}
                            </span>
                          </div>
                        </td>

                        {/* Loyalty Float */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-accent text-meta">
                              {cust.points}
                            </span>
                            <span className="text-muted text-micro">{cust.pointsValue}</span>
                          </div>
                        </td>

                        {/* Last Active */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-primary font-medium text-meta flex items-center gap-1">
                              {cust.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>}
                              {cust.lastActive}
                            </span>
                            <span className="text-muted text-micro truncate max-w-[140px]">
                              {cust.lastActiveSub}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-center">
                          {isSelected ? (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-primary-container text-on-accent text-meta font-medium shadow-sm hover:bg-primary-container-hover transition-all cursor-pointer"
                              type="button"
                            >
                              Selected
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomerId(cust.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface-subtle text-primary text-meta font-medium hover:bg-surface-container-high transition-all cursor-pointer"
                              type="button"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={table.page}
              pageSize={table.limit}
              totalItems={customersData?.count ?? 0}
              onPageChange={table.setPage}
              onPageSizeChange={table.setLimit}
            />
          </div>

          {/* Segment Quick-Actions & Cohort Intelligence Widget (2 Bottom Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Widget 1 */}
            <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm space-y-3 border border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="verified" className="material-symbols-outlined text-accent text-icon-md" />
                  <span className="text-subheading text-primary font-semibold">Tier Migration Matrix</span>
                </div>
                <span className="text-caption text-muted">Q2 Run-rate</span>
              </div>
              <p className="text-body text-secondary">
                184 Silver Silk members are within ₹5,000 GMV of ascending to Gold Atelier status this fortnight.
              </p>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-meta">
                  <span className="font-medium text-primary">Target Conversion Pipeline</span>
                  <span className="font-semibold text-accent">64.2%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: '64.2%' }}></div>
                </div>
              </div>
            </div>

            {/* Widget 2 */}
            <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm space-y-3 border border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="warning" className="material-symbols-outlined text-warning text-icon-md" />
                  <span className="text-subheading text-primary font-semibold">High Return Triage Queue</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-warning text-micro font-semibold">
                  890 Flagged
                </span>
              </div>
              <p className="text-body text-secondary">
                Accounts with &gt; 35% return frequency on delicate handlooms. Restrict cash on delivery and assign size verification concierge.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => onShowToast && onShowToast('Filtering directory to 890 high-return flagged profiles.')}
                  className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-primary text-label font-medium transition-colors cursor-pointer"
                  type="button"
                >
                  Review High-Risk Accounts
                </button>
                <button
                  onClick={() => onShowToast && onShowToast('Handloom return policy guardrail settings opened.')}
                  className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-accent text-label font-medium transition-colors cursor-pointer"
                  type="button"
                >
                  Update Return Policies
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Inspector / Customer 360 Detail Drawer (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-space-md min-w-0">
          {!selectedCustomer ? (
            <EmptyState
              icon="person_search"
              title={isCustomersError ? 'Customer profile unavailable' : 'No customer selected'}
              description={
                isCustomersError
                  ? 'The directory could not be loaded, so there is no profile to inspect.'
                  : 'Pick a row from the directory to open the 360 profile.'
              }
            />
          ) : (
          <>
          {/* Top Inspector Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden relative border border-subtle">
            {/* Header Banner Pattern */}
            <div className="relative flex h-20 items-start justify-between bg-primary-container p-3">
              <span className="px-2 py-0.5 rounded-full bg-scrim/25 backdrop-blur-sm text-on-accent text-caption tracking-widest uppercase">
                LIVE 360 INSPECTOR
              </span>
              <div className="flex items-center gap-1 text-on-accent">
                <button
                  onClick={() => onShowToast && onShowToast('Dossier for ' + selectedCustomer.name + ' queued for print.')}
                  className="p-1 rounded-full hover:bg-scrim/25 transition-colors cursor-pointer"
                  title="Print Dossier"
                  type="button"
                >
                  <Icon name="print" className="material-symbols-outlined text-icon" />
                </button>
                <button
                  onClick={() => onShowToast && onShowToast(selectedCustomer.name + ' pinned to active concierge workspace.')}
                  className="p-1 rounded-full hover:bg-scrim/25 transition-colors cursor-pointer"
                  title="Pin Profile"
                  type="button"
                >
                  <Icon name="push_pin" className="material-symbols-outlined text-icon" />
                </button>
              </div>
            </div>

            {/* Identity & Profile Info */}
            <div className="px-space-md pb-space-md -mt-10 relative space-y-space-md">
              <div className="flex items-end justify-between">
                <div className="relative shrink-0">
                  {selectedCustomer.heroAvatar || selectedCustomer.avatar ? (
                    <Thumbnail src={selectedCustomer.heroAvatar || selectedCustomer.avatar} alt={selectedCustomer.name} className="w-16 h-16 rounded-full shadow-lg" imgClassName="object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-surface-subtle text-primary text-kpi-sm font-semibold flex items-center justify-center shadow-lg ring-4 ring-surface-container-lowest">
                      {selectedCustomer.initials}
                    </div>
                  )}
                  {selectedCustomer.isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-status-success ring-2 ring-surface-container-lowest"></span>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-accent text-caption tracking-wider uppercase flex items-center gap-1 shadow-sm">
                    <Icon name="diamond" className="material-symbols-outlined text-icon-sm" /> {selectedCustomer.tier}
                  </span>
                  <span className="text-micro text-muted mt-1">{selectedCustomer.tenure}</span>
                </div>
              </div>

              <div>
                <h2 className="text-heading font-semibold text-primary tracking-tight">
                  {selectedCustomer.name}
                </h2>
                <p className="text-body text-secondary flex items-center gap-1 mt-0.5">
                  <span>{selectedCustomer.email}</span> • <span>{selectedCustomer.phone}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded bg-surface-subtle text-primary text-micro flex items-center gap-1">
                    <Icon name="check_circle" className="material-symbols-outlined text-icon-sm text-success" /> GSTIN ON FILE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-subtle text-primary text-micro flex items-center gap-1">
                    <Icon name="cake" className="material-symbols-outlined text-icon-sm text-accent" /> Birthday: {selectedCustomer.birthday}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-subtle text-primary text-micro">
                    {selectedCustomer.address}
                  </span>
                </div>
              </div>

              {/* RFM Analytics Deep-Dive Metric Grid */}
              <div className="rounded-xl bg-surface-subtle p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted uppercase tracking-wider font-semibold">
                    RFM Segment Score
                  </span>
                  <span className="text-micro font-semibold text-accent">
                    {selectedCustomer.rfmScore}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="text-micro text-muted block">RECENCY</span>
                    <span className="text-subheading font-semibold text-primary block mt-0.5">
                      {selectedCustomer.recency}
                    </span>
                    <span className="text-micro text-success">{selectedCustomer.recencySub}</span>
                  </div>
                  <div className="p-2 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="text-micro text-muted block">FREQUENCY</span>
                    <span className="text-subheading font-semibold text-primary block mt-0.5">
                      {selectedCustomer.frequency}
                    </span>
                    <span className="text-micro text-accent">{selectedCustomer.frequencySub}</span>
                  </div>
                  <div className="p-2 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="text-micro text-muted block">MONETARY</span>
                    <span className="text-subheading font-semibold text-primary block mt-0.5">
                      {selectedCustomer.monetary}
                    </span>
                    <span className="text-micro text-muted">{selectedCustomer.monetarySub}</span>
                  </div>
                </div>
              </div>

              {/* Wardrobe & Aesthetic DNA Preferences */}
              <div className="space-y-2 pt-1">
                <span className="text-caption text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Icon name="checkroom" className="material-symbols-outlined text-icon" /> Omnichannel Wardrobe DNA
                </span>
                <div className="space-y-2 text-meta">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle">
                    <span className="text-muted">Favored Category:</span>
                    <span className="font-semibold text-primary">{selectedCustomer.favCategory}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle">
                    <span className="text-muted">Apparel Sizes:</span>
                    <div className="flex items-center gap-1 font-semibold text-primary">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest shadow-sm">
                        Kurtas: {selectedCustomer.kurtaSize}
                      </span>
                      {selectedCustomer.blouseSize !== 'N/A' && (
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest shadow-sm">
                          Saree Blouses: {selectedCustomer.blouseSize}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle">
                    <span className="text-muted">Preferred Textiles:</span>
                    <span className="font-medium text-primary">{selectedCustomer.textiles}</span>
                  </div>
                </div>
              </div>

              {/* Loyalty Points Ledger & Store Credit Wallet */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-subtle bg-surface-subtle p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon name="account_balance_wallet" className="material-symbols-outlined text-accent text-icon-md" />
                    <span className="text-subheading text-primary font-semibold">
                      Loyalty &amp; Credit Ledger
                    </span>
                  </div>
                  <button
                    onClick={() => onShowToast && onShowToast('Audit history downloaded for ' + selectedCustomer.name)}
                    className="text-accent text-caption font-semibold hover:underline cursor-pointer"
                    type="button"
                  >
                    Audit History
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="text-micro text-muted block">COUTURE POINTS</span>
                    <span className="text-heading font-semibold text-accent block mt-0.5">
                      {selectedCustomer.points}
                    </span>
                    <span className="text-micro text-muted">{selectedCustomer.pointsValue}</span>
                  </div>
                  <div className="p-2.5 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="text-micro text-muted block">STORE CREDIT LIAB</span>
                    <span className="text-heading font-semibold text-primary block mt-0.5">
                      {selectedCustomer.storeCredit}
                    </span>
                    <span className="text-micro text-success">{selectedCustomer.openReturns}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-meta">
                  <span className="text-muted">Personalized Tier Privilege:</span>
                  <span className="font-semibold text-accent">{selectedCustomer.discountPrivilege}</span>
                </div>
              </div>

              {/* Recent Purchase History & Line Item Thumbs */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted uppercase tracking-wider font-semibold">
                    Recent Order Timeline
                  </span>
                  <span
                    onClick={() => onShowToast && onShowToast('Navigating to full orders list filtered by customer...')}
                    className="text-meta text-accent font-medium hover:underline cursor-pointer"
                  >
                    View all {selectedCustomer.ordersCount}
                  </span>
                </div>

                {selectedCustomer.recentOrders.map((ord, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-surface-subtle space-y-2">
                    <div className="flex items-center justify-between text-meta">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <span>{ord.id}</span>
                        <span className={`px-1.5 py-px rounded-full text-micro ${ord.statusColor}`}>
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-num font-semibold text-primary">
                        {ord.amount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Thumbnail src={ord.image} alt={ord.title} className="w-10 h-10 rounded-md shadow-sm shrink-0" imgClassName="object-cover" />
                      <div className="flex flex-col min-w-0 flex-1 text-micro">
                        <span className="font-medium text-primary truncate">{ord.title}</span>
                        <span className="text-muted truncate">{ord.subtitle}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Concierge Support Notes */}
              <div className="p-3 rounded-lg bg-status-warning-bg/40 space-y-1.5 border border-status-warning/20">
                <div className="flex items-center justify-between text-meta">
                  <span className="text-caption text-warning uppercase tracking-wider flex items-center gap-1">
                    <Icon name="support_agent" className="material-symbols-outlined text-icon-sm" /> Dedicated Concierge Note
                  </span>
                  <span className="text-micro text-muted">Assigned: {selectedCustomer.conciergeStylist}</span>
                </div>
                <p className="text-meta text-primary italic leading-relaxed">
                  {selectedCustomer.conciergeNote}
                </p>
              </div>

              {/* Quick Action Drawer Triggers */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => onShowToast && onShowToast('Goodwill Store Credit dialogue launched for ' + selectedCustomer.name)}
                  className="w-full h-9 rounded-xl bg-primary-container text-on-accent text-label-lg font-medium hover:bg-primary-container-hover shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  type="button"
                >
                  <Icon name="redeem" className="material-symbols-outlined text-icon" />
                  <span>Issue Goodwill Store Credit / Coupon</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onShowToast && onShowToast('WhatsApp chat window initiated for ' + selectedCustomer.phone)}
                    className="h-9 px-2 rounded-xl bg-surface-subtle text-primary text-label font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    type="button"
                  >
                    <Icon name="chat" className="material-symbols-outlined text-icon text-muted" />
                    <span>Send WhatsApp</span>
                  </button>
                  <button
                    onClick={() => onShowToast && onShowToast('Stylist assignment drawer opened.')}
                    className="h-9 px-2 rounded-xl bg-surface-subtle text-primary text-label font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    type="button"
                  >
                    <Icon name="face_6" className="material-symbols-outlined text-icon text-muted" />
                    <span>Change Stylist</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Omnichannel Touchpoints Analytics Micro-Card */}
          <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm space-y-3 border border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-subheading text-primary font-semibold">Store Footprint Cross-Over</span>
              <Icon name="storefront" className="material-symbols-outlined text-muted text-icon-md" />
            </div>
            <p className="text-body text-secondary">
              {selectedCustomer.offlineVisits}
            </p>
            <div className="flex items-center justify-between pt-1 text-meta">
              <span className="text-muted">Online to Offline Spend Split:</span>
              <span className="font-semibold text-primary">{selectedCustomer.spendSplit}</span>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
