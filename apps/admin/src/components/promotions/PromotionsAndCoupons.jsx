import React, { useState, useEffect, useMemo } from 'react';
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
  SearchInput,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable, TableToolbar } from '../shared/DataTable';
import { campaigns } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import {
  usePromotionsQuery,
  useCreatePromotionMutation,
  useTogglePromotionMutation,
  useDeletePromotionMutation
} from '../../hooks/useAdminQueries';

export function PromotionsAndCoupons({ onNavigate, onShowToast }) {
  const [selectedCode, setSelectedCode] = useState('FESTIVE20');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'live', 'vip', 'expired'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('omni');
  const [selectedRows, setSelectedRows] = useState({ 'FESTIVE20': true });

  // TanStack Query for promotions
  const {
    data: promotionsData,
    isLoading: isPromotionsLoading,
    isError: isPromotionsError,
    error: promotionsError,
    refetch: refetchPromotions,
  } = usePromotionsQuery();
  const createPromotionMutation = useCreatePromotionMutation();
  const togglePromotionMutation = useTogglePromotionMutation();
  const deletePromotionMutation = useDeletePromotionMutation();

  const [dbPromotions, setDbPromotions] = useState([]);
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [promoForm, setPromoForm] = useState({
    code: '',
    type: 'percentage',
    value: 20,
    currency: 'inr',
    usageLimit: '',
    active: true,
  });

  useEffect(() => {
    if (promotionsData?.promotions) {
      setDbPromotions(promotionsData.promotions);
    }
  }, [promotionsData]);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!promoForm.code) return;

    setIsSubmitting(true);
    try {
      await createPromotionMutation.mutateAsync({
        code: promoForm.code.toUpperCase().trim(),
        type: promoForm.type,
        value: promoForm.type === 'percentage' ? Number(promoForm.value) : Number(promoForm.value) * 100, // convert major to minor paise if fixed
        currency: promoForm.type === 'fixed' ? (promoForm.currency || 'inr') : null,
        usageLimit: promoForm.usageLimit ? Number(promoForm.usageLimit) : null,
        active: promoForm.active,
      });

      onShowToast?.({
        type: 'success',
        title: 'Promotion Created',
        message: `Campaign code "${promoForm.code.toUpperCase()}" created and active.`,
      });
      setIsCreatePromoOpen(false);
      setPromoForm({ code: '', type: 'percentage', value: 20, currency: 'inr', usageLimit: '', active: true });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Creation Failed',
        message: err?.message || 'Could not create promotion.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (promoId, currentActive, promoCode) => {
    try {
      await togglePromotionMutation.mutateAsync({ promoId, active: !currentActive });
      onShowToast?.({
        type: 'info',
        title: 'Status Updated',
        message: `Promo ${promoCode} is now ${!currentActive ? 'active' : 'inactive'}.`,
      });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Update Failed',
        message: err?.message || 'Could not update promotion status.',
      });
    }
  };

  const handleDeletePromo = async (promoId, promoCode) => {
    if (!confirm(`Are you sure you want to delete promo ${promoCode}?`)) return;
    try {
      await deletePromotionMutation.mutateAsync(promoId);
      onShowToast?.({
        type: 'info',
        title: 'Promotion Deleted',
        message: `Promo code ${promoCode} deleted.`,
      });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Cannot delete used code. Deactivate it instead.',
      });
    }
  };

  // Merge live promotions with mock campaigns
  const mergedCampaigns = useMemo(() => {
    const fromDb = dbPromotions.map(p => ({
      code: p.code,
      id: p.id,
      isDbPromo: true,
      name: p.type === 'percentage' ? `${p.value}% Off Entire Order` : `Flat ₹${p.value / 100} Discount`,
      type: p.type === 'percentage' ? 'Percentage' : 'Fixed Minor',
      applicability: 'All Omnichannel Channels',
      excluded: p.usageLimit ? `Limit: ${p.usageLimit} uses` : 'Unlimited Uses',
      isUrgent: false,
      redemptions: `${p.usageCount ?? 0} Uses`,
      progress: Math.min(100, Math.round(((p.usageCount ?? 0) / (p.usageLimit || 100)) * 100)),
      progressColor: 'bg-primary-container',
      gmvImpact: '₹4.2L',
      marginHealth: 'Safe (48%)',
      marginHealthColor: 'bg-status-success-bg text-success',
      status: p.active ? 'Live' : 'Paused',
      statusColor: p.active ? 'bg-status-success-bg text-success' : 'bg-surface-subtle text-muted',
      icon: 'local_offer',
      iconColor: 'bg-primary-container text-on-accent',
      isAuto: false,
      active: p.active,
    }));

    return [...fromDb, ...campaigns.filter(c => !fromDb.some(p => p.code === c.code))];
  }, [dbPromotions]);

  const selectedCampaign = mergedCampaigns.find(c => c.code === selectedCode) || mergedCampaigns[0];

  const filteredCampaigns = mergedCampaigns.filter(c => {
    if (activeTab === 'live' && c.status !== 'Live') return false;
    if (activeTab === 'vip' && !c.code.includes('VIP') && !c.code.includes('INFLUENCER')) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  // One shared pager over the rows this module actually holds.
  const promosPager = useClientTable(filteredCampaigns);

  const toggleSelectRow = (code) => {
    setSelectedRows(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  if (isPromotionsLoading) {
    return <SkeletonPage variant="cards" stats={6} statsCols={6} label="Loading promotions" />;
  }


  // Selected row ids in the shape DataTable expects.
  const selectedCodes = Object.keys(selectedRows).filter((code) => selectedRows[code]);

  // One column definition per visible column. Cells keep the markup the
  // hand-rolled table used, so the ledger reads exactly as before.
  const promoColumns = [
    {
      key: 'code',
      header: 'Campaign & Coupon Code',
      cell: (camp) => (
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${camp.iconColor}`}>
            <Icon name={camp.icon} className="material-symbols-outlined text-icon" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-body-lg font-semibold text-primary tracking-tight">{camp.code}</span>
              {camp.isAuto && (
                <span className="px-1.5 py-px rounded bg-primary-fixed text-on-primary-fixed text-micro font-semibold">
                  AUTO
                </span>
              )}
              <button
                className="text-muted hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(camp.code);
                  onShowToast?.(`Copied coupon code ${camp.code}`);
                }}
                title="Copy Code"
              >
                <Icon name="content_copy" className="material-symbols-outlined text-icon-sm" />
              </button>
            </div>
            <span className="text-micro text-muted truncate">{camp.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (camp) => (
        <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-surface-subtle text-primary text-caption font-semibold border border-subtle">
          {camp.type}
        </span>
      ),
    },
    {
      key: 'applicability',
      header: 'Applicability / Guardrails',
      cell: (camp) => (
        <div className="flex flex-col">
          <span className="text-label text-primary font-medium">{camp.applicability}</span>
          <span className={`text-micro truncate ${camp.isUrgent ? 'text-danger font-semibold' : 'text-warning'}`}>
            {camp.excluded}
          </span>
        </div>
      ),
    },
    {
      key: 'redemptions',
      header: 'Redemptions',
      align: 'right',
      cell: (camp) => (
        <div className="flex flex-col items-end">
          <span className="text-num font-semibold text-primary">{camp.redemptions}</span>
          <div className="w-16 bg-surface-subtle h-1 rounded-full overflow-hidden mt-1 border border-subtle">
            <div className={`${camp.progressColor} h-full`} style={{ width: `${camp.progress}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: 'gmvImpact',
      header: 'GMV Impact',
      align: 'right',
      className: 'text-num font-semibold text-primary',
      accessor: 'gmvImpact',
    },
    {
      key: 'marginHealth',
      header: 'Margin Health',
      align: 'center',
      cell: (camp) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-success-bg text-success text-caption font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
          <span>{camp.marginHealth}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (camp) => (
        <span className={`px-2 py-0.5 rounded-full text-caption font-medium ${camp.statusColor}`}>
          {camp.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      width: '4rem',
      cell: (camp) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          {camp.isDbPromo ? (
            <>
              <button
                className={`p-1 rounded hover:bg-surface-subtle cursor-pointer ${camp.active ? 'text-success' : 'text-muted'}`}
                onClick={() => handleToggleActive(camp.id, camp.active, camp.code)}
                title={camp.active ? 'Pause Promotion' : 'Activate Promotion'}
              >
                <Icon name={camp.active ? 'toggle_on' : 'toggle_off'} className="material-symbols-outlined text-icon-md" />
              </button>
              <button
                className="p-1 rounded hover:bg-status-danger-bg text-muted hover:text-danger cursor-pointer"
                onClick={() => handleDeletePromo(camp.id, camp.code)}
                title="Delete Promo"
              >
                <Icon name="delete" className="material-symbols-outlined text-icon" />
              </button>
            </>
          ) : (
            <button
              className="p-1 rounded hover:bg-surface-subtle text-muted hover:text-primary"
              onClick={() => onShowToast?.(`Options for promo ${camp.code}`)}
              title="More actions"
              aria-label="More actions"
            >
              <Icon name="more_vert" className="material-symbols-outlined text-icon-md" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      {promotionsError && (
        <ErrorState
          title="Promotions could not be loaded"
          message={promotionsError?.message}
          onRetry={() => refetchPromotions()}
        />
      )}
      <PageHeader
        breadcrumb="Everwear Admin / Settings & Admin / Promotions & Coupons"
        title="Promotions, Discount Engines & Coupon Campaign Orchestration"
        description="Manage cart-level discounts, VIP influencer codes, flash vouchers, margin-guarded threshold rules, and omnichannel promo attribution across all e-store nodes."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm lg:shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.("Running real-time cart rule conflict simulation...")}
              icon="science"
            >
              Simulate Cart Rules
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.("Exporting campaign audit ledger CSV...")}
              icon="download"
            >
              Export Campaign Ledger
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreatePromoOpen(true)}
              icon="add"
            >
              Create Promo Campaign
            </Button>
          </div>
        }
      />

      {/* KPI Summary Banner (5 Metric Cards) */}
      <ContentGrid columns={5}>
        <StatsCard
          label="Active Promotions"
          value="24 Live"
          change="+4 this wk"
          changeType="positive"
          icon="campaign"
          subtitle="12 Auto-Applied • 12 Coupon Codes"
        />
        <StatsCard
          label="Promo-Driven GMV"
          value="₹1.94 Cr"
          change="+18.2%"
          changeType="positive"
          icon="payments"
          subtitle="28.4% of total May GMV volume"
        />
        <StatsCard
          label="Blended Discount Depth"
          value="18.2%"
          change="Target <20%"
          changeType="positive"
          icon="percent"
          subtitle="Blended discount depth across orders"
        />
        <StatsCard
          label="Coupon Redemptions"
          value="64,280"
          change="Uses"
          changeType="neutral"
          icon="confirmation_number"
          subtitle="Avg. 2.14 vouchers / cart"
        />
        <StatsCard
          label="Margin Shield Triggers"
          value="312"
          change="Blocked"
          changeType="negative"
          icon="security"
          subtitle="Saved ~₹14.8L in leaks"
        />
      </ContentGrid>

      {/* Filters & Segmentation Toolbar */}
      <div className="p-space-sm bg-surface-container-lowest rounded-xl shadow-sm border border-subtle flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
        {/* Segment Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-label font-semibold whitespace-nowrap shadow-sm transition-all ${
 activeTab === 'all'
 ? 'bg-primary-container text-on-accent'
 : 'text-muted hover:bg-surface-subtle hover:text-primary'
 }`}
          >
            All Campaigns (24)
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-lg text-label font-semibold whitespace-nowrap transition-all ${
 activeTab === 'live'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:bg-surface-subtle hover:text-primary'
 }`}
          >
            Live & Scheduled (18)
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`px-3 py-1.5 rounded-lg text-label font-semibold whitespace-nowrap transition-all ${
 activeTab === 'vip'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:bg-surface-subtle hover:text-primary'
 }`}
          >
            Influencer & VIP (6)
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`px-3 py-1.5 rounded-lg text-label font-semibold whitespace-nowrap transition-all ${
 activeTab === 'expired'
 ? 'bg-primary-container text-on-accent shadow-sm'
 : 'text-muted hover:bg-surface-subtle hover:text-primary'
 }`}
          >
            Expired / Paused (14)
          </button>
        </div>

        {/* Search & Facets */}
        <div className="flex items-center gap-space-xs flex-wrap sm:flex-nowrap">
          <SearchInput
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
            onClear={() => setSearchQuery('')}
            placeholder="Filter code or trigger"
            label="Filter campaigns"
            className="w-full sm:w-64 sm:flex-initial"
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8"
          >
            <option value="all">Category: All</option>
            <option value="ethnic">Ethnic Wear</option>
            <option value="western">Western Coutures</option>
            <option value="silk">Pure Silk Collections</option>
          </Select>
          <Select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="h-8"
          >
            <option value="omni">Channel: Omnichannel</option>
            <option value="app">Mobile App Only</option>
            <option value="web">Web Storefront</option>
          </Select>
          <button
            onClick={() => onShowToast?.('Adjusted campaign ledger column views')}
            className="h-8 w-8 rounded-lg bg-surface-subtle border border-subtle hover:bg-surface-container-high text-muted hover:text-primary flex items-center justify-center transition-colors"
            title="Column Layout View"
            type="button"
          >
            <Icon name="view_column" className="material-symbols-outlined text-icon-md" />
          </button>
        </div>
      </div>

      {/* Main Split Architecture: Table (65%) + Campaign Inspector (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left Data Table Column (8 Cols ~ 66.6%) */}
        <div className="lg:col-span-8 flex flex-col space-y-space-md">
          <DataTable
            data={promosPager.pageRows}
            columns={promoColumns}
            keyField="code"
            className="min-w-[980px]"
            selectable
            selectedIds={selectedCodes}
            onSelectRow={(code) => toggleSelectRow(code)}
            onSelectAll={(checked) =>
              setSelectedRows(
                checked ? Object.fromEntries(filteredCampaigns.map((c) => [c.code, true])) : {}
              )
            }
            activeRowId={selectedCode}
            onRowClick={(row) => setSelectedCode(row.code)}
            emptyIcon="sell"
            emptyTitle="No campaigns match these filters"
            emptyMessage="No promotion rule matches the current search, audience or channel selection."
            pagination={{
              page: promosPager.page,
              pageSize: promosPager.limit,
              totalItems: promosPager.total,
              onPageChange: promosPager.setPage,
              onPageSizeChange: promosPager.setLimit,
            }}
            toolbar={
              <TableToolbar
                className="bg-surface-canvas px-space-md py-3"
                left={
                  <div className="flex items-center gap-2">
                    <span className="text-subheading text-primary font-semibold">Active Engine Rules</span>
                    <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-surface-subtle text-muted text-caption border border-subtle font-semibold">
                      {filteredCampaigns.length} Rules
                    </span>
                  </div>
                }
                right={
                  <button
                    onClick={() => onShowToast?.('Bulk actions menu opened')}
                    className="px-2 py-1 rounded bg-surface-subtle border border-subtle text-muted hover:text-primary text-caption uppercase flex items-center gap-1 transition-colors"
                  >
                    <Icon name="tune" className="material-symbols-outlined text-icon-sm" />
                    <span>Bulk Actions</span>
                  </button>
                }
              />
            }
          />

          {/* Real-Time Rule Simulation Log Module */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-subtle flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="bolt" className="material-symbols-outlined text-accent text-icon-md" />
                <span className="text-subheading text-primary font-semibold">Simulated Stack Resolution Engine</span>
              </div>
              <span className="text-caption text-muted uppercase">Deterministic Stacking: ON</span>
            </div>
            <p className="text-body text-secondary">
              Rule engine evaluates hierarchically: <strong>Product-Level Markdown &gt; Cart-Level Auto Promos &gt; Coupon Code &gt; Payment Tender Bank Offers</strong>. Auto-exclusion triggered when combined discount pushes product net GMV below target cost margin.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-1">
              <div className="p-space-sm bg-surface-canvas rounded-lg border border-subtle">
                <span className="text-caption text-muted uppercase block">Primary Conflict Mode</span>
                <span className="text-label font-semibold text-primary">Greedy High-Value Wins</span>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-lg border border-subtle">
                <span className="text-caption text-muted uppercase block">Bank Offer Stack</span>
                <span className="text-label font-semibold text-success">Allowed (HDFC/ICICI 10%)</span>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-lg border border-subtle">
                <span className="text-caption text-muted uppercase block">Max Combined Concession</span>
                <span className="text-label font-semibold text-primary">Cap 32.5% of Cart MRP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Campaign Inspector (4 Cols ~ 33.3%) */}
        <div className="lg:col-span-4 flex flex-col space-y-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-subtle flex flex-col space-y-space-md">
            {/* Inspector Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-caption text-accent uppercase font-semibold tracking-wider">
                    Live Campaign Inspector
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">
                    ACTIVE
                  </span>
                </div>
                <h2 className="text-heading text-primary font-semibold mt-0.5 flex items-center gap-1.5">
                  {selectedCampaign.code}
                </h2>
                <span className="text-meta text-muted">{selectedCampaign.subTitle ?? 'Not recorded'}</span>
              </div>
              <button
                onClick={() => onShowToast?.(`Refreshed telemetry for ${selectedCampaign.code}`)}
                className="p-1.5 rounded-lg bg-surface-canvas border border-subtle hover:bg-surface-subtle text-muted hover:text-primary transition-colors"
                title="Refresh Telemetry"
              >
                <Icon name="sync" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>

            {/* Telemetry Metrics & Sparkline Graphic */}
            <div className="p-space-sm rounded-xl bg-surface-canvas border border-subtle flex flex-col space-y-space-sm">
              <div className="flex items-center justify-between">
                <span className="text-caption text-muted uppercase">Redemption Velocity (Last 6 Hours)</span>
                <span className="text-micro font-semibold text-success">{selectedCampaign.velocity ?? 'Not recorded'}</span>
              </div>
              {/* Inline SVG Sparkline */}
              <div className="w-full h-14 relative flex items-end">
                <svg className="w-full h-full text-accent" preserveAspectRatio="none" viewBox="0 0 100 35">
                  <defs>
                    <linearGradient id="promoGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"></stop>
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0.0"></stop>
                    </linearGradient>
                  </defs>
                  <path d="M0,28 Q10,24 20,27 T40,16 T60,20 T80,8 T100,5 L100,35 L0,35 Z" fill="url(#promoGrad)"></path>
                  <path d="M0,28 Q10,24 20,27 T40,16 T60,20 T80,8 T100,5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-space-xs pt-1">
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-subtle">
                  <span className="text-caption text-muted uppercase block">AOV Uplift</span>
                  <span className="text-body-lg font-semibold text-primary">{selectedCampaign.aovUplift ?? 'Not recorded'}</span>
                  <span className="text-micro text-success block">{selectedCampaign.aovUpliftSub ?? 'Not recorded'}</span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-subtle">
                  <span className="text-caption text-muted uppercase block">Net Margin Post-Promo</span>
                  <span className="text-body-lg font-semibold text-primary">{selectedCampaign.netMargin ?? 'Not recorded'}</span>
                  <span className="text-micro text-success block">{selectedCampaign.netMarginSub ?? 'Not recorded'}</span>
                </div>
              </div>
            </div>

            {/* Margin Guardrails Warning/Status Card */}
            <div className="p-space-sm rounded-xl bg-status-success-bg/60 border border-status-success/20 flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <Icon name="verified_user" className="material-symbols-outlined text-icon-md text-success" />
                <span className="text-label font-semibold text-success">Margin Threshold Guard Enforced</span>
              </div>
              <p className="text-meta text-muted leading-relaxed">
                System enforces automatic coupon suppression if post-discount contribution margin drops below <strong>45.0%</strong> on SKU basket.
              </p>
            </div>

            {/* Eligible Category & Exclusion Tree */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-caption text-muted uppercase">Product Scope & Exclusions</span>
                <button
                  onClick={() => onShowToast?.(`Editing SKU scope for ${selectedCampaign.code}`)}
                  className="text-accent hover:underline text-micro font-semibold"
                >
                  Modify SKU Scope
                </button>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-xl border border-subtle flex flex-col space-y-2">
                {/* Included */}
                <div className="flex items-start gap-2">
                  <Icon name="check_circle" className="material-symbols-outlined text-icon text-success shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-label font-semibold text-primary">
                      Category: {selectedCampaign.categoryScope ?? 'Not recorded'}
                    </span>
                    <span className="text-micro text-muted">{selectedCampaign.scopeSkus ?? 'Not recorded'}</span>
                  </div>
                </div>
                {/* Excluded SKU Badges */}
                <div className="flex items-start gap-2 pt-1">
                  <Icon name="do_not_disturb_on" className="material-symbols-outlined text-icon text-danger shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0 space-y-1">
                    <span className="text-label font-semibold text-primary">Target Exclusions</span>
                    <div className="flex flex-wrap gap-1">
                      {(selectedCampaign.exclusions ?? []).map((ex, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-status-danger-bg text-danger text-micro">
                          {ex}
                        </span>
                      ))}
                      {(selectedCampaign.exclusions ?? []).length === 0 && (
                        <span className="text-micro text-muted">
                          No exclusion rules recorded for this promotion.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fraud & Checkout Abuse Shield */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-caption text-muted uppercase">Abuse Mitigation Rules</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-muted text-micro border border-subtle">
                  L3 STRICT
                </span>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-xl border border-subtle space-y-2">
                <div className="flex items-center justify-between text-meta">
                  <span className="text-muted">Device Fingerprint Cap</span>
                  <span className="font-semibold text-primary">{selectedCampaign.fraudDevice ?? 'Not recorded'}</span>
                </div>
                <div className="flex items-center justify-between text-meta">
                  <span className="text-muted">Customer Identity</span>
                  <span className="font-semibold text-primary">{selectedCampaign.fraudAuth ?? 'Not recorded'}</span>
                </div>
                <div className="flex items-center justify-between text-meta">
                  <span className="text-muted">Min Cart Qualifying Value</span>
                  <span className="font-semibold text-primary">{selectedCampaign.fraudMinCart ?? 'Not recorded'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-col space-y-2">
              <div className="grid grid-cols-2 gap-space-xs">
                <button
                  onClick={() => onShowToast?.(`Editing usage quota cap for ${selectedCampaign.code}`)}
                  className="h-9 px-3 rounded-lg bg-surface-subtle border border-subtle hover:bg-surface-container-high text-primary text-label font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  type="button"
                >
                  <Icon name="edit" className="material-symbols-outlined text-icon" />
                  <span>Edit Cap</span>
                </button>
                <button
                  onClick={() => onShowToast?.(`Generated affiliate deep link for ${selectedCampaign.code}`)}
                  className="h-9 px-3 rounded-lg bg-surface-subtle border border-subtle hover:bg-surface-container-high text-primary text-label font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  type="button"
                >
                  <Icon name="link" className="material-symbols-outlined text-icon" />
                  <span>Affiliate Link</span>
                </button>
              </div>
              <button
                onClick={() => onShowToast?.(`Paused coupon ${selectedCampaign.code} across all edge nodes.`)}
                className="h-9 px-3 rounded-lg bg-status-danger-bg hover:bg-status-danger text-danger hover:text-on-accent text-label font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99] border border-status-danger/20"
                type="button"
              >
                <Icon name="pause_circle" className="material-symbols-outlined text-icon-md" />
                <span>Pause {selectedCampaign.code} Instantly</span>
              </button>
            </div>
          </div>

          {/* Omnichannel Attribution Preview Card */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-subtle flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <span className="text-subheading text-primary font-semibold">Channel Attribution Split</span>
              <span className="text-micro text-muted">30-Day Aggregation</span>
            </div>
            {/* Simple Horizontal Bar Chart */}
            <div className="space-y-2 pt-1 text-meta">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted font-medium">iOS & Android Apps</span>
                  <span className="font-semibold text-primary">62.4% (₹1.21 Cr)</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-subtle">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '62.4%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted font-medium">Responsive Web (Mobile + Desktop)</span>
                  <span className="font-semibold text-primary">31.2% (₹60.5 L)</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-subtle">
                  <div className="bg-fashion-magenta h-full rounded-full" style={{ width: '31.2%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted font-medium">POS / In-Store Endless Aisle</span>
                  <span className="font-semibold text-primary">6.4% (₹12.4 L)</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-subtle">
                  <div className="bg-status-info h-full rounded-full" style={{ width: '6.4%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Promo Campaign Modal */}
      {isCreatePromoOpen && (
        <div className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-subtle max-w-md w-full overflow-hidden animate-fade-in fade-in duration-150">
            <div className="p-space-lg border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="local_offer" className="p-2 rounded-xl bg-primary-container text-on-accent material-symbols-outlined text-icon-lg" />
                <div>
                  <h3 className="font-semibold text-primary">Create Promo Campaign</h3>
                  <p className="text-meta text-muted">Configure cart discount rules and voucher codes</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreatePromoOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-muted" title="Close" aria-label="Close"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="p-space-lg space-y-4">
              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DIWALI30"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-mono font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container uppercase whitespace-nowrap"
                />
                <p className="text-micro text-muted mt-1">3 to 32 letters, numbers, or dashes.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-meta font-semibold text-muted mb-1">Discount Type</label>
                  <Select
                    value={promoForm.type}
                    onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}
                    aria-label="Discount type"
                    options={[
                      { value: 'percentage', label: 'Percentage off (%)' },
                      { value: 'fixed', label: 'Fixed amount (₹ / €)' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-meta font-semibold text-muted mb-1">
                    {promoForm.type === 'percentage' ? 'Percentage Value (1-100)' : 'Amount (Major Currency)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={promoForm.type === 'percentage' ? 100 : 100000}
                    value={promoForm.value}
                    onChange={(e) => setPromoForm({ ...promoForm, value: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              </div>

              {promoForm.type === 'fixed' && (
                <div>
                  <label className="block text-meta font-semibold text-muted mb-1">Currency</label>
                  <Select
                    value={promoForm.currency}
                    onChange={(e) => setPromoForm({ ...promoForm, currency: e.target.value })}
                    aria-label="Currency"
                    options={[
                      { value: 'inr', label: 'INR (Indian rupee, ₹)' },
                      { value: 'eur', label: 'EUR (euro, €)' },
                    ]}
                  />
                </div>
              )}

              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Max Redemptions (Optional)</label>
                <input
                  type="number"
                  placeholder="Leave empty for unlimited uses"
                  min={1}
                  max={100000}
                  value={promoForm.usageLimit}
                  onChange={(e) => setPromoForm({ ...promoForm, usageLimit: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo-active-chk"
                  checked={promoForm.active}
                  onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })}
                  className="w-4 h-4 accent-primary-container rounded cursor-pointer"
                />
                <label htmlFor="promo-active-chk" className="text-meta font-semibold text-primary cursor-pointer">
                  Activate campaign immediately upon creation
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setIsCreatePromoOpen(false)}
                  className="h-9 px-4 rounded-xl border border-subtle bg-surface-container-lowest text-primary text-meta font-semibold hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary-container hover:bg-primary-container-hover text-on-accent text-meta font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Icon name={isSubmitting ? 'hourglass_top' : 'check'} className="material-symbols-outlined text-icon" />
                  <span>{isSubmitting ? 'Creating...' : 'Launch Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
