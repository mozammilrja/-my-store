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
} from '../ui';

export function ExecutiveOverview({ onNavigate, onShowToast, onSelectOrder }) {
  const [timeRange, setTimeRange] = useState('Today');
  const [chartMode, setChartMode] = useState('Hourly GMV');
  const [incidents, setIncidents] = useState(OPERATIONAL_INCIDENTS);
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: dashboardData, isLoading, refetch } = useDashboardQuery();

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
          timeAgo: 'Just now',
          customer: name,
          tier: 'VIP COUTURE',
          tierVariant: 'vip',
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
    exceptionsCount: incidents.filter(i => !i.resolved).length,
    depletedSkus: dashboardData?.lowStock?.length || 86
  };

  return (
    <PageContainer>
      {/* Live System Telemetry Status Bar */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-xl shadow-xs border-border-subtle/50">
        <div className="flex items-center gap-space-sm">
          <span className="flex h-2 w-2 rounded-full bg-status-success animate-ping"></span>
          <span className="font-label-xs-caps text-label-xs-caps text-status-success tracking-wider uppercase font-semibold">
            Live Telemetry Online
          </span>
          <span className="text-secondary text-body-sm">•</span>
          <span className="font-body-sm text-body-sm text-secondary">
            Connected to Everwear Commerce API (Cluster BLR-FC1 • Port 9100 • Replica Set rs0)
          </span>
        </div>
        <div className="flex items-center gap-space-md font-label-xs-caps text-label-xs-caps text-secondary">
          <span className="flex items-center gap-1 font-medium">
            <Icon name="cloud_done" className="material-symbols-outlined text-[14px] text-status-success" /> 
            Live Sync: Active
          </span>
          <span className="text-secondary/40">|</span>
          <span className="text-text-secondary font-mono">Clusters: BLR • BOM • DEL • CCU</span>
        </div>
      </Card>

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
              className="gap-1.5 font-label-md"
              type="button"
            >
              <Icon name="sync" className={`material-symbols-outlined text-[18px] text-primary ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Flash Sync'}</span>
            </Button>
            <Button
              variant="primary"
              size="default"
              onClick={handleDownloadPdf}
              className="gap-1.5 font-label-md"
              type="button"
            >
              <Icon name="download" className="material-symbols-outlined text-[18px]" />
              <span>Daily Brief (PDF)</span>
            </Button>
          </>
        }
      />

      {/* KPI Metric Grid (7 Cards Bento) */}
      <ContentGrid cols={7}>
        <StatsCard
          className="xl:col-span-2"
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
          iconColor="text-status-success"
          trend="Target: 92%"
          trendType="neutral"
          trendLabel="within 4h"
          subtext="Fastest Node: BLR-FC1 (2.2h)"
        />

        <StatsCard
          title="Active Hub Nodes"
          value={metrics.activeNodes}
          icon="hub"
          iconColor="text-status-info"
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
          iconColor="text-status-danger"
          badge="ACTION REQ"
          badgeVariant="destructive"
          trendLabel="Immediate action"
          subtext="Unblock in Triage Queue Below"
        />

        <StatsCard
          title="Depleted Stock (SKUs)"
          value={metrics.depletedSkus}
          icon="inventory_2"
          iconColor="text-status-warning"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md border-b border-border-subtle">
              <div>
                <CardTitle className="font-headline-md text-headline-md font-semibold text-text-primary">
                  Sales Velocity &amp; Hub Throughput
                </CardTitle>
                <CardDescription className="font-body-sm text-body-sm text-text-secondary">
                  Hourly order volume compared to prior period baseline across all omnichannel channels.
                </CardDescription>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border-subtle text-xs">
                {['Hourly GMV', 'Units Dispatched', 'Prepaid vs COD'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChartMode(mode)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      chartMode === mode
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
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
              <div className="h-64 w-full bg-surface-canvas rounded-xl border border-border-subtle p-space-md flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
                  <span>₹80L peak</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Today's Velocity</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim"></span> Baseline (Last Week)</span>
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
                          className="w-full max-w-[12px] bg-secondary-fixed-dim/60 rounded-t-xs"
                          title={`Baseline: ${col.base}%`}
                        />
                        <div 
                          style={{ height: `${col.val}%` }} 
                          className="w-full max-w-[14px] bg-primary-container rounded-t-xs group-hover:bg-primary transition-colors"
                          title={`Today: ${col.val}%`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary">{col.hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Top Selling Garments Table */}
          <Card className="p-space-lg shadow-sm">
            <div className="flex items-center justify-between pb-space-md border-b border-border-subtle">
              <div>
                <CardTitle className="font-headline-md text-headline-md font-semibold text-text-primary">
                  Top Performing Garments &amp; Styles (Real-Time)
                </CardTitle>
                <CardDescription className="font-body-sm text-body-sm text-text-secondary">
                  Highest velocity luxury garments by unit sell-through, gross margin &amp; regional demand.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('products')}
                className="text-xs"
                type="button"
              >
                View Catalog Master →
              </Button>
            </div>

            <div className="overflow-x-auto pt-2">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border-subtle">
                    <TableHead className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary">Garment Style</TableHead>
                    <TableHead className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary">Category</TableHead>
                    <TableHead className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary">Units Sold</TableHead>
                    <TableHead className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary">Revenue</TableHead>
                    <TableHead className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary">Gross Margin</TableHead>
                    <TableHead className="font-label-xs-caps text-label-xs-caps uppercase text-text-secondary">Stock Status</TableHead>
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
                          <div className="flex items-center gap-2.5">
                            <img src={item.image} alt={title} className="w-9 h-11 object-cover rounded-md bg-surface-subtle" />
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-text-primary">{title}</span>
                              <span className="font-mono text-[10px] text-text-secondary">{item.sku}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">{item.category}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{units} pcs</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-text-primary">{item.revenue}</TableCell>
                        <TableCell>
                          <Badge variant="success" className="text-[10px]">{margin}%</Badge>
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
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Icon name="notification_important" className="material-symbols-outlined text-status-danger text-[20px]" />
                <CardTitle className="font-headline-sm text-sm font-bold text-text-primary">
                  Operations Exception Triage
                </CardTitle>
              </div>
              <Badge variant="destructive" className="text-[10px]">
                {incidents.filter(i => !i.resolved).length} Pending
              </Badge>
            </div>

            <div className="space-y-space-sm pt-2">
              {incidents.filter(i => !i.resolved).map((inc) => (
                <div key={inc.id} className="p-3 bg-surface-subtle rounded-xl space-y-2 border border-border-subtle/60">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-status-danger">{inc.ref}</span>
                    <Badge variant="outline" className="text-[9px]">{inc.hub}</Badge>
                  </div>
                  <div className="text-xs font-semibold text-text-primary">{inc.title}</div>
                  <div className="text-[11px] text-text-secondary">{inc.description}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-text-secondary font-mono">{inc.time}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleResolveIncident(inc.id, inc.action)}
                      className="h-7 text-xs px-2.5"
                      type="button"
                    >
                      {inc.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Real-Time Ingested Orders Stream */}
          <Card className="p-space-md shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
                <CardTitle className="font-headline-sm text-sm font-bold text-text-primary">
                  Live Dispatch Stream
                </CardTitle>
              </div>
              <button 
                onClick={() => onNavigate('order-management')}
                className="text-primary text-xs font-semibold hover:underline"
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
                  className="p-2.5 rounded-xl hover:bg-surface-subtle transition-colors cursor-pointer border border-border-subtle/40 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-text-primary">{ord.ref}</span>
                    <span className="text-[10px] text-text-secondary font-mono">{ord.timeAgo}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary truncate max-w-[150px]">{ord.customer}</span>
                    <span className="font-mono font-bold text-text-primary">{ord.value}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-secondary pt-0.5">
                    <span>{ord.items}</span>
                    <Badge variant={ord.slaVariant || 'info'} className="text-[9px] py-0 px-1 font-semibold">
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
