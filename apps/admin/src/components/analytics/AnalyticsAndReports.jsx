import React, { useState } from 'react';

export function AnalyticsAndReports({ onNavigate, onShowToast }) {
  const [dateRange, setDateRange] = useState('30d'); // '30d', 'mtd', 'q2'
  const [skuTab, setSkuTab] = useState('top-margin'); // 'top-margin', 'high-returns'

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
      marginColor: 'text-status-success font-semibold',
      returnRate: '6.2%',
      returnColor: 'text-status-success',
      action: 'Scale Ad Budget',
      actionBtn: 'bg-primary-container text-on-primary hover:bg-tertiary-container shadow-xs',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpP94zi7cPehYqUzYIDCa6Hx3uYaiFv4pd2f65HP92hlZgv0B1uM3eKK7O9kkpeFoe66PSkaVWCJ5EoNiyTHUEeXJU18hEK5XH4vMZabHeHkOKmcvpmgro1uxuDDuHMhSyeBZP1iAvKaKrtzw6wUdxRoyREv1MhYtZd2T0G-QvMf6EoFo9zuyvadwnd_msu1ZUoCbJifF4462hV4dEo4nazFtFmp_-_vxm-qQt8wL0'
    },
    {
      name: 'Handcrafted Chelsea Boot',
      sku: 'SKU-ACC-4108',
      price: '₹4,890',
      category: 'Footwear',
      badgeColor: 'bg-status-warning-bg text-status-warning',
      units: '980',
      margin: '54.8%',
      marginColor: 'text-status-success font-semibold',
      returnRate: '8.4%',
      returnColor: 'text-status-success',
      action: 'Auto Reorder',
      actionBtn: 'bg-surface-subtle text-text-primary hover:bg-surface-variant',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMpUbNVdaAkzuR2ovlaQTaYOHwEhwNaEsT7bqWus_62kWTo701StDgqYsQphv2Mx8VROGwVqBBYdC6ja7v3brSMqpwUfcgG9vUNj8XR2SlJKZUZvCuW7dMYLDGUkqhMd-GQWNekSRK9dIwU8i2gggc5FFwAJYrGZyDrkeTigLObowZnz4ywUHSnm4JXH1q_pB4_v3xUtIwyMAnLQcmmBWRKRza2qT5jfZaVtrBjC9I'
    },
    {
      name: 'Structured Linen Blazer - Lilac',
      sku: 'SKU-WST-3190',
      price: '₹3,299',
      category: 'Western',
      badgeColor: 'bg-fashion-magenta/10 text-fashion-magenta',
      units: '1,210',
      margin: '28.2%',
      marginColor: 'text-status-warning font-semibold',
      returnRate: '29.4%',
      returnColor: 'text-status-danger font-bold',
      action: 'Audit Size Chart',
      actionBtn: 'bg-status-danger-bg text-status-danger hover:bg-status-danger hover:text-on-error',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbXDKhQyH7u6hwwXjkfOuEJdcp1KJpGc5vlt2t03GPVZd56HoY9ofEbIcEHeN6ocbCzndgEN3jsoMK-fswMKKh4uZFPy5D8QezQZwNxLOdLR9VxZBjMarju3J6_Elg20kTVW78mh3_HXlQo0tT-lxg10bcnuaSw5R2aciyNIEcu25F8L7V6Qx_atAARdIiu62HDs-zJIZQ4Qg3B8c54Z8y9aMM6cZyiCA0Fwf4JgO1'
    },
    {
      name: 'Raw Washed Selvedge Denim',
      sku: 'SKU-CAS-1029',
      price: '₹2,499',
      category: "Men's Casual",
      badgeColor: 'bg-status-info-bg text-status-info',
      units: '2,310',
      margin: '22.1%',
      marginColor: 'text-status-warning font-semibold',
      returnRate: '34.8%',
      returnColor: 'text-status-danger font-bold',
      action: 'Pause Campaigns',
      actionBtn: 'bg-status-danger-bg text-status-danger hover:bg-status-danger hover:text-on-error',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdYUl1xuUKgoMxc1BGMtVHmqEzV-6yTgIFnj5DHKtUqak1uIg75kEVY_efhltSQHzn5_K1r_mY0wIFMEE8EoFIqcuXyEEWVYq_VSI6Xaz7E9_mXCZNWo3sHTntownStp68-VUefvBfkPp2Irs69vZRO4L1X8uXmugxZ_-vFBApxW207ed9lVHlxMMcmV7nDVwsONkXmyKt3J8Z59G_IZqnW6CS81BtAVkomJkRRL7c'
    }
  ];

  const highReturnSkus = [
    {
      name: 'Raw Washed Selvedge Denim',
      sku: 'SKU-CAS-1029',
      price: '₹2,499',
      category: "Men's Casual",
      badgeColor: 'bg-status-info-bg text-status-info',
      units: '2,310',
      margin: '22.1%',
      marginColor: 'text-status-warning font-semibold',
      returnRate: '34.8%',
      returnColor: 'text-status-danger font-bold',
      action: 'Pause Campaigns',
      actionBtn: 'bg-status-danger-bg text-status-danger hover:bg-status-danger hover:text-on-error',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdYUl1xuUKgoMxc1BGMtVHmqEzV-6yTgIFnj5DHKtUqak1uIg75kEVY_efhltSQHzn5_K1r_mY0wIFMEE8EoFIqcuXyEEWVYq_VSI6Xaz7E9_mXCZNWo3sHTntownStp68-VUefvBfkPp2Irs69vZRO4L1X8uXmugxZ_-vFBApxW207ed9lVHlxMMcmV7nDVwsONkXmyKt3J8Z59G_IZqnW6CS81BtAVkomJkRRL7c'
    },
    {
      name: 'Structured Linen Blazer - Lilac',
      sku: 'SKU-WST-3190',
      price: '₹3,299',
      category: 'Western',
      badgeColor: 'bg-fashion-magenta/10 text-fashion-magenta',
      units: '1,210',
      margin: '28.2%',
      marginColor: 'text-status-warning font-semibold',
      returnRate: '29.4%',
      returnColor: 'text-status-danger font-bold',
      action: 'Audit Size Chart',
      actionBtn: 'bg-status-danger-bg text-status-danger hover:bg-status-danger hover:text-on-error',
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
      marginColor: 'text-text-primary font-medium',
      returnRate: '24.2%',
      returnColor: 'text-status-danger font-bold',
      action: 'Check Fabric QC',
      actionBtn: 'bg-status-warning-bg text-status-warning hover:bg-status-warning hover:text-white',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpP94zi7cPehYqUzYIDCa6Hx3uYaiFv4pd2f65HP92hlZgv0B1uM3eKK7O9kkpeFoe66PSkaVWCJ5EoNiyTHUEeXJU18hEK5XH4vMZabHeHkOKmcvpmgro1uxuDDuHMhSyeBZP1iAvKaKrtzw6wUdxRoyREv1MhYtZd2T0G-QvMf6EoFo9zuyvadwnd_msu1ZUoCbJifF4462hV4dEo4nazFtFmp_-_vxm-qQt8wL0'
    },
    {
      name: 'Oversized Boxy Knit Pullover',
      sku: 'SKU-WST-8820',
      price: '₹2,199',
      category: 'Western',
      badgeColor: 'bg-fashion-magenta/10 text-fashion-magenta',
      units: '1,450',
      margin: '34.5%',
      marginColor: 'text-text-primary font-medium',
      returnRate: '21.8%',
      returnColor: 'text-status-danger font-bold',
      action: 'Update Fit Guide',
      actionBtn: 'bg-surface-subtle text-text-primary hover:bg-surface-variant',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMpUbNVdaAkzuR2ovlaQTaYOHwEhwNaEsT7bqWus_62kWTo701StDgqYsQphv2Mx8VROGwVqBBYdC6ja7v3brSMqpwUfcgG9vUNj8XR2SlJKZUZvCuW7dMYLDGUkqhMd-GQWNekSRK9dIwU8i2gggc5FFwAJYrGZyDrkeTigLObowZnz4ywUHSnm4JXH1q_pB4_v3xUtIwyMAnLQcmmBWRKRza2qT5jfZaVtrBjC9I'
    }
  ];

  const activeSkuList = skuTab === 'top-margin' ? topMarginSkus : highReturnSkus;

  return (
    <div className="flex flex-col w-full">
      {/* Editorial Top Breadcrumbs & Micro HUD */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-4 text-text-secondary">
        <nav className="flex items-center gap-1.5 font-semibold text-xs tracking-widest text-text-secondary uppercase">
          <span 
            className="hover:text-text-primary transition-colors cursor-pointer" 
            onClick={() => onNavigate && onNavigate('overview')}
          >
            Everwear Admin
          </span>
          <span>/</span>
          <span 
            className="hover:text-text-primary transition-colors cursor-pointer"
            onClick={() => onNavigate && onNavigate('overview')}
          >
            Core
          </span>
          <span>/</span>
          <span className="text-primary-container font-bold">Analytics &amp; Reports</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-subtle text-text-secondary font-semibold text-[10px] tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
            MODEL: CLOUD-BIGQUERY-v4.8 • LAST SYNC 2M AGO
          </div>
          <span className="text-[10px] text-text-secondary tracking-widest font-semibold">CURRENCY: INR (₹)</span>
        </div>
      </div>

      {/* Header Executive Bar with Filter Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-semibold text-[11px] tracking-wider uppercase">
              Executive Intelligence
            </span>
            <span className="text-[11px] text-text-secondary uppercase tracking-widest">
              FY24-25 Q2 Consolidation
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Enterprise Fashion Analytics &amp; Revenue Operations
          </h1>
          <p className="text-sm text-text-secondary max-w-3xl">
            Multi-channel unit economics, GMV run-rate, SKU margin performance, and returns neutralization metrics across pan-India warehouses.
          </p>
        </div>

        {/* Actions & Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-surface-subtle p-0.5 rounded-xl shadow-sm border border-border-subtle">
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dateRange === '30d'
                  ? 'bg-surface-container-lowest text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              type="button"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('mtd')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dateRange === 'mtd'
                  ? 'bg-surface-container-lowest text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              type="button"
            >
              MTD
            </button>
            <button
              onClick={() => setDateRange('q2')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                dateRange === 'q2'
                  ? 'bg-surface-container-lowest text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              type="button"
            >
              Q2 FY24-25
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 h-9 rounded-xl bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-surface-variant transition-colors shadow-sm border border-border-subtle"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">calendar_month</span>
              <span>Apr 24 – May 24, 2024</span>
              <span className="material-symbols-outlined text-[14px] text-secondary">arrow_drop_down</span>
            </button>
            <button
              onClick={() => onShowToast && onShowToast('Automated Slack & Email digest scheduled for Monday 09:00 IST.')}
              className="inline-flex items-center gap-1.5 px-3 py-2 h-9 rounded-xl bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-surface-variant transition-colors shadow-sm border border-border-subtle"
              title="Schedule recurring report digest"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">schedule_send</span>
              <span>Schedule</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 h-9 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-tertiary-container transition-all shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Strip (5 Metric Cards, Exact Stitch Pattern) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        {/* KPI 1: GMV */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between border border-border-subtle">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
              Gross Merchandise Value
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success text-[11px] font-bold">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>+18.4%
            </span>
          </div>
          <div className="my-2">
            <div className="text-[26px] leading-8 text-text-primary tracking-tight font-bold">₹18.42 Cr</div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-medium">Run Rate: ₹221 Cr ARR</div>
          </div>
          <div className="pt-2 flex items-center justify-between text-text-secondary text-[11px]">
            <span>Target: ₹17.80 Cr</span>
            <span className="text-status-success font-semibold">103.5% of Plan</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-fashion-magenta to-surface-tint"></div>
        </div>

        {/* KPI 2: Net Realized Revenue */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between border border-border-subtle">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
              Net Realized Revenue
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success text-[11px] font-bold">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>+14.2%
            </span>
          </div>
          <div className="my-2">
            <div className="text-[26px] leading-8 text-text-primary tracking-tight font-bold">₹14.85 Cr</div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-medium">Net of GST &amp; RTO Deductions</div>
          </div>
          <div className="pt-2 flex items-center justify-between text-text-secondary text-[11px]">
            <span>Realization Factor</span>
            <span className="text-text-primary font-semibold">80.6% GMV</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-status-success to-primary-container"></div>
        </div>

        {/* KPI 3: Blended Return Rate */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between border border-border-subtle">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
              Blended Return Rate
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success text-[11px] font-bold">
              <span className="material-symbols-outlined text-[12px]">trending_down</span>-1.6%
            </span>
          </div>
          <div className="my-2">
            <div className="text-[26px] leading-8 text-text-primary tracking-tight font-bold">16.8%</div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-medium">Ethnic Best-in-Class (11.4%)</div>
          </div>
          <div className="pt-2 flex items-center justify-between text-text-secondary text-[11px]">
            <span>RTO Velocity: 4.2%</span>
            <span className="text-status-warning font-semibold">Customer: 12.6%</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-status-warning via-status-danger to-primary-container"></div>
        </div>

        {/* KPI 4: CAC vs 12M LTV */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between border border-border-subtle">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
              CAC vs 12M LTV
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-info-bg text-status-info text-[11px] font-bold">
              11.5x Multiple
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] leading-8 text-text-primary tracking-tight font-bold">₹420</span>
              <span className="text-text-secondary text-sm font-medium">/ ₹4,850</span>
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-medium">Payback Period: 38 Days</div>
          </div>
          <div className="pt-2 flex items-center justify-between text-text-secondary text-[11px]">
            <span>Repeat Rate</span>
            <span className="text-primary-container font-semibold">41.8% in 90d</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-status-info to-primary-container"></div>
        </div>

        {/* KPI 5: Fulfillment SLA */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between border border-border-subtle">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
              Fulfillment SLA (24h)
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success text-[11px] font-bold">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>High Guard
            </span>
          </div>
          <div className="my-2">
            <div className="text-[26px] leading-8 text-text-primary tracking-tight font-bold">98.4%</div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-medium">Median Dispatch: 11.2 hrs</div>
          </div>
          <div className="pt-2 flex items-center justify-between text-text-secondary text-[11px]">
            <span>BLR-FC1 SLA: 99.1%</span>
            <span className="text-text-primary font-semibold">BOM-FC2: 97.8%</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-status-success via-status-info to-primary-container"></div>
        </div>
      </div>

      {/* Primary Visual Grid: Multi-Layer Financial Trajectory & Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        {/* Area / Line Chart: Revenue vs Return Deductions vs Fulfillment Cost (Col 8) */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-border-subtle">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-primary-container uppercase tracking-wider">
                    Unit Economics Model
                  </span>
                  <span className="text-text-secondary">•</span>
                  <span className="text-[11px] text-text-secondary font-medium">Rolling 12-Month Trend</span>
                </div>
                <h2 className="text-lg font-bold text-text-primary mt-0.5">
                  Gross Realization, Returns Neutralization &amp; Logistics
                </h2>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium text-text-secondary">
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
            <p className="text-xs text-text-secondary mb-4">
              Analysis highlights healthy margin retention in Q1/Q2 despite promotional seasonal peaks in festival cohorts.
            </p>
          </div>

          {/* High Precision SVG Multi-Area Chart */}
          <div className="w-full h-64 relative mt-2">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 740 220">
              <defs>
                <linearGradient id="areaGmvGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="areaRetGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#E11D48" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Horizontal Guidelines */}
              <line stroke="#F4F4F5" strokeDasharray="3 3" x1="0" x2="740" y1="20" y2="20" />
              <line stroke="#F4F4F5" strokeDasharray="3 3" x1="0" x2="740" y1="70" y2="70" />
              <line stroke="#F4F4F5" strokeDasharray="3 3" x1="0" x2="740" y1="120" y2="120" />
              <line stroke="#F4F4F5" strokeDasharray="3 3" x1="0" x2="740" y1="170" y2="170" />
              {/* GMV Area */}
              <polygon
                fill="url(#areaGmvGrad)"
                points="0,200 0,140 67,130 134,120 201,110 268,95 335,80 402,65 469,50 536,55 603,40 670,30 740,18 740,200"
              />
              {/* GMV Main Stroke */}
              <polyline
                fill="none"
                points="0,140 67,130 134,120 201,110 268,95 335,80 402,65 469,50 536,55 603,40 670,30 740,18"
                stroke="#6d28d9"
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
                stroke="#E11D48"
                strokeLinecap="round"
                strokeWidth="2"
              />
              {/* Fulfillment Cost Stroke */}
              <polyline
                fill="none"
                points="0,192 67,190 134,188 201,185 268,183 335,180 402,176 469,173 536,174 603,171 670,168 740,164"
                stroke="#D97706"
                strokeDasharray="4 3"
                strokeWidth="1.8"
              />
              {/* Marker Data Points */}
              <circle cx="740" cy="18" fill="#6d28d9" r="4" />
              <circle cx="740" cy="142" fill="#E11D48" r="3.5" />
              <circle cx="740" cy="164" fill="#D97706" r="3.5" />
            </svg>
            {/* X-Axis Labels */}
            <div className="flex justify-between items-center text-text-secondary text-[10px] font-semibold mt-2">
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
              <span className="text-primary-container font-bold">MAY &apos;24 (NOW)</span>
            </div>
          </div>

          {/* Quick Metrics Ribbon below chart */}
          <div className="grid grid-cols-3 gap-2 pt-4 mt-2 bg-surface-subtle p-3 rounded-xl border border-border-subtle">
            <div>
              <span className="text-[10px] text-text-secondary uppercase font-semibold">Average Order Value (AOV)</span>
              <div className="text-base font-bold text-text-primary mt-0.5">
                ₹2,840 <span className="text-status-success text-xs font-semibold">+6.4%</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase font-semibold">Effective Take Rate</span>
              <div className="text-base font-bold text-text-primary mt-0.5">
                22.4% <span className="text-text-secondary text-xs font-normal">Post-Comms</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase font-semibold">Net Contribution Margin</span>
              <div className="text-base font-bold text-status-success mt-0.5">
                32.8% <span className="text-status-success text-xs font-semibold">Healthy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Share of Gross Sales (Donut & Ranked Bars) (Col 4) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-border-subtle">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Catalog Allocation
                </span>
                <h2 className="text-lg font-bold text-text-primary mt-0.5">Category Share</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-status-info text-[10px] font-bold">
                4 CORE VERTICALS
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Share of Gross Merchandise Value across active seasonal lines.
            </p>

            {/* Donut Visual + Center Stat */}
            <div className="relative flex items-center justify-center my-3">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" fill="none" r="38" stroke="#F4F4F5" strokeWidth="12" />
                {/* Women's Ethnic: 42% */}
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="38"
                  stroke="#6d28d9"
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
                  stroke="#C026D3"
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
                  stroke="#2563EB"
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
                  stroke="#D97706"
                  strokeDasharray="21.49 238.76"
                  strokeDashoffset="-217.26"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xl font-bold text-text-primary leading-tight">₹18.42 Cr</span>
                <span className="text-[10px] text-text-secondary font-semibold uppercase">Consolidated</span>
              </div>
            </div>
          </div>

          {/* Category Legend & Granular Breakdown */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span className="font-medium text-text-primary">Women&apos;s Ethnic</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-primary font-bold">₹7.74 Cr</span>
                <span className="text-text-secondary font-semibold text-[10px]">(42%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary-container h-full" style={{ width: '42%' }}></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-fashion-magenta"></span>
                <span className="font-medium text-text-primary">Women&apos;s Western</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-primary font-bold">₹5.71 Cr</span>
                <span className="text-text-secondary font-semibold text-[10px]">(31%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-fashion-magenta h-full" style={{ width: '31%' }}></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-info"></span>
                <span className="font-medium text-text-primary">Men&apos;s Casuals</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-primary font-bold">₹3.31 Cr</span>
                <span className="text-text-secondary font-semibold text-[10px]">(18%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-status-info h-full" style={{ width: '18%' }}></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-warning"></span>
                <span className="font-medium text-text-primary">Accessories &amp; Footwear</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-primary font-bold">₹1.66 Cr</span>
                <span className="text-text-secondary font-semibold text-[10px]">(9%)</span>
              </div>
            </div>
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
              <div className="bg-status-warning h-full" style={{ width: '9%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Performance Matrix Table */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm mb-6 overflow-hidden border border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                Channel Unit Economics
              </span>
              <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-status-success text-[10px] font-bold">
                OMNICHANNEL DIRECT + SYNDICATED
              </span>
            </div>
            <h2 className="text-lg font-bold text-text-primary mt-0.5">
              Sales Channel Attribution &amp; Margin Realization
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-secondary font-medium">Comparing 4 active channels</span>
            <button 
              className="p-1 text-secondary hover:text-text-primary rounded-lg transition-colors" 
              title="Filter columns" 
              type="button"
              onClick={() => onShowToast && onShowToast('Channel dimension filters active: Direct, Marketplace, Partner.')}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto scrollbar-thin -mx-5 px-5">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-surface-canvas text-text-secondary text-[11px] uppercase tracking-wider font-semibold border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                <th className="py-2.5 px-3 whitespace-nowrap">Channel Name</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Orders Vol</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Gross GMV</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Conv. Rate</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">AOV (₹)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Return Rate</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Take Rate / Comm.</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">CM2 Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle text-xs text-text-primary">
              {/* Row 1: Direct Mobile App */}
              <tr className="hover:bg-surface-canvas transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary-container shrink-0">
                      <span className="material-symbols-outlined text-[18px]">smartphone</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Mobile App (iOS / Android)</div>
                      <div className="text-[10px] text-text-secondary font-medium">Owned Direct • Zero Commission</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">31,420</td>
                <td className="py-3 px-3 text-right font-bold text-text-primary">₹8.95 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success text-[10px] font-bold">
                    3.92%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-medium">₹2,848</td>
                <td className="py-3 px-3 text-right font-semibold text-status-success">13.2%</td>
                <td className="py-3 px-3 text-right text-text-secondary font-medium">0.0% (₹0)</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-bold text-status-success">44.6%</span>
                </td>
              </tr>
              {/* Row 2: Storefront Web */}
              <tr className="hover:bg-surface-canvas transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-subtle flex items-center justify-center text-text-primary shrink-0 border border-border-subtle">
                      <span className="material-symbols-outlined text-[18px]">laptop_mac</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Storefront Web (everwear.in)</div>
                      <div className="text-[10px] text-text-secondary font-medium">Direct Consumer • Next.js Headless</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">17,890</td>
                <td className="py-3 px-3 text-right font-bold text-text-primary">₹4.65 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-subtle text-text-secondary text-[10px] font-semibold border border-border-subtle">
                    2.41%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-medium">₹2,599</td>
                <td className="py-3 px-3 text-right text-text-primary font-medium">15.8%</td>
                <td className="py-3 px-3 text-right text-text-secondary font-medium">1.8% (PG Gateway)</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-bold text-status-success">38.2%</span>
                </td>
              </tr>
              {/* Row 3: Myntra Marketplace */}
              <tr className="hover:bg-surface-canvas transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-fashion-magenta/10 flex items-center justify-center text-fashion-magenta shrink-0">
                      <span className="material-symbols-outlined text-[18px]">storefront</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Myntra Marketplace</div>
                      <div className="text-[10px] text-text-secondary font-medium">Syndicated Tier-1 • Omnichannel API</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">14,120</td>
                <td className="py-3 px-3 text-right font-bold text-text-primary">₹3.34 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-status-info-bg text-status-info text-[10px] font-bold">
                    4.18%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-medium">₹2,365</td>
                <td className="py-3 px-3 text-right text-status-danger font-semibold">21.4%</td>
                <td className="py-3 px-3 text-right text-status-warning font-semibold">24.5% Take</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-bold text-status-warning">21.8%</span>
                </td>
              </tr>
              {/* Row 4: Nykaa Fashion */}
              <tr className="hover:bg-surface-canvas transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-status-info-bg flex items-center justify-center text-status-info shrink-0">
                      <span className="material-symbols-outlined text-[18px]">diamond</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Nykaa Fashion</div>
                      <div className="text-[10px] text-text-secondary font-medium">Curated Premium • Designer Assortment</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-medium">4,280</td>
                <td className="py-3 px-3 text-right font-bold text-text-primary">₹1.48 Cr</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-subtle text-text-secondary text-[10px] font-semibold border border-border-subtle">
                    1.94%
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-bold text-text-primary">₹3,458</td>
                <td className="py-3 px-3 text-right text-text-primary font-medium">16.1%</td>
                <td className="py-3 px-3 text-right text-status-warning font-semibold">26.0% Take</td>
                <td className="py-3 px-3 text-right">
                  <span className="font-bold text-status-warning">23.2%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Channel Summary Footer Banner */}
        <div className="mt-4 pt-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-text-secondary text-[11px] bg-surface-subtle p-3 rounded-xl border border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[16px]">info</span>
            <span>
              Direct app and web traffic drive <strong className="text-text-primary">73.8%</strong> of total CM2 profit pool with zero third-party platform commissions.
            </span>
          </div>
          <button 
            className="text-primary-container font-semibold hover:underline shrink-0 text-left md:text-right" 
            type="button"
            onClick={() => onShowToast && onShowToast('Navigating to commission and syndication payout settings.')}
          >
            Configure Commission Splits &rarr;
          </button>
        </div>
      </div>

      {/* Dual Split Diagnostics: Return Reasons Intelligence + Operational SKU Triggers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Return Reasons Breakdown with Actionable Recommendations (Col 5) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-border-subtle">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[11px] font-bold text-status-danger uppercase tracking-wider">
                  Post-Purchase Friction
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-0.5">Return Reasons Decomposition</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-status-danger-bg text-status-danger text-[10px] font-bold">
                16.8% NET
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Aggregated from verified reverse pickup notes and reverse quality inspection logs.
            </p>

            {/* Reason Bars */}
            <div className="space-y-4">
              {/* Reason 1 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-status-danger text-[16px]">straighten</span>
                    Fit &amp; Size Misalignment
                  </span>
                  <span className="font-bold text-text-primary">54.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-status-danger h-full" style={{ width: '54%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-text-secondary">
                  <span className="material-symbols-outlined text-[13px] text-primary-container">lightbulb</span>
                  <span><strong className="text-text-primary">Action:</strong> 3D AR Size recommender ready for deployment on Anarkali Kurta lines.</span>
                </div>
              </div>

              {/* Reason 2 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-status-warning text-[16px]">palette</span>
                    Color &amp; Fabric Variation
                  </span>
                  <span className="font-bold text-text-primary">22.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-status-warning h-full" style={{ width: '22%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-text-secondary">
                  <span className="material-symbols-outlined text-[13px] text-primary-container">lightbulb</span>
                  <span><strong className="text-text-primary">Action:</strong> Recalibrate studio lighting specs for pure silk / chanderi batches.</span>
                </div>
              </div>

              {/* Reason 3 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-status-info text-[16px]">local_shipping</span>
                    Delayed Dispatch / Courier SLA
                  </span>
                  <span className="font-bold text-text-primary">14.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-status-info h-full" style={{ width: '14%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-text-secondary">
                  <span className="material-symbols-outlined text-[13px] text-primary-container">lightbulb</span>
                  <span><strong className="text-text-primary">Action:</strong> Shift Tier-2 East zone deliveries to Bluedart Air priority.</span>
                </div>
              </div>

              {/* Reason 4 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[16px]">broken_image</span>
                    Manufacturing Stitching Defect
                  </span>
                  <span className="font-bold text-text-primary">10.0%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full" style={{ width: '10%' }}></div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-text-secondary">
                  <span className="material-symbols-outlined text-[13px] text-primary-container">lightbulb</span>
                  <span><strong className="text-text-primary">Action:</strong> Penalty notice drafted for Surat Vendor Unit #04.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button inside Card */}
          <div className="mt-4 pt-3 border-t border-surface-subtle">
            <button
              onClick={() => onShowToast && onShowToast('Automated Return Shield activated across 4 fulfillment hubs.')}
              className="w-full py-2 px-3 rounded-xl bg-surface-subtle hover:bg-surface-variant text-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-border-subtle"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-primary-container">verified_user</span>
              <span>Initiate Automated Return Shield Rules</span>
            </button>
          </div>
        </div>

        {/* Margin Outperformers vs High-Return At-Risk SKUs (Col 7) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between border border-border-subtle">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Catalog Health Check
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-0.5">
                  Margin Champions vs. High-Return At-Risk SKUs
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg text-xs font-semibold border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setSkuTab('top-margin')}
                  className={`px-2 py-1 rounded transition-all ${
                    skuTab === 'top-margin'
                      ? 'bg-surface-container-lowest text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Top Margin (5)
                </button>
                <button
                  type="button"
                  onClick={() => setSkuTab('high-returns')}
                  className={`px-2 py-1 rounded transition-all ${
                    skuTab === 'high-returns'
                      ? 'bg-surface-container-lowest text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  High Returns (5)
                </button>
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Live catalog intelligence correlating net unit margins with post-delivery return velocity.
            </p>

            {/* SKU Detailed Mini Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-surface-canvas text-text-secondary text-[10px] uppercase tracking-wider font-semibold border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2 px-2.5 whitespace-nowrap">SKU &amp; Product</th>
                    <th className="py-2 px-2.5 whitespace-nowrap">Category</th>
                    <th className="py-2 px-2.5 text-right whitespace-nowrap">Units Sold</th>
                    <th className="py-2 px-2.5 text-right whitespace-nowrap">Net Margin</th>
                    <th className="py-2 px-2.5 text-right whitespace-nowrap">Return Rate</th>
                    <th className="py-2 px-2.5 text-right whitespace-nowrap">Action Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-subtle text-xs">
                  {activeSkuList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-canvas transition-colors">
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <img
                            alt={item.name}
                            className="w-9 h-11 rounded object-cover shrink-0 bg-surface-subtle border border-border-subtle"
                            src={item.img}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-text-primary truncate">{item.name}</div>
                            <div className="text-[10px] text-text-secondary font-medium">
                              {item.sku} • {item.price}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${item.badgeColor}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-medium">{item.units}</td>
                      <td className={`py-2.5 px-2.5 text-right ${item.marginColor}`}>{item.margin}</td>
                      <td className={`py-2.5 px-2.5 text-right ${item.returnColor}`}>{item.returnRate}</td>
                      <td className="py-2.5 px-2.5 text-right">
                        <button
                          onClick={() => onShowToast && onShowToast(`Trigger executed: ${item.action} for ${item.sku}`)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${item.actionBtn}`}
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
          <div className="mt-4 pt-2 flex items-center justify-between text-text-secondary text-[11px] border-t border-surface-subtle">
            <span>Showing {activeSkuList.length} of 24 highlighted SKUs with actionable threshold deviations.</span>
            <button
              onClick={() => onNavigate && onNavigate('products')}
              className="text-primary-container font-semibold hover:underline"
              type="button"
            >
              Open Catalog Diagnostics Studio &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Operational Health Footer Ticker */}
      <div className="bg-surface-subtle rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-text-secondary text-[11px] border border-border-subtle">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-text-primary">
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
            className="p-1 hover:text-text-primary transition-colors rounded"
            title="Force Data Recalculation"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsAndReports;
