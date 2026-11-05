import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, ContentGrid, PageBody, PageContainer, PageHeader, SkeletonPage, StatsCard, Tabs, TabsList, TabsTrigger } from '../ui';
import { fleetApi } from '../../lib/api-fleet';
import { DeliveriesBoard } from './DeliveriesBoard';
import { RidersPanel } from './RidersPanel';
import { FleetSettingsPanel, ZonesPanel } from './ZonesAndSettings';

/*
 * Our own delivery fleet (apps/backend/src/routes/admin/fleet.ts): the
 * delivery board, riders and their checks, delivery zones and the fleet
 * settings. Riders work in the rider app; this is where the store dispatches
 * by hand, approves riders and sets the rules. Cash is on its own screen
 * (Cash on Delivery).
 */

export function DeliveryFleet({ onShowToast }) {
  const [view, setView] = useState('deliveries');
  const tasks = useQuery({ queryKey: ['fleet', 'tasks'], queryFn: () => fleetApi.tasks({ limit: 500 }) });
  const riders = useQuery({ queryKey: ['fleet', 'riders'], queryFn: () => fleetApi.riders() });
  const zones = useQuery({ queryKey: ['fleet', 'zones'], queryFn: () => fleetApi.zones() });
  const warehouses = useQuery({ queryKey: ['fleet', 'warehouses'], queryFn: () => fleetApi.warehouses() });
  const settings = useQuery({ queryKey: ['fleet', 'settings'], queryFn: () => fleetApi.settings() });

  const queries = [tasks, riders, zones, warehouses, settings];
  if (queries.some((q) => q.isLoading)) return <SkeletonPage variant="table" stats={4} statsCols={4} columns={5} label="Loading the fleet" />;
  const failed = queries.find((q) => q.isError);

  const allRiders = riders.data?.riders ?? [];
  const allZones = zones.data?.zones ?? [];
  const allWarehouses = (warehouses.data?.warehouses ?? []).filter((w) => !w.sellerId);
  const byStatus = tasks.data?.byStatus ?? {};
  const n = (...s) => s.reduce((a, k) => a + (byStatus[k] ?? 0), 0);
  const pending = allRiders.filter((r) => r.status === 'pending').length;
  const online = allRiders.filter((r) => r.status === 'approved' && r.online).length;

  return (
    <PageContainer>
      <PageHeader kicker="Logistics" title="Delivery fleet" description="Everwear's own riders: who delivers what, rider checks, zones and pay." />
      <PageBody error={failed?.error} hasData={!failed} title="The fleet could not be loaded" onRetry={() => queries.forEach((q) => q.refetch())}>
        <ContentGrid cols={4}>
          <StatsCard title="Waiting for a rider" value={String(n('unassigned', 'offered'))} icon="pending" iconColor="text-warning" trendLabel="Unassigned or offered" />
          <StatsCard title="On the road" value={String(n('assigned', 'picked_up', 'out_for_delivery'))} icon="two_wheeler" iconColor="text-info" trendLabel={`${online} rider${online === 1 ? '' : 's'} online now`} />
          <StatsCard title="Failed attempts" value={String(n('attempt_failed'))} icon="report_problem" iconColor="text-danger" trendLabel="Waiting to retry or return" />
          <StatsCard title="Riders to check" value={String(pending)} icon="verified_user" iconColor="text-accent" trendLabel="Signed up, not yet approved" />
        </ContentGrid>

        <Tabs value={view} onValueChange={setView}>
          <TabsList aria-label="Fleet views">
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="riders" className="gap-space-xs">
              <span>Riders</span>
              {pending > 0 && (
                <Badge variant="warning" size="sm" className="tabular-nums">
                  {pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="zones">Zones</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'deliveries' && <DeliveriesBoard tasksQuery={tasks} riders={allRiders} zones={allZones} onShowToast={onShowToast} />}
        {view === 'riders' && <RidersPanel ridersQuery={riders} zones={allZones} warehouses={allWarehouses} onShowToast={onShowToast} />}
        {view === 'zones' && <ZonesPanel zones={allZones} warehouses={allWarehouses} onShowToast={onShowToast} />}
        {view === 'settings' && <FleetSettingsPanel settingsQuery={settings} onShowToast={onShowToast} />}
      </PageBody>
    </PageContainer>
  );
}
