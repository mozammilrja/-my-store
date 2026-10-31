import React from 'react';
import { Icon } from '../ui';
import { DataTable, TableToolbar } from '../shared/DataTable';

const ROUTE_DATA = {
  'analytics-and-reports': {
    title: 'Analytics & Multi-Channel Reports',
    subtitle: 'Consolidated merchandising velocity, channel attribution & return-rate telemetry.',
    icon: 'insights',
    stats: [
      { label: 'Weekly Revenue', val: '₹3.42 Cr', change: '+12.4%' },
      { label: 'Cart Conversion', val: '4.82%', change: '+0.6%' },
      { label: 'Return Attributed GMV', val: '14.2%', change: '-1.8%' },
      { label: 'Average SLA Margin', val: '99.4%', change: '+0.2%' },
    ],
    tableTitle: 'Channel Attribution & Unit Velocity'
  },
  'categories-and-collections': {
    title: 'Categories & Curated Collections',
    subtitle: 'Hierarchical taxonomy, seasonal drops, runway capsules & storefront indexing.',
    icon: 'folder_open',
    stats: [
      { label: 'Total Categories', val: '48 Nodes', change: '4 Active' },
      { label: 'Curated Drops', val: '12 Active', change: '+2 Drops' },
      { label: 'Seasonal Capsules', val: '6 Live', change: 'Fall/Atelier' },
      { label: 'Catalog Completeness', val: '98.9%', change: '+1.2%' },
    ],
    tableTitle: 'Taxonomy Master & Storefront Navigation'
  },
  'inventory-and-warehouses': {
    title: 'Multi-Hub Inventory & Warehouse Allocation',
    subtitle: 'Real-time stock ledger, aisle/bin coordinates & automated rebalancing across 4 hubs.',
    icon: 'warehouse',
    stats: [
      { label: 'Total Stock Units', val: '148,920', change: 'Across 4 FCs' },
      { label: 'Low Stock Alerts', val: '12 SKUs', change: 'Urgent PO' },
      { label: 'Inventory Turnover', val: '8.4x / yr', change: '+0.8x' },
      { label: 'Bin Utilization', val: '87.4%', change: 'Optimal' },
    ],
    tableTitle: 'National Warehouse Nodes & Stock Allocations'
  },
  'purchase-orders-and-suppliers': {
    title: 'Purchase Orders & Guild Suppliers',
    subtitle: 'Procurement workflows, raw material silk mill orders & Jaipur guild lead times.',
    icon: 'local_shipping',
    stats: [
      { label: 'Active Inbound POs', val: '22 Orders', change: 'In transit' },
      { label: 'Total Mill Spend', val: '₹1.18 Cr', change: 'Q2 Planned' },
      { label: 'On-Time Mill Delivery', val: '96.2%', change: '+3.1%' },
      { label: 'Supplier Guilds', val: '14 Partners', change: 'Verified' },
    ],
    tableTitle: 'Active Procurement Orders & Mill Commitments'
  },
  'returns-and-exchanges': {
    title: 'Returns, Exchanges & Quality Control',
    subtitle: 'RTO reversions, doorstep size exchanges, reverse logistics & damaged stock quarantine.',
    icon: 'swap_horizontal_circle',
    stats: [
      { label: 'Pending Returns', val: '19 Units', change: 'Awaiting QC' },
      { label: 'Doorstep Exchanges', val: '64 Active', change: '48h SLA' },
      { label: 'QC Pass Rate', val: '92.6%', change: '+1.4%' },
      { label: 'Refund Turnaround', val: '4.2 hrs', change: 'Instant UPI' },
    ],
    tableTitle: 'Reverse Logistics & Inbound QC Queue'
  },
  'shipments-and-dispatch': {
    title: 'Shipments & Linehaul Dispatch',
    subtitle: '3PL carrier airway bills, airport linehauls, vehicle docks & vehicle dispatch schedules.',
    icon: 'flight_takeoff',
    stats: [
      { label: 'Active Dispatches', val: '3,480 Units', change: 'In Flight/Road' },
      { label: 'Carrier Linehauls', val: '18 Trucks', change: 'On Schedule' },
      { label: 'Airport Cutoff Risk', val: '0 Packages', change: 'Clear' },
      { label: 'Average Ground Velocity', val: '28.4 hrs', change: 'Pan-India' },
    ],
    tableTitle: 'Carrier Linehaul Batches & Dock Manifests'
  },
  'gst-and-tax-invoices': {
    title: 'GST Compliance & Tax Invoicing',
    subtitle: 'E-Way bills, HSN 6204/6205 statutory registers, GSTR-1 & B2C invoice archives.',
    icon: 'receipt_long',
    stats: [
      { label: 'GSTIN Invoices (M-T-D)', val: '84,210 Docs', change: '100% Synced' },
      { label: 'Total Output GST', val: '₹57.95 Lakh', change: '12% Slab' },
      { label: 'Input Tax Credit (ITC)', val: '₹22.40 Lakh', change: 'Reconciled' },
      { label: 'E-Way Bill Exceptions', val: '0 Pending', change: 'Compliant' },
    ],
    tableTitle: 'Statutory GST Tax Registers & Invoices'
  },
  'payments-and-reconciliation': {
    title: 'Payments & Gateway Reconciliation',
    subtitle: 'RazorpayX, HDFC PG, UPI, Cash-on-Delivery cash deposits & escrow balance audits.',
    icon: 'account_balance_wallet',
    stats: [
      { label: 'Prepaid Razorpay GMV', val: '₹3.92 Cr', change: '98.4% Auto' },
      { label: 'COD Remittance', val: '₹90.94 Lakh', change: 'Bank Deposited' },
      { label: 'Pending PG Payouts', val: '₹14.28 Lakh', change: 'T+1 Settlement' },
      { label: 'Chargeback Ratio', val: '0.04%', change: 'Ultra-low' },
    ],
    tableTitle: 'Live Payment Batches & Gateway Settlements'
  },
  'credit-notes-and-refunds': {
    title: 'Credit Notes & Customer Refunds',
    subtitle: 'Store credits, return reversals, instant UPI refunds & tax adjusted credit notes.',
    icon: 'currency_exchange',
    stats: [
      { label: 'Credit Notes Issued', val: '312 Docs', change: 'May 2024' },
      { label: 'Instant UPI Refunds', val: '₹8.40 Lakh', change: '100% Success' },
      { label: 'Wallet Store Credits', val: '₹14.90 Lakh', change: '68% Re-used' },
      { label: 'Audit Compliance', val: '100%', change: 'GST Rule 138' },
    ],
    tableTitle: 'Credit Notes Register & Refund Transactions'
  },
  'customers-and-loyalty': {
    title: 'Customers & VIP Couture Loyalty',
    subtitle: 'Tier management (VIP Couture, Platinum, Gold, Silver), lifetime value & concierge profiles.',
    icon: 'group',
    stats: [
      { label: 'Active Shoppers', val: '142,800', change: '+6.2% mo' },
      { label: 'VIP Couture Members', val: '4,120', change: 'High AOV' },
      { label: 'Repeat Purchase Rate', val: '38.4%', change: '+3.2%' },
      { label: 'Loyalty Points Staged', val: '12.4M Pts', change: 'Active' },
    ],
    tableTitle: 'Customer Profiles & Loyalty Tier Ledger'
  },
  'promotions-and-coupons': {
    title: 'Promotions, Flash Drops & Coupons',
    subtitle: 'Discount campaigns, BOGO logic, cart coupon rules & affiliate influencer codes.',
    icon: 'sell',
    stats: [
      { label: 'Active Campaigns', val: '8 Rules', change: 'Festive Drop' },
      { label: 'Coupon Redemptions', val: '14,290', change: '+18.2%' },
      { label: 'Average Discount Depth', val: '34.2%', change: 'Target 35%' },
      { label: 'Campaign Attributed GMV', val: '₹1.64 Cr', change: '34% of GMV' },
    ],
    tableTitle: 'Active Promotional Rules & Cart Mechanics'
  },
  'users-and-role-access': {
    title: 'Users & Enterprise Role-Based Access Control',
    subtitle: 'Warehouse dispatchers, catalog studio editors, financial controllers & audit logs.',
    icon: 'admin_panel_settings',
    stats: [
      { label: 'Active Personnel', val: '64 Users', change: '4 Hubs' },
      { label: 'Admin Roles', val: '6 Tiers', change: 'RBAC Enabled' },
      { label: 'Active Sessions', val: '42 Online', change: '2FA Enforced' },
      { label: 'Security Compliance', val: 'SOC2 Type II', change: 'Audited' },
    ],
    tableTitle: 'Operations Personnel & Privilege Matrix'
  },
  'system-settings': {
    title: 'System Settings & API Gateways',
    subtitle: 'Myntra partner APIs, Delhivery/BlueDart webhook endpoints & telemetry configs.',
    icon: 'settings',
    stats: [
      { label: 'API Health Score', val: '99.98%', change: 'Operational' },
      { label: 'Throughput Speed', val: '1,248 TPS', change: 'Peak Ready' },
      { label: 'Active 3PL Webhooks', val: '14 Endpoints', change: 'Healthy' },
      { label: 'Node Cluster Latency', val: '12ms Avg', change: 'Fast' },
    ],
    tableTitle: 'Integration Webhooks & Microservice Health'
  }
};

