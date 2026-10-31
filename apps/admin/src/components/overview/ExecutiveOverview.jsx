import React, { useState, useMemo } from 'react';
import { TOP_SELLING_SKUS, OPERATIONAL_INCIDENTS } from '../../data/mockData';
import { useDashboardQuery } from '../../hooks/useAdminQueries';
import { formatMoney, formatDate } from '../../lib/format';
import { Icon,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Alert,
  AlertTitle,
  AlertDescription,
  Progress,
  Separator,
  PageContainer,
  PageHeader,
  DateRangeFilter,
  ContentGrid,
  StatsCard,
  SectionCard,
  StatusBadge,
  ErrorState,
  EmptyState,
  SkeletonPage,
  Thumbnail,
} from '../ui';

const INCIDENT_VARIANT = {
  CRITICAL: 'destructive',
  WARNING: 'warning',
  INFO: 'info',
};

const RELATIVE_STEPS = [
  [60, 'sec'],
  [3600, 'min'],
  [86400, 'hr'],
];

function relativeTime(iso) {
  if (!iso) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (Number.isNaN(seconds)) return '—';
  if (seconds < 10) return 'just now';
  for (const [limit, unit] of RELATIVE_STEPS) {
    if (seconds < limit) {
      const divisor = limit === 60 ? 1 : limit === 3600 ? 60 : 3600;
      return `${Math.floor(seconds / divisor)} ${unit} ago`;
    }
  }
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function ExecutiveOverview({ onNavigate, onShowToast, onSelectOrder }) {
  const [timeRange, setTimeRange] = useState('Today');
  const [chartMode, setChartMode] = useState('Hourly GMV');
  const [incidents, setIncidents] = useState(OPERATIONAL_INCIDENTS);
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: dashboardData, isLoading, isError, error, refetch } = useDashboardQuery();

  const defaultOrders = useMemo(() => [
    {
      ref: '#EW-892401',
      fullId: 'EVR-984210-BLR',
      timeAgo: '14 secs ago',
      customer: 'Meera Singhania',
      tier: 'VIP COUTURE',
      tierVariant: 'vip',
      email: 'meera.s***@everwear.vip',
      items: '4 items (2x Anarkali, 2x Dupatta)',
      value: '₹24,890',
      payMode: 'HDFC Card (Prepaid)',
      payIcon: 'credit_card',
      node: 'BLR-FC1',
      slaStatus: 'Picking (18m left)',
      slaVariant: 'info',
    },
    {
      ref: '#EW-892400',
      fullId: 'EVR-984209-BOM',
      timeAgo: '42 secs ago',
      customer: 'Raghavan Iyer',
      tier: 'GOLD TIER',
      tierVariant: 'secondary',
      email: 'r.iyer***@gmail.com',
      items: '2 items (Selvedge Denim, Relaxed Tee)',
      value: '₹6,450',
      payMode: 'UPI (Instant)',
      payIcon: 'qr_code_2',
      node: 'BOM-FC2',
      slaStatus: 'Manifested',
      slaVariant: 'success',
    },
    {
      ref: '#EW-892399',
      fullId: 'EVR-984208-DEL',
      timeAgo: '1m 12s ago',
      customer: 'Tanya Kapoor',
      tier: 'NEW SHOPPER',
      tierVariant: 'secondary',
      email: 'kapoortanya***@outlook.com',
      items: '1 item (Pleated Emerald Midi Dress)',
      value: '₹4,290',
      payMode: 'COD (Verified OTP)',
      payIcon: 'local_atm',
      node: 'DEL-FC3',
      slaStatus: 'Pack Queue',
      slaVariant: 'info',
    },
    {
      ref: '#EW-892398',
      fullId: 'EVR-984207-HYD',
      timeAgo: '2m 04s ago',
      customer: 'Devendra Sen',
      tier: 'VIP COUTURE',
      tierVariant: 'vip',
      email: 'dev.sen***@rediffmail.com',
      items: '5 items (Silk Blend Overshirts, Linen Pants)',
      value: '₹31,200',
      payMode: 'Amex Corporate (Prepaid)',
      payIcon: 'credit_card',
      node: 'CCU-FC4',
      slaStatus: 'In-Transit (Air)',
      slaVariant: 'success',
    },
    {
      ref: '#EW-892397',
      fullId: 'EVR-984206-MAA',
      timeAgo: '2m 45s ago',
      customer: 'Pooja Nambiar',
      tier: 'SILVER TIER',
      tierVariant: 'secondary',
      email: 'p.nambiar***@yahoo.com',
      items: '2 items (Chanderi Printed Stole, Kurti)',
      value: '₹5,190',
      payMode: 'UPI (Instant)',
      payIcon: 'qr_code_2',
      node: 'BLR-FC1',
      slaStatus: 'Dispatched',
      slaVariant: 'success',
    },
  ], []);

  const recentOrders = useMemo(() => {
    if (dashboardData?.recentOrders && dashboardData.recentOrders.length > 0) {
      return dashboardData.recentOrders.map((ro, i) => {
        const val = ro.totals?.total ? formatMoney(ro.totals.total, ro.currency) : '₹4,890';
        const name = ro.shippingAddress ? `${ro.shippingAddress.firstName || ''} ${ro.shippingAddress.lastName || ''}`.trim() : ro.email?.split('@')[0] || 'Customer';
        return {
          ref: `#EW-${ro.displayId || 1000 + i}`,
          fullId: `EVR-${ro.displayId || 1000 + i}-BLR`,
          timeAgo: relativeTime(ro.createdAt),
          customer: name,
          tier: ro.paymentStatus === 'paid' ? 'PREPAID' : 'COD',
          tierVariant: 'secondary',
          email: ro.email,
          items: `${ro.items?.length || 1} items`,
          value: val,
          payMode: ro.paymentStatus === 'paid' ? 'UPI (Instant)' : 'Cash on Delivery',
          payIcon: ro.paymentStatus === 'paid' ? 'qr_code_2' : 'local_atm',
          node: 'BLR-FC1',
          slaStatus: ro.fulfillmentStatus === 'shipped' ? 'Dispatched' : 'Picking',
          slaVariant: ro.fulfillmentStatus === 'shipped' ? 'success' : 'info',
        };
      });
    }
    return defaultOrders;
  }, [dashboardData, defaultOrders]);

  const handleFlashSync = async () => {
    setIsSyncing(true);
    await refetch();
    setIsSyncing(false);
    onShowToast({
      type: 'success',
      title: 'Flash Sync Complete',
      message: 'Telemetry refreshed across all 4 national fulfillment clusters (Cluster BLR-FC1 live).',
    });
  };

  const handleDownloadPdf = () => {
    onShowToast({
      type: 'info',
      title: 'Executive Brief Generated',
      message: 'Daily Operations Executive PDF summary downloaded successfully.',
    });
  };

  const handleResolveIncident = (incidentId, actionTaken) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, resolved: true };
      }
      return inc;
    }));
    onShowToast({
      type: 'success',
      title: 'Action Executed',
      message: `${actionTaken} applied successfully. Dispatch routing updated.`,
    });
  };

  // Metrics adjusted by time range
  const openIncidents = incidents.filter((i) => !i.resolved);

  const metrics = {
    gmv: timeRange === 'Today' ? '₹4,82,94,200' :
         timeRange === 'Yesterday' ? '₹3,94,20,500' :
         timeRange === 'Last 7D' ? '₹31,42,80,000' : '₹1,28,40,90,000',
    gmvGrowth: timeRange === 'Today' ? '+14.2%' : '+8.6%',
    ordersCount: timeRange === 'Today' ? '14,820' :
                 timeRange === 'Yesterday' ? '12,410' :
                 timeRange === 'Last 7D' ? '98,420' : '4,12,800',
    aov: '₹3,258',
    deliveredPct: '94.8%',
    activeNodes: '4 / 4 Nodes',
    exceptionsCount: openIncidents.length,
    depletedSkus: dashboardData?.lowStock?.length || 86
  };

  if (isLoading) {
    return <SkeletonPage variant="dashboard" stats={6} statsCols={6} label="Loading executive overview" />;
  }

  return (
    <PageContainer>
      {/* Live System Telemetry Status Bar */}
      <Card className="flex flex-col justify-between gap-space-sm px-space-md py-space-sm sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-space-sm">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-status-success" />
          <span className="shrink-0 text-caption uppercase tracking-wider text-success">
            Live telemetry online
          </span>
          <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-text-faint" />
          <span className="truncate text-body text-secondary">
            Connected to the Everwear Commerce API
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-space-md text-caption text-muted">
          <span className="flex items-center gap-1 font-medium">
            <Icon name="cloud_done" aria-hidden="true" className="material-symbols-outlined text-icon-sm text-success" />
            Live sync active
          </span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-text-faint" />
          <span className="font-mono whitespace-nowrap">BLR · BOM · DEL · CCU</span>
        </div>
      </Card>

      {isError && (
        <ErrorState
          title="Live dashboard telemetry is unavailable"
          message={error?.message}
          onRetry={() => refetch()}
        />
      )}

      {/* Page Title & Operational Actions Toolbar */}
      <PageHeader
        kicker="Ops Orchestration Center"
        badge="Q2 FY24-25 ACTIVE"
        title="Executive Operations Overview"
        description="Real-time consolidated fashion commerce telemetry across 4 national fulfillment hubs (Bengaluru, Mumbai, Delhi-NCR, Kolkata)."
        actions={
          <>
            <DateRangeFilter
              ranges={['Today', 'Yesterday', 'Last 7D', 'MTD', 'Q2 FY24-25']}
              activeRange={timeRange}
              onRangeChange={setTimeRange}
            />
            <Button
              variant="secondary"
              size="default"
              onClick={handleFlashSync}
              disabled={isSyncing}
              className="gap-1.5"
              type="button"
            >
              <Icon name="sync" className={`material-symbols-outlined text-icon-md text-accent ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Flash Sync'}</span>
            </Button>
            <Button
              variant="primary"
              size="default"
              onClick={handleDownloadPdf}
              className="gap-1.5"
              type="button"
            >
              <Icon name="download" className="material-symbols-outlined text-icon-md" />
              <span>Daily Brief (PDF)</span>
            </Button>
          </>
        }
      />

      {/* KPI Metric Grid (7 Cards Bento) */}
      <ContentGrid cols={7}>
        <StatsCard
          title="Gross Merchandise Value"
          value={metrics.gmv}
          trend={metrics.gmvGrowth}
          trendType="up"
          progress={88}
          progressLabel="Target Achievement"
          targetText="106.4% of Daily Quota"
          subtext="Prepaid: 72.4% (Razorpay/UPI) • COD: 27.6%"
        />

        <StatsCard
          title="Orders Placed"
          value={metrics.ordersCount}
          icon="shopping_cart"
          trend="+21.4%"
          trendType="up"
          trendLabel="vs SLA Target"
          subtext={`AOV: ${metrics.aov}`}
        />

        <StatsCard
          title="On-Time Dispatch SLA"
          value={metrics.deliveredPct}
          icon="local_shipping"
          iconColor="text-success"
          trend="Target: 92%"
          trendType="neutral"
          trendLabel="within 4h"
          subtext="Fastest Node: BLR-FC1 (2.2h)"
        />

        <StatsCard
          title="Active Hub Nodes"
          value={metrics.activeNodes}
          icon="hub"
          iconColor="text-info"
          badge="OPERATIONAL"
          badgeVariant="success"
          trendLabel="All Nodes Live"
          subtext="Peak Node: BLR-FC1 (38%)"
        />

        <StatsCard
          className="bg-status-danger-bg/40 border-status-danger/20 hover:border-status-danger/40"
          title="Critical Exceptions"
          value={metrics.exceptionsCount}
          icon="warning"
          iconColor="text-danger"
          badge="ACTION REQ"
          badgeVariant="destructive"
          trendLabel="Immediate action"
          subtext="Unblock in Triage Queue Below"
        />

        <StatsCard
          title="Depleted Stock (SKUs)"
          value={metrics.depletedSkus}
          icon="inventory_2"
          iconColor="text-warning"
          trend="Out of stock"
          trendType="down"
          trendLabel="in 1+ hub"
          subtext="Open Inventory Matrix →"
          onClick={() => onNavigate('inventory-and-warehouses')}
        />
      </ContentGrid>

      {/* Main Multi-Column Matrix: Sales Chart (8 Cols) + Exception Triage Queue (4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* Left Column (8 Cols): Sales Velocity & Hub Throughput Charts */}
        <div className="xl:col-span-8 space-y-space-lg">
          <Card className="p-space-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md border-b border-subtle">
              <div>
                <CardTitle className="text-heading font-semibold text-primary">
                  Sales Velocity &amp; Hub Throughput
                </CardTitle>
                <CardDescription className="text-body text-secondary">
                  Hourly order volume compared to prior period baseline across all omnichannel channels.
                </CardDescription>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-subtle text-meta">
                {['Hourly GMV', 'Units Dispatched', 'Prepaid vs COD'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChartMode(mode)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
 chartMode === mode
 ? 'bg-surface-container-lowest text-accent font-semibold shadow-xs'
 : 'text-muted hover:text-primary'
 }`}
                    type="button"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Stylized Visual Chart */}
            <div className="pt-space-md space-y-space-md">
              <div className="flex h-64 w-full flex-col justify-between rounded-xl border border-subtle bg-surface-subtle p-space-md">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-meta font-mono text-muted">
                  <span>₹80L peak</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-1"></span> Today’s velocity</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-baseline"></span> Baseline (last week)</span>
                  </div>
                </div>

                {/* SVG Area / Bars */}
                <div className="relative h-44 w-full flex items-end gap-1.5 sm:gap-3 px-1">
                  {[
                    { hour: '06h', val: 24, base: 18 },
                    { hour: '08h', val: 42, base: 30 },
                    { hour: '10h', val: 78, base: 55 },
                    { hour: '12h', val: 92, base: 68 },
                    { hour: '14h', val: 86, base: 74 },
                    { hour: '16h', val: 96, base: 70 },
                    { hour: '18h', val: 88, base: 82 },
                    { hour: '20h', val: 95, base: 85 },
                    { hour: '22h', val: 72, base: 60 },
                    { hour: '00h', val: 38, base: 25 },
                  ].map((col) => (
                    <div key={col.hour} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        <div 
                          style={{ height: `${col.base}%` }} 
                          className="w-full max-w-[12px] rounded-t-sm bg-chart-baseline"
                          title={`Baseline: ${col.base}%`}
                        />
                        <div 
                          style={{ height: `${col.val}%` }} 
                          className="w-full max-w-[14px] rounded-t-sm bg-chart-1 transition-colors group-hover:bg-primary-hover"
                          title={`Today: ${col.val}%`}
                        />
                      </div>
                      <span className="text-micro font-mono text-muted whitespace-nowrap">{col.hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Top Selling Garments Table */}
          <Card className="p-space-lg shadow-sm">
            <div className="flex items-center justify-between pb-space-md border-b border-subtle">
              <div>
                <CardTitle className="text-heading font-semibold text-primary">
                  Top Performing Garments &amp; Styles (Real-Time)
                </CardTitle>
                <CardDescription className="text-body text-secondary">
                  Highest velocity luxury garments by unit sell-through, gross margin &amp; regional demand.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('products')}
                className="text-meta"
                type="button"
              >
                View Catalog Master →
              </Button>
            </div>

            <div className="overflow-x-auto pt-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-subtle">
                    <TableHead>Garment Style</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Gross Margin</TableHead>
                    <TableHead>Stock Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOP_SELLING_SKUS.map((item) => {
                    const title = item.title || item.name;
                    const units = item.unitsSold || item.units || '840';
                    const margin = item.margin || '58';
                    const stock = item.stockStatus || item.stockBuffer || 'Healthy';
                    const isLow = typeof stock === 'string' && (stock.toLowerCase().includes('low') || stock.toLowerCase().includes('danger') || item.bufferType === 'danger');
                    return (
                      <TableRow 
                        key={item.id} 
                        className="cursor-pointer hover:bg-surface-subtle transition-colors"
                        onClick={() => onNavigate('products')}
                      >
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Thumbnail src={item.image} alt={title} className="w-9 h-11 rounded-md" imgClassName="object-cover" />
                            <div className="flex min-w-0 flex-col">
                              <span className="line-clamp-2 font-semibold text-meta text-primary" title={title}>{title}</span>
                              <span className="font-mono text-micro text-muted whitespace-nowrap">{item.sku}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-meta text-muted">{item.category}</TableCell>
                        <TableCell className="font-mono text-meta font-semibold whitespace-nowrap">{units} pcs</TableCell>
                        <TableCell className="font-mono text-meta font-semibold text-primary whitespace-nowrap">{item.revenue}</TableCell>
                        <TableCell>
                          <Badge variant="success" className="text-micro">{margin}%</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={stock} size="sm" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right Column (4 Cols): Operations Exception Triage & Live Stream */}
        <div className="xl:col-span-4 space-y-space-lg">
          {/* Operations Exception Triage Queue */}
          <Card className="p-space-md shadow-sm border-l-4 border-l-status-danger">
            <div className="flex items-center justify-between pb-2 border-b border-subtle">
              <div className="flex items-center gap-2">
                <Icon name="notification_important" className="material-symbols-outlined text-danger text-icon-lg" />
                <CardTitle className="text-body font-semibold text-primary">
                  Operations Exception Triage
                </CardTitle>
              </div>
              <Badge variant="destructive" size="sm">
                {openIncidents.length} pending
              </Badge>
            </div>

            <div className="space-y-space-sm pt-2">
              {openIncidents.length === 0 ? (
                <EmptyState
                  icon="task_alt"
                  title="No open exceptions"
                  description="Every fulfillment node is inside its SLA window."
                  className="p-6"
                />
              ) : (
                openIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="flex flex-col gap-2 rounded-xl border border-subtle bg-surface-subtle p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge
                        status={inc.level}
                        size="sm"
                        variant={INCIDENT_VARIANT[inc.level] || 'info'}
                        showDot
                      />
                      <Badge variant="outline" size="sm" className="min-w-0">
                        <span className="truncate">{inc.node}</span>
                      </Badge>
                    </div>
                    <div className="text-meta font-semibold text-primary">{inc.title}</div>
                    <p className="text-micro leading-relaxed text-muted">{inc.desc}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="font-mono text-micro text-muted whitespace-nowrap">
                        {inc.etaText || 'Awaiting action'}
                      </span>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {inc.dismissText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolveIncident(inc.id, inc.dismissText)}
                          >
                            {inc.dismissText}
                          </Button>
                        )}
                        {inc.actionText && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolveIncident(inc.id, inc.actionText)}
                          >
                            {inc.actionText}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Real-Time Ingested Orders Stream */}
          <Card className="p-space-md shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-subtle">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                <CardTitle className="text-body font-semibold text-primary">
                  Live Dispatch Stream
                </CardTitle>
              </div>
              <button 
                onClick={() => onNavigate('order-management')}
                className="text-accent text-meta font-semibold hover:underline"
                type="button"
              >
                All Orders →
              </button>
            </div>

            <div className="space-y-space-xs pt-2">
              {recentOrders.map((ord, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    onSelectOrder?.(ord.fullId);
                    onNavigate('order-management', ord.fullId);
                  }}
                  className="p-2.5 rounded-xl hover:bg-surface-subtle transition-colors cursor-pointer border border-subtle/40 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-meta font-semibold text-primary whitespace-nowrap">{ord.ref}</span>
                    <span className="text-micro text-muted font-mono whitespace-nowrap">{ord.timeAgo}</span>
                  </div>
                  <div className="flex items-center justify-between text-meta">
                    <span className="font-medium text-primary truncate max-w-[150px]">{ord.customer}</span>
                    <span className="font-mono font-semibold text-primary whitespace-nowrap">{ord.value}</span>
                  </div>
                  <div className="flex items-center justify-between text-micro text-muted pt-0.5">
                    <span>{ord.items}</span>
                    <Badge variant={ord.slaVariant || 'info'} className="text-micro py-0 px-1 font-semibold">
                      {ord.slaStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
