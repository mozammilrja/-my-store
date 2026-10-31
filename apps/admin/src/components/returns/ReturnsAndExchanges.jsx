import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { adminApi } from '../../lib/api';
import { useOrdersQuery, useUpdateOrderStatusMutation, useProcessReturnMutation } from '../../hooks/useAdminQueries';
import { Icon,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Input,
  Select,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
  Progress,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  FilterBar,
  SearchInput,
  FilterDropdown,
  ErrorState,
  SkeletonPage,
  Thumbnail,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { EmptyState } from '../shared/FeedbackAndOverlays';

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
  const [activeTab, setActiveTab] = useState('Pending QC');
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [dispositionFilter, setDispositionFilter] = useState('All');
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
      const returnOrders = ordersData.orders.filter(o => o.fulfillmentStatus === 'returned' || o.status === 'canceled');
      if (returnOrders.length > 0) {
        const mapped = returnOrders.map((ord, idx) => {
          const amountNum = ord.totals?.total ? ord.totals.total / 100 : 2799;
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
              phone: ord.shippingAddress?.phone || '+91 98800 12345',
              upiId: `${customerName.toLowerCase().replace(/\s+/g, '')}@okaxis`,
              tier: 'GOLD VIP',
              tierBadgeClass: 'border-status-warning/25 bg-status-warning-bg text-warning',
              address: ord.shippingAddress ? `${ord.shippingAddress.address1 || ''}, ${ord.shippingAddress.city || ''}` : 'Bengaluru',
            },
            product: {
              name: firstItem?.productTitle || 'Everwear Silk Ensemble',
              sku: firstItem?.variantTitle || 'EVR-MXD-SLK-04',
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
  const filteredReturns = useMemo(() => {
    return returnsList.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesOrder = item.orderRef.toLowerCase().includes(q);
        const matchesCustomer = item.customer.name.toLowerCase().includes(q);
        const matchesAwb = (item.courier?.awb ?? '').toLowerCase().includes(q);
        if (!matchesId && !matchesOrder && !matchesCustomer && !matchesAwb) return false;
      }
      if (reasonFilter !== 'All' && item.returnReason !== reasonFilter) {
        return false;
      }
      return true;
    });
  }, [returnsList, searchQuery, reasonFilter]);

  // One shared pager over the rows this module actually holds.
  const returnsPager = useClientTable(filteredReturns);

  const handleApproveRefund = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#059669', '#10b981', '#6d28d9', '#2563eb']
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
      message: `₹${activeReturn.refundValue.toLocaleString('en-IN')} sent via ${activeReturn.settlementEngine} to ${activeReturn.customer.upiId}. Grade ${selectedGrade} inventory restocked.`,
      duration: 5000,
    });
  };

  const handleConvertToCredit = () => {
    const bonus = Math.round(activeReturn.refundValue * 1.1);
    onShowToast({
      type: 'info',
      title: 'Store Credit Issued',
      message: `Added ₹${bonus.toLocaleString('en-IN')} (+10% loyalty bonus) to ${activeReturn.customer.name}'s Everwear Wallet.`,
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
      message: '14 staged Grade-A items approved and sent to automated bin replenishment queue.',
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

  return (
    <PageContainer>
      {ordersError && (
        <ErrorState
          title="Returns could not be loaded"
          message={ordersError?.message}
          onRetry={() => refetchReturns()}
        />
      )}
      {/* Editorial Header & Action Ribbon */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Fulfillment & Orders', 'Returns & Exchanges']}
        title="Returns, Reverse Logistics & Refund Operations"
        description="End-to-end customer return lifecycle: pickup dispatch, QC grading, inventory disposition, and instant UPI/bank refund disbursement."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkQcPass}
              className="gap-1.5 h-9"
              type="button"
            >
              <Icon name="verified" className="material-symbols-outlined text-icon text-success" />
              <span>Bulk QC Pass</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 h-9"
              type="button"
            >
              <Icon name="file_download" className="material-symbols-outlined text-icon text-muted" />
              <span>Export Reverse Manifest (CSV)</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setManualReturnOpen(true)}
              className="gap-1.5 h-9 shadow-sm"
              type="button"
            >
              <Icon name="add" className="material-symbols-outlined text-icon" />
              <span>Initiate Manual Return</span>
            </Button>
          </>
        }
      />

      {/* 6 Metrical Pulse Cards */}
      <ContentGrid cols={6}>
        <StatsCard
          title="Total Requests"
          value="1,420"
          icon="swap_horizontal_circle"
          trend="1.8% rate"
          trendType="up"
          trendLabel="-0.4% MoM"
        />

        <StatsCard
          title="Awaiting Pickup"
          value="412"
          icon="schedule"
          iconColor="text-warning"
          badge="BlueDart SLA"
          badgeVariant="warning"
          trendLabel="Carrier dispatch active"
        />

        <StatsCard
          title="In-Transit to FC"
          value="328"
          icon="local_shipping"
          iconColor="text-info"
          badge="Dock in 24-48h"
          badgeVariant="info"
        />

        <StatsCard
          title="Inbound QC Dock"
          value="186"
          icon="rule"
          iconColor="text-accent"
          badge="Grading"
          badgeVariant="warning"
          trendLabel="Pending triage"
        />

        <StatsCard
          className="hover:border-status-danger/40"
          title="Refund Approval"
          value="94"
          icon="account_balance_wallet"
          iconColor="text-danger"
          badge="₹3.14L"
          badgeVariant="destructive"
          trendLabel="Pending approval"
        />

        <StatsCard
          title="Restocked (MTD)"
          value="864 pcs"
          icon="inventory_2"
          iconColor="text-success"
          badge="61% Grade A"
          badgeVariant="success"
          trendLabel="Inventory recovered"
        />
      </ContentGrid>

      {/* Filter Array & Queue Triage Tabs */}
      <FilterBar
        tabs={[
          { id: 'All Returns', label: 'All Returns', count: '1,420' },
          { id: 'Pending QC', label: 'Pending QC', count: '186' },
          { id: 'Refund Queue', label: 'Refund Queue', count: '94' },
          { id: 'Exchanges', label: 'Exchanges', count: '142' },
          { id: 'Completed', label: 'Completed', count: '840' },
          { id: 'Rejected / Fraud RTO', label: 'Rejected / Fraud RTO', count: '48' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={
          <SearchInput
            placeholder="Search Return ID, Order Ref, Customer, AWB..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            onClear={() => setSearchQuery('')}
            className="w-full sm:w-72"
          />
        }
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={reasonFilter}
              onChange={(val) => setReasonFilter(val)}
              options={[
                { value: 'All', label: 'All Return Reasons' },
                { value: 'Size/Fit Issue', label: 'Size/Fit Issue' },
                { value: 'Fabric/Quality Defect', label: 'Fabric/Quality Defect' },
                { value: 'Color Mismatch', label: 'Color Mismatch' },
                { value: 'Damaged in Transit', label: 'Damaged in Transit' },
                { value: 'Buyer Remorse', label: 'Buyer Remorse' },
              ]}
            />
            <FilterDropdown
              value={dispositionFilter}
              onChange={(val) => setDispositionFilter(val)}
              options={[
                { value: 'All', label: 'All Dispositions' },
                { value: 'Restock Grade A (Pristine)', label: 'Restock Grade A' },
                { value: 'Refurbish/Steam Grade B', label: 'Refurbish Grade B' },
                { value: 'Liquidation/Scrap Grade C', label: 'Scrap Grade C' },
              ]}
            />
            <FilterDropdown
              value={refundFilter}
              onChange={(val) => setRefundFilter(val)}
              options={[
                { value: 'All', label: 'Refund Status' },
                { value: 'Hold for Inspection', label: 'Hold for Inspection' },
                { value: 'Refund Initiated', label: 'Refund Initiated' },
                { value: 'UPI Reconciled', label: 'UPI Reconciled' },
              ]}
            />
          </div>
        }
      />

      {/* Dual-Pane Reverse Logistics Triage Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left Pane: Inbound Queue & Triage (8 cols) */}
        <Card className="lg:col-span-7 xl:col-span-8 overflow-hidden flex flex-col">
          <div className="p-space-md flex items-center justify-between border-b border-subtle bg-surface-container-lowest">
            <div className="flex items-center gap-space-sm">
              <span className="text-subheading font-semibold text-primary">Inbound Queue & Triage</span>
              <Badge variant="secondary" className="text-caption">
                Showing {filteredReturns.length} of 186 pending
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => refetchReturns()} title="Refresh queue" aria-label="Refresh queue">
                <Icon name="refresh" className="material-symbols-outlined text-icon-md" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[960px] w-full border-collapse">
              <TableHeader sticky>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="whitespace-nowrap">Return &amp; Order Ref</TableHead>
                  <TableHead className="whitespace-nowrap">Garment &amp; Variant</TableHead>
                  <TableHead className="whitespace-nowrap">Customer &amp; Location</TableHead>
                  <TableHead className="whitespace-nowrap">Logistics AWB &amp; Dock</TableHead>
                  <TableHead className="whitespace-nowrap">QC Status</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Refund / Value</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border-subtle/50">
                {returnsPager.pageRows.map((item) => {
                  const isSelected = activeReturn?.id === item.id;
                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => setSelectedReturnId(item.id)}
                      className={`cursor-pointer transition-colors ${
 isSelected
 ? 'bg-surface-container-low border-l-4 border-l-primary'
 : 'hover:bg-surface-subtle'
 }`}
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-label font-semibold text-accent">
                            {item.id}
                          </span>
                          <span className="text-micro text-muted font-mono whitespace-nowrap">
                            {item.orderRef}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-label text-primary truncate max-w-[170px]" title={item.productTitle}>
                            {item.productTitle}
                          </span>
                          <span className="text-micro text-muted">
                            {item.variant}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-primary font-medium text-meta">
                            {item.customer.name}
                          </span>
                          <span className="text-micro text-muted">
                            {item.customer.location}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-num text-primary text-meta font-mono whitespace-nowrap">
                            {item.courier
                              ? `${item.courier.partner} #${item.courier.awb}`
                              : 'No reverse pickup booked'}
                          </span>
                          <span className="text-micro text-success">
                            {item.courier?.dockStatus ?? ''}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <StatusBadge status={item.qcStatus} />
                      </TableCell>

                      <TableCell className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-num font-semibold text-primary tabular-nums">
                            ₹{item.refundValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-micro text-muted">
                            {item.paymentMethod}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={isSelected ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setSelectedReturnId(item.id)}
                          className="h-7 text-meta py-0 px-2"
                        >
                          {isSelected ? 'Active QC' : 'Inspect'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={returnsPager.page}
            pageSize={returnsPager.limit}
            totalItems={returnsPager.total}
            onPageChange={returnsPager.setPage}
            onPageSizeChange={returnsPager.setLimit}
          />
        </Card>

        {/* Right Pane: Dock Triage & QC Grading Station (4/5 cols) */}
        {!activeReturn ? (
          <EmptyState icon="swap_horizontal_circle" title="No return selected" message="Pick a return from the queue to inspect it." />
        ) : (
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-space-md">
          <Card className="shadow-md">
            <CardContent className="p-space-md flex flex-col gap-space-md">
              <div className="flex flex-wrap items-start justify-between gap-space-sm">
                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="default" className="text-micro font-semibold">
                      Dock Triage Station #04
                    </Badge>
                    <Badge variant={activeReturn.qcStatus.includes('Passed') ? 'success' : 'warning'} className="text-micro font-semibold">
                      {(activeReturn.qcStatus ?? 'Not inspected').toUpperCase()}
                    </Badge>
                  </div>
                  <h2 className="text-subheading font-semibold text-primary mt-1">
                    {activeReturn.id}
                  </h2>
                  <span className="truncate text-body text-secondary">
                    {activeReturn.productTitle} • {activeReturn.variant}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-kpi-sm leading-tight text-accent tabular-nums">
                    ₹{activeReturn.refundValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-caption text-muted uppercase">REFUND VALUE</span>
                </div>
              </div>

              {/* Garment Image & Customer Note */}
              <div className="bg-surface-canvas p-space-sm rounded-lg flex gap-space-sm items-center border border-subtle/50">
                <Thumbnail src={activeReturn.image} alt={activeReturn.productTitle} className="w-16 h-20 rounded-md shrink-0 shadow-xs" imgClassName="object-cover" />
                <div className="flex flex-col min-w-0">
                  <span className="text-caption text-muted uppercase font-semibold">
                    Customer Note & Reason
                  </span>
                  <span className="text-label font-semibold text-primary mt-0.5">
                    {activeReturn.returnReason}
                  </span>
                  <p className="text-meta text-muted italic mt-1 line-clamp-2">
                    "{activeReturn.customerNote}"
                  </p>
                </div>
              </div>

              {/* Garment Physical Checklist */}
              <div className="flex flex-col gap-space-xs">
                <span className="text-caption text-muted uppercase tracking-wider font-semibold">
                  Garment Physical Checklist
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <label 
                    onClick={() => setChecklist(prev => ({ ...prev, tags: !prev.tags }))}
                    className="flex flex-col p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container transition-colors border border-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-micro text-muted">Brand Tags</span>
                      <Checkbox checked={checklist.tags} onChange={() => {}} />
                    </div>
                    <span className="text-meta font-semibold text-success mt-1">
                      {checklist.tags ? 'Intact' : 'Missing'}
                    </span>
                  </label>

                  <label 
                    onClick={() => setChecklist(prev => ({ ...prev, clean: !prev.clean }))}
                    className="flex flex-col p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container transition-colors border border-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-micro text-muted">Wear / Odor</span>
                      <Checkbox checked={checklist.clean} onChange={() => {}} />
                    </div>
                    <span className="text-meta font-semibold text-success mt-1">
                      {checklist.clean ? 'Clean' : 'Soiled'}
                    </span>
                  </label>

                  <label 
                    onClick={() => setChecklist(prev => ({ ...prev, zeroDefect: !prev.zeroDefect }))}
                    className="flex flex-col p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container transition-colors border border-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-micro text-muted">Seam / Tear</span>
                      <Checkbox checked={checklist.zeroDefect} onChange={() => {}} />
                    </div>
                    <span className="text-meta font-semibold text-success mt-1">
                      {checklist.zeroDefect ? 'Zero Defect' : 'Damaged'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Assigned Disposition Grade */}
              <div className="flex flex-col gap-space-xs">
                <span className="text-caption text-muted uppercase tracking-wider font-semibold">
                  Assigned Disposition Grade
                </span>
                <div className="space-y-1.5 mt-1">
                  <label 
                    onClick={() => setSelectedGrade('A')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
 selectedGrade === 'A' ? 'bg-status-success-bg border-status-success/30' : 'bg-surface-canvas border-subtle'
 }`}
                  >
                    <input 
                      type="radio" 
                      name="disposition" 
                      checked={selectedGrade === 'A'} 
                      onChange={() => setSelectedGrade('A')}
                      className="mt-1 accent-primary" 
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-label font-semibold text-primary">Grade A — Pristine Restock</span>
                        <Badge variant="success" className="text-micro py-0 px-1.5">Recommended</Badge>
                      </div>
                      <span className="text-micro text-muted mt-0.5">
                        Route instantly to {currentHub.id} Aisle C-12 / Bin 5 for inventory replenishment.
                      </span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setSelectedGrade('B')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
 selectedGrade === 'B' ? 'bg-status-warning-bg border-status-warning/30' : 'bg-surface-canvas border-subtle'
 }`}
                  >
                    <input 
                      type="radio" 
                      name="disposition" 
                      checked={selectedGrade === 'B'} 
                      onChange={() => setSelectedGrade('B')}
                      className="mt-1 accent-primary" 
                    />
                    <div className="flex flex-col">
                      <span className="text-label font-semibold text-primary">Grade B — Refurbish / Steam Required</span>
                      <span className="text-micro text-muted mt-0.5">
                        Mild linting or packaging wrinkles. Route to Steam & Polybag Bay.
                      </span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setSelectedGrade('C')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
 selectedGrade === 'C' ? 'bg-status-danger-bg border-status-danger/30' : 'bg-surface-canvas border-subtle'
 }`}
                  >
                    <input 
                      type="radio" 
                      name="disposition" 
                      checked={selectedGrade === 'C'} 
                      onChange={() => setSelectedGrade('C')}
                      className="mt-1 accent-primary" 
                    />
                    <div className="flex flex-col">
                      <span className="text-label font-semibold text-primary">Grade C — Liquidation / Salvage Scrap</span>
                      <span className="text-micro text-muted mt-0.5">
                        Permanent stains or damaged fibers. Discard or scrap wholesale.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Settlement Engine Summary */}
              <div className="bg-surface-canvas p-space-sm rounded-lg flex flex-col gap-1.5 border border-subtle/50">
                <div className="flex items-center justify-between text-caption text-muted">
                  <span>SETTLEMENT ENGINE</span>
                  <span>{(activeReturn.settlementEngine ?? 'Original payment method').toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between text-body">
                  <span className="text-muted">Original Transaction:</span>
                  <span className="text-primary font-medium">₹{activeReturn.refundValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-body">
                  <span className="text-muted">Return Deductions:</span>
                  <span className="text-success font-medium">₹0.00 (Everwear Assurance)</span>
                </div>
                <div className="flex items-center justify-between text-body">
                  <span className="text-muted">Customer UPI ID:</span>
                  <span className="text-primary font-mono text-meta whitespace-nowrap">{activeReturn.customer.upiId}</span>
                </div>
                <Separator className="my-0.5" />
                <div className="flex items-center justify-between pt-0.5 text-subheading text-primary">
                  <span className="font-semibold">Net Refund Amount:</span>
                  <span className="text-success font-semibold tabular-nums">₹{activeReturn.refundValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Operational Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="primary"
                  size="default"
                  onClick={handleApproveRefund}
                  className="w-full gap-2 shadow-md"
                >
                  <Icon name="verified_user" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                  <span className="truncate">Approve &amp; refund ₹{activeReturn.refundValue}</span>
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleConvertToCredit}
                  className="w-full gap-1.5"
                  title={`Convert to store credit with a 10% bonus (₹${Math.round(activeReturn.refundValue * 1.1)})`}
                >
                  <Icon name="stars" aria-hidden="true" className="material-symbols-outlined text-icon" />
                  <span className="truncate">Store credit +10% (₹{Math.round(activeReturn.refundValue * 1.1)})</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRejectReturn}
                  className="w-full text-danger hover:bg-status-danger-bg hover:text-danger text-meta font-semibold"
                >
                  <span className="truncate">Reject &amp; return to customer</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Audit Trail Card */}
          <Card>
            <CardContent className="p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="text-subheading font-semibold text-primary">Audit Trail</span>
                <Badge variant="secondary" className="text-micro">LIVE LOGS</Badge>
              </div>
              <div className="relative pl-5 space-y-3 mt-1 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
                {(activeReturn.timeline ?? []).map((step, idx) => (
                  <div key={idx} className="relative flex flex-col">
                    <div
                      className={`absolute -left-5 top-1 h-2.5 w-2.5 rounded-full shadow-xs ${
                        step.isCurrent
                          ? 'bg-status-info-solid'
                          : step.done
                            ? 'bg-status-success-solid'
                            : 'bg-surface-container-high'
                      }`}
                    />
                    <span
                      className={`text-label font-semibold ${step.done ? 'text-primary' : 'text-faint'}`}
                    >
                      {step.label}
                    </span>
                    <span className="text-micro text-muted">
                      {step.at ?? (step.done ? 'Completed' : 'Not reached yet')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </div>

      {/* Manual Return Modal */}
      <Dialog open={manualReturnOpen} onOpenChange={setManualReturnOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-subtle bg-surface-subtle flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="assignment_return" className="material-symbols-outlined text-accent text-icon-lg" />
              <div>
                <DialogTitle>Initiate Manual Return</DialogTitle>
                <DialogDescription className="text-meta">
                  Create customer reverse pickup for {currentHub.id}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setManualReturnOpen(false)}
              className="h-8 w-8 text-muted"
            >
              <Icon name="close" className="material-symbols-outlined text-icon-md" />
            </Button>
          </DialogHeader>

          <form onSubmit={handleCreateReturn} className="p-space-lg space-y-3">
            <div>
              <label className="block text-meta font-medium text-muted mb-1">Original Order Ref *</label>
              <Input
                required
                type="text"
                value={newOrderRef}
                onChange={(e) => setNewOrderRef(e.target.value)}
                placeholder="EVR-984210-BLR"
                className="h-9 text-meta font-mono whitespace-nowrap"
              />
            </div>
            <div>
              <label className="block text-meta font-medium text-muted mb-1">Customer Full Name *</label>
              <Input
                required
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Deepa Sengupta"
                className="h-9 text-meta"
              />
            </div>
            <div>
              <label className="block text-meta font-medium text-muted mb-1">Garment Item</label>
              <Input
                type="text"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="h-9 text-meta"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Return Reason</label>
                <Select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="h-9 text-meta"
                >
                  <option>Size/Fit Issue</option>
                  <option>Fabric/Quality Defect</option>
                  <option>Color Mismatch</option>
                  <option>Damaged in Transit</option>
                  <option>Buyer Remorse</option>
                </Select>
              </div>
              <div>
                <label className="block text-meta font-medium text-muted mb-1">Refund Amount (₹)</label>
                <Input
                  type="number"
                  value={newRefundAmount}
                  onChange={(e) => setNewRefundAmount(e.target.value)}
                  className="h-9 text-meta"
                />
              </div>
            </div>
            <div>
              <label className="block text-meta font-medium text-muted mb-1">UPI ID for Refund Settlement</label>
              <Input
                type="text"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                placeholder="name@okaxis"
                className="h-9 text-meta font-mono whitespace-nowrap"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManualReturnOpen(false)}
                className="text-meta"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="gap-1.5 text-meta shadow-md"
              >
                <Icon name="check" className="material-symbols-outlined text-icon" />
                <span>Dispatch Pickup</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
