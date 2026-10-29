import React, { useState } from 'react';
import { TOP_SELLING_SKUS, OPERATIONAL_INCIDENTS } from '../../data/mockData';
import {
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
} from '../ui';

export function ExecutiveOverview({ onNavigate, onShowToast, onSelectOrder }) {
  const [timeRange, setTimeRange] = useState('Today');
  const [chartMode, setChartMode] = useState('Hourly GMV');
  const [incidents, setIncidents] = useState(OPERATIONAL_INCIDENTS);
  const [isSyncing, setIsSyncing] = useState(false);

  // Simulated live orders stream
  const [recentOrders] = useState([
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
  ]);

  const handleFlashSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      onShowToast({
        type: 'success',
        title: 'Flash Sync Complete',
        message: 'Consolidated telemetry refreshed across 4 national fulfillment clusters (142ms latency).',
      });
    }, 700);
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

  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* System Status & Prototype Scope Bar (ReUI Card Banner) */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-xl shadow-xs border-border-subtle/50">
        <div className="flex items-center gap-space-sm">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
          <span className="font-label-xs-caps text-label-xs-caps text-on-surface-variant tracking-wider uppercase font-semibold">
            Prototype Environment
          </span>
          <span className="text-secondary text-body-sm">•</span>
          <span className="font-body-sm text-body-sm text-secondary">
            Simulated enterprise telemetry for Everwear operations benchmarking
          </span>
        </div>
        <div className="flex items-center gap-space-md font-label-xs-caps text-label-xs-caps text-secondary">
          <span className="flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px] text-status-success">cloud_done</span> 
            Node Synced: 2 mins ago
          </span>
          <span className="text-secondary/40">|</span>
          <span className="text-text-secondary font-mono">Clusters: BLR • BOM • DEL • CCU</span>
        </div>
      </Card>

      {/* Page Title & Operational Actions Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-label-xs-caps text-label-xs-caps text-primary uppercase font-bold tracking-widest">
              Ops Orchestration Center
            </span>
            <Badge variant="info">
              Q2 FY24-25 ACTIVE
            </Badge>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight font-semibold">
            Executive Operations Overview
          </h1>
          <p className="font-body-md text-body-md text-text-secondary">
            Real-time consolidated fashion commerce telemetry across 4 fulfillment hubs (Bengaluru, Mumbai, Delhi-NCR, Kolkata).
          </p>
        </div>

        {/* Controls, Toggle & Actions (ReUI Buttons) */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Time Range Segmented Toggle */}
          <div className="flex items-center bg-surface-container-high p-1 rounded-xl shadow-xs border border-border-subtle/40">
            {['Today', 'Yesterday', 'Last 7D', 'MTD', 'Q2 FY24-25'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={`h-7 px-2.5 font-label-sm text-label-sm ${
                  timeRange === range
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs hover:bg-surface-container-lowest'
                    : 'text-text-secondary hover:text-text-primary'
                } ${range === 'Q2 FY24-25' ? 'hidden sm:inline-flex' : ''}`}
              >
                {range}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              onClick={handleFlashSync}
              disabled={isSyncing}
              className="gap-1.5 font-label-md"
            >
              <span className={`material-symbols-outlined text-[18px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isSyncing ? 'Syncing...' : 'Flash Sync'}</span>
            </Button>
            <Button
              variant="primary"
              size="default"
              onClick={handleDownloadPdf}
              className="gap-1.5 font-label-md"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Daily Brief (PDF)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ReUI c-card-12 Inspired KPI Metric Grid (7 Cards Bento) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-space-md">
        {/* Card 1: Net Sales Today (GMV) - Spans 2 cols on XL */}
        <Card className="xl:col-span-2 p-space-md flex flex-col justify-between group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Gross Merchandise Value
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-metric-stat text-metric-stat text-text-primary font-semibold tabular-nums">
                  ₹4,82,94,200
                </span>
              </div>
            </div>
            <Badge variant="success" className="gap-0.5">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +14.2%
            </Badge>
          </div>

          <div className="my-space-sm">
            {/* Sparkline Curve */}
            <svg className="w-full h-8 text-primary overflow-visible" fill="none" viewBox="0 0 160 32">
              <path
                d="M0 26 C20 28, 35 15, 55 18 C75 22, 90 8, 110 12 C130 16, 145 4, 160 2"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              ></path>
              <path
                d="M0 26 C20 28, 35 15, 55 18 C75 22, 90 8, 110 12 C130 16, 145 4, 160 2 L160 32 L0 32 Z"
                fill="currentColor"
                fillOpacity="0.08"
              ></path>
            </svg>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border-subtle/40">
            <span className="font-body-sm text-body-sm text-text-secondary">
              Target: <strong className="text-text-primary font-medium">₹4.50 Cr</strong>
            </span>
            <span className="font-label-xs-caps text-label-xs-caps text-status-success font-semibold">
              107.3% Attainment
            </span>
          </div>
        </Card>

        {/* Card 2: Total Orders */}
        <Card className="p-space-md flex flex-col justify-between group hover:shadow-md transition-all">
          <div>
            <div className="flex items-start justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Total Orders
              </span>
              <Badge variant="success">+8.7%</Badge>
            </div>
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold mt-1 tabular-nums">
              18,492
            </div>
          </div>
          <div className="pt-space-sm space-y-1">
            <Progress value={74} className="h-1.5" />
            <div className="flex items-center justify-between font-label-xs-caps text-[10px] text-text-secondary">
              <span>App: 74%</span>
              <span>Web: 26%</span>
            </div>
          </div>
        </Card>

        {/* Card 3: AOV */}
        <Card className="p-space-md flex flex-col justify-between group hover:shadow-md transition-all">
          <div>
            <div className="flex items-start justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Average Order Value
              </span>
              <Badge variant="success">+5.1%</Badge>
            </div>
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold mt-1 tabular-nums">
              ₹2,612
            </div>
          </div>
          <div className="pt-space-sm">
            <span className="font-label-xs-caps text-[10px] text-text-secondary block font-semibold">PEAK BASKET</span>
            <span className="font-body-sm text-body-sm text-primary font-medium truncate block">
              Women's Ethnic & Kurtas
            </span>
          </div>
        </Card>

        {/* Card 4: Orders Awaiting Dispatch */}
        <Card className="p-space-md flex flex-col justify-between group hover:shadow-md transition-all">
          <div>
            <div className="flex items-start justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Awaiting Dispatch
              </span>
              <Badge variant="warning">42 At Risk</Badge>
            </div>
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold mt-1 tabular-nums">
              1,428
            </div>
          </div>
          <div className="pt-space-sm flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-text-secondary">Avg Pick-to-Pack:</span>
            <span className="font-label-sm text-label-sm font-semibold text-text-primary">28 mins</span>
          </div>
        </Card>

        {/* Card 5: Low-Stock SKUs */}
        <Card className="p-space-md flex flex-col justify-between group hover:shadow-md transition-all">
          <div>
            <div className="flex items-start justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Low Inventory Alert
              </span>
              <Badge variant="destructive">134 Critical</Badge>
            </div>
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold mt-1 tabular-nums">
              48 <span className="text-body-md text-text-secondary font-normal">OOS</span>
            </div>
          </div>
          <div className="pt-space-sm flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-text-secondary">Inbound POs:</span>
            <span className="font-label-sm text-label-sm font-semibold text-primary">22 Active</span>
          </div>
        </Card>

        {/* Card 6: Pending Returns / RTO */}
        <Card className="p-space-md flex flex-col justify-between group hover:shadow-md transition-all">
          <div>
            <div className="flex items-start justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Pending Returns/RTO
              </span>
              <Badge variant="info">16.4%</Badge>
            </div>
            <div className="font-metric-stat text-metric-stat text-text-primary font-semibold mt-1 tabular-nums">
              612
            </div>
          </div>
          <div className="pt-space-sm flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-text-secondary">Awaiting QC:</span>
            <span className="font-label-sm text-label-sm font-semibold text-status-warning">84 Units</span>
          </div>
        </Card>
      </div>

      {/* Row 1: Hourly Velocity Chart & Order SLA Health Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {/* Chart Column (2/3) */}
        <Card className="lg:col-span-2 p-space-lg flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div>
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Demand Telemetry
              </span>
              <CardTitle className="font-headline-sm text-headline-sm text-text-primary font-semibold">
                Sales & Dispatch Velocity Curve
              </CardTitle>
            </div>
            <div className="flex items-center gap-space-xs bg-surface-subtle p-1 rounded-xl border border-border-subtle/30">
              {['Hourly GMV', 'By Apparel Cluster', 'FC Node Split'].map((mode) => (
                <Button
                  key={mode}
                  variant={chartMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartMode(mode)}
                  className={`h-7 px-2.5 text-label-xs-caps font-label-xs-caps ${
                    chartMode === mode
                      ? 'bg-surface-container-lowest text-text-primary font-semibold shadow-xs hover:bg-surface-container-lowest'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          {/* Rich Visual Curve Graph SVG */}
          <div className="relative w-full my-space-md pt-space-sm">
            <div className="flex items-center justify-between text-label-xs-caps text-text-secondary mb-1">
              <span>06:00 IST</span>
              <span>10:00</span>
              <span>14:00 (Lunch Surge)</span>
              <span>18:00</span>
              <span className="text-primary font-semibold">21:00 (Peak Flash 420 OPM)</span>
              <span>02:00</span>
            </div>
            <div className="h-52 w-full relative">
              {/* Background Grid Guides */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="w-full border-b border-dashed border-border-subtle"></div>
                <div className="w-full border-b border-dashed border-border-subtle"></div>
                <div className="w-full border-b border-dashed border-border-subtle"></div>
                <div className="w-full border-b border-dashed border-border-subtle"></div>
              </div>

              {/* Curve Chart */}
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 180">
                <defs>
                  <linearGradient id="gmvAreaGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#5300b7" stopOpacity="0.3"></stop>
                    <stop offset="100%" stopColor="#5300b7" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <path
                  d="M 0 140 C 70 145, 120 120, 200 115 C 280 110, 360 85, 440 90 C 520 95, 600 45, 700 60"
                  fill="none"
                  stroke="#ccc3d7"
                  strokeDasharray="4 4"
                  strokeWidth="2"
                ></path>
                <path
                  d="M 0 150 C 60 140, 110 130, 180 95 C 250 60, 330 80, 420 50 C 490 20, 560 10, 620 15 C 660 18, 680 40, 700 48 L 700 180 L 0 180 Z"
                  fill="url(#gmvAreaGrad)"
                ></path>
                <path
                  d="M 0 150 C 60 140, 110 130, 180 95 C 250 60, 330 80, 420 50 C 490 20, 560 10, 620 15 C 660 18, 680 40, 700 48"
                  fill="none"
                  stroke="#5300b7"
                  strokeLinecap="round"
                  strokeWidth="3"
                ></path>
                <circle cx="620" cy="15" fill="#5300b7" r="5"></circle>
                <circle cx="620" cy="15" fill="#5300b7" fillOpacity="0.25" r="9"></circle>
              </svg>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-md bg-surface-canvas rounded-xl p-space-sm border border-border-subtle/50">
            <div>
              <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase">Units Dispatched Today</span>
              <p className="font-headline-sm text-headline-sm text-text-primary font-semibold mt-0.5 tabular-nums">42,180 pcs</p>
            </div>
            <div>
              <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase">Cancellation Rate</span>
              <p className="font-headline-sm text-headline-sm text-status-success font-semibold mt-0.5">
                2.1% <span className="text-body-sm font-normal text-text-secondary">(Low)</span>
              </p>
            </div>
            <div>
              <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase">Gross Discount Depth</span>
              <p className="font-headline-sm text-headline-sm text-text-primary font-semibold mt-0.5 tabular-nums">34.2%</p>
            </div>
            <div>
              <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase">Peak Throttle Bandwidth</span>
              <p className="font-headline-sm text-headline-sm text-primary font-semibold mt-0.5">99.8% Healthy</p>
            </div>
          </div>
        </Card>

        {/* SLA Health & Order Distribution (1/3) */}
        <Card className="p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                Fulfillment Funnel
              </span>
              <Badge variant="success">98.2% On-Time</Badge>
            </div>
            <CardTitle className="font-headline-sm text-headline-sm text-text-primary font-semibold mt-1">
              Live Order Status Flow
            </CardTitle>
          </div>

          {/* Circular Radial Chart Display */}
          <div className="flex items-center justify-center my-space-md">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#eeedf7" strokeWidth="12"></circle>
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#5300b7" strokeDasharray="105.5 251.2" strokeDashoffset="0" strokeWidth="12"></circle>
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#7331df" strokeDasharray="60.3 251.2" strokeDashoffset="-105.5" strokeWidth="12"></circle>
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#2563EB" strokeDasharray="70.3 251.2" strokeDashoffset="-165.8" strokeWidth="12"></circle>
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#059669" strokeDasharray="12.5 251.2" strokeDashoffset="-236.1" strokeWidth="12"></circle>
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#E11D48" strokeDasharray="2.5 251.2" strokeDashoffset="-248.6" strokeWidth="12"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline-md text-headline-md font-semibold text-text-primary tabular-nums">18.5k</span>
                <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase">Active Units</span>
              </div>
            </div>
          </div>

          {/* Segment Breakdown */}
          <div className="space-y-space-xs font-body-sm text-body-sm">
            <div className="flex items-center justify-between py-1 border-b border-border-subtle/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span className="text-text-primary">Confirmed / Allocating</span>
              </div>
              <span className="font-table-cell-num text-table-cell-num text-text-primary font-semibold tabular-nums">42% (7,766)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border-subtle/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-tint"></span>
                <span className="text-text-primary">Pick, Pack & Manifest</span>
              </div>
              <span className="font-table-cell-num text-table-cell-num text-text-primary font-semibold tabular-nums">24% (4,438)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border-subtle/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-info"></span>
                <span className="text-text-primary">Dispatched & In-Transit</span>
              </div>
              <span className="font-table-cell-num text-table-cell-num text-text-primary font-semibold tabular-nums">28% (5,177)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border-subtle/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-success"></span>
                <span className="text-text-primary">Delivered Same-Day</span>
              </div>
              <span className="font-table-cell-num text-table-cell-num text-text-primary font-semibold tabular-nums">5% (924)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-danger"></span>
                <span className="text-text-primary">RTO / Courier Rejection</span>
              </div>
              <span className="font-table-cell-num text-table-cell-num text-status-danger font-semibold tabular-nums">1% (187)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Top Selling Fashion SKUs & Warehouse SLA Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Top Selling SKUs Table (ReUI Table) */}
        <Card className="p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div>
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
                  Merchandising Velocity
                </span>
                <CardTitle className="font-headline-sm text-headline-sm text-text-primary font-semibold">
                  Top Performing Apparel SKUs Today
                </CardTitle>
              </div>
              <Button
                variant="link"
                onClick={() => onNavigate('products')}
                className="font-label-xs-caps text-label-xs-caps flex items-center gap-1"
              >
                VIEW ALL 3,410 SKUs <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Button>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[640px] w-full border-collapse">
                <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                    <TableHead className="whitespace-nowrap">PRODUCT ITEM</TableHead>
                    <TableHead className="whitespace-nowrap">CATEGORY</TableHead>
                    <TableHead className="text-right whitespace-nowrap">UNITS</TableHead>
                    <TableHead className="text-right whitespace-nowrap">REVENUE</TableHead>
                    <TableHead className="whitespace-nowrap">STOCK VELOCITY</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {TOP_SELLING_SKUS.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => onNavigate('products')}
                    className="cursor-pointer group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <img 
                          className="w-9 h-9 rounded-lg object-cover bg-surface-container shrink-0 shadow-xs" 
                          alt={item.name} 
                          src={item.image} 
                        />
                        <div className="min-w-0">
                          <p className="font-label-sm text-label-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                            {item.name}
                          </p>
                          <span className="font-label-xs-caps text-[10px] text-text-secondary font-mono">
                            SKU: {item.sku}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {item.category}
                    </TableCell>
                    <TableCell className="text-right font-table-cell-num font-semibold text-text-primary tabular-nums">
                      {item.units}
                    </TableCell>
                    <TableCell className="text-right font-table-cell-num font-semibold text-primary tabular-nums">
                      {item.revenue}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          item.bufferType === 'danger' ? 'destructive' :
                          item.bufferType === 'warning' ? 'warning' : 'success'
                        }
                      >
                        {item.stockBuffer}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="mt-space-md pt-space-xs flex items-center justify-between text-body-sm text-text-secondary border-t border-border-subtle/30">
            <span>Displaying Top 4 of 3,410 live catalog styles</span>
            <span className="font-label-xs-caps text-label-xs-caps text-primary font-semibold">
              Stock Reorder Triggered: 2 items
            </span>
          </div>
        </Card>

        {/* Warehouse SLA & Real-time Operations Incidents (ReUI Alert Suite) */}
        <Card className="p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div>
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
                  Operational Exception Queue
                </span>
                <CardTitle className="font-headline-sm text-headline-sm text-text-primary font-semibold">
                  Hub SLA & Inventory Action Triggers
                </CardTitle>
              </div>
              <Badge variant="destructive">
                {incidents.filter(i => !i.resolved).length} Immediate Escalations
              </Badge>
            </div>

            {/* Incident Cards Stack (ReUI Alerts) */}
            <div className="space-y-space-sm">
              {incidents.map((incident) => {
                if (incident.resolved) return null;
                const isCritical = incident.level === 'CRITICAL';
                const isWarning = incident.level === 'WARNING';
                return (
                  <Alert
                    key={incident.id}
                    variant={isCritical ? "destructive" : isWarning ? "warning" : "info"}
                    className="flex items-start gap-space-sm"
                  >
                    <span className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 ${
                      isCritical ? 'text-status-danger' :
                      isWarning ? 'text-status-warning' : 'text-status-info'
                    }`}>
                      {isCritical ? 'error' : isWarning ? 'warning' : 'rocket_launch'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <AlertTitle className={
                          isCritical ? 'text-status-danger' :
                          isWarning ? 'text-status-warning' : 'text-status-info'
                        }>
                          {incident.title}
                        </AlertTitle>
                        <span className="font-label-xs-caps text-[10px] text-text-secondary font-mono">
                          {incident.node}
                        </span>
                      </div>
                      <AlertDescription>
                        {incident.desc}
                      </AlertDescription>
                      {incident.actionText && (
                        <div className="mt-2.5 flex items-center gap-space-sm">
                          <Button
                            variant={isCritical ? "destructive" : "secondary"}
                            size="sm"
                            onClick={() => handleResolveIncident(incident.id, incident.actionText)}
                            className="font-label-xs-caps text-label-xs-caps h-7 font-semibold"
                          >
                            {incident.actionText}
                          </Button>
                          {incident.etaText ? (
                            <span className="font-label-xs-caps text-[10px] text-text-secondary">{incident.etaText}</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveIncident(incident.id, 'Alert Acknowledged')}
                              className="font-label-xs-caps text-label-xs-caps h-7 text-text-secondary hover:text-text-primary"
                            >
                              {incident.dismissText || 'Acknowledge Alert'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Alert>
                );
              })}
            </div>
          </div>

          <div className="mt-space-md pt-space-xs flex items-center justify-between text-body-sm text-text-secondary border-t border-border-subtle/30">
            <span>Automated routing engine active across 4 nodes</span>
            <Button
              variant="link"
              onClick={() => onNavigate('order-management')}
              className="font-label-xs-caps text-label-xs-caps font-semibold"
            >
              VIEW ALL HUBS DISPATCH MATRIX
            </Button>
          </div>
        </Card>
      </div>

      {/* Row 3: Live Real-time Stream of High-Value & VIP Orders (ReUI Card & Table) */}
      <Card className="p-space-lg flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
                Fulfillment Ingestion
              </span>
              <span className="flex h-2 w-2 rounded-full bg-status-success animate-pulse"></span>
            </div>
            <CardTitle className="font-headline-sm text-headline-sm text-text-primary font-semibold">
              Recent Order Stream & High-Value Transactions
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">
              Auto-Refresh: Every 15s
            </span>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleFlashSync}
              title="Refresh Stream"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </Button>
          </div>
        </div>

        {/* Live Stream Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="min-w-[920px] w-full border-collapse">
            <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                <TableHead className="whitespace-nowrap">ORDER REF</TableHead>
                <TableHead className="whitespace-nowrap">CUSTOMER &amp; TIER</TableHead>
                <TableHead className="whitespace-nowrap">ITEMS</TableHead>
                <TableHead className="whitespace-nowrap">ORDER VALUE</TableHead>
                <TableHead className="whitespace-nowrap">PAYMENT MODE</TableHead>
                <TableHead className="whitespace-nowrap">NODE FC</TableHead>
                <TableHead className="whitespace-nowrap">DISPATCH SLA</TableHead>
                <TableHead className="text-right whitespace-nowrap">ACTION</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {recentOrders.map((ord, idx) => (
              <TableRow
                key={idx}
                onClick={() => {
                  onSelectOrder(ord.fullId);
                  onNavigate('order-management');
                }}
                className="cursor-pointer group"
              >
                <TableCell>
                  <span className="font-label-sm text-label-sm font-semibold text-primary group-hover:underline">
                    {ord.ref}
                  </span>
                  <span className="block font-label-xs-caps text-[10px] text-text-secondary font-mono">
                    {ord.timeAgo}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-body-sm text-body-sm font-medium text-text-primary">
                      {ord.customer}
                    </span>
                    <Badge variant={ord.tierVariant}>
                      {ord.tier}
                    </Badge>
                  </div>
                  <span className="font-label-xs-caps text-[10px] text-text-secondary">
                    {ord.email}
                  </span>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {ord.items}
                </TableCell>
                <TableCell className="font-table-cell-num font-semibold text-text-primary tabular-nums">
                  {ord.value}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 font-label-xs-caps text-[11px] text-text-primary">
                    <span className="material-symbols-outlined text-[14px] text-status-success">{ord.payIcon}</span>
                    {ord.payMode}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {ord.node}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ord.slaVariant}>
                    {ord.slaStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOrder(ord.fullId);
                      onNavigate('order-management');
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {/* Table Footer */}
        <div className="mt-space-md pt-space-xs flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm text-body-sm text-text-secondary border-t border-border-subtle/30">
          <div className="flex items-center gap-space-md">
            <span>Payment Mix: <strong className="text-text-primary">68% UPI / 22% Card / 10% COD</strong></span>
            <span>•</span>
            <span>Auto-Reconciled RazorpayX: <strong className="text-status-success">98.4%</strong></span>
          </div>
          <Button
            variant="link"
            onClick={() => onNavigate('order-management')}
            className="font-label-xs-caps text-label-xs-caps font-semibold flex items-center gap-1"
          >
            OPEN COMPREHENSIVE FULFILLMENT LOGS <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
