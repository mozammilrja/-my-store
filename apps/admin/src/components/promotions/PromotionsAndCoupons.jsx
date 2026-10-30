import React, { useState, useEffect, useMemo } from 'react';
import { Select } from '../ui/select';
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
  const { data: promotionsData, isLoading: isPromotionsLoading } = usePromotionsQuery();
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
      marginHealthColor: 'bg-status-success-bg text-status-success',
      status: p.active ? 'Live' : 'Paused',
      statusColor: p.active ? 'bg-status-success-bg text-status-success' : 'bg-surface-subtle text-text-secondary',
      icon: 'local_offer',
      iconColor: 'bg-primary-container text-white',
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

  const toggleSelectRow = (code) => {
    setSelectedRows(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Sub-header & Title Section */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-border-subtle">
        <div className="flex flex-col space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
            <span>Everwear Admin</span>
            <span className="material-symbols-outlined text-[13px] text-text-secondary">chevron_right</span>
            <span>Settings & Admin</span>
            <span className="material-symbols-outlined text-[13px] text-text-secondary">chevron_right</span>
            <span className="text-primary-container font-semibold">Promotions & Coupons</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight font-semibold">
            Promotions, Discount Engines & Coupon Campaign Orchestration
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary max-w-4xl">
            Manage cart-level discounts, VIP influencer codes, flash vouchers, margin-guarded threshold rules, and omnichannel promo attribution across all e-store nodes.
          </p>
        </div>
        {/* Top Action Buttons */}
        <div className="flex items-center gap-space-sm shrink-0 flex-wrap">
          <button
            onClick={() => onShowToast?.('Running real-time cart rule conflict simulation...')}
            className="h-9 px-3 rounded-lg bg-surface-container-lowest text-text-primary border border-border-subtle hover:bg-surface-subtle shadow-sm flex items-center gap-1.5 font-label-md text-label-md transition-all active:scale-[0.98]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-primary-container">science</span>
            <span>Simulate Cart Rules</span>
          </button>
          <button
            onClick={() => onShowToast?.('Exporting campaign audit ledger CSV...')}
            className="h-9 px-3 rounded-lg bg-surface-container-lowest text-text-primary border border-border-subtle hover:bg-surface-subtle shadow-sm flex items-center gap-1.5 font-label-md text-label-md transition-all active:scale-[0.98]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-text-secondary">download</span>
            <span>Export Campaign Ledger</span>
          </button>
          <button
            onClick={() => setIsCreatePromoOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm flex items-center gap-1.5 font-label-md text-label-md font-semibold active:scale-[0.98] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Promo Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Banner (5 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-space-md">
        {/* KPI 1 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col justify-between space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Active Promotions</span>
            <span className="w-7 h-7 rounded-lg bg-status-success-bg text-status-success flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">campaign</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric-stat text-metric-stat text-text-primary font-semibold">24 Live</span>
              <span className="font-label-xs-caps text-[10px] text-status-success bg-status-success-bg px-1.5 py-0.5 rounded-full font-semibold">
                +4 this wk
              </span>
            </div>
            <div className="font-body-sm text-[12px] text-text-secondary mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
              <span>12 Auto-Applied • 12 Coupon Codes</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Promo-Driven GMV</span>
            <span className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">payments</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric-stat text-metric-stat text-text-primary font-semibold">₹1.94 Cr</span>
              <span className="font-label-xs-caps text-[10px] text-status-success bg-status-success-bg px-1.5 py-0.5 rounded-full font-semibold">
                +18.2%
              </span>
            </div>
            <span className="font-body-sm text-[12px] text-text-secondary mt-1 block">
              28.4% of total May GMV volume
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Blended Discount Depth</span>
            <span className="w-7 h-7 rounded-lg bg-status-info-bg text-status-info flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">percent</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric-stat text-metric-stat text-text-primary font-semibold">18.2%</span>
              <span className="font-label-xs-caps text-[10px] text-status-success bg-status-success-bg px-1.5 py-0.5 rounded-full font-semibold">
                Target &lt;20%
              </span>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full mt-2 overflow-hidden border border-border-subtle">
              <div className="bg-primary-container h-full rounded-full" style={{ width: '72%' }}></div>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Coupon Redemptions</span>
            <span className="w-7 h-7 rounded-lg bg-status-warning-bg text-status-warning flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric-stat text-metric-stat text-text-primary font-semibold">64,280</span>
              <span className="font-label-xs-caps text-[10px] text-text-secondary bg-surface-subtle px-1.5 py-0.5 rounded-full border border-border-subtle font-semibold">
                Uses
              </span>
            </div>
            <span className="font-body-sm text-[12px] text-text-secondary mt-1 block">
              Avg. 2.14 vouchers / transacting cart
            </span>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Margin Shield Triggers</span>
            <span className="w-7 h-7 rounded-lg bg-status-danger-bg text-status-danger flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">security</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-metric-stat text-metric-stat text-status-danger font-semibold">312</span>
              <span className="font-label-xs-caps text-[10px] text-status-danger bg-status-danger-bg px-1.5 py-0.5 rounded-full font-semibold">
                Blocked
              </span>
            </div>
            <span className="font-body-sm text-[12px] text-text-secondary mt-1 block">
              Saved ~₹14.8L in stacked discount leaks
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Segmentation Toolbar */}
      <div className="p-space-sm bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
        {/* Segment Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold whitespace-nowrap shadow-sm transition-all ${
              activeTab === 'all'
                ? 'bg-primary-container text-on-primary'
                : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
            }`}
          >
            All Campaigns (24)
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'live'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
            }`}
          >
            Live & Scheduled (18)
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'vip'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
            }`}
          >
            Influencer & VIP (6)
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'expired'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
            }`}
          >
            Expired / Paused (14)
          </button>
        </div>

        {/* Search & Facets */}
        <div className="flex items-center gap-space-xs flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-text-secondary pointer-events-none">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-surface-canvas border border-border-subtle rounded-lg font-body-sm text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-container shadow-sm"
              placeholder="Filter code or trigger..."
              type="text"
            />
          </div>
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
            className="h-8 w-8 rounded-lg bg-surface-subtle border border-border-subtle hover:bg-surface-container-high text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            title="Column Layout View"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">view_column</span>
          </button>
        </div>
      </div>

      {/* Main Split Architecture: Table (65%) + Campaign Inspector (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left Data Table Column (8 Cols ~ 66.6%) */}
        <div className="lg:col-span-8 flex flex-col space-y-space-md">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col">
            {/* Table Header Bar */}
            <div className="px-space-md py-3 bg-surface-canvas border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Active Engine Rules</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-text-secondary font-label-xs-caps text-label-xs-caps border border-border-subtle font-semibold">
                  {filteredCampaigns.length} Rules
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onShowToast?.('Bulk actions menu opened')}
                  className="px-2 py-1 rounded bg-surface-subtle border border-border-subtle text-text-secondary hover:text-text-primary font-label-xs-caps text-label-xs-caps uppercase flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  <span>Bulk Actions</span>
                </button>
              </div>
            </div>

            {/* Table Viewport */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-surface-canvas font-label-xs-caps text-label-xs-caps text-text-secondary uppercase select-none border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2.5 px-3 w-8 whitespace-nowrap">
                      <input className="rounded bg-surface-canvas text-primary focus:ring-0 cursor-pointer" type="checkbox" />
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Campaign &amp; Coupon Code</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Type</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Applicability / Guardrails</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Redemptions</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">GMV Impact</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Margin Health</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-2 text-center w-10 whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm">
                  {filteredCampaigns.map((camp) => {
                    const isSelected = selectedCode === camp.code;
                    return (
                      <tr
                        key={camp.code}
                        onClick={() => setSelectedCode(camp.code)}
                        className={`cursor-pointer transition-colors relative ${
                          isSelected ? 'bg-primary-fixed/20 hover:bg-primary-fixed/30' : 'bg-surface-container-lowest hover:bg-surface-canvas'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <input
                            checked={!!selectedRows[camp.code]}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectRow(camp.code);
                            }}
                            className="rounded bg-surface-canvas text-primary focus:ring-0 cursor-pointer"
                            type="checkbox"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${camp.iconColor}`}>
                              <span className="material-symbols-outlined text-[16px]">{camp.icon}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-headline-sm text-body-md font-semibold text-text-primary tracking-tight">
                                  {camp.code}
                                </span>
                                {camp.isAuto && (
                                  <span className="px-1.5 py-0.2 rounded bg-primary-fixed text-primary-container font-label-xs-caps text-[9px] font-semibold">
                                    AUTO
                                  </span>
                                )}
                                <button
                                  className="text-text-secondary hover:text-text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(camp.code);
                                    onShowToast?.(`Copied coupon code ${camp.code}`);
                                  }}
                                  title="Copy Code"
                                >
                                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                </button>
                              </div>
                              <span className="font-label-xs-caps text-[11px] text-text-secondary truncate">{camp.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-text-primary font-label-xs-caps text-label-xs-caps font-semibold border border-border-subtle">
                            {camp.type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm text-text-primary font-medium">{camp.applicability}</span>
                            <span className={`font-label-xs-caps text-[10px] truncate ${
                              camp.isUrgent ? 'text-status-danger font-semibold' : 'text-status-warning'
                            }`}>
                              {camp.excluded}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-table-cell-num text-table-cell-num font-semibold text-text-primary">
                              {camp.redemptions}
                            </span>
                            <div className="w-16 bg-surface-subtle h-1 rounded-full overflow-hidden mt-1 border border-border-subtle">
                              <div className={`${camp.progressColor} h-full`} style={{ width: `${camp.progress}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-table-cell-num text-table-cell-num font-semibold text-text-primary">
                          {camp.gmvImpact}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-label-xs-caps font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-success"></span>
                            <span>{camp.marginHealth}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps font-medium ${camp.statusColor}`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {camp.isDbPromo ? (
                              <>
                                <button
                                  className={`p-1 rounded hover:bg-surface-subtle cursor-pointer ${camp.active ? 'text-status-success' : 'text-text-secondary'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleActive(camp.id, camp.active, camp.code);
                                  }}
                                  title={camp.active ? "Pause Promotion" : "Activate Promotion"}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {camp.active ? 'toggle_on' : 'toggle_off'}
                                  </span>
                                </button>
                                <button
                                  className="p-1 rounded hover:bg-status-danger-bg text-text-secondary hover:text-status-danger cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePromo(camp.id, camp.code);
                                  }}
                                  title="Delete Promo"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </>
                            ) : (
                              <button
                                className="p-1 rounded hover:bg-surface-subtle text-text-secondary hover:text-text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShowToast?.(`Options for promo ${camp.code}`);
                                }}
                              >
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="px-space-md py-2.5 bg-surface-canvas border-t border-border-subtle flex items-center justify-between font-body-sm text-[12px] text-text-secondary">
              <div className="flex items-center gap-1">
                <span>Showing <strong className="text-text-primary">1-5</strong> of 24 promo engines</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-2.5 py-1 rounded bg-surface-container-lowest shadow-sm text-text-secondary hover:text-text-primary font-medium border border-border-subtle" disabled>
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  <button className="w-6 h-6 rounded bg-primary-container text-on-primary font-semibold text-center leading-6">1</button>
                  <button className="w-6 h-6 rounded hover:bg-surface-subtle text-text-secondary text-center leading-6">2</button>
                  <button className="w-6 h-6 rounded hover:bg-surface-subtle text-text-secondary text-center leading-6">3</button>
                </div>
                <button className="px-2.5 py-1 rounded bg-surface-container-lowest shadow-sm text-text-secondary hover:text-text-primary font-medium border border-border-subtle">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Rule Simulation Log Module */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[18px]">bolt</span>
                <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Simulated Stack Resolution Engine</span>
              </div>
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Deterministic Stacking: ON</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Rule engine evaluates hierarchically: <strong>Product-Level Markdown &gt; Cart-Level Auto Promos &gt; Coupon Code &gt; Payment Tender Bank Offers</strong>. Auto-exclusion triggered when combined discount pushes product net GMV below target cost margin.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-1">
              <div className="p-space-sm bg-surface-canvas rounded-lg border border-border-subtle">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase block">Primary Conflict Mode</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">Greedy High-Value Wins</span>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-lg border border-border-subtle">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase block">Bank Offer Stack</span>
                <span className="font-label-sm text-label-sm font-semibold text-status-success">Allowed (HDFC/ICICI 10%)</span>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-lg border border-border-subtle">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase block">Max Combined Concession</span>
                <span className="font-label-sm text-label-sm font-semibold text-text-primary">Cap 32.5% of Cart MRP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Campaign Inspector (4 Cols ~ 33.3%) */}
        <div className="lg:col-span-4 flex flex-col space-y-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col space-y-space-md">
            {/* Inspector Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-label-xs-caps text-label-xs-caps text-primary-container uppercase font-bold tracking-wider">
                    Live Campaign Inspector
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-[10px] font-semibold">
                    ACTIVE
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-text-primary font-semibold mt-0.5 flex items-center gap-1.5">
                  {selectedCampaign.code}
                </h2>
                <span className="font-body-sm text-[12px] text-text-secondary">{selectedCampaign.subTitle}</span>
              </div>
              <button
                onClick={() => onShowToast?.(`Refreshed telemetry for ${selectedCampaign.code}`)}
                className="p-1.5 rounded-lg bg-surface-canvas border border-border-subtle hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors"
                title="Refresh Telemetry"
              >
                <span className="material-symbols-outlined text-[18px]">sync</span>
              </button>
            </div>

            {/* Telemetry Metrics & Sparkline Graphic */}
            <div className="p-space-sm rounded-xl bg-surface-canvas border border-border-subtle flex flex-col space-y-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Redemption Velocity (Last 6 Hours)</span>
                <span className="font-label-xs-caps text-[11px] font-semibold text-status-success">{selectedCampaign.velocity}</span>
              </div>
              {/* Inline SVG Sparkline */}
              <div className="w-full h-14 relative flex items-end">
                <svg className="w-full h-full text-primary-container" preserveAspectRatio="none" viewBox="0 0 100 35">
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
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-border-subtle">
                  <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase block">AOV Uplift</span>
                  <span className="font-headline-sm text-body-lg font-semibold text-text-primary">{selectedCampaign.aovUplift}</span>
                  <span className="font-label-xs-caps text-[10px] text-status-success block">{selectedCampaign.aovUpliftSub}</span>
                </div>
                <div className="bg-surface-container-lowest p-2 rounded-lg border border-border-subtle">
                  <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase block">Net Margin Post-Promo</span>
                  <span className="font-headline-sm text-body-lg font-semibold text-text-primary">{selectedCampaign.netMargin}</span>
                  <span className="font-label-xs-caps text-[10px] text-status-success block">{selectedCampaign.netMarginSub}</span>
                </div>
              </div>
            </div>

            {/* Margin Guardrails Warning/Status Card */}
            <div className="p-space-sm rounded-xl bg-status-success-bg/60 border border-status-success/20 flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-status-success">verified_user</span>
                <span className="font-label-sm text-label-sm font-semibold text-status-success">Margin Threshold Guard Enforced</span>
              </div>
              <p className="font-body-sm text-[12px] text-text-secondary leading-relaxed">
                System enforces automatic coupon suppression if post-discount contribution margin drops below <strong>45.0%</strong> on SKU basket.
              </p>
            </div>

            {/* Eligible Category & Exclusion Tree */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Product Scope & Exclusions</span>
                <button
                  onClick={() => onShowToast?.(`Editing SKU scope for ${selectedCampaign.code}`)}
                  className="font-label-xs-caps text-primary-container hover:underline text-[11px] font-semibold"
                >
                  Modify SKU Scope
                </button>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-xl border border-border-subtle flex flex-col space-y-2">
                {/* Included */}
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-status-success shrink-0 mt-0.5">check_circle</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm font-semibold text-text-primary">
                      Category: {selectedCampaign.categoryScope}
                    </span>
                    <span className="font-body-sm text-[11px] text-text-secondary">{selectedCampaign.scopeSkus}</span>
                  </div>
                </div>
                {/* Excluded SKU Badges */}
                <div className="flex items-start gap-2 pt-1">
                  <span className="material-symbols-outlined text-[16px] text-status-danger shrink-0 mt-0.5">do_not_disturb_on</span>
                  <div className="flex flex-col min-w-0 space-y-1">
                    <span className="font-label-sm text-label-sm font-semibold text-text-primary">Target Exclusions</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedCampaign.exclusions.map((ex, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-status-danger-bg text-status-danger font-label-xs-caps text-[10px] font-medium">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fraud & Checkout Abuse Shield */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Abuse Mitigation Rules</span>
                <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-text-secondary font-label-xs-caps text-[10px] border border-border-subtle">
                  L3 STRICT
                </span>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-xl border border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-[12px] font-body-sm">
                  <span className="text-text-secondary">Device Fingerprint Cap</span>
                  <span className="font-semibold text-text-primary">{selectedCampaign.fraudDevice}</span>
                </div>
                <div className="flex items-center justify-between text-[12px] font-body-sm">
                  <span className="text-text-secondary">Customer Identity</span>
                  <span className="font-semibold text-text-primary">{selectedCampaign.fraudAuth}</span>
                </div>
                <div className="flex items-center justify-between text-[12px] font-body-sm">
                  <span className="text-text-secondary">Min Cart Qualifying Value</span>
                  <span className="font-semibold text-text-primary">{selectedCampaign.fraudMinCart}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-col space-y-2">
              <div className="grid grid-cols-2 gap-space-xs">
                <button
                  onClick={() => onShowToast?.(`Editing usage quota cap for ${selectedCampaign.code}`)}
                  className="h-9 px-3 rounded-lg bg-surface-subtle border border-border-subtle hover:bg-surface-container-high text-text-primary font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span>Edit Cap</span>
                </button>
                <button
                  onClick={() => onShowToast?.(`Generated affiliate deep link for ${selectedCampaign.code}`)}
                  className="h-9 px-3 rounded-lg bg-surface-subtle border border-border-subtle hover:bg-surface-container-high text-text-primary font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  <span>Affiliate Link</span>
                </button>
              </div>
              <button
                onClick={() => onShowToast?.(`Paused coupon ${selectedCampaign.code} across all edge nodes.`)}
                className="h-9 px-3 rounded-lg bg-status-danger-bg hover:bg-status-danger text-status-danger hover:text-white font-label-sm text-label-sm font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99] border border-status-danger/20"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                <span>Pause {selectedCampaign.code} Instantly</span>
              </button>
            </div>
          </div>

          {/* Omnichannel Attribution Preview Card */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm border border-border-subtle flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Channel Attribution Split</span>
              <span className="font-label-xs-caps text-[10px] text-text-secondary">30-Day Aggregation</span>
            </div>
            {/* Simple Horizontal Bar Chart */}
            <div className="space-y-2 pt-1 font-body-sm text-[12px]">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary font-medium">iOS & Android Apps</span>
                  <span className="font-semibold text-text-primary">62.4% (₹1.21 Cr)</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-border-subtle">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '62.4%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary font-medium">Responsive Web (Mobile + Desktop)</span>
                  <span className="font-semibold text-text-primary">31.2% (₹60.5 L)</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-border-subtle">
                  <div className="bg-fashion-magenta h-full rounded-full" style={{ width: '31.2%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary font-medium">POS / In-Store Endless Aisle</span>
                  <span className="font-semibold text-text-primary">6.4% (₹12.4 L)</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-border-subtle">
                  <div className="bg-status-info h-full rounded-full" style={{ width: '6.4%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Promo Campaign Modal */}
      {isCreatePromoOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-border-subtle max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-space-lg border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-container text-white material-symbols-outlined text-[20px]">local_offer</span>
                <div>
                  <h3 className="font-headline-sm font-semibold text-text-primary">Create Promo Campaign</h3>
                  <p className="text-xs text-text-secondary">Configure cart discount rules and voucher codes</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreatePromoOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-text-secondary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="p-space-lg space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DIWALI30"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container uppercase"
                />
                <p className="text-[10px] text-text-secondary mt-1">3 to 32 letters, numbers, or dashes.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Discount Type</label>
                  <select
                    value={promoForm.type}
                    onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                  >
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="fixed">Fixed Amount (₹ / €)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    {promoForm.type === 'percentage' ? 'Percentage Value (1-100)' : 'Amount (Major Currency)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={promoForm.type === 'percentage' ? 100 : 100000}
                    value={promoForm.value}
                    onChange={(e) => setPromoForm({ ...promoForm, value: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              </div>

              {promoForm.type === 'fixed' && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Currency</label>
                  <select
                    value={promoForm.currency}
                    onChange={(e) => setPromoForm({ ...promoForm, currency: e.target.value })}
                    className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                  >
                    <option value="inr">INR (Indian Rupee - ₹)</option>
                    <option value="eur">EUR (Euro - €)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Max Redemptions (Optional)</label>
                <input
                  type="number"
                  placeholder="Leave empty for unlimited uses"
                  min={1}
                  max={100000}
                  value={promoForm.usageLimit}
                  onChange={(e) => setPromoForm({ ...promoForm, usageLimit: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-border-subtle rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
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
                <label htmlFor="promo-active-chk" className="text-xs font-semibold text-text-primary cursor-pointer">
                  Activate campaign immediately upon creation
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsCreatePromoOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border-subtle bg-surface-container-lowest text-text-primary text-xs font-semibold hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isSubmitting ? 'hourglass_top' : 'check'}
                  </span>
                  <span>{isSubmitting ? 'Creating...' : 'Launch Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
