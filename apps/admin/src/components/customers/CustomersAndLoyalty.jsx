import React, { useState, useMemo, useEffect } from 'react';
import { Select } from '../ui/select';
import { customerList } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';

export function CustomersAndLoyalty({ onNavigate, onShowToast }) {
  const [activeSegment, setActiveSegment] = useState('all'); // 'all', 'vip', 'risk', 'dormant', 'rfm'
  const [selectedCustomerId, setSelectedCustomerId] = useState('cust-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [ltvFilter, setLtvFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [activeFilters, setActiveFilters] = useState([
    { id: 'f-tier', label: 'VIP Club Couture' },
    { id: 'f-ret', label: 'Return Rate < 10%' }
  ]);
  const [dbCustomers, setDbCustomers] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);

  useEffect(() => {
    adminApi.customers({ limit: 50 })
      .then(res => {
        if (res?.customers) {
          setDbCustomers(res.customers);
        }
      })
      .catch(err => {
        console.warn('Could not load customers from API:', err?.message);
      });
  }, []);

  // When a db customer is selected, fetch their real order history
  useEffect(() => {
    if (selectedCustomerId && selectedCustomerId.startsWith('cust_')) {
      adminApi.customer(selectedCustomerId)
        .then(res => {
          if (res?.orders) setCustomerOrders(res.orders);
        })
        .catch(() => setCustomerOrders([]));
    } else {
      setCustomerOrders([]);
    }
  }, [selectedCustomerId]);

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
        tierBadge: (c.orderCount ?? 0) >= 3 ? 'bg-primary-container text-white' : 'bg-surface-subtle text-text-primary',
        badgeIcon: (c.orderCount ?? 0) >= 3 ? 'diamond' : 'workspace_premium',
        idBadge: `ID #${c.id.slice(-6).toUpperCase()}`,
        email: c.email,
        phone: c.phone || '+91 98450 00000',
        geo: address,
        address: c.addresses?.[0]?.address1 || 'Verified Address On File',
        birthday: 'Aug 18',
        tenure: `Customer since ${new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        gmv: '₹48,900',
        ordersCount: `${c.orderCount ?? 0} Orders`,
        aov: '₹6,400',
        returnRate: '2.4% (Low)',
        returnRateColor: 'text-status-success',
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
          statusColor: o.status === 'delivered' ? 'bg-status-success-bg text-status-success' : 'bg-status-info-bg text-status-info',
          amount: formatMoney(o.totals?.total ?? 0, o.currency ?? 'inr'),
          title: o.items?.[0]?.title || 'Artisanal Apparel Garment',
          subtitle: `Ordered on ${new Date(o.createdAt).toLocaleDateString()}`,
          image: o.items?.[0]?.thumbnail || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=200',
        })),
      };
    });

    return [...fromDb, ...customerList.filter(m => !fromDb.some(d => d.email === m.email))];
  }, [dbCustomers, customerOrders]);

  const selectedCustomer = useMemo(() => {
    return mergedCustomers.find(c => c.id === selectedCustomerId) || mergedCustomers[0];
  }, [mergedCustomers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    return mergedCustomers.filter(c => {
      if (activeSegment === 'vip' && !c.tier.includes('COUTURE')) return false;
      if (activeSegment === 'risk' && !c.returnRate.includes('9.0%') && !c.returnRate.includes('7.1%') && !c.id.includes('cust-3')) return false;
      if (activeSegment === 'dormant' && c.id !== 'cust-3' && c.id !== 'cust-5') return false;

      if (tierFilter !== 'ALL') {
        if (tierFilter === 'vip' && !c.tier.includes('COUTURE')) return false;
        if (tierFilter === 'gold' && !c.tier.includes('Gold')) return false;
        if (tierFilter === 'new' && !c.tier.includes('New')) return false;
      }

      if (cityFilter !== 'ALL') {
        if (!c.geo.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.email.toLowerCase().includes(q) &&
          !c.phone.includes(q) &&
          !c.geo.toLowerCase().includes(q) &&
          !c.idBadge.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [activeSegment, tierFilter, cityFilter, searchQuery]);

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

  return (
    <div className="space-y-space-md w-full">
      {/* Top Context Header & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              onClick={() => onNavigate && onNavigate('overview')}
              className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-widest uppercase cursor-pointer hover:text-text-primary transition-colors"
            >
              EVERWEAR ADMIN
            </span>
            <span className="text-text-secondary font-label-xs-caps">/</span>
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-widest uppercase">
              SETTINGS &amp; ADMIN
            </span>
            <span className="text-text-secondary font-label-xs-caps">/</span>
            <span className="font-label-xs-caps text-label-xs-caps text-primary-container font-semibold tracking-widest uppercase">
              CUSTOMERS &amp; LOYALTY
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight font-semibold flex items-center gap-space-sm flex-wrap">
            Customer Intelligence, VIP Tiers &amp; Loyalty Operations
            <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-status-info font-label-xs-caps text-label-xs-caps font-semibold">
              CRM v4.8
            </span>
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary max-w-4xl">
            Comprehensive customer 360 profiles, RFM segment analytics, omnichannel loyalty point ledger, and VIP concierge management.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-sm shrink-0">
          <button
            onClick={() => onShowToast && onShowToast('Exporting Customer & Loyalty Ledger as CSV...')}
            className="h-9 px-space-md rounded-xl bg-surface-container-lowest text-text-primary hover:bg-surface-subtle shadow-sm font-label-md text-label-md flex items-center gap-1.5 transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px] text-text-secondary">file_download</span>
            <span>Export Ledger (CSV)</span>
          </button>
          <button
            onClick={() => onShowToast && onShowToast('Segment campaign configuration modal opened.')}
            className="h-9 px-space-md rounded-xl bg-surface-subtle text-text-primary hover:bg-surface-container-high shadow-sm font-label-md text-label-md flex items-center gap-1.5 transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px] text-text-secondary">campaign</span>
            <span>Trigger Segment Campaign</span>
          </button>
          <button
            onClick={() => onShowToast && onShowToast('Concierge note modal initialized for ' + selectedCustomer.name)}
            className="h-9 px-space-md rounded-xl bg-surface-container-lowest text-text-primary hover:bg-surface-subtle shadow-sm font-label-md text-label-md flex items-center gap-1.5 transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px] text-text-secondary">person_add</span>
            <span>+ Add Concierge Note</span>
          </button>
          <button
            onClick={() => onShowToast && onShowToast('Loyalty tier rules & multiplier engine configuration open.')}
            className="h-9 px-space-md rounded-xl bg-primary-container text-on-primary hover:bg-primary shadow-sm font-label-md text-label-md flex items-center gap-1.5 transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">tune</span>
            <span>Adjust Loyalty Rules</span>
          </button>
        </div>
      </div>

      {/* KPI / Performance Matrix Strip (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-space-md">
        {/* Card 1 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-wider uppercase">
              Total Customers
            </span>
            <span className="w-7 h-7 rounded-lg bg-surface-subtle flex items-center justify-center text-text-secondary">
              <span className="material-symbols-outlined text-[16px]">groups</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-semibold">
              148,290
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-label-xs-caps font-semibold">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>+12.4% MoM
            </span>
          </div>
          <span className="font-label-sm text-[11px] text-text-secondary mt-1">Omnichannel active pan-India</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container opacity-40"></div>
        </div>

        {/* Card 2 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-wider uppercase">
              VIP Club Couture
            </span>
            <span className="w-7 h-7 rounded-lg bg-primary-fixed flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[16px]">diamond</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-semibold">
              4,820
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary-fixed text-primary-container font-label-xs-caps text-label-xs-caps font-semibold">
              Tier 1 HNW
            </span>
          </div>
          <span className="font-label-sm text-[11px] text-text-secondary mt-1">Avg annual spend &gt; ₹1.25L</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container"></div>
        </div>

        {/* Card 3 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-wider uppercase">
              Repeat Purchase Rate
            </span>
            <span className="w-7 h-7 rounded-lg bg-surface-subtle flex items-center justify-center text-text-secondary">
              <span className="material-symbols-outlined text-[16px]">repeat</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-semibold">
              41.8%
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-label-xs-caps font-semibold">
              +3.2pp YoY
            </span>
          </div>
          <span className="font-label-sm text-[11px] text-text-secondary mt-1">30-day cohort retention window</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-status-success opacity-40"></div>
        </div>

        {/* Card 4 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-wider uppercase">
              Loyalty Points In Float
            </span>
            <span className="w-7 h-7 rounded-lg bg-status-info-bg flex items-center justify-center text-status-info">
              <span className="material-symbols-outlined text-[16px]">toll</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-semibold">
              18.4M <span className="text-xs font-normal text-text-secondary">Pts</span>
            </span>
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary font-medium">
              Valuation ₹18.4L
            </span>
          </div>
          <span className="font-label-sm text-[11px] text-text-secondary mt-1">Redemption rate: 76.4%</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-status-info opacity-40"></div>
        </div>

        {/* Card 5 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-wider uppercase">
              Store Credit Liability
            </span>
            <span className="w-7 h-7 rounded-lg bg-status-warning-bg flex items-center justify-center text-status-warning">
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-metric-stat text-metric-stat text-text-primary tracking-tight font-semibold">
              ₹4.12 <span className="text-xs font-normal text-text-secondary">Lakhs</span>
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-warning-bg text-status-warning font-label-xs-caps text-label-xs-caps font-semibold">
              Pending
            </span>
          </div>
          <span className="font-label-sm text-[11px] text-text-secondary mt-1">From returns/exchanges</span>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-status-warning opacity-40"></div>
        </div>
      </div>

      {/* Primary Split Workflow Canvas (8 Cols Directory + 4 Cols 360 Profile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Central Directory / Table Column (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-space-md min-w-0">
          {/* Segment Navigation Pills */}
          <div className="bg-surface-container-lowest rounded-xl p-1.5 shadow-sm flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 min-w-max">
              <button
                onClick={() => setActiveSegment('all')}
                className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeSegment === 'all'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subte'
                }`}
                type="button"
              >
                <span>All Customers</span>
                <span className={`px-1.5 py-0.2 rounded-full font-label-xs-caps text-[10px] ${
                  activeSegment === 'all' ? 'bg-white/20 text-white' : 'bg-surface-subtle text-text-secondary'
                }`}>
                  148,290
                </span>
              </button>
              <button
                onClick={() => setActiveSegment('vip')}
                className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  activeSegment === 'vip'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                }`}
                type="button"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                <span>VIP Club Couture</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-subtle text-text-secondary font-label-xs-caps text-[10px]">
                  4,820
                </span>
              </button>
              <button
                onClick={() => setActiveSegment('risk')}
                className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  activeSegment === 'risk'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                }`}
                type="button"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-danger"></span>
                <span>High Return Risk</span>
                <span className="px-1.5 py-0.2 rounded-full bg-status-danger-bg text-status-danger font-label-xs-caps text-[10px]">
                  890
                </span>
              </button>
              <button
                onClick={() => setActiveSegment('dormant')}
                className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  activeSegment === 'dormant'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                }`}
                type="button"
              >
                <span>Dormant Reactivation</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-subtle text-text-secondary font-label-xs-caps text-[10px]">
                  12,400
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveSegment('rfm');
                  if (onShowToast) onShowToast('RFM 3D matrix filter activated.');
                }}
                className={`px-3.5 py-1.5 rounded-lg font-label-sm text-label-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeSegment === 'rfm'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">pie_chart</span>
                <span>RFM Segments</span>
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-1 shrink-0 pl-2">
              <button
                onClick={() => onShowToast && onShowToast('Configuring column visibility...')}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-all cursor-pointer"
                title="View Options"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">view_column</span>
              </button>
              <button
                onClick={() => onShowToast && onShowToast('Row density toggled.')}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-all cursor-pointer"
                title="Density Toggle"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">density_medium</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-5 relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-text-secondary text-[18px]">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-subtle text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all"
                  placeholder="Search customer, phone, email, or order ID..."
                  type="text"
                />
              </div>
              <div className="md:col-span-3">
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
              <div className="md:col-span-2">
                <Select
                  value={ltvFilter}
                  onChange={(e) => setLtvFilter(e.target.value)}
                  className="h-9"
                >
                  <option value="ALL">LTV Threshold</option>
                  <option value="25k">&gt; ₹25,000</option>
                  <option value="50k">&gt; ₹50,000</option>
                  <option value="100k">&gt; ₹1,00,000</option>
                </Select>
              </div>
              <div className="md:col-span-2">
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
            <div className="flex items-center justify-between pt-1 font-label-xs-caps text-label-xs-caps text-text-secondary flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Active filters:</span>
                {activeFilters.map(filter => (
                  <span
                    key={filter.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-subtle text-text-primary font-label-sm text-[11px]"
                  >
                    {filter.label}
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="hover:text-status-danger cursor-pointer ml-0.5"
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-fixed text-primary-container font-label-sm text-[11px]">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:opacity-70 cursor-pointer ml-0.5" type="button">
                      ×
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={clearAllFilters}
                className="text-primary-container hover:underline lowercase font-label-xs-caps text-[11px] cursor-pointer"
                type="button"
              >
                Clear all filters
              </button>
            </div>
          </div>

          {/* Directory Data Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-border-subtle">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-surface-subtle font-label-xs-caps text-label-xs-caps text-text-secondary uppercase select-none border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Customer &amp; Tier</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Contact &amp; Geo</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Lifetime Orders / GMV</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">AOV / Ret Rate</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Loyalty Float</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Last Active</th>
                    <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-subtle font-body-sm text-body-sm text-text-primary">
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
                                <img
                                  className={`w-8 h-8 rounded-full object-cover shadow-sm ring-2 ${
                                    isSelected ? 'ring-primary-container' : 'ring-border-subtle'
                                  }`}
                                  src={cust.avatar}
                                  alt={cust.name}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-surface-subtle text-text-secondary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                                  {cust.initials}
                                </div>
                              )}
                              {cust.tier.includes('COUTURE') && (
                                <span
                                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary-container flex items-center justify-center text-white shadow-xs"
                                  title="VIP Couture"
                                >
                                  <span className="material-symbols-outlined text-[9px]">star</span>
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-label-md text-label-md font-semibold text-text-primary flex items-center gap-1.5 flex-wrap">
                                {cust.name}
                                <span className={`px-1.5 py-0.2 rounded-full font-label-xs-caps text-[9px] tracking-wider uppercase font-semibold ${cust.tierBadge}`}>
                                  {cust.tier}
                                </span>
                              </span>
                              <span className="font-label-xs-caps text-[11px] text-text-secondary truncate">
                                {cust.idBadge}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Geo */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-text-primary font-medium text-xs truncate max-w-[170px]">
                              {cust.email}
                            </span>
                            <span className="text-text-secondary text-[11px] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">location_on</span>
                              {cust.geo}
                            </span>
                          </div>
                        </td>

                        {/* Lifetime Orders / GMV */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-text-primary font-table-cell-num text-table-cell-num">
                              {cust.gmv}
                            </span>
                            <span className="text-text-secondary text-[11px]">{cust.ordersCount}</span>
                          </div>
                        </td>

                        {/* AOV / Ret Rate */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-text-primary font-table-cell-num text-[12px]">
                              {cust.aov}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 font-label-xs-caps text-[10px] font-semibold ${cust.returnRateColor}`}>
                              {cust.returnRate.includes('Low') && <span className="w-1.5 h-1.5 rounded-full bg-status-success mr-0.5"></span>}
                              {cust.returnRate}
                            </span>
                          </div>
                        </td>

                        {/* Loyalty Float */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-primary-container font-table-cell-num text-[12px]">
                              {cust.points}
                            </span>
                            <span className="text-text-secondary text-[11px]">{cust.pointsValue}</span>
                          </div>
                        </td>

                        {/* Last Active */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-text-primary font-medium text-xs flex items-center gap-1">
                              {cust.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>}
                              {cust.lastActive}
                            </span>
                            <span className="text-text-secondary text-[11px] truncate max-w-[140px]">
                              {cust.lastActiveSub}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-center">
                          {isSelected ? (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-primary-container text-white font-label-sm text-[12px] font-medium shadow-sm hover:bg-primary transition-all cursor-pointer"
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
                              className="px-2.5 py-1 rounded-lg bg-surface-subtle text-text-primary font-label-sm text-[12px] font-medium hover:bg-surface-container-high transition-all cursor-pointer"
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

            {/* Table Pagination Footer */}
            <div className="p-3 bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-secondary select-none border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <Select className="h-7 px-2 rounded bg-surface-container-lowest text-text-primary font-medium border border-border-subtle w-16" defaultValue="25">
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </Select>
                <span className="hidden sm:inline">Showing records 1 - 5 of 148,290</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1 rounded bg-surface-container-lowest text-text-secondary hover:text-text-primary disabled:opacity-40 cursor-pointer"
                  disabled
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <button className="px-2 py-0.5 rounded bg-primary-container text-white font-semibold cursor-pointer" type="button">
                  1
                </button>
                <button className="px-2 py-0.5 rounded bg-surface-container-lowest hover:bg-surface-container-high text-text-primary cursor-pointer" type="button">
                  2
                </button>
                <button className="px-2 py-0.5 rounded bg-surface-container-lowest hover:bg-surface-container-high text-text-primary cursor-pointer" type="button">
                  3
                </button>
                <span className="px-1 text-text-secondary">...</span>
                <button className="px-2 py-0.5 rounded bg-surface-container-lowest hover:bg-surface-container-high text-text-primary cursor-pointer" type="button">
                  5,931
                </button>
                <button className="p-1 rounded bg-surface-container-lowest text-text-secondary hover:text-text-primary cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Segment Quick-Actions & Cohort Intelligence Widget (2 Bottom Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Widget 1 */}
            <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm space-y-3 border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[18px]">verified</span>
                  <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Tier Migration Matrix</span>
                </div>
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">Q2 Run-rate</span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary">
                184 Silver Silk members are within ₹5,000 GMV of ascending to Gold Atelier status this fortnight.
              </p>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-text-primary">Target Conversion Pipeline</span>
                  <span className="font-semibold text-primary-container">64.2%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full" style={{ width: '64.2%' }}></div>
                </div>
              </div>
            </div>

            {/* Widget 2 */}
            <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm space-y-3 border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-status-warning text-[18px]">warning</span>
                  <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">High Return Triage Queue</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning font-label-xs-caps text-[10px] font-semibold">
                  890 Flagged
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Accounts with &gt; 35% return frequency on delicate handlooms. Restrict cash on delivery and assign size verification concierge.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => onShowToast && onShowToast('Filtering directory to 890 high-return flagged profiles.')}
                  className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-text-primary font-label-sm text-label-sm font-medium transition-colors cursor-pointer"
                  type="button"
                >
                  Review High-Risk Accounts
                </button>
                <button
                  onClick={() => onShowToast && onShowToast('Handloom return policy guardrail settings opened.')}
                  className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container-high text-primary-container font-label-sm text-label-sm font-medium transition-colors cursor-pointer"
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
          {/* Top Inspector Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden relative border border-border-subtle">
            {/* Header Banner Pattern */}
            <div className="h-20 bg-gradient-to-r from-primary-container via-purple-700 to-fashion-magenta relative p-3 flex items-start justify-between">
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white font-label-xs-caps text-[10px] tracking-widest uppercase font-semibold">
                LIVE 360 INSPECTOR
              </span>
              <div className="flex items-center gap-1 text-white">
                <button
                  onClick={() => onShowToast && onShowToast('Dossier for ' + selectedCustomer.name + ' queued for print.')}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  title="Print Dossier"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                </button>
                <button
                  onClick={() => onShowToast && onShowToast(selectedCustomer.name + ' pinned to active concierge workspace.')}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  title="Pin Profile"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">push_pin</span>
                </button>
              </div>
            </div>

            {/* Identity & Profile Info */}
            <div className="px-space-md pb-space-md -mt-10 relative space-y-space-md">
              <div className="flex items-end justify-between">
                <div className="relative shrink-0">
                  {selectedCustomer.heroAvatar || selectedCustomer.avatar ? (
                    <img
                      className="w-16 h-16 rounded-full object-cover shadow-lg ring-4 ring-surface-container-lowest"
                      src={selectedCustomer.heroAvatar || selectedCustomer.avatar}
                      alt={selectedCustomer.name}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-surface-subtle text-text-primary text-xl font-bold flex items-center justify-center shadow-lg ring-4 ring-surface-container-lowest">
                      {selectedCustomer.initials}
                    </div>
                  )}
                  {selectedCustomer.isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-status-success ring-2 ring-surface-container-lowest"></span>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-white font-label-xs-caps text-[10px] tracking-wider uppercase font-semibold flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[11px]">diamond</span> {selectedCustomer.tier}
                  </span>
                  <span className="font-label-sm text-[11px] text-text-secondary mt-1">{selectedCustomer.tenure}</span>
                </div>
              </div>

              <div>
                <h2 className="font-headline-md text-headline-md font-semibold text-text-primary tracking-tight">
                  {selectedCustomer.name}
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary flex items-center gap-1 mt-0.5">
                  <span>{selectedCustomer.email}</span> • <span>{selectedCustomer.phone}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded bg-surface-subtle text-text-primary font-label-xs-caps text-[10px] font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-status-success">check_circle</span> GSTIN ON FILE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-subtle text-text-primary font-label-xs-caps text-[10px] font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-primary-container">cake</span> Birthday: {selectedCustomer.birthday}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-subtle text-text-primary font-label-xs-caps text-[10px] font-medium">
                    {selectedCustomer.address}
                  </span>
                </div>
              </div>

              {/* RFM Analytics Deep-Dive Metric Grid */}
              <div className="rounded-xl bg-surface-subtle p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                    RFM Segment Score
                  </span>
                  <span className="font-label-sm text-[11px] font-bold text-primary-container">
                    {selectedCustomer.rfmScore}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="font-label-xs-caps text-[10px] text-text-secondary block">RECENCY</span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-text-primary block mt-0.5">
                      {selectedCustomer.recency}
                    </span>
                    <span className="text-[10px] text-status-success font-medium">{selectedCustomer.recencySub}</span>
                  </div>
                  <div className="p-2 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="font-label-xs-caps text-[10px] text-text-secondary block">FREQUENCY</span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-text-primary block mt-0.5">
                      {selectedCustomer.frequency}
                    </span>
                    <span className="text-[10px] text-primary-container font-medium">{selectedCustomer.frequencySub}</span>
                  </div>
                  <div className="p-2 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="font-label-xs-caps text-[10px] text-text-secondary block">MONETARY</span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-text-primary block mt-0.5">
                      {selectedCustomer.monetary}
                    </span>
                    <span className="text-[10px] text-text-secondary font-medium">{selectedCustomer.monetarySub}</span>
                  </div>
                </div>
              </div>

              {/* Wardrobe & Aesthetic DNA Preferences */}
              <div className="space-y-2 pt-1">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">checkroom</span> Omnichannel Wardrobe DNA
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle">
                    <span className="text-text-secondary">Favored Category:</span>
                    <span className="font-semibold text-text-primary">{selectedCustomer.favCategory}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle">
                    <span className="text-text-secondary">Apparel Sizes:</span>
                    <div className="flex items-center gap-1 font-semibold text-text-primary">
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
                    <span className="text-text-secondary">Preferred Textiles:</span>
                    <span className="font-medium text-text-primary">{selectedCustomer.textiles}</span>
                  </div>
                </div>
              </div>

              {/* Loyalty Points Ledger & Store Credit Wallet */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary-fixed/40 to-surface-subtle space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary-container text-[18px]">account_balance_wallet</span>
                    <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">
                      Loyalty &amp; Credit Ledger
                    </span>
                  </div>
                  <button
                    onClick={() => onShowToast && onShowToast('Audit history downloaded for ' + selectedCustomer.name)}
                    className="text-primary-container font-label-xs-caps text-label-xs-caps font-semibold hover:underline cursor-pointer"
                    type="button"
                  >
                    Audit History
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="font-label-xs-caps text-[10px] text-text-secondary block">COUTURE POINTS</span>
                    <span className="font-headline-md text-headline-md font-bold text-primary-container block mt-0.5">
                      {selectedCustomer.points}
                    </span>
                    <span className="text-[11px] text-text-secondary">{selectedCustomer.pointsValue}</span>
                  </div>
                  <div className="p-2.5 bg-surface-container-lowest rounded-lg shadow-sm">
                    <span className="font-label-xs-caps text-[10px] text-text-secondary block">STORE CREDIT LIAB</span>
                    <span className="font-headline-md text-headline-md font-bold text-text-primary block mt-0.5">
                      {selectedCustomer.storeCredit}
                    </span>
                    <span className="text-[11px] text-status-success font-medium">{selectedCustomer.openReturns}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs">
                  <span className="text-text-secondary">Personalized Tier Privilege:</span>
                  <span className="font-semibold text-primary-container">{selectedCustomer.discountPrivilege}</span>
                </div>
              </div>

              {/* Recent Purchase History & Line Item Thumbs */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                    Recent Order Timeline
                  </span>
                  <span
                    onClick={() => onShowToast && onShowToast('Navigating to full orders list filtered by customer...')}
                    className="text-xs text-primary-container font-medium hover:underline cursor-pointer"
                  >
                    View all {selectedCustomer.ordersCount}
                  </span>
                </div>

                {selectedCustomer.recentOrders.map((ord, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-surface-subtle space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                        <span>{ord.id}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${ord.statusColor}`}>
                          {ord.status}
                        </span>
                      </div>
                      <span className="font-table-cell-num text-table-cell-num font-semibold text-text-primary">
                        {ord.amount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        className="w-10 h-10 rounded-md object-cover shadow-sm shrink-0"
                        src={ord.image}
                        alt={ord.title}
                      />
                      <div className="flex flex-col min-w-0 flex-1 text-[11px]">
                        <span className="font-medium text-text-primary truncate">{ord.title}</span>
                        <span className="text-text-secondary truncate">{ord.subtitle}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Concierge Support Notes */}
              <div className="p-3 rounded-lg bg-status-warning-bg/40 space-y-1.5 border border-status-warning/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-label-xs-caps text-[10px] text-status-warning uppercase tracking-wider font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">support_agent</span> Dedicated Concierge Note
                  </span>
                  <span className="text-[10px] text-text-secondary">Assigned: {selectedCustomer.conciergeStylist}</span>
                </div>
                <p className="font-body-sm text-xs text-text-primary italic leading-relaxed">
                  {selectedCustomer.conciergeNote}
                </p>
              </div>

              {/* Quick Action Drawer Triggers */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => onShowToast && onShowToast('Goodwill Store Credit dialogue launched for ' + selectedCustomer.name)}
                  className="w-full h-9 rounded-xl bg-primary-container text-white font-label-md text-label-md font-medium hover:bg-primary shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">redeem</span>
                  <span>Issue Goodwill Store Credit / Coupon</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onShowToast && onShowToast('WhatsApp chat window initiated for ' + selectedCustomer.phone)}
                    className="h-9 px-2 rounded-xl bg-surface-subtle text-text-primary font-label-sm text-label-sm font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-secondary">chat</span>
                    <span>Send WhatsApp</span>
                  </button>
                  <button
                    onClick={() => onShowToast && onShowToast('Stylist assignment drawer opened.')}
                    className="h-9 px-2 rounded-xl bg-surface-subtle text-text-primary font-label-sm text-label-sm font-medium hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-secondary">face_6</span>
                    <span>Change Stylist</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Omnichannel Touchpoints Analytics Micro-Card */}
          <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm space-y-3 border border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Store Footprint Cross-Over</span>
              <span className="material-symbols-outlined text-text-secondary text-[18px]">storefront</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              {selectedCustomer.offlineVisits}
            </p>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-text-secondary">Online to Offline Spend Split:</span>
              <span className="font-semibold text-text-primary">{selectedCustomer.spendSplit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
