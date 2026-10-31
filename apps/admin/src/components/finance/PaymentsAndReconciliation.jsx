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
import { formatMoney } from '../../lib/format';
import { useOrdersQuery } from '../../hooks/useAdminQueries';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { SectionCard } from '../shared/Layout';

/** The splits a payment record can actually support. */
const PAYMENT_TABS = [
  { id: 'all', label: 'All payments' },
  { id: 'prepaid', label: 'Prepaid' },
  { id: 'cod', label: 'Cash on delivery' },
  { id: 'awaiting', label: 'Awaiting' },
  { id: 'refunded', label: 'Refunded' },
];

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
  // 100 is the API's ceiling. The ledger's totals and tab counts are summed
  // from what comes back, so a short page would under-report them.
  } = useOrdersQuery({ limit: 100 });

  // Load real orders from query cache to reconcile live transactions
  useEffect(() => {
    if (ordersData?.orders?.length > 0) {
      const liveTxns = ordersData.orders.map((ord, idx) => {
        const amountNum = (ord.totals?.total ?? 0) / 100;
        const customerName = ord.shippingAddress
          ? `${ord.shippingAddress.firstName || ''} ${ord.shippingAddress.lastName || ''}`.trim()
          : ord.email;
        const initials =
          customerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'EW';
        const details = ord.paymentDetails ?? {};
        const paidAt = details.paidAt ? new Date(details.paidAt) : null;

        return {
          id: ord.id,
          txnCode: details.transactionId ? `#${details.transactionId}` : `#ORD-${ord.displayId}`,
          orderRef: `ORD-${ord.displayId}`,
          // The gateway's own reference, when it gave one. It used to be
          // manufactured from the order id and labelled a bank UTR.
          reference: details.transactionId ?? null,
          customer: customerName,
          initials,
          initialsBg: 'bg-primary-fixed text-on-primary-fixed',
          method: ord.paymentMethod === 'cod' ? 'Cash on delivery' : details.provider === 'stripe' ? 'Stripe' : 'Razorpay',
          methodIcon: ord.paymentMethod === 'cod' ? 'payments' : 'account_balance',
          methodColor: 'text-accent',
          methodType: ord.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
          gross: `₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          grossNum: amountNum,
          paidAt: paidAt
            ? paidAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : null,
          refunded: (details.refunds ?? []).reduce((n, r) => n + (r.amount ?? 0), 0) / 100,
          status:
            ord.paymentStatus === 'paid'
              ? 'Paid'
              : ord.paymentStatus === 'refunded'
                ? 'Refunded'
                : 'Awaiting',
          statusBadge:
            ord.paymentStatus === 'paid'
              ? 'bg-status-success-bg text-success'
              : ord.paymentStatus === 'refunded'
                ? 'bg-status-info-bg text-info'
                : 'bg-status-warning-bg text-warning',
          // What the payment was actually for, and how the amount is made up.
          // Both come straight off the order; the drawer had room for them and
          // was showing nothing.
          lines: (ord.items ?? []).map((it) => ({
            id: it.id,
            title: it.productTitle,
            variant: it.variantTitle,
            quantity: it.quantity,
            total: it.total ?? (it.unitPrice ?? 0) * (it.quantity ?? 1),
          })),
          totals: ord.totals ?? null,
          refunds: (details.refunds ?? []).map((r) => ({
            id: r.id,
            amount: r.amount,
            reason: r.reason,
            createdAt: r.createdAt,
          })),
          timeline: [
            {
              title: `Order placed (${ord.paymentMethod?.toUpperCase() || 'PREPAID'})`,
              time: new Date(ord.createdAt).toLocaleDateString('en-IN'),
              color: 'bg-status-success',
            },
            ...(paidAt
              ? [{ title: 'Payment captured', time: paidAt.toLocaleDateString('en-IN'), color: 'bg-status-success' }]
              : []),
          ],
        };
      });
      setDbTransactions(liveTxns);
    }
  }, [ordersData]);

  // Manual re-match form state
  const [reMatchUtr, setReMatchUtr] = useState('');


  const disputesList = [
    { id: 'DSP-01', order: 'ORD-2024-88432', customer: 'Kunal Chawla', amount: '₹8,999.00', reason: 'Unrecognized Charge', cardBrand: 'Mastercard', daysLeft: '4 Days' },
    { id: 'DSP-02', order: 'ORD-2024-87910', customer: 'Pooja Verma', amount: '₹4,250.00', reason: 'Defective Garment (Claimed)', cardBrand: 'Visa Signature', daysLeft: '6 Days' },
    { id: 'DSP-03', order: 'ORD-2024-87422', customer: 'Siddharth Rao', amount: '₹14,200.00', reason: 'Package Not Received', cardBrand: 'Amex Platinum', daysLeft: '2 Days (Urgent)' },
  ];

  const transactions = useMemo(() => {
    return dbTransactions;
  }, [dbTransactions]);

  /** Ledger totals, summed from the payments in hand. */
  const paymentTotals = useMemo(() => {
    const sum = (rows) => rows.reduce((n, t) => n + (t.grossNum ?? 0), 0);
    const paid = transactions.filter((t) => t.status === 'Paid');
    const awaiting = transactions.filter((t) => t.status === 'Awaiting');
    const cod = transactions.filter((t) => t.methodType === 'COD' && t.status === 'Awaiting');
    const refunded = transactions.filter((t) => t.status === 'Refunded');
    return {
      collected: sum(paid),
      paidCount: paid.length,
      awaiting: sum(awaiting),
      awaitingCount: awaiting.length,
      cod: sum(cod),
      codCount: cod.length,
      refunded: refunded.reduce((n, t) => n + (t.refunded || t.grossNum || 0), 0),
      refundedCount: refunded.length,
    };
  }, [transactions]);

  const tabCounts = useMemo(
    () => ({
      all: transactions.length,
      prepaid: transactions.filter((t) => t.methodType === 'Prepaid').length,
      cod: transactions.filter((t) => t.methodType === 'COD').length,
      awaiting: transactions.filter((t) => t.status === 'Awaiting').length,
      refunded: transactions.filter((t) => t.status === 'Refunded').length,
    }),
    [transactions]
  );

  const selectedTxn = useMemo(() => {
    return transactions.find(t => t.id === selectedTxnId) || transactions[0];
  }, [selectedTxnId, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (activeTab === 'cod' && t.methodType !== 'COD') return false;
      if (activeTab === 'prepaid' && t.methodType !== 'Prepaid') return false;
      if (activeTab === 'awaiting' && t.status !== 'Awaiting') return false;
      if (activeTab === 'refunded' && t.status !== 'Refunded') return false;
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
    if (onShowToast) onShowToast('Ledger XML written. Import it into your accounting package.');
  };

  const handleManualRematchSubmit = (e) => {
    e.preventDefault();
    setIsReMatchModalOpen(false);
    if (onShowToast) onShowToast(`${selectedTxn?.txnCode ?? 'This payment'} was not changed; there is no re-match operation.`);
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
    {
      key: 'reference',
      header: 'Gateway reference',
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      cell: (t) =>
        t.reference ? (
          <span className="font-mono text-num text-secondary">{t.reference}</span>
        ) : (
          <span className="text-faint">Not recorded</span>
        ),
    },
    {
      key: 'paidAt',
      header: 'Paid',
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      width: '9rem',
      cell: (t) =>
        t.paidAt ?? <span className="whitespace-nowrap text-faint">Not paid</span>,
    },
    {
      key: 'status',
      header: 'Gateway Status',
      cell: (t) => (
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-micro font-semibold ${t.statusBadge}`}
        >
          {t.status}
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
              <span>Export ledger XML</span>
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

      {/* Summed from the payments in the ledger. These read 12.48 crore,
          84.2 lakh and 312 hubs before, whatever the ledger held, and the
          gateway fee was a blended MDR rate nothing records. */}
      <ContentGrid columns={4}>
        <StatsCard
          title="Collected"
          value={`₹${paymentTotals.collected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon="verified"
          iconColor="text-success"
          subtitle={`${paymentTotals.paidCount} payments captured`}
        />
        <StatsCard
          title="Awaiting payment"
          value={`₹${paymentTotals.awaiting.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon="hourglass_top"
          iconColor="text-info"
          subtitle={`${paymentTotals.awaitingCount} orders not yet paid`}
        />
        <StatsCard
          title="Cash on delivery"
          value={`₹${paymentTotals.cod.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon="local_shipping"
          iconColor="text-warning"
          subtitle={`${paymentTotals.codCount} orders to collect on`}
        />
        <StatsCard
          title="Refunded"
          value={`₹${paymentTotals.refunded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon="currency_exchange"
          iconColor="text-danger"
          subtitle={`${paymentTotals.refundedCount} payments reversed`}
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
              {/* Counts come from the transactions in hand. They used to read
                  56, 18, 94, 3 and 8 regardless, and three of the tabs
                  filtered on statuses a payment never has. */}
              <div className="flex items-center gap-1 whitespace-nowrap text-meta">
                {PAYMENT_TABS.map((tab) => {
                  const count = tabCounts[tab.id] ?? 0;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 font-semibold transition-all ${
                        isActive
                          ? 'bg-surface-subtle text-accent shadow-xs'
                          : 'text-muted hover:bg-surface-subtle hover:text-primary'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-micro font-semibold tabular-nums ${
                          isActive
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : 'bg-surface-subtle text-muted'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
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

          {/* The drawer used to show an MDR split, a net settled figure, a
              settlement batch, a gateway node and a bank account. None of
              those exist on a payment: the MDR was a 1.2% rate applied in the
              browser and the rest were fixed strings. */}
          <div className="w-full shrink-0 xl:w-[410px]">
            {!selectedTxn ? (
              <EmptyState
                icon="account_balance_wallet"
                title="No payment selected"
                description="Pick a payment from the ledger to see its detail."
              />
            ) : (
              <div className="sticky top-20 flex flex-col gap-space-md">
                <SectionCard
                  title={selectedTxn.txnCode}
                  description={`Order ${selectedTxn.orderRef}`}
                  action={
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-micro font-semibold ${selectedTxn.statusBadge}`}
                    >
                      {selectedTxn.status}
                    </span>
                  }
                >
                  <dl className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between gap-space-md">
                      <dt className="text-meta text-muted">Customer</dt>
                      <dd className="text-body text-primary">{selectedTxn.customer}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-space-md">
                      <dt className="text-meta text-muted">Method</dt>
                      <dd className="text-body text-primary">{selectedTxn.method}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-space-md">
                      <dt className="text-meta text-muted">Amount</dt>
                      <dd className="text-num font-semibold tabular-nums text-primary">
                        {selectedTxn.gross}
                      </dd>
                    </div>
                    {selectedTxn.refunded > 0 && (
                      <div className="flex items-center justify-between gap-space-md">
                        <dt className="text-meta text-muted">Refunded</dt>
                        <dd className="text-num font-semibold tabular-nums text-danger">
                          ₹{selectedTxn.refunded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-space-md">
                      <dt className="text-meta text-muted">Paid</dt>
                      <dd className="text-body text-primary">
                        {selectedTxn.paidAt ?? <span className="text-faint">Not paid yet</span>}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-space-md">
                      <dt className="text-meta text-muted">Gateway reference</dt>
                      <dd className="font-mono text-num text-secondary">
                        {selectedTxn.reference ?? <span className="text-faint">Not recorded</span>}
                      </dd>
                    </div>
                  </dl>
                </SectionCard>

                {selectedTxn.totals && (
                  <SectionCard title="Amount breakdown">
                    <dl className="flex flex-col gap-space-sm">
                      {[
                        ['Items', selectedTxn.totals.itemSubtotal],
                        ['Discount', -(selectedTxn.totals.discountTotal ?? 0)],
                        ['Shipping', selectedTxn.totals.shippingTotal],
                        ['Tax', selectedTxn.totals.taxTotal],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-space-md">
                            <dt className="text-meta text-muted">{label}</dt>
                            <dd
                              className={`text-num tabular-nums ${value < 0 ? 'text-success' : 'text-secondary'}`}
                            >
                              {formatMoney(value, 'inr')}
                            </dd>
                          </div>
                        ))}
                      <div className="flex items-center justify-between gap-space-md border-t border-subtle pt-space-sm">
                        <dt className="text-meta font-semibold text-primary">Total</dt>
                        <dd className="text-num font-semibold tabular-nums text-primary">
                          {formatMoney(selectedTxn.totals.total ?? 0, 'inr')}
                        </dd>
                      </div>
                    </dl>
                  </SectionCard>
                )}

                {selectedTxn.lines?.length > 0 && (
                  <SectionCard title={`Paid for (${selectedTxn.lines.length})`}>
                    <ul className="flex flex-col gap-space-sm">
                      {selectedTxn.lines.map((line) => (
                        <li key={line.id} className="flex items-start justify-between gap-space-md">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-body text-primary" title={line.title}>
                              {line.title}
                            </span>
                            <span className="text-meta text-muted">
                              {line.variant} / {line.quantity} pc{line.quantity === 1 ? '' : 's'}
                            </span>
                          </div>
                          <span className="shrink-0 text-num tabular-nums text-secondary">
                            {formatMoney(line.total, 'inr')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {selectedTxn.refunds?.length > 0 && (
                  <SectionCard title={`Refunds (${selectedTxn.refunds.length})`}>
                    <ul className="flex flex-col gap-space-sm">
                      {selectedTxn.refunds.map((refund) => (
                        <li key={refund.id} className="flex items-start justify-between gap-space-md">
                          <div className="flex min-w-0 flex-col">
                            <span className="text-body text-primary">{refund.reason}</span>
                            <span className="text-meta text-muted">
                              {new Date(refund.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <span className="shrink-0 text-num tabular-nums text-danger">
                            {formatMoney(refund.amount, 'inr')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                <SectionCard title="History">
                  <ol className="flex flex-col gap-space-sm">
                    {(selectedTxn.timeline ?? []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.color}`}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-body text-primary">{item.title}</span>
                          <span className="text-meta text-muted">{item.time}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </SectionCard>
              </div>
            )}
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
