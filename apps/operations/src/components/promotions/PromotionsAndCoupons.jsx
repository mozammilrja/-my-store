import React, { useState, useEffect, useMemo } from 'react';
import {
  Icon,
  Button,
  Badge,
  Checkbox,
  Progress,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  PageBody,
  SkeletonPage,
  SearchInput,
  FilterBar,
  SectionCard,
  AppDialog,
  ConfirmDialog,
  FormInput,
  FormSelect,
  FormGrid,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable, TableToolbar } from '../shared/DataTable';
import { formatMoney } from '../../lib/format';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { downloadCsv, datedFilename } from '../../lib/export';
import {
  useOrdersQuery,
  usePromotionsQuery,
  useCreatePromotionMutation,
  useTogglePromotionMutation,
  useDeletePromotionMutation
} from '../../hooks/useAdminQueries';

/**
 * Where a promotion stands today, read off its `active` flag and its
 * `startsAt`/`endsAt` dates. Every promotion lands in exactly one state, so
 * the tab counts add up to the total.
 */
function promotionState(p, now) {
  const starts = p.startsAt ? new Date(p.startsAt) : null;
  const ends = p.endsAt ? new Date(p.endsAt) : null;
  if (ends && ends <= now) return 'expired';
  if (!p.active) return 'paused';
  if (starts && starts > now) return 'scheduled';
  return 'live';
}

const STATE_LABEL = { live: 'Live', scheduled: 'Scheduled', paused: 'Paused', expired: 'Expired' };
const STATE_VARIANT = { live: 'success', scheduled: 'info', paused: 'secondary', expired: 'destructive' };

const PROMO_TABS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'paused', label: 'Paused' },
  { id: 'expired', label: 'Expired' },
];

const EMPTY_FORM = { code: '', type: 'percentage', value: 20, currency: 'inr', usageLimit: '', active: true };

