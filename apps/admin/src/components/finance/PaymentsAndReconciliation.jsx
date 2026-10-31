import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  Select,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  ErrorState,
  SkeletonPage,
  SearchInput,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable } from '../shared/DataTable';
import { PersonAvatar } from '../shared/PersonAvatar';
import { adminApi } from '../../lib/api';
import { useOrdersQuery } from '../../hooks/useAdminQueries';

export function PaymentsAndReconciliation({ onNavigate, onShowToast }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'batches', 'cod', 'discrepancies', 'disputes'
  const [selectedTxnId, setSelectedTxnId] = useState('984210');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDisputesModalOpen, setIsDisputesModalOpen] = useState(false);
  const [isReMatchModalOpen, setIsReMatchModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbTransactions, setDbTransactions] = useState([]);

  // TanStack Query for orders
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isError: isPaymentsError,
    error: paymentsError,
    refetch: refetchTransactions,
  } = useOrdersQuery({ limit: 50 });

  // Load real orders from query cache to reconcile live transactions
  useEffect(() => {
    if (ordersData?.orders?.length > 0) {
      const liveTxns = ordersData.orders.map((ord, idx) => {
        const amountNum = ord.totals?.total ? ord.totals.total / 100 : 2799;
        const mdrNum = +(amountNum * 0.012).toFixed(2);
        const netNum = +(amountNum - mdrNum).toFixed(2);
        const customerName = ord.shippingAddress ? `${ord.shippingAddress.firstName || ''} ${ord.shippingAddress.lastName || ''}`.trim() : ord.email;
        const initials = customerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'EW';

        return {
          id: ord.id,
          txnCode: `#TXN-${ord.displayId || idx + 1000}`,
          orderRef: `ORD-${ord.displayId || idx + 1000}`,
          customer: customerName,
          initials,
          initialsBg: 'bg-primary-fixed text-on-primary-fixed',
          method: ord.paymentMethod === 'cod' ? 'Cash on Delivery (Handover)' : 'Razorpay UPI',
          methodIcon: ord.paymentMethod === 'cod' ? 'payments' : 'account_balance',
          methodColor: 'text-accent',
          methodType: ord.paymentMethod === 'cod' ? 'COD' : 'UPI',
          gross: `₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          grossNum: amountNum,
          mdr: `₹${mdrNum.toFixed(2)}`,
          mdrNum,
          mdrBase: `-₹${(mdrNum * 0.82).toFixed(2)}`,
          gstOnMdr: `-₹${(mdrNum * 0.18).toFixed(2)}`,
          net: `₹${netNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          netNum,
          utr: `UTR${ord.id.slice(-8).toUpperCase()}`,
          status: ord.paymentStatus === 'paid' ? 'Settled' : ord.paymentStatus === 'refunded' ? 'Refunded' : 'Awaiting Settlement',
          statusBadge: ord.paymentStatus === 'paid' ? 'bg-status-success-bg text-success' : 'bg-status-warning-bg text-warning',
          reconMatch: ord.paymentStatus === 'paid' ? 'Auto-Matched' : 'Pending Verification',
          reconIcon: ord.paymentStatus === 'paid' ? 'done_all' : 'schedule',
          reconBadge: ord.paymentStatus === 'paid' ? 'bg-status-success-bg text-success' : 'bg-status-warning-bg text-warning',
          batch: `#SETTL-${(ord.displayId || 100) + 89000}`,
          source: 'Gateway Node',
          account: 'HDFC •••• 9014',
          timeline: [
            { title: `Order Placed (${ord.paymentMethod?.toUpperCase() || 'PREPAID'})`, time: new Date(ord.createdAt).toLocaleDateString(), color: 'bg-status-success' }
          ]
        };
      });
      setDbTransactions(liveTxns);
    }
  }, [ordersData]);

  // Manual re-match form state
  const [reMatchUtr, setReMatchUtr] = useState('');

  const baseTransactions = [
    {
      id: '984210',
      txnCode: '#TXN-984210',
      orderRef: 'ORD-2024-88412',
      customer: 'Rohan Parekh',
      initials: 'RP',
      initialsBg: 'bg-primary-fixed text-on-primary-fixed',
      method: 'Razorpay UPI',
      methodIcon: 'account_balance',
      methodColor: 'text-accent',
      methodType: 'UPI',
      gross: '₹4,890.00',
      grossNum: 4890.00,
      mdr: '₹57.70',
      mdrNum: 57.70,
      mdrBase: '-₹48.90',
      gstOnMdr: '-₹8.80',
      net: '₹4,832.30',
      netNum: 4832.30,
      utr: 'UTR9841220912',
      status: 'Settled',
      statusBadge: 'bg-status-success-bg text-success',
      reconMatch: 'Auto-Matched',
      reconIcon: 'done_all',
      reconBadge: 'bg-status-success-bg text-success',
      batch: '#SETTL-89214',
      source: 'Razorpay Node-04',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Settlement Ingestion Reconciled', time: 'May 24, 2024 • 14:38:12 IST by AutoWorker', color: 'bg-status-success' },
        { title: 'Bank Credit Confirmation Received', time: 'May 24, 2024 • 14:15:02 IST via HDFC API', color: 'bg-primary-container' },
        { title: 'Payment Captured by Gateway', time: 'May 24, 2024 • 11:22:45 IST via UPI App', color: 'bg-secondary' }
      ]
    },
    {
      id: '984211',
      txnCode: '#TXN-984211',
      orderRef: 'ORD-2024-88415',
      customer: 'Meera Kapoor',
      initials: 'MK',
      initialsBg: 'bg-secondary-fixed text-on-secondary-fixed',
      method: 'PayU Credit Card',
      methodIcon: 'credit_card',
      methodColor: 'text-accent',
      methodType: 'Credit Card',
      gross: '₹12,400.00',
      grossNum: 12400.00,
      mdr: '₹219.48',
      mdrNum: 219.48,
      mdrBase: '-₹186.00',
      gstOnMdr: '-₹33.48',
      net: '₹12,180.52',
      netNum: 12180.52,
      utr: 'UTR9841221104',
      status: 'Settled',
      statusBadge: 'bg-status-success-bg text-success',
      reconMatch: 'Auto-Matched',
      reconIcon: 'done_all',
      reconBadge: 'bg-status-success-bg text-success',
      batch: '#SETTL-89214',
      source: 'PayU Enterprise PG',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Settlement Ingestion Reconciled', time: 'May 24, 2024 • 14:38:12 IST by AutoWorker', color: 'bg-status-success' },
        { title: 'Bank Credit Confirmation Received', time: 'May 24, 2024 • 14:12:10 IST via PayU API', color: 'bg-primary-container' },
        { title: 'Payment Captured by Gateway', time: 'May 24, 2024 • 11:05:19 IST via 3DS2 Visa', color: 'bg-secondary' }
      ]
    },
    {
      id: '984212',
      txnCode: '#TXN-984212',
      orderRef: 'ORD-2024-88420',
      customer: 'Vikram Nair',
      initials: 'VN',
      initialsBg: 'bg-error-container text-on-error-container',
      method: 'Razorpay UPI',
      methodIcon: 'account_balance',
      methodColor: 'text-accent',
      methodType: 'UPI',
      gross: '₹3,450.00',
      grossNum: 3450.00,
      mdr: '₹40.71',
      mdrNum: 40.71,
      mdrBase: '-₹34.50',
      gstOnMdr: '-₹6.21',
      net: '₹3,409.29',
      netNum: 3409.29,
      utr: 'MISSING_UTR',
      status: 'Discrepancy',
      statusBadge: 'bg-status-danger-bg text-danger',
      reconMatch: 'Manual Review',
      reconIcon: 'warning',
      reconBadge: 'bg-status-danger-bg text-danger',
      batch: '#SETTL-89215-PENDING',
      source: 'Razorpay Node-04',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Discrepancy Flagged: Missing Bank UTR', time: 'May 24, 2024 • 14:38:15 IST by ReconGuard', color: 'bg-status-danger' },
        { title: 'Gateway Payload Received without Clearing Ref', time: 'May 24, 2024 • 13:40:00 IST', color: 'bg-status-warning' },
        { title: 'Order Created in System', time: 'May 24, 2024 • 13:35:10 IST via Web', color: 'bg-secondary' }
      ]
    },
    {
      id: '984213',
      txnCode: '#TXN-984213',
      orderRef: 'ORD-2024-88424',
      customer: 'Deepak Sen',
      initials: 'DS',
      initialsBg: 'bg-surface-subtle text-muted',
      method: 'COD (BlueDart)',
      methodIcon: 'local_shipping',
      methodColor: 'text-warning',
      methodType: 'COD',
      gross: '₹1,899.00',
      grossNum: 1899.00,
      mdr: '₹45.00',
      mdrNum: 45.00,
      mdrBase: '-₹45.00',
      gstOnMdr: '₹0.00 (Exempt)',
      net: '₹1,854.00',
      netNum: 1854.00,
      utr: 'BD-DEL-40192',
      status: 'In Clearing',
      statusBadge: 'bg-status-info-bg text-info',
      reconMatch: '3PL Clearing',
      reconIcon: 'sync',
      reconBadge: 'bg-status-info-bg text-info',
      batch: '#3PL-BD-DEL-89',
      source: 'BlueDart Courier Feed',
      account: 'Cash Remittance Hub',
      timeline: [
        { title: 'Cash Ingested at BlueDart Regional Hub', time: 'May 24, 2024 • 12:10:00 IST', color: 'bg-status-info' },
        { title: 'Doorstep Delivery Completed & Cash Collected', time: 'May 24, 2024 • 10:45:00 IST', color: 'bg-status-success' }
      ]
    },
    {
      id: '984214',
      txnCode: '#TXN-984214',
      orderRef: 'ORD-2024-88429',
      customer: 'Aarti Gupta',
      initials: 'AG',
      initialsBg: 'bg-secondary-fixed text-on-secondary-fixed',
      method: 'HDFC NetBanking',
      methodIcon: 'domain',
      methodColor: 'text-info',
      methodType: 'NetBanking',
      gross: '₹6,250.00',
      grossNum: 6250.00,
      mdr: '₹18.00',
      mdrNum: 18.00,
      mdrBase: '-₹15.25',
      gstOnMdr: '-₹2.75',
      net: '₹6,232.00',
      netNum: 6232.00,
      utr: 'HDFC9912048',
      status: 'Settled',
      statusBadge: 'bg-status-success-bg text-success',
      reconMatch: 'Auto-Matched',
      reconIcon: 'done_all',
      reconBadge: 'bg-status-success-bg text-success',
      batch: '#SETTL-89214',
      source: 'HDFC Corporate Aggregator',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Settlement Ingestion Reconciled', time: 'May 24, 2024 • 14:38:12 IST by AutoWorker', color: 'bg-status-success' },
        { title: 'Host-to-Host Confirmation Cleared', time: 'May 24, 2024 • 14:02:18 IST', color: 'bg-primary-container' },
        { title: 'NetBanking Auth Successful', time: 'May 24, 2024 • 13:58:00 IST', color: 'bg-secondary' }
      ]
    },
    {
      id: '984215',
      txnCode: '#TXN-984215',
      orderRef: 'ORD-2024-88432',
      customer: 'Kunal Chawla',
      initials: 'KC',
      initialsBg: 'bg-status-warning-bg text-warning',
      method: 'PayU Credit Card',
      methodIcon: 'credit_card',
      methodColor: 'text-accent',
      methodType: 'Credit Card',
      gross: '₹8,999.00',
      grossNum: 8999.00,
      mdr: '₹159.28',
      mdrNum: 159.28,
      mdrBase: '-₹135.00',
      gstOnMdr: '-₹24.28',
      net: '₹8,839.72',
      netNum: 8839.72,
      utr: 'CB-HOLD-002',
      status: 'Chargeback Hold',
      statusBadge: 'bg-status-warning-bg text-warning',
      reconMatch: 'Disputed',
      reconIcon: 'flag',
      reconBadge: 'bg-status-warning-bg text-warning',
      batch: '#DISPUTE-2024-08',
      source: 'PayU Dispute Desk',
      account: 'Escrow Reserve Account',
      timeline: [
        { title: 'Card Issuer Chargeback Inquiry Filed', time: 'May 24, 2024 • 13:10:00 IST (Reason: Unrecognized Txn)', color: 'bg-status-warning' },
        { title: 'Funds Held in Merchant Escrow', time: 'May 24, 2024 • 13:11:00 IST', color: 'bg-status-danger' },
        { title: 'Original Payment Settled', time: 'May 22, 2024 • 10:00:00 IST', color: 'bg-secondary' }
      ]
    }
  ];

  const disputesList = [
    { id: 'DSP-01', order: 'ORD-2024-88432', customer: 'Kunal Chawla', amount: '₹8,999.00', reason: 'Unrecognized Charge', cardBrand: 'Mastercard', daysLeft: '4 Days' },
    { id: 'DSP-02', order: 'ORD-2024-87910', customer: 'Pooja Verma', amount: '₹4,250.00', reason: 'Defective Garment (Claimed)', cardBrand: 'Visa Signature', daysLeft: '6 Days' },
    { id: 'DSP-03', order: 'ORD-2024-87422', customer: 'Siddharth Rao', amount: '₹14,200.00', reason: 'Package Not Received', cardBrand: 'Amex Platinum', daysLeft: '2 Days (Urgent)' },
  ];

  const transactions = useMemo(() => {
    return [...dbTransactions, ...baseTransactions];
  }, [dbTransactions]);

  const selectedTxn = useMemo(() => {
    return transactions.find(t => t.id === selectedTxnId) || transactions[0];
  }, [selectedTxnId, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (activeTab === 'discrepancies' && t.status !== 'Discrepancy') return false;
      if (activeTab === 'disputes' && t.status !== 'Chargeback Hold') return false;
      if (activeTab === 'cod' && t.methodType !== 'COD') return false;
      if (methodFilter !== 'ALL' && t.methodType !== methodFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !t.txnCode.toLowerCase().includes(q) &&
          !t.orderRef.toLowerCase().includes(q) &&
          !t.customer.toLowerCase().includes(q) &&
          !t.utr.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeTab, methodFilter, statusFilter, searchQuery, transactions]);

  // One shared pager over the rows this module actually holds.
  const txnPager = useClientTable(filteredTransactions);

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (onShowToast) onShowToast('Gateway API telemetry synced successfully across Razorpay, PayU, and Cashfree.');
    }, 1200);
  };

  const handleDownloadLedger = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<EVERWEAR_SETTLEMENT_LEDGER>
  <GENERATED_DATE>${new Date().toISOString()}</GENERATED_DATE>
  <BATCH_ID>SETTL-89214</BATCH_ID>
  <TOTAL_SETTLED_INR>124890400</TOTAL_SETTLED_INR>
  <ENTRIES_COUNT>${transactions.length}</ENTRIES_COUNT>
