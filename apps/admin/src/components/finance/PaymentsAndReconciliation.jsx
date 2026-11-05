import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Button,
  Select,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  PageBody,
  SkeletonPage,
  SearchInput,
  FilterBar,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable } from '../shared/DataTable';
import { PersonAvatar } from '../shared/PersonAvatar';
import { formatMoney } from '../../lib/format';
import { useOrdersQuery } from '../../hooks/useAdminQueries';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { SectionCard } from '../shared/Layout';
import { GatewayActivity } from './GatewayActivity';

/** The splits a payment record can actually support. */
const PAYMENT_TABS = [
  { id: 'all', label: 'All payments' },
  { id: 'prepaid', label: 'Prepaid' },
  { id: 'cod', label: 'Cash on delivery' },
  { id: 'awaiting', label: 'Awaiting' },
  { id: 'refunded', label: 'Refunded' },
];

/** The three payment statuses an order carries, in the guide's tones. */
const STATUS_VARIANT = { Paid: 'success', Awaiting: 'warning', Refunded: 'info' };
const PAYMENT_STATUSES = ['Paid', 'Awaiting', 'Refunded'];

const inr = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function PaymentsAndReconciliation({ onNavigate, onShowToast }) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTxnId, setSelectedTxnId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dbTransactions, setDbTransactions] = useState([]);

  // TanStack Query for orders
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
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


  // Methods as the ledger names them, so the filter only offers what exists.
  const methodOptions = useMemo(
    () => [...new Set(transactions.map((t) => t.method))].sort(),
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
      if (methodFilter !== 'ALL' && t.method !== methodFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !t.txnCode.toLowerCase().includes(q) &&
          !t.orderRef.toLowerCase().includes(q) &&
          !t.customer.toLowerCase().includes(q) &&
          !(t.reference ?? '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeTab, methodFilter, statusFilter, searchQuery, transactions]);

  // No payment exists at all: the ledger, its tabs, its filters and the drawer
  // have nothing to work on, so the ledger becomes one empty state.
  const noTransactions = transactions.length === 0;
  const noFilteredTransactions = !noTransactions && filteredTransactions.length === 0;
  const clearTxnFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setMethodFilter('ALL');
    setStatusFilter('ALL');
  };

  // One shared pager over the rows this module actually holds.
  const txnPager = useClientTable(filteredTransactions);

  // Refreshes the ledger from the API. This used to wait 1.2s and announce a
  // sync with Razorpay, PayU and Cashfree that never happened.
  const handleRefresh = async () => {
    const result = await refetchTransactions();
    if (!result?.error) onShowToast?.('Payments refreshed.');
  };

  const handleDownloadLedger = () => {
    // Every figure here is summed from the payments on screen. The batch id and
    // the 12.49 crore settled total it used to carry were fixed strings.
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<EVERWEAR_PAYMENT_LEDGER>
  <GENERATED_DATE>${new Date().toISOString()}</GENERATED_DATE>
  <TOTAL_COLLECTED_INR>${paymentTotals.collected.toFixed(2)}</TOTAL_COLLECTED_INR>
  <ENTRIES_COUNT>${transactions.length}</ENTRIES_COUNT>
</EVERWEAR_PAYMENT_LEDGER>`;
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

  if (isOrdersLoading) {
    return <SkeletonPage variant="table" stats={4} statsCols={4} columns={7} label="Loading settlements" />;
  }

  const txnColumns = [
    {
      key: 'txn',
      header: 'Transaction / order',
      cell: (t) => (
        <div className="flex flex-col">
          <span className="font-mono text-label font-semibold text-accent">{t.txnCode}</span>
          <span className="font-mono text-micro text-muted">{t.orderRef}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (t) => (
        <div className="flex items-center gap-space-sm">
          <PersonAvatar
            name={t.customer}
            initials={t.initials}
            tone={t.initialsBg}
            className="h-6 w-6"
            fallbackClassName="text-micro"
          />
          <span className="max-w-28 truncate font-semibold text-primary" title={t.customer}>{t.customer}</span>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (t) => (
        <span className="flex min-w-0 items-center gap-space-xs font-medium text-primary" title={t.method}>
          <Icon name={t.methodIcon} aria-hidden="true" className={`material-symbols-outlined shrink-0 text-icon ${t.methodColor}`} />
          <span className="truncate">{t.method}</span>
        </span>
      ),
    },
    {
      key: 'gross',
      header: 'Gross amount',
      align: 'right',
      cell: (t) => <span className="font-semibold tabular-nums text-primary">{t.gross}</span>,
    },
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
      fit: true,
      header: 'Status',
      cell: (t) => <StatusBadge status={t.status} variant={STATUS_VARIANT[t.status]} />,
    },
    {
      key: 'action',
      fit: true,
      header: 'Action',
      align: 'center',
      cell: (t) => (
        <Button
          variant="ghost"
          size="iconXs"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTxnId(t.id);
          }}
          title="View breakdown"
          aria-label={`View breakdown of ${t.txnCode}`}
        >
          <Icon name="visibility" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Finance & compliance"
        title="Payments"
        description="Captured payments and their settlement status."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isOrdersFetching}
            >
              <Icon
                name="sync"
                aria-hidden="true"
                className={`material-symbols-outlined text-icon-sm ${isOrdersFetching ? 'animate-spin' : ''}`}
              />
              <span>{isOrdersFetching ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadLedger}>
              <Icon name="download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Export ledger XML</span>
            </Button>
          </>
        }
      />
      <PageBody
        error={paymentsError}
        hasData={ordersData != null}
        title="Settlement data could not be loaded"
        onRetry={refetchTransactions}
      >
        {/* Summed from the payments in the ledger. */}
        <ContentGrid columns={4}>
          <StatsCard
            title="Collected"
            value={inr(paymentTotals.collected)}
            icon="verified"
            iconColor="text-success"
            subtitle={`${paymentTotals.paidCount} payments captured`}
          />
          <StatsCard
            title="Awaiting payment"
            value={inr(paymentTotals.awaiting)}
            icon="hourglass_top"
            iconColor="text-info"
            subtitle={`${paymentTotals.awaitingCount} orders not yet paid`}
          />
          <StatsCard
            title="Cash on delivery"
            value={inr(paymentTotals.cod)}
            icon="local_shipping"
            iconColor="text-warning"
            subtitle={`${paymentTotals.codCount} orders to collect on`}
          />
          <StatsCard
            title="Refunded"
            value={inr(paymentTotals.refunded)}
            icon="currency_exchange"
            iconColor="text-danger"
            subtitle={`${paymentTotals.refundedCount} payments reversed`}
          />
        </ContentGrid>

        {/* The gateway match-rate panel and the recon health, carrier COD and
            ERP ingestion cards were typed-in figures (99.8% match, 7.85 crore
            volume, carrier remittances, a cron PID); no record behind them. */}
        {noTransactions ? (
          <EmptyState
            icon="account_balance_wallet"
            title="No payments yet"
            description="Payments appear here as customers place orders, with their method, amount and gateway status."
            className="py-16"
          />
        ) : (
          <>
            <FilterBar
              tabs={PAYMENT_TABS.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 }))}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              search={
                <SearchInput
                  value={searchQuery}
                  onChange={(value) => setSearchQuery(value)}
                  onClear={() => setSearchQuery('')}
                  placeholder="Filter by reference, order or customer"
                  label="Filter transactions"
                  className="w-full sm:w-64"
                />
              }
              filters={
                <>
                  <Select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    aria-label="Payment method"
                    className="h-8"
                    wrapperClassName="w-full sm:w-44"
                  >
                    <option value="ALL">All methods</option>
                    {methodOptions.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </Select>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Payment status"
                    className="h-8"
                    wrapperClassName="w-full sm:w-36"
                  >
                    <option value="ALL">All statuses</option>
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Select>
                </>
              }
            />

            <div className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-12">
              <DataTable
                data={txnPager.pageRows}
                columns={txnColumns}
                keyField="id"
                className="min-w-[1020px]"
                containerClassName={noFilteredTransactions ? 'xl:col-span-12' : 'xl:col-span-8'}
                activeRowId={selectedTxnId ?? selectedTxn?.id}
                onRowClick={(t) => setSelectedTxnId(t.id)}
                emptyIcon="account_balance"
                emptyTitle="No transactions match these filters"
                emptyMessage="Clear the tab, search, method or status filter to see every payment."
                emptyAction={
                  <Button variant="outline" size="sm" onClick={clearTxnFilters}>
                    Clear filters
                  </Button>
                }
                pagination={{
                  page: txnPager.page,
                  pageSize: txnPager.limit,
                  totalItems: txnPager.total,
                  onPageChange: txnPager.setPage,
                  onPageSizeChange: txnPager.setLimit,
                }}
              />

              {/* Only what a payment records: no MDR split, batch or bank account. */}
              {!noFilteredTransactions && (
                <div className="flex min-w-0 flex-col gap-space-md xl:col-span-4">
                  {!selectedTxn ? (
                    <EmptyState
                      icon="account_balance_wallet"
                      title="No payment selected"
                      description="Pick a payment from the ledger to see its detail."
                    />
                  ) : (
                    <>
                      <SectionCard
                        title={selectedTxn.txnCode}
                        description={`Order ${selectedTxn.orderRef}`}
                        action={<StatusBadge status={selectedTxn.status} variant={STATUS_VARIANT[selectedTxn.status]} />}
                      >
                        <dl className="flex flex-col gap-space-sm">
                          <div className="flex items-center justify-between gap-space-md">
                            <dt className="text-meta text-muted">Customer</dt>
                            <dd className="text-right text-body text-primary">{selectedTxn.customer}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-space-md">
                            <dt className="text-meta text-muted">Method</dt>
                            <dd className="text-right text-body text-primary">{selectedTxn.method}</dd>
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
                                {inr(selectedTxn.refunded)}
                              </dd>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-space-md">
                            <dt className="text-meta text-muted">Paid</dt>
                            <dd className="text-right text-body text-primary">
                              {selectedTxn.paidAt ?? <span className="text-faint">Not paid yet</span>}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-space-md">
                            <dt className="text-meta text-muted">Gateway reference</dt>
                            <dd className="min-w-0 truncate font-mono text-num text-secondary">
                              {selectedTxn.reference ?? <span className="font-sans text-faint">Not recorded</span>}
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
                            <li key={idx} className="flex items-start gap-space-sm">
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
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        <div className="mt-space-lg">
          <GatewayActivity onShowToast={onShowToast} />
        </div>
      </PageBody>
    </PageContainer>
  );
}

export default PaymentsAndReconciliation;