export function PromotionsAndCoupons({ onNavigate, onShowToast }) {
  const [selectedCode, setSelectedCode] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  // TanStack Query for promotions
  const {
    data: promotionsData,
    isLoading: isPromotionsLoading,
    isError: isPromotionsError,
    error: promotionsError,
    refetch: refetchPromotions,
  } = usePromotionsQuery();

  // The GMV and discount-depth strips are measurements of orders, not of the
  // promotion records, so the orders have to be loaded to state them at all.
  const { data: ordersData } = useOrdersQuery({ limit: 100 });
  const createPromotionMutation = useCreatePromotionMutation();
  const togglePromotionMutation = useTogglePromotionMutation();
  const deletePromotionMutation = useDeletePromotionMutation();

  const [dbPromotions, setDbPromotions] = useState([]);
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [promoForm, setPromoForm] = useState(EMPTY_FORM);

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
        currency: promoForm.type === 'fixed' ? 'inr' : null,
        usageLimit: promoForm.usageLimit ? Number(promoForm.usageLimit) : null,
        active: promoForm.active,
      });

      onShowToast?.({
        type: 'success',
        title: 'Promotion Created',
        message: `Campaign code "${promoForm.code.toUpperCase()}" created${promoForm.active ? ' and active' : ''}.`,
      });
      setIsCreatePromoOpen(false);
      setPromoForm(EMPTY_FORM);
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

  const handleDeletePromo = async () => {
    if (!pendingDelete) return;
    const { id: promoId, code: promoCode } = pendingDelete;
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
    } finally {
      setPendingDelete(null);
    }
  };

  // Promotions as the API holds them. GMV impact, margin health, velocity and
  // abuse rules are not on a promotion record, so none of them are shown.
  const mergedCampaigns = useMemo(() => {
    const now = new Date();
    const dateLabel = (value) =>
      value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : null;

    return dbPromotions.map((p) => {
      const limit = p.usageLimit ?? null;
      const used = p.usageCount ?? 0;
      const starts = dateLabel(p.startsAt);
      const ends = dateLabel(p.endsAt);
      const state = promotionState(p, now);

      return {
        code: p.code,
        id: p.id,
        name:
          p.type === 'percentage'
            ? `${p.value}% off the order`
            : `Flat ${formatMoney(p.value, p.currency ?? 'inr')} off`,
        type: p.type === 'percentage' ? 'Percentage' : 'Fixed amount',
        discountLabel:
          p.type === 'percentage' ? `${p.value}%` : formatMoney(p.value, p.currency ?? 'inr'),
        window: starts && ends ? `${starts} to ${ends}` : starts ? `From ${starts}` : ends ? `Until ${ends}` : 'No end date',
        windowWarning: state === 'expired' && p.active ? 'Still switched on' : null,
        usageLabel: limit ? `${used} of ${limit}` : `${used} uses`,
        progress: limit ? Math.min(100, Math.round((used / limit) * 100)) : null,
        created: dateLabel(p.createdAt),
        state,
        status: STATE_LABEL[state],
        active: p.active,
      };
    });
  }, [dbPromotions]);

  /** Every strip above the ledger, measured off the records behind it. */
  const promoStats = useMemo(() => {
    const orders = ordersData?.orders ?? [];
    const withCode = orders.filter((o) => (o.promoCodes ?? []).length > 0);
    const subtotal = orders.reduce((t, o) => t + (o.totals?.itemSubtotal ?? 0), 0);
    const discount = orders.reduce((t, o) => t + (o.totals?.discountTotal ?? 0), 0);
    return {
      live: mergedCampaigns.filter((c) => c.state === 'live').length,
      total: mergedCampaigns.length,
      redemptions: dbPromotions.reduce((t, p) => t + (p.usageCount ?? 0), 0),
      orderCount: orders.length,
      promoOrders: withCode.length,
      promoGmv: withCode.reduce((t, o) => t + (o.totals?.total ?? 0), 0),
      depth: subtotal > 0 ? (discount / subtotal) * 100 : null,
    };
  }, [mergedCampaigns, dbPromotions, ordersData]);

  // Counted from the loaded promotions. These read 24, 18, 6 and 14 whatever
  // the store held, and "Expired / Paused" filtered nothing.
  const tabCounts = useMemo(() => {
    const counts = { all: mergedCampaigns.length, live: 0, scheduled: 0, paused: 0, expired: 0 };
    mergedCampaigns.forEach((c) => {
      counts[c.state] += 1;
    });
    return counts;
  }, [mergedCampaigns]);

  const selectedCampaign = mergedCampaigns.find(c => c.code === selectedCode) || mergedCampaigns[0];

  const filteredCampaigns = mergedCampaigns.filter(c => {
    if (activeTab !== 'all' && c.state !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!c.code.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /** Writes the campaigns currently listed. */
  const handleExportPromotions = () => {
    const written = downloadCsv({
      filename: datedFilename('promotions'),
      columns: [
        { header: 'Code', value: (c) => c.code },
        { header: 'Discount', value: (c) => c.discountLabel },
        { header: 'Type', value: (c) => c.type },
        { header: 'Active window', value: (c) => c.window },
        { header: 'Redemptions', value: (c) => c.usageLabel },
        { header: 'Status', value: (c) => c.status },
      ],
      rows: filteredCampaigns,
    });
    onShowToast?.({
      type: 'success',
      title: 'Campaigns exported',
      message: `${written} ${written === 1 ? 'row' : 'rows'} written to a CSV file.`,
    });
  };

  // One shared pager over the rows this module actually holds.
  const promosPager = useClientTable(filteredCampaigns);

  // No promotion on record at all, as against none matching the filters.
  const noCampaigns = (promotionsData?.promotions ?? []).length === 0;
  const noMatches = !noCampaigns && filteredCampaigns.length === 0;
  const clearFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
  };

  const toggleSelectRow = (code) => {
    setSelectedRows(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  if (isPromotionsLoading) {
    return <SkeletonPage variant="cards" stats={4} statsCols={4} label="Loading promotions" />;
  }


  // Selected row ids in the shape DataTable expects.
  const selectedCodes = Object.keys(selectedRows).filter((code) => selectedRows[code]);

  const promoColumns = [
    {
      key: 'code',
      header: 'Campaign & code',
      cell: (camp) => (
        <div className="flex items-center gap-space-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-subtle bg-surface-subtle text-accent">
            <Icon name="local_offer" aria-hidden="true" className="material-symbols-outlined text-icon" />
          </span>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-mono text-body font-semibold text-primary">{camp.code}</span>
              <Button
                variant="ghost"
                size="iconXs"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(camp.code);
                  onShowToast?.(`Copied coupon code ${camp.code}`);
                }}
                title="Copy code"
                aria-label={`Copy code ${camp.code}`}
              >
                <Icon name="content_copy" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              </Button>
            </div>
            <span className="truncate text-micro text-muted">{camp.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (camp) => <Badge variant="secondary">{camp.type}</Badge>,
    },
    {
      key: 'discount',
      fit: true,
      header: 'Discount',
      align: 'right',
      cell: (camp) => <span className="text-num font-semibold tabular-nums text-primary">{camp.discountLabel}</span>,
    },
    {
      key: 'window',
      // A date range reads as one unit: "04 Oct 26 to 04 Dec 26" split over two
      // lines had the eye pairing the wrong start and end dates down the column.
      header: 'Active window',
      cell: (camp) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap text-label text-primary">{camp.window}</span>
          {camp.windowWarning && (
            <span className="text-micro font-semibold text-warning">{camp.windowWarning}</span>
          )}
        </div>
      ),
    },
    {
      key: 'redemptions',
      header: 'Redemptions',
      align: 'right',
      cell: (camp) => (
        <div className="flex flex-col items-end gap-1">
          <span className="text-num font-semibold tabular-nums text-primary">{camp.usageLabel}</span>
          {camp.progress === null ? (
            <span className="text-micro text-faint">No limit</span>
          ) : (
            <>
              <Progress
                value={camp.progress}
                label={`${camp.code} redemption limit used`}
                className="h-1 w-16"
                title={`${camp.progress}% of the redemption limit used`}
              />
              <span className="text-micro tabular-nums text-muted">{camp.progress}% of limit</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      fit: true,
      header: 'Status',
      align: 'center',
      cell: (camp) => <StatusBadge status={camp.status} variant={STATE_VARIANT[camp.state]} />,
    },
    {
      key: 'actions',
      fit: true,
      header: 'Action',
      align: 'center',
      cell: (camp) => (
        <div className="flex items-center justify-center gap-space-xs" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="iconXs"
            className={camp.active ? 'text-success' : 'text-muted'}
            onClick={() => handleToggleActive(camp.id, camp.active, camp.code)}
            title={camp.active ? 'Pause promotion' : 'Activate promotion'}
            aria-label={camp.active ? `Pause ${camp.code}` : `Activate ${camp.code}`}
          >
            <Icon name={camp.active ? 'toggle_on' : 'toggle_off'} aria-hidden="true" className="material-symbols-outlined text-icon-md" />
          </Button>
          <Button
            variant="ghost"
            size="iconXs"
            className="hover:bg-status-danger-bg hover:text-danger"
            onClick={() => setPendingDelete({ id: camp.id, code: camp.code })}
            title="Delete promo"
            aria-label={`Delete ${camp.code}`}
          >
            <Icon name="delete" aria-hidden="true" className="material-symbols-outlined text-icon" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Settings & admin"
        title="Promotions & coupons"
        description="Discount codes, their dates and redemptions."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm lg:shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportPromotions}>
              <Icon name="download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Export Campaign Ledger</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsCreatePromoOpen(true)}>
              <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Create Promo Campaign</span>
            </Button>
          </div>
        }
      />
      <PageBody
        error={promotionsError}
        hasData={promotionsData != null}
        title="Promotions could not be loaded"
        onRetry={refetchPromotions}
      >

        {/* Counted from the promotions and orders the API returns. */}
        <ContentGrid columns={4}>
          <StatsCard
            label="Active promotions"
            value={`${promoStats.live} live`}
            icon="campaign"
            subtitle={`${promoStats.total} codes on record`}
          />
          <StatsCard
            label="Promo-driven GMV"
            value={formatMoney(promoStats.promoGmv, 'inr')}
            icon="payments"
            subtitle={
              promoStats.orderCount
                ? `${promoStats.promoOrders} of ${promoStats.orderCount} orders used a code`
                : 'No orders loaded'
            }
          />
          <StatsCard
            label="Blended discount depth"
            value={promoStats.depth == null ? 'Not recorded' : `${promoStats.depth.toFixed(1)}%`}
            icon="percent"
            subtitle="Discount against item subtotal, all orders"
          />
          <StatsCard
            label="Coupon redemptions"
            value={promoStats.redemptions.toLocaleString('en-IN')}
            icon="confirmation_number"
            subtitle="Counted on the promotions themselves"
          />
        </ContentGrid>

        {!noCampaigns && (
          <FilterBar
            tabs={PROMO_TABS.map((tab) => ({ ...tab, count: tabCounts[tab.id] }))}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            search={
              <SearchInput
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                onClear={() => setSearchQuery('')}
                placeholder="Filter code or discount"
                label="Filter campaigns"
                className="w-full sm:w-64"
              />
            }
          />
        )}

        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          {noCampaigns ? (
            <EmptyState
              icon="sell"
              title="No campaigns yet"
              description="Discount codes you create will be listed here with their dates, status and redemptions."
              className="py-16 lg:col-span-12"
              action={
                <Button variant="primary" size="sm" onClick={() => setIsCreatePromoOpen(true)}>
                  <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>Create Promo Campaign</span>
                </Button>
              }
            />
          ) : (
            <DataTable
              data={promosPager.pageRows}
              columns={promoColumns}
              keyField="code"
              className="min-w-[840px]"
              containerClassName={noMatches ? 'lg:col-span-12' : 'lg:col-span-8'}
              selectable
              selectedIds={selectedCodes}
              onSelectRow={(code) => toggleSelectRow(code)}
              onSelectAll={(checked) =>
                setSelectedRows(
                  checked ? Object.fromEntries(filteredCampaigns.map((c) => [c.code, true])) : {}
                )
              }
              activeRowId={selectedCode ?? selectedCampaign?.code}
              onRowClick={(row) => setSelectedCode(row.code)}
              emptyIcon="search"
              emptyTitle="No campaigns match these filters"
              emptyMessage="No promotion matches the current search or status selection."
              emptyAction={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
              pagination={{
                page: promosPager.page,
                pageSize: promosPager.limit,
                totalItems: promosPager.total,
                onPageChange: promosPager.setPage,
                onPageSizeChange: promosPager.setLimit,
              }}
              toolbar={
                <TableToolbar
                  className="px-space-md py-space-sm"
                  left={
                    <div className="flex items-center gap-space-sm">
                      <span className="text-subheading font-semibold text-primary">Campaigns</span>
                      <Badge variant="secondary" className="tabular-nums">
                        {filteredCampaigns.length}
                      </Badge>
                    </div>
                  }
                />
              }
            />
          )}

          {/* Only what a promotion records. The inspector used to show a
              drawn-in sparkline, a 45% margin guard, "L3 strict" abuse rules
              and an always-on ACTIVE badge; none of it existed. */}
          {noCampaigns || noMatches ? null : !selectedCampaign ? (
            <div className="lg:col-span-4">
              <EmptyState icon="sell" title="No campaign selected" description="Pick a campaign from the list to inspect it." />
            </div>
          ) : (
            <SectionCard
              className="lg:col-span-4"
              title={<span className="font-mono">{selectedCampaign.code}</span>}
              description={selectedCampaign.name}
              action={<StatusBadge status={selectedCampaign.status} variant={STATE_VARIANT[selectedCampaign.state]} />}
              footer={
                <div className="flex flex-wrap items-center justify-end gap-space-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-status-danger-bg hover:text-danger"
                    onClick={() => setPendingDelete({ id: selectedCampaign.id, code: selectedCampaign.code })}
                  >
                    <Icon name="delete" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                    <span>Delete</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleToggleActive(selectedCampaign.id, selectedCampaign.active, selectedCampaign.code)
                    }
                    disabled={togglePromotionMutation.isPending}
                  >
                    <Icon
                      name={selectedCampaign.active ? 'pause_circle' : 'toggle_on'}
                      aria-hidden="true"
                      className="material-symbols-outlined text-icon-sm"
                    />
                    <span>{selectedCampaign.active ? 'Pause promotion' : 'Activate promotion'}</span>
                  </Button>
                </div>
              }
            >
              <dl className="flex flex-col gap-space-sm">
                {[
                  ['Discount', selectedCampaign.discountLabel],
                  ['Type', selectedCampaign.type],
                  ['Active window', selectedCampaign.window],
                  ['Redemptions', selectedCampaign.usageLabel],
                  ['Created', selectedCampaign.created ?? 'Not recorded'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-space-md">
                    <dt className="text-meta text-muted">{label}</dt>
                    <dd className="text-right text-body tabular-nums text-primary">{value}</dd>
                  </div>
                ))}
                {selectedCampaign.windowWarning && (
                  <p className="text-meta text-warning">
                    The end date has passed but the code is still switched on.
                  </p>
                )}
                {selectedCampaign.progress !== null && (
                  <div className="flex flex-col gap-space-xs border-t border-subtle pt-space-sm">
                    <div className="flex items-center justify-between text-micro text-muted">
                      <span>Redemption limit used</span>
                      <span className="font-semibold tabular-nums text-primary">{selectedCampaign.progress}%</span>
                    </div>
                    <Progress value={selectedCampaign.progress} label="Redemption limit used" />
                  </div>
                )}
              </dl>
            </SectionCard>
          )}
        </div>

        <AppDialog
          isOpen={isCreatePromoOpen}
          onClose={() => setIsCreatePromoOpen(false)}
          title="Create promo campaign"
          description="Set the discount and the voucher code customers enter at checkout."
          maxWidth="max-w-md"
        >
          <form id="create-promo-form" onSubmit={handleCreatePromo} className="flex flex-col gap-space-md">
            <FormInput
              id="promo-code"
              label="Coupon code"
              required
              placeholder="e.g. DIWALI30"
              value={promoForm.code}
              onChange={(value) => setPromoForm({ ...promoForm, code: value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
              helperText="3 to 32 letters, numbers, or dashes."
              inputClassName="font-mono uppercase"
            />

            <FormGrid columns={2}>
              <FormSelect
                id="promo-type"
                label="Discount type"
                value={promoForm.type}
                onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}
                options={[
                  { value: 'percentage', label: 'Percentage off (%)' },
                  { value: 'fixed', label: 'Fixed amount (₹)' },
                ]}
              />
              <FormInput
                id="promo-value"
                label={promoForm.type === 'percentage' ? 'Percentage (1-100)' : 'Amount (₹)'}
                type="number"
                required
                min={1}
                max={promoForm.type === 'percentage' ? 100 : 100000}
                value={promoForm.value}
                onChange={(value) => setPromoForm({ ...promoForm, value })}
              />
            </FormGrid>

            <FormInput
              id="promo-limit"
              label="Max redemptions"
              type="number"
              placeholder="Leave empty for unlimited uses"
              min={1}
              max={100000}
              value={promoForm.usageLimit}
              onChange={(value) => setPromoForm({ ...promoForm, usageLimit: value })}
            />

            <label htmlFor="promo-active-chk" className="flex cursor-pointer items-center gap-space-sm text-label text-primary">
              <Checkbox
                id="promo-active-chk"
                checked={promoForm.active}
                onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })}
              />
              Activate campaign immediately upon creation
            </label>

            <div className="flex items-center justify-end gap-space-sm border-t border-subtle pt-space-md">
              <Button variant="outline" size="sm" onClick={() => setIsCreatePromoOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                <Icon name={isSubmitting ? 'hourglass_top' : 'check'} aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>{isSubmitting ? 'Creating...' : 'Launch Campaign'}</span>
              </Button>
            </div>
          </form>
        </AppDialog>

        <ConfirmDialog
          isOpen={pendingDelete != null}
          onClose={() => setPendingDelete(null)}
          onConfirm={handleDeletePromo}
          title={`Delete promo ${pendingDelete?.code ?? ''}?`}
          message="The code stops working at checkout. A code that has been redeemed cannot be deleted; pause it instead."
          confirmText="Delete"
          isLoading={deletePromotionMutation.isPending}
        />
      </PageBody>
    </PageContainer>
  );
}