</EVERWEAR_SETTLEMENT_LEDGER>`;
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `everwear_settlement_ledger_${new Date().toISOString().slice(0, 10)}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Tally / Zoho Books XML ledger export generated.');
  };

  const handleManualRematchSubmit = (e) => {
    e.preventDefault();
    setIsReMatchModalOpen(false);
    if (onShowToast) onShowToast(`Bank UTR ${reMatchUtr || 'UTR9841220999'} linked to ${selectedTxn.txnCode}. Status updated to Settled.`);
  };

  if (isOrdersLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={7} label="Loading settlements" />;
  }


  const txnColumns = [
    {
      key: 'txn',
      header: 'Transaction ID / Order',
      cell: (t) => (
        <div className="flex flex-col">
          <span className="font-semibold text-accent">{t.txnCode}</span>
          <span className="text-micro text-muted">{t.orderRef}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (t) => (
        <div className="flex items-center gap-2">
          <PersonAvatar
            name={t.customer}
            initials={t.initials}
            tone={t.initialsBg}
            className="h-6 w-6"
            fallbackClassName="text-micro"
          />
          <span className="font-semibold text-primary truncate max-w-[110px]">{t.customer}</span>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (t) => (
        <span className="flex min-w-0 items-center gap-1 font-medium text-primary" title={t.method}>
          <Icon name={t.methodIcon} aria-hidden="true" className={`material-symbols-outlined shrink-0 text-icon ${t.methodColor}`} />
          <span className="truncate">{t.method}</span>
        </span>
      ),
    },
    { key: 'gross', header: 'Gross Amount', align: 'right', className: 'font-semibold', accessor: 'gross' },
    { key: 'mdr', header: 'MDR + GST', align: 'right', className: 'text-muted font-medium', accessor: 'mdr' },
    { key: 'net', header: 'Net Settled', align: 'right', className: 'font-semibold text-success', accessor: 'net' },
    {
      key: 'utr',
      header: 'Bank UTR / Ref',
      cell: (t) => (
        <span
          className={`font-mono text-micro px-1.5 py-0.5 rounded ${
            t.utr === 'MISSING_UTR'
              ? 'bg-status-danger-bg text-danger font-semibold'
              : 'bg-surface-subtle text-muted border border-subtle'
          }`}
        >
          {t.utr}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Gateway Status',
      cell: (t) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-micro font-semibold ${t.statusBadge}`}>
          {t.status}
        </span>
      ),
    },
    {
      key: 'recon',
      header: 'Recon Match',
      cell: (t) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold ${t.reconBadge}`}>
          <Icon name={t.reconIcon} className="material-symbols-outlined text-icon-sm" />
          {t.reconMatch}
        </span>
      ),
    },
    {
      key: 'action',
      fit: true,
      header: 'Action',
      align: 'center',
      cell: (t) =>
        t.status === 'Discrepancy' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTxnId(t.id);
              setIsReMatchModalOpen(true);
            }}
            className="p-1 rounded-md text-danger hover:bg-status-danger-bg transition-colors"
            title="Resolve Discrepancy"
            type="button"
          >
            <Icon name="build" className="material-symbols-outlined text-icon-md" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTxnId(t.id);
            }}
            className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-subtle transition-colors"
            title="View Breakdown"
            type="button"
          >
            <Icon name="visibility" className="material-symbols-outlined text-icon-md" />
          </button>
        ),
    },
  ];

  return (
    <PageContainer>
      {paymentsError && (
        <ErrorState
          title="Settlement data could not be loaded"
          message={paymentsError?.message}
          onRetry={() => refetchTransactions()}
        />
      )}
      {/* Top Breadcrumb & Actions Bar */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Finance & Compliance', 'Payments & Reconciliation']}
        title="Payment Gateway Settlement & Financial Reconciliation"
        badge="LEDGER SYNC: CURRENT"
        badgeVariant="success"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="gap-2"
              type="button"
            >
              <Icon name="sync" className={`material-symbols-outlined text-icon text-muted ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Trigger Gateway Sync'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLedger}
              className="gap-2"
              type="button"
            >
              <Icon name="download" className="material-symbols-outlined text-icon text-muted" />
              <span>Export Tally / Zoho XML</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDisputesModalOpen(true)}
              className="gap-2 bg-primary-container text-on-accent hover:bg-primary-container-hover shadow-sm"
              type="button"
            >
              <Icon name="gavel" className="material-symbols-outlined text-icon" />
              <span>Dispute Resolution Center</span>
              <span className="ml-1 px-1.5 py-px rounded-full bg-status-danger-solid text-on-accent text-micro font-semibold">
                8
              </span>
            </Button>
          </>
        }
      />

      {/* 5 Top Summary Metric Cards */}
      <ContentGrid columns={5}>
        <StatsCard
          title="Settled Funds (MTD)"
          value="₹12,48,90,400"
          icon="verified"
          iconColor="text-success"
          trend="+14.2%"
          trendType="up"
          trendLabel="Razorpay, Cashfree, Stripe, PayU"
        />
        <StatsCard
          title="In-Transit / Uncleared"
          value="₹84,20,500"
          icon="hourglass_top"
          iconColor="text-info"
          badge="1,420 Txns"
          badgeVariant="info"
          trendLabel="T+2 Settlement Window"
        />
        <StatsCard
          title="COD Cash-in-Transit"
          value="₹32,15,000"
          icon="local_shipping"
          iconColor="text-warning"
          badge="312 Hubs"
          badgeVariant="warning"
          trendLabel="BlueDart, Delhivery, SFX"
        />
        <StatsCard
          title="Gateway Fee & MDR"
          value="₹18,45,210"
          icon="pie_chart"
          trendLabel="Blended Rate: 1.48% MDR"
        />
        <StatsCard
          title="Unreconciled Variance"
          value="₹12,450"
          icon="warning"
          iconColor="text-danger"
          badge="3 Flagged"
          badgeVariant="destructive"
          trendLabel="Manual Action Required"
        />
      </ContentGrid>

        {/* Gateway Status & Ingestion Pipes (4 Gateway Cards) */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-subtle">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Icon name="lan" className="material-symbols-outlined text-icon-lg text-accent" />
              <h2 className="text-heading font-semibold text-primary">Reconciled Gateway Status &amp; Ingestion Pipes</h2>
            </div>
            <div className="flex items-center gap-4 text-muted text-micro font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-success"></span>Matched (99.6%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-warning"></span>Pending Remit (0.39%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-danger"></span>Discrepancy (0.01%)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Gateway 1: Razorpay UPI */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="account_balance" className="material-symbols-outlined text-icon-md text-accent" />
                  <span className="text-body font-semibold text-primary">Razorpay UPI</span>
                </div>
                <span className="text-meta font-semibold text-success">99.8% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '99.8%' }}></div>
                <div className="bg-status-warning h-full" style={{ width: '0.2%' }}></div>
              </div>
              <div className="flex items-center justify-between text-micro text-muted">
                <span>Vol: ₹7,85,12,000</span>
                <span>Batch #89214 Closed</span>
              </div>
            </div>

            {/* Gateway 2: HDFC NetBanking */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="domain" className="material-symbols-outlined text-icon-md text-info" />
                  <span className="text-body font-semibold text-primary">HDFC NetBanking</span>
                </div>
                <span className="text-meta font-semibold text-success">100.0% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '100%' }}></div>
              </div>
              <div className="flex items-center justify-between text-micro text-muted">
                <span>Vol: ₹2,10,34,500</span>
                <span>Zero Variance</span>
              </div>
            </div>

            {/* Gateway 3: COD Remittance */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="local_shipping" className="material-symbols-outlined text-icon-md text-warning" />
                  <span className="text-body font-semibold text-primary">COD Remittance</span>
                </div>
                <span className="text-meta font-semibold text-warning">98.2% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '98.2%' }}></div>
                <div className="bg-status-warning h-full" style={{ width: '1.8%' }}></div>
              </div>
              <div className="flex items-center justify-between text-micro text-muted">
                <span>Vol: ₹1,48,20,900</span>
                <span>₹2.4L In 3PL Transit</span>
              </div>
            </div>

            {/* Gateway 4: PayU Credit Cards */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="credit_card" className="material-symbols-outlined text-icon-md text-accent" />
                  <span className="text-body font-semibold text-primary">PayU Credit Cards</span>
                </div>
                <span className="text-meta font-semibold text-success">99.9% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '99.9%' }}></div>
                <div className="bg-status-danger h-full" style={{ width: '0.1%' }}></div>
              </div>
              <div className="flex items-center justify-between text-micro text-muted">
                <span>Vol: ₹1,05,23,000</span>
                <span>MDR ₹1.82L Deducted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Split View: Master Ledger Table + Sticky Settlement Drawer */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* Left Table Section */}
          <div className="w-full xl:flex-1 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-subtle">
            {/* Table Filter Tabs */}
            <div className="px-4 pt-3 bg-surface-container-lowest flex items-center justify-between overflow-x-auto select-none border-b border-subtle">
              <div className="flex items-center gap-1 text-meta whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
 activeTab === 'all'
 ? 'text-accent bg-surface-subtle shadow-xs'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                  type="button"
                >
                  <span>All Transactions</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-micro font-semibold">
                    {transactions.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('batches')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
 activeTab === 'batches'
 ? 'text-accent bg-surface-subtle shadow-xs'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                  type="button"
                >
                  <span>Gateway Batches</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-muted text-micro font-semibold">
                    18
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('cod')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
 activeTab === 'cod'
 ? 'text-accent bg-surface-subtle shadow-xs'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                  type="button"
                >
                  <span>3PL COD Remittance</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-muted text-micro font-semibold">
                    94
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('discrepancies')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
 activeTab === 'discrepancies'
 ? 'text-danger bg-status-danger-bg shadow-xs'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                  type="button"
                >
                  <span>Discrepancies</span>
                  <span className="px-2 py-0.5 rounded-full bg-status-danger-bg text-danger text-micro font-semibold">
                    3 Flagged
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('disputes')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
 activeTab === 'disputes'
 ? 'text-warning bg-status-warning-bg shadow-xs'
 : 'text-muted hover:text-primary hover:bg-surface-subtle'
 }`}
                  type="button"
                >
                  <span>Chargebacks</span>
                  <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-warning text-micro font-semibold">
                    8
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 pl-3">
                <button 
                  className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-subtle" 
                  title="Refresh Feed"
                  type="button"
                  onClick={handleTriggerSync}
                >
                  <Icon name="refresh" className="material-symbols-outlined text-icon-lg" />
                </button>
              </div>
            </div>

            {/* Filter Search Bar */}
            <div className="p-4 bg-surface-subtle/50 flex flex-wrap items-center justify-between gap-3 border-b border-subtle">
              <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                <SearchInput
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
                  onClear={() => setSearchQuery('')}
                  placeholder="Filter by UTR, order, customer or amount"
                  label="Filter transactions"
                  className="w-full max-w-sm flex-1"
                />
                <div className="w-40">
                  <Select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="h-9"
                  >
                    <option value="ALL">All Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="NetBanking">NetBanking</option>
                    <option value="COD">COD</option>
                  </Select>
                </div>
                <div className="w-44">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Settled">Settled</option>
                    <option value="In Clearing">In Clearing</option>
                    <option value="Discrepancy">Discrepancy</option>
                    <option value="Chargeback Hold">Chargeback Hold</option>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-micro font-semibold text-muted">BATCH WINDOW:</span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-meta font-semibold text-primary border border-subtle">
                  TODAY 00:00 - 23:59 IST
                </span>
              </div>
            </div>

            <DataTable
              data={txnPager.pageRows}
              columns={txnColumns}
              keyField="id"
              className="min-w-[1020px]"
              containerClassName="border-0 bg-transparent shadow-none rounded-none"
              activeRowId={selectedTxnId}
              onRowClick={(t) => setSelectedTxnId(t.id)}
              rowClassName={(t) =>
                t.status === 'Discrepancy'
                  ? 'bg-status-danger-bg/25'
                  : t.status === 'Chargeback Hold'
                  ? 'bg-status-warning-bg/20'
                  : ''
              }
              emptyIcon="account_balance"
              emptyTitle="No transactions in this window"
              emptyMessage="No settlement matches the current search, method or status filter."
              pagination={{
                page: txnPager.page,
                pageSize: txnPager.limit,
                totalItems: txnPager.total,
                onPageChange: txnPager.setPage,
                onPageSizeChange: txnPager.setLimit,
              }}
            />
          </div>

          {/* Right Side: Detailed Settlement Breakdown Drawer (Sticky) */}
          <div className="w-full xl:w-[410px] shrink-0 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden sticky top-20 border border-subtle">
            <div className="p-4 bg-surface-container-low flex items-center justify-between border-b border-subtle">
              <div className="flex items-center gap-2">
                <Icon name="receipt_long" className="material-symbols-outlined text-icon-lg text-accent" />
                <span className="text-body font-semibold text-primary">Detailed Settlement Breakdown</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-micro font-semibold ${selectedTxn.statusBadge}`}>
                {selectedTxn.status.toUpperCase()}
              </span>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between bg-surface-subtle p-3 rounded-lg border border-subtle">
                <div className="flex flex-col">
                  <span className="text-caption text-muted uppercase">CURRENT SELECTION</span>
                  <span className="text-heading font-semibold text-primary mt-0.5">{selectedTxn.txnCode}</span>
                  <span className="text-meta text-muted font-medium">Order: {selectedTxn.orderRef}</span>
                </div>
                <div className="text-right">
                  <span className="text-caption text-muted uppercase">NET DEPOSITED</span>
                  <div className="text-kpi-sm font-semibold text-success mt-0.5">{selectedTxn.net}</div>
                </div>
              </div>

              {/* Financial Split & Deductions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-muted text-micro font-semibold tracking-wider">
                  <span>FINANCIAL SPLIT &amp; DEDUCTIONS</span>
                  <span>STATUTORY GST (18%)</span>
                </div>
                <div className="space-y-2 text-meta">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted font-medium">Cart Gross Total (Customer Paid)</span>
                    <span className="font-semibold text-primary">{selectedTxn.gross}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted font-medium">Gateway MDR Base Rate (1.00%)</span>
                    <span className="font-semibold text-danger">{selectedTxn.mdrBase}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted font-medium">Integrated GST on MDR (18.0%)</span>
                    <span className="font-semibold text-danger">{selectedTxn.gstOnMdr}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted font-medium">Everwear Platform Processing</span>
                    <span className="font-semibold text-primary">₹0.00 (Waived)</span>
                  </div>
                  <div className="pt-2 flex justify-between items-center font-semibold bg-surface-subtle px-2.5 py-1.5 rounded-lg border border-subtle">
                    <span className="text-primary">Net Bank Credit Amount</span>
                    <span className="text-success text-body">{selectedTxn.net}</span>
                  </div>
                </div>
              </div>

              {/* Banking & Batch Telemetry */}
              <div className="p-3 bg-surface-subtle/70 rounded-lg space-y-2 border border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted uppercase">
                    BANKING &amp; BATCH TELEMETRY
                  </span>
                  <Icon name="account_balance" className="material-symbols-outlined text-icon text-success" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-meta">
                  <div>
                    <span className="text-micro text-muted block font-semibold">SETTLEMENT BATCH</span>
                    <span className="font-mono text-meta font-semibold text-accent whitespace-nowrap">{selectedTxn.batch}</span>
                  </div>
                  <div>
                    <span className="text-micro text-muted block font-semibold">GATEWAY SOURCE</span>
                    <span className="font-semibold text-primary">{selectedTxn.source}</span>
                  </div>
                  <div>
                    <span className="text-micro text-muted block font-semibold">BANK UTR NUMBER</span>
                    <span className="font-mono text-meta font-medium text-primary whitespace-nowrap">{selectedTxn.utr}</span>
                  </div>
                  <div>
                    <span className="text-micro text-muted block font-semibold">CREDIT ACCOUNT</span>
                    <span className="font-mono text-meta font-medium text-primary whitespace-nowrap">{selectedTxn.account}</span>
                  </div>
                </div>
              </div>

              {/* Audit Trail & Compliance Timestamp */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-caption text-muted uppercase">
                    AUDIT TRAIL &amp; COMPLIANCE TIMESTAMP
                  </span>
                  <span className="text-micro font-semibold text-success">VERIFIED LOG</span>
                </div>
                <div className="space-y-3 relative pl-3.5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-border-subtle">
                  {selectedTxn.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[13px] top-1.5 w-2 h-2 rounded-full ${item.color}`}></div>
                      <div className="text-meta font-semibold text-primary">{item.title}</div>
                      <div className="text-micro text-muted">{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onShowToast && onShowToast(`Tax Invoice PDF compiled for ${selectedTxn.txnCode}.`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-subtle hover:bg-border-subtle text-primary text-meta font-semibold transition-colors border border-subtle cursor-pointer"
                  type="button"
                >
                  <Icon name="receipt" className="material-symbols-outlined text-icon" />
                  <span>Tax Invoice</span>
                </button>
                <button
                  onClick={() => setIsReMatchModalOpen(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary-container text-on-accent hover:bg-primary-container-hover text-meta font-semibold transition-colors shadow-sm cursor-pointer"
                  type="button"
                >
                  <Icon name="rule" className="material-symbols-outlined text-icon" />
                  <span>Manual Re-Match</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 3 Diagnostic Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between border border-subtle">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body font-semibold text-primary">Automated Recon Health</h3>
                <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">
                  OPTIMAL
                </span>
              </div>
              <p className="text-meta text-muted mb-3">
                Real-time multi-currency dual entry checking against Everwear ERP &amp; Banking Host-to-Host (H2H) pipe.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-meta font-semibold">
                  <span className="text-muted">H2H Auto-Match Accuracy</span>
                  <span className="text-primary">99.98%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '99.98%' }}></div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-muted text-micro border-t border-surface-subtle">
              <span>CRON JOB: Run every 15 min</span>
              <span className="text-success font-semibold">Active (PID: 49102)</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between border border-subtle">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body font-semibold text-primary">Carrier COD Remittances</h3>
                <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-warning text-micro font-semibold">
                  CYCLE T+3
                </span>
              </div>
              <div className="space-y-2.5 mt-2">
                <div className="flex items-center justify-between text-meta">
                  <span className="text-muted font-medium">BlueDart Express (Air Cargo)</span>
                  <span className="font-semibold text-primary">₹18,20,400 <span className="text-micro text-success font-semibold">(99.1%)</span></span>
                </div>
                <div className="flex items-center justify-between text-meta">
                  <span className="text-muted font-medium">Delhivery Direct Surface</span>
                  <span className="font-semibold text-primary">₹10,44,100 <span className="text-micro text-success font-semibold">(98.0%)</span></span>
                </div>
                <div className="flex items-center justify-between text-meta">
                  <span className="text-muted font-medium">Shadowfax Hyperlocal &amp; City</span>
                  <span className="font-semibold text-primary">₹3,50,500 <span className="text-micro text-warning font-semibold">(95.4%)</span></span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-micro text-muted border-t border-surface-subtle">
              <span>NEXT SETTLEMENT WINDOW</span>
              <span className="font-semibold text-primary">Tomorrow 11:30 AM</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between border border-subtle">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-body font-semibold text-primary">Direct ERP Ingestion</h3>
                <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-info text-micro font-semibold">
                  ZOHO BOOKS V4
                </span>
              </div>
              <p className="text-meta text-muted mb-3">
                Push journal entries for gross sales, payment processor fee ledger, and credit note offsets directly to corporate books.
              </p>
              <div className="p-2.5 rounded-lg bg-surface-subtle flex items-center justify-between border border-subtle">
                <div className="flex items-center gap-2">
                  <Icon name="sync_saved_locally" className="material-symbols-outlined text-icon-md text-accent" />
                  <div className="flex flex-col">
                    <span className="text-meta font-semibold text-primary">Ledger Sync Auto-Lock</span>
                    <span className="text-micro text-muted">Day closing snapshot enabled</span>
                  </div>
                </div>
                <button
                  onClick={() => onShowToast && onShowToast('Ledger sync batch pushed to Zoho Books API successfully.')}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-primary hover:bg-border-subtle text-meta font-semibold border border-subtle transition-colors cursor-pointer"
                  type="button"
                >
                  Push Now
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-micro text-muted border-t border-surface-subtle">
              <span>LAST SYNC: 14 mins ago</span>
              <span className="text-success font-semibold">Zero Journal Skew</span>
            </div>
          </div>
        </div>

      {/* Disputes Resolution Modal */}
      {isDisputesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Icon name="gavel" className="material-symbols-outlined text-danger text-icon-lg" />
                <h3 className="text-heading font-semibold text-primary">Dispute &amp; Chargeback Resolution Desk</h3>
              </div>
              <button
                onClick={() => setIsDisputesModalOpen(false)}
                className="p-1 text-muted hover:text-primary rounded-lg transition-colors"
                type="button" title="Close" aria-label="Close"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-lg" />
              </button>
            </div>
            <p className="text-meta text-muted">
              Review and submit counter-evidence for chargeback challenges before statutory banking deadlines.
            </p>
            <div className="space-y-3">
              {disputesList.map((d) => (
                <div key={d.id} className="p-3 bg-surface-subtle rounded-xl flex items-center justify-between border border-subtle">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-meta text-primary">{d.id}</span>
                      <span className="text-meta text-muted font-medium">({d.order})</span>
                      <span className="px-1.5 py-0.5 rounded bg-status-danger-bg text-danger text-micro font-semibold">
                        {d.daysLeft}
                      </span>
                    </div>
                    <div className="text-meta font-medium text-primary mt-1">
                      {d.customer} • <span className="font-semibold">{d.amount}</span> • {d.cardBrand}
                    </div>
                    <div className="text-micro text-muted mt-0.5">Claim: {d.reason}</div>
                  </div>
                  <button
                    onClick={() => {
                      setIsDisputesModalOpen(false);
                      if (onShowToast) onShowToast(`Evidence packet compiled and uploaded for ${d.id}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary-container text-on-accent text-meta font-semibold hover:bg-primary-container-hover transition-colors cursor-pointer"
                    type="button"
                  >
                    Submit Proof
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-subtle flex justify-end">
              <button
                onClick={() => setIsDisputesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-subtle hover:bg-surface-variant text-primary text-meta font-semibold"
                type="button"
              >
                Close Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Re-Match / Override Modal */}
      {isReMatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleManualRematchSubmit}
            className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-subtle space-y-4"
          >
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Icon name="rule" className="material-symbols-outlined text-accent text-icon-lg" />
                <h3 className="text-heading font-semibold text-primary">Manual Settlement Override</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReMatchModalOpen(false)}
                className="p-1 text-muted hover:text-primary rounded-lg transition-colors" title="Close" aria-label="Close"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-lg" />
              </button>
            </div>
            <div className="text-meta text-muted">
              Force-reconcile <span className="font-semibold text-primary">{selectedTxn.txnCode}</span> against host-to-host bank statement.
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-caption text-muted uppercase mb-1">
                  Bank UTR Reference Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR9841220912"
                  value={reMatchUtr}
                  onChange={(e) => setReMatchUtr(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-subtle rounded-lg text-meta font-mono text-primary border border-subtle focus:outline-none focus:ring-1 focus:ring-primary-container whitespace-nowrap"
                />
              </div>
              <div>
                <label className="block text-caption text-muted uppercase mb-1">
                  Reconciliation Note / Reason
                </label>
                <textarea
                  rows={2}
                  defaultValue="Verified via HDFC corporate net banking statement CSV"
                  className="w-full p-2 bg-surface-subtle rounded-lg text-meta text-primary border border-subtle focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-subtle flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReMatchModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-variant text-primary text-meta font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary-container text-on-accent hover:bg-primary-container-hover text-meta font-semibold shadow-sm"
              >
                Confirm Re-Match
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}

export default PaymentsAndReconciliation;
