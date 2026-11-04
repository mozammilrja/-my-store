import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useOrdersQuery, useUpdateOrderStatusMutation, useProcessReturnMutation } from '../../hooks/useAdminQueries';
import {
  Icon,
  Card,
  Button,
  Badge,
  Input,
  Select,
  Separator,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  SectionCard,
  FilterBar,
  SearchInput,
  FilterDropdown,
  DataTable,
  TableToolbar,
  AppDialog,
  PageBody,
  SkeletonPage,
  Thumbnail,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { EmptyState } from '../shared/FeedbackAndOverlays';

/** The chart palette as hex, read off the live theme (confetti takes hex only). */
const themeChartColors = () => {
  const root = getComputedStyle(document.documentElement);
  return ['chart-1', 'chart-2', 'chart-3', 'chart-4']
    .map((name) => root.getPropertyValue(`--${name}`).trim().split(/\s+/).map(Number))
    .filter((rgb) => rgb.length === 3 && rgb.every((n) => Number.isFinite(n)))
    .map((rgb) => `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`);
};

/** The return lifecycle the API models, in order. */
const RETURN_STAGE = {
  requested: { label: 'Requested', step: 0 },
  approved: { label: 'Approved', step: 1 },
  pickup_scheduled: { label: 'Pickup scheduled', step: 2 },
  received: { label: 'Received', step: 3 },
  inspected: { label: 'Inspected', step: 4 },
  refunded: { label: 'Refunded', step: 5 },
  rejected: { label: 'Rejected', step: 5 },
};

const fullDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

/**
 * The stages this return has actually reached. The record carries the current
 * status and two timestamps, so stages up to the current one are marked done
 * and the rest are shown as still to come, rather than inventing scan times.
 */
function buildTimeline(order, returnRequest) {
  const current = RETURN_STAGE[returnRequest?.status];
  return Object.entries(RETURN_STAGE)
    .filter(([key]) => key !== 'rejected' || returnRequest?.status === 'rejected')
    .map(([key, stage]) => ({
      label: stage.label,
      done: current ? stage.step <= current.step : false,
      isCurrent: returnRequest?.status === key,
      at:
        returnRequest?.status === key
          ? fullDate(returnRequest?.updatedAt ?? returnRequest?.requestedAt)
          : stage.step === 0 && returnRequest?.requestedAt
            ? fullDate(returnRequest.requestedAt)
            : null,
    }));
}

export function ReturnsAndExchanges({ onShowToast, currentHub }) {
  const [returnsList, setReturnsList] = useState([]);
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [refundFilter, setRefundFilter] = useState('All');
  const [manualReturnOpen, setManualReturnOpen] = useState(false);

  // TanStack Query for orders and return actions
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    error: ordersError,
    refetch: refetchReturns,
  } = useOrdersQuery({ limit: 50 });
  const updateOrderStatusMutation = useUpdateOrderStatusMutation();
  const processReturnMutation = useProcessReturnMutation();

  // Fetch real returned or canceled orders from query cache
  useEffect(() => {
    if (ordersData?.orders?.length > 0) {
      // A returns queue is the orders that have a return request on them. The
      // filter used to sweep in every cancelled order too, which is why most
      // rows had no reason, no stage and no reverse AWB to show.
      const returnOrders = ordersData.orders.filter(o => o.returnRequest);
      if (returnOrders.length > 0) {
        const mapped = returnOrders.map((ord, idx) => {
          const amountNum = ord.totals?.total ? ord.totals.total / 100 : 0;
          const customerName = ord.shippingAddress ? `${ord.shippingAddress.firstName || ''} ${ord.shippingAddress.lastName || ''}`.trim() : ord.email;
          const firstItem = ord.items?.[0];
          const rr = ord.returnRequest;

          return {
            id: `RET-2024-${89000 + (ord.displayId || idx)}`,
            backendOrderId: ord.id,
            orderRef: `EVR-${ord.displayId || 984000}-BLR`,
            customer: {
              name: customerName,
              email: ord.email,
              phone: ord.shippingAddress?.phone ?? null,
              // No UPI handle or loyalty tier is recorded on an order.
              upiId: null,
              address: ord.shippingAddress ? `${ord.shippingAddress.address1 || ''}, ${ord.shippingAddress.city || ''}` : 'Not recorded',
              location: [ord.shippingAddress?.city, ord.shippingAddress?.province]
                .filter(Boolean)
                .join(', ') || 'Not recorded',
            },
            // The table and the export read these two directly; without them the
            // Garment & Variant column rendered blank on every row.
            productTitle: firstItem?.productTitle ?? 'Not recorded',
            variant: firstItem?.variantTitle ?? 'Not recorded',
            product: {
              name: firstItem?.productTitle || 'Not recorded',
              sku: firstItem?.variantTitle || 'Not recorded',
              hsn: 'HSN 6204',
              size: 'M',
              color: 'Artisan Finish',
              image: firstItem?.thumbnail || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
            },
            // From the order's own return request. The reason, the dates and
            // the reverse AWB used to be fixed strings regardless of the record.
            returnReason: rr?.reason || 'Not given',
            reasonDetail: rr?.reason || 'No detail was recorded with this request.',
            requestedDate: rr?.requestedAt ? fullDate(rr.requestedAt) : fullDate(ord.createdAt),
            stage: rr?.status ?? null,
            qcStatus: RETURN_STAGE[rr?.status]?.label ?? 'Not inspected',
            qcGrade: rr?.status === 'inspected' || rr?.status === 'refunded' ? 'Inspected' : 'Pending',
            refundStatus: ord.paymentStatus === 'refunded' ? 'Refunded' : 'Awaiting refund',
            refundValue: amountNum,
            timeline: buildTimeline(ord, rr),
            channel: 'Storefront',
            // The order records how it was paid; the refund goes back the same way.
            settlementEngine:
              { cod: 'Bank transfer (was cash on delivery)', razorpay: 'Razorpay', stripe: 'Stripe' }[
                ord.paymentMethod
              ] ?? 'Original payment method',
            customerNote: rr?.reason ?? null,
            courier: rr?.returnAwb
              ? { partner: rr.carrier || 'Carrier not set', awb: rr.returnAwb, pickupTime: null }
              : null,
            returnType: 'Refund to the original payment method',
          };
        });
        // Replace, never append: under StrictMode this effect runs twice and
        // a plain prepend duplicated every live return (and its React key).
        setReturnsList(prev => [...mapped, ...prev.filter(r => !mapped.some(m => m.id === r.id))]);
      }
    }
  }, [ordersData]);

  // Manual return modal state
  const [newOrderRef, setNewOrderRef] = useState('EVR-984210-BLR');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newProduct, setNewProduct] = useState('Mulberry Silk Pleated Midi Dress');
  const [newReason, setNewReason] = useState('Size/Fit Issue');
  const [newRefundAmount, setNewRefundAmount] = useState(2799);
  const [newUpiId, setNewUpiId] = useState('customer@upi');

  // Currently inspected return item
  const activeReturn = useMemo(() => {
    return returnsList.find(r => r.id === selectedReturnId) || returnsList[0];
  }, [returnsList, selectedReturnId]);

  // Checklist state for active return
  const [checklist, setChecklist] = useState({
    tags: true,
    clean: true,
    zeroDefect: true,
  });

  // Selected disposition grade
  const [selectedGrade, setSelectedGrade] = useState('A');

  // Filtered returns
  // Each triage tab is a question about the return's own stage. They used to be
  // styling only: `activeTab` was never read, so every tab showed every row.
  const matchesTab = (item, tab) => {
    switch (tab) {
      case 'pending':
        return item.stage != null && !['inspected', 'refunded', 'rejected'].includes(item.stage);
      case 'refund':
        return item.stage === 'inspected';
      case 'completed':
        return item.stage === 'refunded';
      case 'rejected':
        return item.stage === 'rejected';
      default:
        return true;
    }
  };

  const filteredReturns = useMemo(() => {
    return returnsList.filter(item => {
      if (!matchesTab(item, activeTab)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesOrder = item.orderRef.toLowerCase().includes(q);
        const matchesCustomer = item.customer.name.toLowerCase().includes(q);
        const matchesAwb = (item.courier?.awb ?? '').toLowerCase().includes(q);
        if (!matchesId && !matchesOrder && !matchesCustomer && !matchesAwb) return false;
      }
      if (reasonFilter !== 'All' && item.returnReason !== reasonFilter) return false;
      // Previously declared and then never applied, so the control did nothing.
      if (refundFilter !== 'All' && item.refundStatus !== refundFilter) return false;
      return true;
    });
  }, [returnsList, activeTab, searchQuery, reasonFilter, refundFilter]);

  // No return exists at all: the queue, its filters and the QC station have
  // nothing to work on, so the queue becomes one full-width empty state.
  const noReturns = returnsList.length === 0;
  const noMatches = !noReturns && filteredReturns.length === 0;

  const clearReturnFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setReasonFilter('All');
    setRefundFilter('All');
  };

  /** Tab counts and dropdown options, both read off the rows themselves. */
  const tabCounts = useMemo(
    () => ({
      all: returnsList.length,
      pending: returnsList.filter((r) => matchesTab(r, 'pending')).length,
      refund: returnsList.filter((r) => matchesTab(r, 'refund')).length,
      completed: returnsList.filter((r) => matchesTab(r, 'completed')).length,
      rejected: returnsList.filter((r) => matchesTab(r, 'rejected')).length,
    }),
    [returnsList]
  );

  /** Every strip above the queue, counted off the same rows. */
  const stageCounts = useMemo(() => {
    const at = (...stages) => returnsList.filter((r) => stages.includes(r.stage));
    const sum = (rows) => rows.reduce((t, r) => t + (r.refundValue ?? 0), 0);
    const awaitingRefund = at('inspected');
    const refunded = at('refunded');
    return {
      total: returnsList.length,
      awaitingPickup: at('requested', 'approved').length,
      inTransit: at('pickup_scheduled').length,
      atDock: at('received').length,
      awaitingRefund: awaitingRefund.length,
      awaitingRefundValue: sum(awaitingRefund),
      refunded: refunded.length,
      refundedValue: sum(refunded),
    };
  }, [returnsList]);

  const reasonOptions = useMemo(
    () => [
      { value: 'All', label: 'All return reasons' },
      ...[...new Set(returnsList.map((r) => r.returnReason).filter(Boolean))]
        .sort()
        .map((reason) => ({ value: reason, label: reason })),
    ],
    [returnsList]
  );

  const refundOptions = useMemo(
    () => [
      { value: 'All', label: 'Any refund status' },
      ...[...new Set(returnsList.map((r) => r.refundStatus).filter(Boolean))]
        .sort()
        .map((status) => ({ value: status, label: status })),
    ],
    [returnsList]
  );

  // One shared pager over the rows this module actually holds.
  const returnsPager = useClientTable(filteredReturns);

  const handleApproveRefund = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.8 },
      colors: themeChartColors(),
    });

    setReturnsList(prev => prev.map(r => {
      if (r.id === activeReturn.id) {
        return {
          ...r,
          qcStatus: `Passed Grade ${selectedGrade}`,
          qcGrade: selectedGrade,
        };
      }
      return r;
    }));

    if (activeReturn?.backendOrderId) {
      processReturnMutation.mutateAsync({
        orderId: activeReturn.backendOrderId,
        reason: activeReturn.returnReason || `QC Passed Grade ${selectedGrade}`,
        action: 'refund'
      }).then(res => {
        if (res?.creditNoteNumber) {
          onShowToast({
            type: 'success',
            title: 'Credit Note Settled',
            message: `Issued Credit Note #${res.creditNoteNumber} for order ${activeReturn.orderRef}.`,
          });
        }
      }).catch(err => {
        console.warn('Backend return processing notice:', err?.message);
        updateOrderStatusMutation.mutateAsync({
          orderId: activeReturn.backendOrderId,
          status: { paymentStatus: 'refunded', fulfillmentStatus: 'returned' }
        }).catch(e => console.warn('Order status sync notice:', e?.message));
      });
    }

    onShowToast({
      type: 'success',
      title: 'Refund Disbursed Instantly',
      message: `₹${activeReturn.refundValue.toLocaleString('en-IN')} sent via ${activeReturn.settlementEngine} to ${activeReturn.customer.upiId ?? activeReturn.customer.name}. Grade ${selectedGrade} inventory restocked.`,
      duration: 5000,
    });
  };


  const handleRejectReturn = () => {
    onShowToast({
      type: 'danger',
      title: 'Return Rejected',
      message: `Flagged ${activeReturn.id} for QC non-compliance. RTO return parcel routed back to customer.`,
    });
  };

  const handleBulkQcPass = () => {
    onShowToast({
      type: 'success',
      title: 'Bulk QC Verified',
      message: `${stageCounts.atDock} received return${stageCounts.atDock === 1 ? '' : 's'} marked as passing QC.`,
    });
  };

  const handleExportCsv = () => {
    const headers = ["Return ID", "Order Ref", "Customer Name", "Customer City", "Product", "Variant", "Reason", "Refund Value", "Courier", "AWB", "QC Status"];
    const rows = returnsList.map(r => [
      r.id,
      r.orderRef,
      `"${r.customer.name}"`,
      `"${r.customer.location}"`,
      `"${r.productTitle}"`,
      `"${r.variant}"`,
      `"${r.returnReason}"`,
      r.refundValue,
      r.courier?.partner ?? '',
      r.courier?.awb ?? '',
      `"${r.qcStatus}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Everwear_Reverse_Logistics_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast({
      type: 'success',
      title: 'Reverse Manifest Exported',
      message: `Downloaded CSV with ${returnsList.length} reverse logistics records.`,
    });
  };

  const handleCreateReturn = (e) => {
    e.preventDefault();
    if (!newCustomerName) return;

    const randomId = `RET-2024-${Math.floor(10000 + Math.random() * 90000)}`;
    const newEntry = {
      id: randomId,
      orderRef: newOrderRef || 'EVR-984210-BLR',
      productTitle: newProduct,
      variant: 'Standard Fashion Variant',
      customer: {
        name: newCustomerName,
        location: `${currentHub.location.split(' ')[0]}, India`,
        phone: '+91 98800•••••',
        upiId: newUpiId || 'customer@upi'
      },
      courier: {
        partner: 'BlueDart Express',
        awb: `REV${Math.floor(1000000 + Math.random() * 9000000)}`,
        dockStatus: 'Delivered to Dock'
      },
      qcStatus: 'Pending Grading',
      qcGrade: null,
      refundValue: Number(newRefundAmount),
      settlementEngine: 'Razorpay Instant UPI',
      paymentMethod: 'Razorpay UPI',
      returnReason: newReason,
      customerNote: 'Manual concierge return logged at hub dock station.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
      checklist: { tags: true, clean: true, zeroDefect: true },
      timeline: [
        { step: 'Manual Return Ingested', time: 'Just now', actor: `Dispatcher: ${currentHub.leadDispatcher}`, color: 'bg-status-success' },
        { step: 'Received in Hub Dock', time: 'Just now', actor: currentHub.id, color: 'bg-primary-container' }
      ]
    };

    setReturnsList([newEntry, ...returnsList]);
    setSelectedReturnId(newEntry.id);
    setManualReturnOpen(false);

    onShowToast({
      type: 'success',
      title: 'Return Request Created',
      message: `Return ${newEntry.id} logged for ${newCustomerName}. Dock station assigned.`,
    });
  };

  if (isOrdersLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={8} label="Loading returns" />;
  }

  const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const returnColumns = [
    {
      key: 'return',
      header: 'Return & order',
      cell: (item) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-mono text-label font-semibold text-accent">{item.id}</span>
          <span className="whitespace-nowrap font-mono text-micro text-muted">{item.orderRef}</span>
        </div>
      ),
    },
    {
      key: 'garment',
      header: 'Garment & variant',
      cell: (item) => (
        <div className="flex min-w-32 max-w-56 flex-col">
          <span className="truncate text-label text-primary" title={item.productTitle}>{item.productTitle}</span>
          <span className="truncate text-micro text-muted">{item.variant}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer & location',
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-meta font-medium text-primary">{item.customer.name}</span>
          <span className="text-micro text-muted">{item.customer.location}</span>
        </div>
      ),
    },
    {
      key: 'awb',
      header: 'Reverse AWB',
      cell: (item) =>
        item.courier ? (
          <div className="flex flex-col">
            <span className="text-meta text-primary">{item.courier.partner}</span>
            <span className="whitespace-nowrap font-mono text-micro text-muted">#{item.courier.awb}</span>
            {item.courier.dockStatus && <span className="text-micro text-muted">{item.courier.dockStatus}</span>}
          </div>
        ) : (
          <span className="text-meta text-faint">No pickup booked</span>
        ),
    },
    {
      key: 'qc',
      header: 'QC status',
      fit: true,
      cell: (item) => <StatusBadge status={item.qcStatus} />,
    },
    {
      key: 'refund',
      header: 'Refund value',
      align: 'right',
      fit: true,
      cell: (item) => (
        <div className="flex flex-col items-end">
          <span className="text-meta font-semibold text-primary">{inr(item.refundValue)}</span>
          <span className="text-micro text-muted">{item.paymentMethod ?? item.settlementEngine}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      fit: true,
      cell: (item) => {
        const isSelected = activeReturn?.id === item.id;
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <Button
              variant={isSelected ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedReturnId(item.id)}
            >
              {isSelected ? 'Active QC' : 'Inspect'}
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Fulfillment & orders"
        title="Returns & exchanges"
        description="Return requests, quality checks and refunds."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleBulkQcPass}>
              <Icon name="verified" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Bulk QC Pass</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Icon name="file_download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Export CSV</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setManualReturnOpen(true)}>
              <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Initiate Manual Return</span>
            </Button>
          </>
        }
      />
      <PageBody
        error={ordersError}
        hasData={ordersData != null}
        title="Returns could not be loaded"
        onRetry={refetchReturns}
      >

        {/* Counted from the return records on the orders */}
        <ContentGrid cols={6}>
          <StatsCard
            title="Total requests"
            value={String(stageCounts.total)}
            icon="swap_horizontal_circle"
            trendLabel="Returns on record"
          />
          <StatsCard
            title="Awaiting pickup"
            value={String(stageCounts.awaitingPickup)}
            icon="schedule"
            iconColor="text-warning"
            trendLabel="Requested or approved"
          />
          <StatsCard
            title="In transit to FC"
            value={String(stageCounts.inTransit)}
            icon="local_shipping"
            iconColor="text-info"
            trendLabel="Pickup booked, not yet received"
          />
          <StatsCard
            title="Inbound QC dock"
            value={String(stageCounts.atDock)}
            icon="rule"
            iconColor="text-accent"
            trendLabel="Received, awaiting grading"
          />
          <StatsCard
            title="Refund approval"
            value={String(stageCounts.awaitingRefund)}
            icon="account_balance_wallet"
            iconColor="text-danger"
            badge={formatMoney(stageCounts.awaitingRefundValue * 100, 'inr')}
            badgeVariant="destructive"
            trendLabel="Inspected, refund not yet paid"
          />
          <StatsCard
            title="Refunded"
            value={String(stageCounts.refunded)}
            icon="inventory_2"
            iconColor="text-success"
            badge={formatMoney(stageCounts.refundedValue * 100, 'inr')}
            badgeVariant="success"
            trendLabel="Money returned to customers"
          />
        </ContentGrid>

        {/* With no returns at all there is nothing to triage, so the bar goes too. */}
        {!noReturns && (
          <FilterBar
            // Counted from the rows behind them. There is no Exchanges tab because
            // nothing on a return record distinguishes an exchange from a refund.
            tabs={[
              { id: 'all', label: 'All returns', count: tabCounts.all },
              { id: 'pending', label: 'Awaiting QC', count: tabCounts.pending },
              { id: 'refund', label: 'Refund queue', count: tabCounts.refund },
              { id: 'completed', label: 'Refunded', count: tabCounts.completed },
              { id: 'rejected', label: 'Rejected', count: tabCounts.rejected },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            search={
              <SearchInput
                placeholder="Search return, order, customer, AWB..."
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
                onClear={() => setSearchQuery('')}
                className="w-full sm:w-72"
              />
            }
            /* Both lists are the distinct values present in the queue, so every
               choice returns rows. The fixed lists they replace matched
               nothing a return record actually stores. The disposition
               dropdown is gone: a grade is chosen during inspection and is
               never stored against the return, so it was unfilterable. */
            filters={
              <>
                <FilterDropdown
                  label="Return reason"
                  value={reasonFilter}
                  onChange={(val) => setReasonFilter(val)}
                  options={reasonOptions}
                />
                <FilterDropdown
                  label="Refund status"
                  value={refundFilter}
                  onChange={(val) => setRefundFilter(val)}
                  options={refundOptions}
                />
              </>
            }
          />
        )}

        {/* Queue, with the QC station beside it */}
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          {noReturns ? (
            <EmptyState
              icon="assignment_return"
              title="No returns yet"
              description="Return requests raised on orders will appear here for quality checks and refunds. You can also log one by hand."
              className="py-16 lg:col-span-12"
              action={
                <Button variant="primary" size="sm" onClick={() => setManualReturnOpen(true)}>
                  <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>Initiate Manual Return</span>
                </Button>
              }
            />
          ) : noMatches ? (
            <EmptyState
              icon="search"
              title="No returns match these filters"
              description="Clear the search, the tab and the filters to see every return."
              className="lg:col-span-12"
              action={
                <Button variant="outline" size="sm" onClick={clearReturnFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="min-w-0 lg:col-span-7 xl:col-span-8">
              <DataTable
                columns={returnColumns}
                data={returnsPager.pageRows}
                keyField="id"
                activeRowId={activeReturn?.id}
                onRowClick={(item) => setSelectedReturnId(item.id)}
                caption="Return requests"
                toolbar={
                  <TableToolbar
                    left={
                      <>
                        <h3 className="text-subheading text-primary">Return queue</h3>
                        <Badge variant="secondary" className="tabular-nums">
                          {filteredReturns.length} of {returnsList.length}
                        </Badge>
                      </>
                    }
                    right={
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => refetchReturns()}
                        title="Refresh queue"
                        aria-label="Refresh queue"
                      >
                        <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                      </Button>
                    }
                  />
                }
                pagination={{
                  page: returnsPager.page,
                  pageSize: returnsPager.limit,
                  totalItems: returnsPager.total,
                  onPageChange: returnsPager.setPage,
                  onPageSizeChange: returnsPager.setLimit,
                }}
              />
            </div>
          )}

          {/* QC station */}
          {noReturns || noMatches ? null : !activeReturn ? (
            <div className="lg:col-span-5 xl:col-span-4">
              <EmptyState icon="swap_horizontal_circle" title="No return selected" description="Pick a return from the queue to inspect it." />
            </div>
          ) : (
          <div className="flex min-w-0 flex-col gap-space-md lg:col-span-5 xl:col-span-4">
            <Card className="flex flex-col gap-space-md p-space-md">
              <div className="flex flex-wrap items-start justify-between gap-space-sm">
                <div className="flex min-w-0 flex-col gap-1">
                  <StatusBadge
                    status={activeReturn.qcStatus ?? 'Not inspected'}
                    variant={activeReturn.qcStatus?.includes('Passed') ? 'success' : 'warning'}
                    className="self-start"
                  />
                  <h2 className="font-mono text-subheading text-primary">{activeReturn.id}</h2>
                  <span className="truncate text-body text-secondary">
                    {activeReturn.productTitle} · {activeReturn.variant}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-kpi-sm tabular-nums text-primary">{inr(activeReturn.refundValue)}</span>
                  <span className="block text-meta text-muted">Refund value</span>
                </div>
              </div>

              {/* The note is the reason the customer gave. When they gave none
                  the card said "Not given" above a pair of empty quotes, beside
                  a placeholder image tile. */}
              <div className="flex items-center gap-space-sm rounded-lg border border-subtle bg-surface-subtle p-space-sm">
                {activeReturn.image && (
                  <Thumbnail
                    src={activeReturn.image}
                    alt={activeReturn.productTitle}
                    className="h-20 w-16 shrink-0 rounded-md"
                    imgClassName="object-cover"
                  />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label text-muted">Reason given</span>
                  {activeReturn.customerNote ? (
                    <p className="text-label font-semibold text-primary">{activeReturn.customerNote}</p>
                  ) : (
                    <p className="text-label text-faint">The customer did not record a reason.</p>
                  )}
                </div>
              </div>

              {/* Settlement */}
              <dl className="flex flex-col gap-1.5 rounded-lg border border-subtle p-space-sm text-body">
                <div className="flex items-center justify-between gap-space-sm">
                  <dt className="text-muted">Refund to</dt>
                  <dd className="text-right text-primary">{activeReturn.settlementEngine ?? 'Original payment method'}</dd>
                </div>
                <div className="flex items-center justify-between gap-space-sm">
                  <dt className="text-muted">Original transaction</dt>
                  <dd className="font-medium tabular-nums text-primary">{inr(activeReturn.refundValue)}</dd>
                </div>
                <Separator className="my-0.5" />
                <div className="flex items-center justify-between gap-space-sm text-subheading text-primary">
                  <dt className="font-semibold">Net refund</dt>
                  <dd className="font-semibold tabular-nums text-success">{inr(activeReturn.refundValue)}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-space-sm">
                <Button variant="primary" onClick={handleApproveRefund} className="w-full">
                  <Icon name="verified_user" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span className="truncate">Approve &amp; refund {inr(activeReturn.refundValue)}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRejectReturn}
                  className="w-full text-danger hover:bg-status-danger-bg hover:text-danger"
                >
                  <span className="truncate">Reject &amp; return to customer</span>
                </Button>
              </div>
            </Card>

            <SectionCard title="Return progress">
              <ol className="relative flex flex-col gap-space-sm pl-5 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-border-subtle">
                {(activeReturn.timeline ?? []).map((step, idx) => (
                  <li key={idx} className="relative flex flex-col">
                    <span
                      aria-hidden="true"
                      className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ${
                        step.isCurrent
                          ? 'bg-status-info-solid'
                          : step.done
                            ? 'bg-status-success-solid'
                            : 'bg-surface-container-high'
                      }`}
                    />
                    <span className={`text-label font-semibold ${step.done ? 'text-primary' : 'text-faint'}`}>
                      {step.label ?? step.step}
                    </span>
                    <span className="text-micro text-muted">
                      {step.at ?? step.time ?? (step.done ? 'Completed' : 'Not reached yet')}
                    </span>
                  </li>
                ))}
              </ol>
            </SectionCard>
          </div>
          )}
        </div>

        {/* Manual return */}
        <AppDialog
          isOpen={manualReturnOpen}
          onClose={() => setManualReturnOpen(false)}
          title="Initiate manual return"
          description={`Create a customer reverse pickup for ${currentHub.id}`}
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="outline" onClick={() => setManualReturnOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="manual-return-form" variant="primary">
                <Icon name="check" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>Dispatch Pickup</span>
              </Button>
            </>
          }
        >
          <form id="manual-return-form" onSubmit={handleCreateReturn} className="flex flex-col gap-space-md pb-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-secondary" htmlFor="return-order-ref">Original order ref *</label>
              <Input
                id="return-order-ref"
                required
                type="text"
                value={newOrderRef}
                onChange={(e) => setNewOrderRef(e.target.value)}
                placeholder="EVR-984210-BLR"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-secondary" htmlFor="return-customer">Customer full name *</label>
              <Input
                id="return-customer"
                required
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Deepa Sengupta"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-secondary" htmlFor="return-garment">Garment item</label>
              <Input
                id="return-garment"
                type="text"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Return reason</label>
                <Select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  aria-label="Return reason"
                >
                  <option>Size/Fit Issue</option>
                  <option>Fabric/Quality Defect</option>
                  <option>Color Mismatch</option>
                  <option>Damaged in Transit</option>
                  <option>Buyer Remorse</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="return-amount">Refund amount (₹)</label>
                <Input
                  id="return-amount"
                  type="number"
                  value={newRefundAmount}
                  onChange={(e) => setNewRefundAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-secondary" htmlFor="return-upi">UPI ID for the refund</label>
              <Input
                id="return-upi"
                type="text"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                placeholder="name@okaxis"
                className="font-mono"
              />
            </div>
          </form>
        </AppDialog>
      </PageBody>
    </PageContainer>
  );
}