export function GenericView({ path, onNavigate, onShowToast }) {
  const data = ROUTE_DATA[path] || {
    title: path.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    subtitle: 'Operational control matrix and enterprise telemetry data.',
    icon: 'dashboard',
    stats: [
      { label: 'System Metric', val: 'Normal', change: '100%' },
      { label: 'Cluster State', val: 'Active', change: 'Healthy' },
      { label: 'Active Services', val: '12 Nodes', change: 'Synced' },
      { label: 'Throughput', val: '1,248 TPS', change: 'Nominal' },
    ],
    tableTitle: 'Operational Logs & Ledger'
  };


  // The placeholder ledger: five synthetic records, shaped as data so this view
  // uses the same shared table as the real modules.
  const genericRows = [1, 2, 3, 4, 5].map((i) => ({
    id: i,
    ref: `#EVR-${data.title.substring(0, 3).toUpperCase()}-904${i}`,
    entity: `Batch Protocol ${i} \u2022 Standard Dispatch`,
    node: ['BLR-FC1', 'BOM-FC2', 'DEL-FC1', 'CCU-FC4'][i % 4],
    value: `\u20B9${(i * 14200 + 4900).toLocaleString('en-IN')}`,
  }));

  const genericColumns = [
    {
      key: 'ref',
      header: 'Record Ref',
      className: 'font-mono font-semibold text-accent whitespace-nowrap',
      accessor: 'ref',
    },
    {
      key: 'entity',
      header: 'Primary Entity',
      cell: (row) => (
        <>
          <div className="font-semibold text-primary">{row.entity}</div>
          <span className="text-meta text-muted">Updated 3 mins ago</span>
        </>
      ),
    },
    {
      key: 'node',
      header: 'Node Cluster',
      cell: (row) => (
        <span className="px-2 py-0.5 rounded bg-surface-subtle text-primary font-mono text-meta border border-subtle whitespace-nowrap">
          {row.node}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Metric / Val',
      align: 'right',
      className: 'font-mono font-semibold text-primary whitespace-nowrap',
      accessor: 'value',
    },
    {
      key: 'compliance',
      fit: true,
      header: 'Compliance',
      align: 'right',
      cell: () => (
        <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold border border-status-success/20">
          Validated
        </span>
      ),
    },
    {
      key: 'actions',
      fit: true,
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <button
          onClick={() =>
            onShowToast({
              type: 'info',
              title: 'Record Inspected',
              message: `Audit ledger verified for protocol #${row.id}.`,
            })
          }
          className="p-1 rounded hover:bg-surface-container text-muted hover:text-primary"
          title="More actions"
          aria-label="More actions"
        >
          <Icon name="more_vert" className="material-symbols-outlined text-icon-md" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col w-full space-y-space-lg animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <nav className="flex items-center gap-1.5 text-caption uppercase tracking-wider text-muted mb-1">
            <span>Everwear Admin</span>
            <span className="text-muted/40">/</span>
            <span className="text-accent font-semibold">{data.title}</span>
          </nav>
          <div className="flex items-center gap-2">
            <Icon name={data.icon} className="material-symbols-outlined text-accent text-icon-xl" />
            <h1 className="text-title font-semibold text-primary tracking-tight">
              {data.title}
            </h1>
          </div>
          <p className="text-body text-secondary mt-1">{data.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('overview')}
            className="px-3 h-9 rounded-xl bg-surface-subtle hover:bg-surface-container-high text-primary text-label transition-colors border border-subtle"
            type="button"
          >
            ← Back to Overview
          </button>
          <button
            onClick={() => onShowToast({ type: 'success', title: 'Data Refreshed', message: `Telemetry updated for ${data.title}.` })}
            className="px-4 h-9 rounded-xl bg-primary-container text-on-accent hover:bg-primary-container-hover text-label shadow-sm transition-colors flex items-center gap-1.5"
            type="button"
          >
            <Icon name="sync" className="material-symbols-outlined text-icon-md" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        {data.stats.map((s, idx) => (
          <div key={idx} className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-subtle flex flex-col justify-between">
            <span className="text-caption uppercase tracking-wider text-muted font-semibold">
              {s.label}
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-kpi text-primary font-semibold tabular-nums">{s.val}</span>
              <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold border border-status-success/20">
                {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Ledger Table Card */}
      <DataTable
        data={genericRows}
        columns={genericColumns}
        keyField="id"
        className="min-w-[850px]"
        emptyIcon="database"
        emptyTitle="No records in this ledger yet"
        emptyMessage="This module has no backing endpoint, so no records are listed."
        toolbar={
          <TableToolbar
            className="px-space-lg py-space-sm"
            left={
              <div className="flex items-center gap-2">
                <Icon name="table_rows" className="material-symbols-outlined text-icon-md text-accent" />
                <h3 className="text-subheading font-semibold text-primary">{data.tableTitle}</h3>
              </div>
            }
            right={
              <span className="text-caption text-muted font-mono whitespace-nowrap">LIVE SYNC &bull; 1,248 TPS</span>
            }
          />
        }
      />
    </div>
  );
}
