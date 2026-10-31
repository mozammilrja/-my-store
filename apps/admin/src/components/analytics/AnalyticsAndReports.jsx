import React, { useState } from 'react';
import {
  Icon,
  Button,
  Badge,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  ErrorState,
  SkeletonPage,
  Thumbnail,
} from '../ui';
import { useDashboardQuery } from '../../hooks/useAdminQueries';

export function AnalyticsAndReports({ onNavigate, onShowToast }) {
  const [dateRange, setDateRange] = useState('30d'); // '30d', 'mtd', 'q2'
  const [skuTab, setSkuTab] = useState('top-margin'); // 'top-margin', 'high-returns'

  // TanStack Query for live dashboard analytics data
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardQuery();

  const handleExportCsv = () => {
    const headers = ['Channel Name', 'Orders Vol', 'Gross GMV', 'Conv. Rate', 'AOV (INR)', 'Return Rate', 'Take Rate / Comm.', 'CM2 Margin'];
    const rows = [
      ['Mobile App (iOS / Android)', '31420', '₹8.95 Cr', '3.92%', '₹2848', '13.2%', '0.0%', '44.6%'],
      ['Storefront Web (everwear.in)', '17890', '₹4.65 Cr', '2.41%', '₹2599', '15.8%', '1.8%', '38.2%'],
      ['Myntra Marketplace', '14120', '₹3.34 Cr', '4.18%', '₹2365', '21.4%', '24.5%', '21.8%'],
      ['Nykaa Fashion', '4280', '₹1.48 Cr', '1.94%', '₹3458', '16.1%', '26.0%', '23.2%']
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(',')).join('\n')];
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `everwear_analytics_attribution_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Channel attribution CSV report exported successfully.');
  };

  const topMarginSkus = [
    {
      name: 'Mulberry Zari Silk Anarkali',
      sku: 'SKU-ETH-9921',
      price: '₹6,499',
      category: "Women's Ethnic",
      badgeColor: 'bg-primary-fixed text-on-primary-fixed',
      units: '1,842',
      margin: '61.4%',
      marginColor: 'text-success font-semibold',
      returnRate: '6.2%',
      returnColor: 'text-success',
      action: 'Scale Ad Budget',
      actionBtn: 'bg-primary-container text-on-accent hover:bg-tertiary-container shadow-xs',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpP94zi7cPehYqUzYIDCa6Hx3uYaiFv4pd2f65HP92hlZgv0B1uM3eKK7O9kkpeFoe66PSkaVWCJ5EoNiyTHUEeXJU18hEK5XH4vMZabHeHkOKmcvpmgro1uxuDDuHMhSyeBZP1iAvKaKrtzw6wUdxRoyREv1MhYtZd2T0G-QvMf6EoFo9zuyvadwnd_msu1ZUoCbJifF4462hV4dEo4nazFtFmp_-_vxm-qQt8wL0'
    },
    {
      name: 'Handcrafted Chelsea Boot',
      sku: 'SKU-ACC-4108',
      price: '₹4,890',
      category: 'Footwear',
      badgeColor: 'bg-status-warning-bg text-warning',
      units: '980',
      margin: '54.8%',
      marginColor: 'text-success font-semibold',
      returnRate: '8.4%',
      returnColor: 'text-success',
      action: 'Auto Reorder',
      actionBtn: 'bg-surface-subtle text-primary hover:bg-surface-variant',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMpUbNVdaAkzuR2ovlaQTaYOHwEhwNaEsT7bqWus_62kWTo701StDgqYsQphv2Mx8VROGwVqBBYdC6ja7v3brSMqpwUfcgG9vUNj8XR2SlJKZUZvCuW7dMYLDGUkqhMd-GQWNekSRK9dIwU8i2gggc5FFwAJYrGZyDrkeTigLObowZnz4ywUHSnm4JXH1q_pB4_v3xUtIwyMAnLQcmmBWRKRza2qT5jfZaVtrBjC9I'
    },
    {
      name: 'Structured Linen Blazer - Lilac',
      sku: 'SKU-WST-3190',
      price: '₹3,299',
      category: 'Western',
      badgeColor: 'bg-primary-fixed text-on-primary-fixed',
      units: '1,210',
      margin: '28.2%',
      marginColor: 'text-warning font-semibold',
      returnRate: '29.4%',
      returnColor: 'text-danger font-semibold',
      action: 'Audit Size Chart',
      actionBtn: 'bg-status-danger-bg text-danger hover:bg-status-danger hover:text-on-accent',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbXDKhQyH7u6hwwXjkfOuEJdcp1KJpGc5vlt2t03GPVZd56HoY9ofEbIcEHeN6ocbCzndgEN3jsoMK-fswMKKh4uZFPy5D8QezQZwNxLOdLR9VxZBjMarju3J6_Elg20kTVW78mh3_HXlQo0tT-lxg10bcnuaSw5R2aciyNIEcu25F8L7V6Qx_atAARdIiu62HDs-zJIZQ4Qg3B8c54Z8y9aMM6cZyiCA0Fwf4JgO1'
    },
    {
      name: 'Raw Washed Selvedge Denim',
      sku: 'SKU-CAS-1029',
      price: '₹2,499',
      category: "Men's Casual",
      badgeColor: 'bg-status-info-bg text-info',
      units: '2,310',
      margin: '22.1%',
      marginColor: 'text-warning font-semibold',
      returnRate: '34.8%',
      returnColor: 'text-danger font-semibold',
      action: 'Pause Campaigns',
      actionBtn: 'bg-status-danger-bg text-danger hover:bg-status-danger hover:text-on-accent',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdYUl1xuUKgoMxc1BGMtVHmqEzV-6yTgIFnj5DHKtUqak1uIg75kEVY_efhltSQHzn5_K1r_mY0wIFMEE8EoFIqcuXyEEWVYq_VSI6Xaz7E9_mXCZNWo3sHTntownStp68-VUefvBfkPp2Irs69vZRO4L1X8uXmugxZ_-vFBApxW207ed9lVHlxMMcmV7nDVwsONkXmyKt3J8Z59G_IZqnW6CS81BtAVkomJkRRL7c'
    }
  ];

  const highReturnSkus = [
    {
      name: 'Raw Washed Selvedge Denim',
      sku: 'SKU-CAS-1029',
      price: '₹2,499',
      category: "Men's Casual",
      badgeColor: 'bg-status-info-bg text-info',
      units: '2,310',
      margin: '22.1%',
      marginColor: 'text-warning font-semibold',
      returnRate: '34.8%',
      returnColor: 'text-danger font-semibold',
      action: 'Pause Campaigns',
      actionBtn: 'bg-status-danger-bg text-danger hover:bg-status-danger hover:text-on-accent',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdYUl1xuUKgoMxc1BGMtVHmqEzV-6yTgIFnj5DHKtUqak1uIg75kEVY_efhltSQHzn5_K1r_mY0wIFMEE8EoFIqcuXyEEWVYq_VSI6Xaz7E9_mXCZNWo3sHTntownStp68-VUefvBfkPp2Irs69vZRO4L1X8uXmugxZ_-vFBApxW207ed9lVHlxMMcmV7nDVwsONkXmyKt3J8Z59G_IZqnW6CS81BtAVkomJkRRL7c'
    },
    {
      name: 'Structured Linen Blazer - Lilac',
      sku: 'SKU-WST-3190',
      price: '₹3,299',
      category: 'Western',
      badgeColor: 'bg-primary-fixed text-on-primary-fixed',
      units: '1,210',
      margin: '28.2%',
      marginColor: 'text-warning font-semibold',
      returnRate: '29.4%',
      returnColor: 'text-danger font-semibold',
      action: 'Audit Size Chart',
      actionBtn: 'bg-status-danger-bg text-danger hover:bg-status-danger hover:text-on-accent',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbXDKhQyH7u6hwwXjkfOuEJdcp1KJpGc5vlt2t03GPVZd56HoY9ofEbIcEHeN6ocbCzndgEN3jsoMK-fswMKKh4uZFPy5D8QezQZwNxLOdLR9VxZBjMarju3J6_Elg20kTVW78mh3_HXlQo0tT-lxg10bcnuaSw5R2aciyNIEcu25F8L7V6Qx_atAARdIiu62HDs-zJIZQ4Qg3B8c54Z8y9aMM6cZyiCA0Fwf4JgO1'
    },
    {
      name: 'Chanderi Gold Foil Dupatta',
      sku: 'SKU-ETH-4012',
      price: '₹1,850',
      category: "Women's Ethnic",
      badgeColor: 'bg-primary-fixed text-on-primary-fixed',
      units: '890',
      margin: '31.0%',
      marginColor: 'text-primary font-medium',
      returnRate: '24.2%',
      returnColor: 'text-danger font-semibold',
      action: 'Check Fabric QC',
      actionBtn: 'bg-status-warning-bg text-warning hover:bg-status-warning hover:text-on-accent',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpP94zi7cPehYqUzYIDCa6Hx3uYaiFv4pd2f65HP92hlZgv0B1uM3eKK7O9kkpeFoe66PSkaVWCJ5EoNiyTHUEeXJU18hEK5XH4vMZabHeHkOKmcvpmgro1uxuDDuHMhSyeBZP1iAvKaKrtzw6wUdxRoyREv1MhYtZd2T0G-QvMf6EoFo9zuyvadwnd_msu1ZUoCbJifF4462hV4dEo4nazFtFmp_-_vxm-qQt8wL0'
    },
    {
      name: 'Oversized Boxy Knit Pullover',
      sku: 'SKU-WST-8820',
      price: '₹2,199',
      category: 'Western',
      badgeColor: 'bg-primary-fixed text-on-primary-fixed',
      units: '1,450',
      margin: '34.5%',
      marginColor: 'text-primary font-medium',
      returnRate: '21.8%',
      returnColor: 'text-danger font-semibold',
      action: 'Update Fit Guide',
      actionBtn: 'bg-surface-subtle text-primary hover:bg-surface-variant',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMpUbNVdaAkzuR2ovlaQTaYOHwEhwNaEsT7bqWus_62kWTo701StDgqYsQphv2Mx8VROGwVqBBYdC6ja7v3brSMqpwUfcgG9vUNj8XR2SlJKZUZvCuW7dMYLDGUkqhMd-GQWNekSRK9dIwU8i2gggc5FFwAJYrGZyDrkeTigLObowZnz4ywUHSnm4JXH1q_pB4_v3xUtIwyMAnLQcmmBWRKRza2qT5jfZaVtrBjC9I'
    }
  ];

  const activeSkuList = skuTab === 'top-margin' ? topMarginSkus : highReturnSkus;

  if (isDashboardLoading) {
    return <SkeletonPage variant="analytics" stats={6} statsCols={6} columns={7} label="Loading analytics" />;
  }

  return (
    <PageContainer>
      {dashboardError && (
        <ErrorState
          title="Analytics telemetry is unavailable"
          message={dashboardError?.message}
          onRetry={() => refetchDashboard()}
        />
      )}
      <PageHeader
        breadcrumb="Everwear Admin / Core / Analytics & Reports"
        title="Enterprise Fashion Analytics & Revenue Operations"
        badge={<Badge variant="primary">Executive Intelligence • FY24-25 Q2 Consolidation</Badge>}
        description="Multi-channel unit economics, GMV run-rate, SKU margin performance, and returns neutralization metrics across pan-India warehouses."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0">
            <div className="flex items-center bg-surface-subtle p-0.5 rounded-xl shadow-sm border border-subtle">
              <button
                onClick={() => setDateRange('30d')}
                className={`px-3 py-1.5 text-meta font-semibold rounded-lg transition-all ${
 dateRange === '30d'
 ? 'bg-surface-container-lowest text-primary shadow-sm'
 : 'text-muted hover:text-primary'
 }`}
                type="button"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange('mtd')}
                className={`px-3 py-1.5 text-meta font-semibold rounded-lg transition-all ${
 dateRange === 'mtd'
 ? 'bg-surface-container-lowest text-primary shadow-sm'
 : 'text-muted hover:text-primary'
 }`}
                type="button"
              >
                MTD
              </button>
              <button
                onClick={() => setDateRange('q2')}
                className={`px-3 py-1.5 text-meta font-semibold rounded-lg transition-all ${
 dateRange === 'q2'
 ? 'bg-surface-container-lowest text-primary shadow-sm'
 : 'text-muted hover:text-primary'
 }`}
                type="button"
              >
                Q2 FY24-25
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                icon="calendar_month"
              >
                Apr 24 – May 24, 2024
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShowToast && onShowToast('Automated Slack & Email digest scheduled for Monday 09:00 IST.')}
                icon="schedule_send"
              >
                Schedule
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportCsv}
                icon="download"
              >
                Export CSV
              </Button>
            </div>
          </div>
        }
      />

      {/* KPI Metric Strip (5 Metric Cards) */}
      <ContentGrid columns={5}>
        <StatsCard
          label="Gross Merchandise Value"
          value="₹18.42 Cr"
          change="+18.4%"
          changeType="positive"
          icon="trending_up"
          subtitle="Run Rate: ₹221 Cr ARR (103.5% of Plan)"
        />
        <StatsCard
          label="Net Realized Revenue"
          value="₹14.85 Cr"
          change="+14.2%"
          changeType="positive"
          icon="trending_up"
          subtitle="Realization Factor: 80.6% GMV"
        />
        <StatsCard
          label="Blended Return Rate"
          value="16.8%"
          change="-1.6%"
          changeType="positive"
          icon="trending_down"
          subtitle="RTO Velocity: 4.2% · Customer: 12.6%"
        />
        <StatsCard
          label="CAC vs 12M LTV"
          value="₹420 / ₹4,850"
          change="11.5x Multiple"
          changeType="neutral"
          icon="analytics"
          subtitle="Repeat Rate: 41.8% in 90d"
        />
        <StatsCard
          label="Fulfillment SLA (24h)"
          value="98.4%"
          change="High Guard"
          changeType="positive"
          icon="check_circle"
          subtitle="Median Dispatch: 11.2 hrs"
        />
      </ContentGrid>

      {/* Primary Visual Grid: Multi-Layer Financial Trajectory & Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Area / Line Chart: Revenue vs Return Deductions vs Fulfillment Cost (Col 8) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-subtle">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-accent uppercase tracking-wider">
                    Unit Economics Model
                  </span>
                  <span className="text-muted">•</span>
                  <span className="text-micro text-muted">Rolling 12-Month Trend</span>
                </div>
                <h2 className="text-heading font-semibold text-primary mt-0.5">
                  Gross Realization, Returns Neutralization &amp; Logistics
                </h2>
              </div>
              <div className="flex items-center gap-4 text-micro text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-primary-container"></span>
                  <span>GMV (₹ Cr)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-status-danger"></span>
                  <span>Returns / RTO</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-status-warning"></span>
                  <span>Fulfillment &amp; Freight</span>
                </div>
              </div>
            </div>
            <p className="text-meta text-muted mb-4">
              Analysis highlights healthy margin retention in Q1/Q2 despite promotional seasonal peaks in festival cohorts.
            </p>
          </div>

          {/* High Precision SVG Multi-Area Chart */}
          <div className="w-full h-64 relative mt-2">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 740 220">
              <defs>
                <linearGradient id="areaGmvGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="areaRetGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--chart-4))" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="rgb(var(--chart-4))" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Horizontal Guidelines */}
              <line className="stroke-border-subtle" stroke="currentColor" strokeDasharray="3 3" x1="0" x2="740" y1="20" y2="20" />
              <line className="stroke-border-subtle" stroke="currentColor" strokeDasharray="3 3" x1="0" x2="740" y1="70" y2="70" />
              <line className="stroke-border-subtle" stroke="currentColor" strokeDasharray="3 3" x1="0" x2="740" y1="120" y2="120" />
              <line className="stroke-border-subtle" stroke="currentColor" strokeDasharray="3 3" x1="0" x2="740" y1="170" y2="170" />
              {/* GMV Area */}
              <polygon
                fill="url(#areaGmvGrad)"
                points="0,200 0,140 67,130 134,120 201,110 268,95 335,80 402,65 469,50 536,55 603,40 670,30 740,18 740,200"
              />
              {/* GMV Main Stroke */}
              <polyline
                fill="none"
                points="0,140 67,130 134,120 201,110 268,95 335,80 402,65 469,50 536,55 603,40 670,30 740,18"
                className="stroke-chart-1" stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              {/* Returns Deductions Line */}
              <polygon
                fill="url(#areaRetGrad)"
                points="0,200 0,180 67,178 134,175 201,170 268,168 335,162 402,158 469,152 536,155 603,150 670,148 740,142 740,200"
              />
              <polyline
                fill="none"
                points="0,180 67,178 134,175 201,170 268,168 335,162 402,158 469,152 536,155 603,150 670,148 740,142"
                className="stroke-chart-4" stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
              {/* Fulfillment Cost Stroke */}
              <polyline
                fill="none"
                points="0,192 67,190 134,188 201,185 268,183 335,180 402,176 469,173 536,174 603,171 670,168 740,164"
                className="stroke-chart-3" stroke="currentColor"
                strokeDasharray="4 3"
                strokeWidth="1.8"
              />
              {/* Marker Data Points */}
              <circle cx="740" cy="18" className="fill-chart-1" fill="currentColor" r="4" />
              <circle cx="740" cy="142" className="fill-chart-4" fill="currentColor" r="3.5" />
              <circle cx="740" cy="164" className="fill-chart-3" fill="currentColor" r="3.5" />
            </svg>
            {/* X-Axis Labels */}
            <div className="flex justify-between items-center text-muted text-micro font-semibold mt-2">
              <span>JUN &apos;23</span>
              <span>JUL</span>
              <span>AUG</span>
              <span>SEP</span>
              <span>OCT (Diwali)</span>
              <span>NOV</span>
              <span>DEC</span>
              <span>JAN &apos;24</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
              <span className="text-accent font-semibold">MAY &apos;24 (NOW)</span>
            </div>
          </div>

          {/* Quick Metrics Ribbon below chart */}
          <div className="grid grid-cols-3 gap-2 pt-4 mt-2 bg-surface-subtle p-3 rounded-xl border border-subtle">
            <div>
              <span className="text-caption text-muted uppercase">Average Order Value (AOV)</span>
              <div className="text-heading font-semibold text-primary mt-0.5">
                ₹2,840 <span className="text-success text-meta font-semibold">+6.4%</span>
              </div>
            </div>
            <div>
              <span className="text-caption text-muted uppercase">Effective Take Rate</span>
              <div className="text-heading font-semibold text-primary mt-0.5">
                22.4% <span className="text-muted text-meta font-normal">Post-Comms</span>
              </div>
            </div>
            <div>
              <span className="text-caption text-muted uppercase">Net Contribution Margin</span>
              <div className="text-heading font-semibold text-success mt-0.5">
                32.8% <span className="text-success text-meta font-semibold">Healthy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Share of Gross Sales (Donut & Ranked Bars) (Col 4) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-subtle">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-caption text-muted uppercase tracking-wider">
                  Catalog Allocation
                </span>
                <h2 className="text-heading font-semibold text-primary mt-0.5">Category Share</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-info text-micro font-semibold">
                4 CORE VERTICALS
              </span>
            </div>
            <p className="text-meta text-muted mb-3">
              Share of Gross Merchandise Value across active seasonal lines.
            </p>

            {/* Donut Visual + Center Stat */}
            <div className="relative flex items-center justify-center my-3">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" fill="none" r="38" className="stroke-border-subtle" stroke="currentColor" strokeWidth="12" />
                {/* Women's Ethnic: 42% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="38"
                  className="stroke-chart-1" stroke="currentColor"
                  strokeDasharray="100.28 238.76"
                  strokeDashoffset="0"
                  strokeWidth="12"
                />
                {/* Women's Western: 31% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="38"
                  className="stroke-chart-4" stroke="currentColor"
                  strokeDasharray="74.01 238.76"
                  strokeDashoffset="-100.28"
                  strokeWidth="12"
                />
                {/* Men's Casuals: 18% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="38"
                  className="stroke-chart-5" stroke="currentColor"
                  strokeDasharray="42.97 238.76"
                  strokeDashoffset="-174.29"
                  strokeWidth="12"
                />
                {/* Accessories & Footwear: 9% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="38"
                  className="stroke-chart-3" stroke="currentColor"
                  strokeDasharray="21.49 238.76"
                  strokeDashoffset="-217.26"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-kpi-sm font-semibold text-primary leading-tight">₹18.42 Cr</span>
                <span className="text-caption text-muted uppercase">Consolidated</span>
              </div>
            </div>
          </div>

          {/* Category Legend & Granular Breakdown */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-meta">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span className="font-medium text-primary">Women&apos;s Ethnic</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary font-semibold">₹7.74 Cr</span>
                <span className="text-muted font-semibold text-micro">(42%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary-container h-full" style={{ width: '42%' }}></div>
            </div>

            <div className="flex items-center justify-between text-meta pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-fashion-magenta"></span>
                <span className="font-medium text-primary">Women&apos;s Western</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary font-semibold">₹5.71 Cr</span>
                <span className="text-muted font-semibold text-micro">(31%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-fashion-magenta h-full" style={{ width: '31%' }}></div>
            </div>

            <div className="flex items-center justify-between text-meta pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-info"></span>
                <span className="font-medium text-primary">Men&apos;s Casuals</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary font-semibold">₹3.31 Cr</span>
                <span className="text-muted font-semibold text-micro">(18%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-status-info h-full" style={{ width: '18%' }}></div>
            </div>

            <div className="flex items-center justify-between text-meta pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-warning"></span>
                <span className="font-medium text-primary">Accessories &amp; Footwear</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary font-semibold">₹1.66 Cr</span>
                <span className="text-muted font-semibold text-micro">(9%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-status-warning h-full" style={{ width: '9%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Performance Matrix Table */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm overflow-hidden border border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-caption text-muted uppercase tracking-wider">
                Channel Unit Economics
              </span>
              <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">
                OMNICHANNEL DIRECT + SYNDICATED
              </span>
            </div>
            <h2 className="text-heading font-semibold text-primary mt-0.5">
              Sales Channel Attribution &amp; Margin Realization
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-micro text-muted">Comparing 4 active channels</span>
            <button 
              className="p-1 text-muted hover:text-primary rounded-lg transition-colors" 
              title="Filter columns" 
              type="button"
              onClick={() => onShowToast && onShowToast('Channel dimension filters active: Direct, Marketplace, Partner.')}
            >
              <Icon name="tune" className="material-symbols-outlined text-icon-md" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto scrollbar-thin -mx-5 px-5">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-surface-subtle text-muted text-caption uppercase tracking-wider border-b border-subtle select-none sticky top-0 z-10">
                <th className="py-2.5 px-3 text-left text-caption text-muted uppercase tracking-wider whitespace-nowrap">Channel Name</th>
                <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Orders Vol</th>
                <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Gross GMV</th>
                <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Conv. Rate</th>
                <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">AOV (₹)</th>
                <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Return Rate</th>
                <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Take Rate / Comm.</th>
                <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">CM2 Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 text-meta text-primary">
              {/* Row 1: Direct Mobile App */}
              <tr className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-accent shrink-0">
                      <Icon name="smartphone" className="material-symbols-outlined text-icon-md" />
                    </div>
                    <div>
                      <div className="text-body font-semibold text-primary">Mobile App (iOS / Android)</div>
                      <div className="truncate text-micro text-muted">Owned Direct • Zero Commission</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">31,420</td>
                <td className="py-3 px-3 text-right font-semibold text-primary">₹8.95 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">
                    3.92%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-medium">₹2,848</td>
                <td className="py-3 px-3 text-right font-semibold text-success">13.2%</td>
                <td className="py-3 px-3 text-right text-muted font-medium">0.0% (₹0)</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-semibold text-success">44.6%</span>
                </td>
              </tr>
              {/* Row 2: Storefront Web */}
              <tr className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-subtle flex items-center justify-center text-primary shrink-0 border border-subtle">
                      <Icon name="laptop_mac" className="material-symbols-outlined text-icon-md" />
                    </div>
                    <div>
                      <div className="text-body font-semibold text-primary">Storefront Web (everwear.in)</div>
                      <div className="truncate text-micro text-muted">Direct Consumer • Next.js Headless</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">17,890</td>
                <td className="py-3 px-3 text-right font-semibold text-primary">₹4.65 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-subtle text-muted text-micro font-semibold border border-subtle">
                    2.41%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-medium">₹2,599</td>
                <td className="py-3 px-3 text-right text-primary font-medium">15.8%</td>
                <td className="py-3 px-3 text-right text-muted font-medium">1.8% (PG Gateway)</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-semibold text-success">38.2%</span>
                </td>
              </tr>
              {/* Row 3: Myntra Marketplace */}
              <tr className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-fashion-magenta/10 flex items-center justify-center text-accent shrink-0">
                      <Icon name="storefront" className="material-symbols-outlined text-icon-md" />
                    </div>
                    <div>
                      <div className="text-body font-semibold text-primary">Myntra Marketplace</div>
                      <div className="truncate text-micro text-muted">Syndicated Tier-1 • Omnichannel API</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">14,120</td>
                <td className="py-3 px-3 text-right font-semibold text-primary">₹3.34 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-status-info-bg text-info text-micro font-semibold">
                    4.18%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-medium">₹2,365</td>
                <td className="py-3 px-3 text-right text-danger font-semibold">21.4%</td>
                <td className="py-3 px-3 text-right text-warning font-semibold">24.5% Take</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-semibold text-warning">21.8%</span>
                </td>
              </tr>
              {/* Row 4: Nykaa Fashion */}
              <tr className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-status-info-bg flex items-center justify-center text-info shrink-0">
                      <Icon name="diamond" className="material-symbols-outlined text-icon-md" />
                    </div>
                    <div>
                      <div className="text-body font-semibold text-primary">Nykaa Fashion</div>
                      <div className="truncate text-micro text-muted">Curated Premium • Designer Assortment</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">4,280</td>
                <td className="py-3 px-3 text-right font-semibold text-primary">₹1.48 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-subtle text-muted text-micro font-semibold border border-subtle">
                    1.94%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-semibold text-primary">₹3,458</td>
                <td className="py-3 px-3 text-right text-primary font-medium">16.1%</td>
                <td className="py-3 px-3 text-right text-warning font-semibold">26.0% Take</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-semibold text-warning">23.2%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Channel Summary Footer Banner */}
        <div className="mt-4 pt-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-muted text-micro bg-surface-subtle p-3 rounded-xl border border-subtle">
          <div className="flex items-center gap-2">
            <Icon name="info" className="material-symbols-outlined text-accent text-icon" />
            <span>
              Direct app and web traffic drive <strong className="text-primary">73.8%</strong> of total CM2 profit pool with zero third-party platform commissions.
            </span>
          </div>
          <button 
            className="text-accent font-semibold hover:underline shrink-0 text-left md:text-right" 
            type="button"
            onClick={() => onShowToast && onShowToast('Navigating to commission and syndication payout settings.')}
          >
            Configure Commission Splits &rarr;
          </button>
        </div>
      </div>

      {/* Dual Split Diagnostics: Return Reasons Intelligence + Operational SKU Triggers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Return Reasons Breakdown with Actionable Recommendations (Col 5) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-subtle">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-caption text-danger uppercase tracking-wider">
                  Post-Purchase Friction
                </span>
                <h3 className="text-heading font-semibold text-primary mt-0.5">Return Reasons Decomposition</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-danger-bg text-danger text-micro font-semibold">
                16.8% NET
              </span>
            </div>
            <p className="text-meta text-muted mb-4">
              Aggregated from verified reverse pickup notes and reverse quality inspection logs.
            </p>

            {/* Reason Bars */}
            <div className="space-y-4">
              {/* Reason 1 */}
              <div>
                <div className="flex justify-between items-center text-meta mb-1">
                  <span className="font-medium text-primary flex items-center gap-1.5">
                    <Icon name="straighten" className="material-symbols-outlined text-danger text-icon" />
                    Fit &amp; Size Misalignment
                  </span>
                  <span className="font-semibold text-primary">54.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-status-danger h-full" style={{ width: '54%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-micro text-muted">
                  <Icon name="lightbulb" className="material-symbols-outlined text-icon-sm text-accent" />
                  <span><strong className="text-primary">Action:</strong> 3D AR Size recommender ready for deployment on Anarkali Kurta lines.</span>
                </div>
              </div>

              {/* Reason 2 */}
              <div>
                <div className="flex justify-between items-center text-meta mb-1">
                  <span className="font-medium text-primary flex items-center gap-1.5">
                    <Icon name="palette" className="material-symbols-outlined text-warning text-icon" />
                    Color &amp; Fabric Variation
                  </span>
                  <span className="font-semibold text-primary">22.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-status-warning h-full" style={{ width: '22%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-micro text-muted">
                  <Icon name="lightbulb" className="material-symbols-outlined text-icon-sm text-accent" />
                  <span><strong className="text-primary">Action:</strong> Recalibrate studio lighting specs for pure silk / chanderi batches.</span>
                </div>
              </div>

              {/* Reason 3 */}
              <div>
                <div className="flex justify-between items-center text-meta mb-1">
                  <span className="font-medium text-primary flex items-center gap-1.5">
                    <Icon name="local_shipping" className="material-symbols-outlined text-info text-icon" />
                    Delayed Dispatch / Courier SLA
                  </span>
                  <span className="font-semibold text-primary">14.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-status-info h-full" style={{ width: '14%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-micro text-muted">
                  <Icon name="lightbulb" className="material-symbols-outlined text-icon-sm text-accent" />
                  <span><strong className="text-primary">Action:</strong> Shift Tier-2 East zone deliveries to Bluedart Air priority.</span>
                </div>
              </div>

              {/* Reason 4 */}
              <div>
                <div className="flex justify-between items-center text-meta mb-1">
                  <span className="font-medium text-primary flex items-center gap-1.5">
                    <Icon name="broken_image" className="material-symbols-outlined text-muted text-icon" />
                    Manufacturing Stitching Defect
                  </span>
                  <span className="font-semibold text-primary">10.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full" style={{ width: '10%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-micro text-muted">
                  <Icon name="lightbulb" className="material-symbols-outlined text-icon-sm text-accent" />
                  <span><strong className="text-primary">Action:</strong> Penalty notice drafted for Surat Vendor Unit #04.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button inside Card */}
          <div className="mt-4 pt-3 border-t border-surface-subtle">
            <button
              onClick={() => onShowToast && onShowToast('Automated Return Shield activated across 4 fulfillment hubs.')}
              className="w-full py-2 px-3 rounded-xl bg-surface-subtle hover:bg-surface-variant text-primary text-meta font-semibold flex items-center justify-center gap-2 transition-colors border border-subtle"
              type="button"
            >
              <Icon name="verified_user" className="material-symbols-outlined text-icon-md text-accent" />
              <span>Initiate Automated Return Shield Rules</span>
            </button>
          </div>
        </div>

        {/* Margin Outperformers vs High-Return At-Risk SKUs (Col 7) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-subtle">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-caption text-muted uppercase tracking-wider">
                  Catalog Health Check
                </span>
                <h3 className="text-heading font-semibold text-primary mt-0.5">
                  Margin Champions vs. High-Return At-Risk SKUs
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg text-meta font-semibold border border-subtle">
                <button
                  type="button"
                  onClick={() => setSkuTab('top-margin')}
                  className={`px-2 py-1 rounded transition-all ${
 skuTab === 'top-margin'
 ? 'bg-surface-container-lowest text-primary shadow-xs'
 : 'text-muted hover:text-primary'
 }`}
                >
                  Top Margin (5)
                </button>
                <button
                  type="button"
                  onClick={() => setSkuTab('high-returns')}
                  className={`px-2 py-1 rounded transition-all ${
 skuTab === 'high-returns'
 ? 'bg-surface-container-lowest text-primary shadow-xs'
 : 'text-muted hover:text-primary'
 }`}
                >
                  High Returns (5)
                </button>
              </div>
            </div>
            <p className="text-meta text-muted mb-3">
              Live catalog intelligence correlating net unit margins with post-delivery return velocity.
            </p>

            {/* SKU Detailed Mini Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-surface-subtle text-muted text-caption uppercase tracking-wider border-b border-subtle select-none sticky top-0 z-10">
                    <th className="py-2.5 px-3 text-left text-caption text-muted uppercase tracking-wider whitespace-nowrap">SKU &amp; Product</th>
                    <th className="py-2.5 px-3 text-left text-caption text-muted uppercase tracking-wider whitespace-nowrap">Category</th>
                    <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Units Sold</th>
                    <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Net Margin</th>
                    <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Return Rate</th>
                    <th className="py-2.5 px-3 text-right text-caption text-muted uppercase tracking-wider whitespace-nowrap">Action Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 text-meta text-primary">
                  {activeSkuList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Thumbnail src={item.img} alt={item.name} className="w-9 h-11 shrink-0" imgClassName="object-cover" />
                          <div className="min-w-0">
                            <div className="text-meta font-semibold text-primary truncate">{item.name}</div>
                            <div className="truncate text-micro text-muted">
                              {item.sku} • {item.price}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded-full text-micro font-semibold ${item.badgeColor}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">{item.units}</td>
                      <td className={`py-2.5 px-3 text-right ${item.marginColor}`}>{item.margin}</td>
                      <td className={`py-2.5 px-3 text-right ${item.returnColor}`}>{item.returnRate}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onShowToast && onShowToast(`Trigger executed: ${item.action} for ${item.sku}`)}
                          className={`px-2 py-1 rounded text-micro font-semibold transition-colors ${item.actionBtn}`}
                          type="button"
                        >
                          {item.action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Operational Trigger Ribbon */}
          <div className="mt-4 pt-2 flex items-center justify-between text-muted text-micro border-t border-surface-subtle">
            <span>Showing {activeSkuList.length} of 24 highlighted SKUs with actionable threshold deviations.</span>
            <button
              onClick={() => onNavigate && onNavigate('products')}
              className="text-accent font-semibold hover:underline"
              type="button"
            >
              Open Catalog Diagnostics Studio &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Operational Health Footer Ticker */}
      <div className="bg-surface-subtle rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-muted text-micro border border-subtle">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
            ANALYTICS ENGINE STATUS: NORMAL
          </span>
          <span>•</span>
          <span>DATA INGESTION PIPELINE: DELTA-LAKE v3.1</span>
          <span>•</span>
          <span>CONFIDENCE INTERVAL: 99.8%</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Auto-refresh in <strong>04:22</strong></span>
          <button
            onClick={() => onShowToast && onShowToast('Recalculating warehouse telemetry cache in Delta Lake...')}
            className="p-1 hover:text-primary transition-colors rounded"
            title="Force Data Recalculation"
            type="button"
          >
            <Icon name="refresh" className="material-symbols-outlined text-icon-sm" />
          </button>
        </div>
      </div>
    </PageContainer>
  );
}

export default AnalyticsAndReports;
