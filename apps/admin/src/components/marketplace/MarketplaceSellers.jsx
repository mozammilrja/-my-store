import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../../lib/api-marketplace';
import { useSession } from '../../lib/session';
import { ContentGrid, FilterBar, PageBody, PageContainer, PageHeader, SkeletonPage, StatsCard } from '../ui';
import { SellersTab } from './SellersTab';
import { ListingsReview } from './ListingsReview';
import { SettlementsTab } from './SettlementsTab';
import { MarketplaceSettingsTab } from './MarketplaceSettingsTab';
import { money } from './shared';

/*
 * Running the marketplace, from the admin marketplace API
 * (apps/backend/src/routes/admin/marketplace.ts): reviewing sellers and their
 * KYC, reviewing listings, settling with sellers, and the marketplace's fees
 * and deadlines. Buttons follow the API's role rules, so a role that can't do
 * something is told why instead of being refused after the click.
 */

const TABS = [
  { id: 'sellers', label: 'Sellers' },
  { id: 'listings', label: 'Listings to review' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'settings', label: 'Settings' },
];

export function MarketplaceSellers({ onShowToast }) {
  const { role } = useSession();
  const [tab, setTab] = useState('sellers');
  const sellers = useQuery({ queryKey: ['admin', 'marketplace', 'sellers'], queryFn: () => marketplaceApi.sellers() });
  const queue = useQuery({ queryKey: ['admin', 'marketplace', 'review'], queryFn: () => marketplaceApi.reviewQueue() });
  const settlements = useQuery({ queryKey: ['admin', 'marketplace', 'settlements'], queryFn: () => marketplaceApi.settlements() });
  const settings = useQuery({ queryKey: ['admin', 'marketplace', 'settings'], queryFn: () => marketplaceApi.settings() });

  const loading = sellers.isLoading || queue.isLoading || settlements.isLoading || settings.isLoading;
  if (loading) return <SkeletonPage variant="table" stats={4} statsCols={4} columns={4} label="Loading the marketplace" />;

  const all = sellers.data?.sellers ?? [];
  const names = new Map(all.map((s) => [s._id, s.displayName]));
  const sellerName = (id) => names.get(id) ?? 'Unknown seller';
  const awaiting = all.filter((s) => s.status === 'submitted').length;
  const toReview = queue.data?.listings?.length ?? 0;
  const unpaid = (settlements.data?.settlements ?? []).filter((s) => s.status === 'pending');
  const error = sellers.error ?? queue.error ?? settlements.error ?? settings.error;

  return (
    <PageContainer>
      <PageHeader kicker="Marketplace" title="Sellers & settlements" description="Seller applications and their checks, listings waiting for review, and payouts to sellers." />
      <PageBody
        error={error}
        hasData={sellers.data != null && queue.data != null && settlements.data != null && settings.data != null}
        title="The marketplace could not be loaded"
        onRetry={() => [sellers, queue, settlements, settings].forEach((q) => q.refetch())}
      >
        <ContentGrid cols={4}>
          <StatsCard title="Applications to review" value={String(awaiting)} icon="person_search" iconColor="text-warning" trendLabel="Submitted, waiting for checks" />
          <StatsCard title="Live sellers" value={String(all.filter((s) => s.status === 'approved').length)} icon="storefront" iconColor="text-success" trendLabel={`${all.filter((s) => s.status === 'suspended').length} suspended`} />
          <StatsCard title="Listings to review" value={String(toReview)} icon="fact_check" iconColor="text-info" trendLabel="Sent by sellers" />
          <StatsCard title="Settlements to pay" value={String(unpaid.length)} icon="account_balance" iconColor="text-accent" trendLabel={unpaid.length ? `${money(unpaid.reduce((n, s) => n + s.net, 0))} in total` : 'Nothing outstanding'} />
        </ContentGrid>

        <FilterBar
          tabsLabel="Marketplace section"
          tabs={TABS.map((t) => ({ ...t, count: t.id === 'sellers' ? all.length : t.id === 'listings' ? toReview : t.id === 'settlements' ? unpaid.length : undefined }))}
          activeTab={tab}
          onTabChange={setTab}
        />

        {tab === 'sellers' && <SellersTab sellersQuery={sellers} role={role} onShowToast={onShowToast} />}
        {tab === 'listings' && <ListingsReview queueQuery={queue} sellerName={sellerName} role={role} onShowToast={onShowToast} />}
        {tab === 'settlements' && <SettlementsTab settlementsQuery={settlements} sellerName={sellerName} role={role} onShowToast={onShowToast} />}
        {tab === 'settings' && <MarketplaceSettingsTab settingsQuery={settings} role={role} onShowToast={onShowToast} />}
      </PageBody>
    </PageContainer>
  );
}
