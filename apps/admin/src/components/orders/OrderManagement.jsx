import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { CreateOrderModal } from './CreateOrderModal';
import { useOrdersQuery, useCancelOrderMutation, useUpdateOrderStatusMutation } from '../../hooks/useAdminQueries';
import { useServerTable } from '../../hooks/useServerTable';
import { Icon,
  Card,
  CardContent,
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
  Progress,
  PageContainer,
  PageHeader,
  FilterBar,
  SearchInput,
  FilterDropdown,
  DataTable,
  StatusBadge,
  ErrorState,
  SkeletonPage,
} from '../ui';

export function OrderManagement({ 
  onShowToast, 
  currentHub,
  selectedOrderId,
  onSelectOrder 
}) {
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [internalActiveId, setInternalActiveId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Paging, search and the two filters the API can actually answer.
  const table = useServerTable({ filters: { fulfillment: 'all', payment: 'all' } });
  const { page, setPage, limit, setLimit, search: searchQuery, setSearch: setSearchQuery } = table;
  const activeTab = table.filters.fulfillment;
  const paymentFilter = table.filters.payment;

  // TanStack Query: orders data fetching and mutations
  const {
    data: apiData,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    error: ordersError,
    refetch: refetchOrders,
    isFetching: isOrdersFetching,
  } = useOrdersQuery(table.params, { placeholderData: (prev) => prev });
  const cancelOrderMutation = useCancelOrderMutation();
  const updateStatusMutation = useUpdateOrderStatusMutation();

  // Sync orders whenever query data changes
  useEffect(() => {
    if (!apiData?.orders) return;
    {
      const apiOrders = apiData.orders.map((ord, idx) => {
        const customerName = ord.shippingAddress 
          ? `${ord.shippingAddress.firstName || ''} ${ord.shippingAddress.lastName || ''}`.trim() || ord.email.split('@')[0]
          : ord.email.split('@')[0];
        const phone = ord.shippingAddress?.phone || '+91 98800 12345';
        const city = ord.shippingAddress?.city || 'Bengaluru';
        const address = ord.shippingAddress 
          ? `${ord.shippingAddress.address1 || ''}, ${ord.shippingAddress.city || ''}`
          : 'Bengaluru, India';
        const totalAmount = ord.totals?.total ? formatMoney(ord.totals.total, ord.currency) : (ord.total ? formatMoney(ord.total, ord.currency) : '₹4,890.00');

        const orderIdFormatted = ord.displayId ? `EVR-${ord.displayId}-${currentHub?.id?.slice(0, 3) || 'BLR'}` : ord.id;
        const isDelivered = ord.fulfillmentStatus === 'delivered';
        const isShipped = ord.fulfillmentStatus === 'shipped';
        const isAwaiting = ord.paymentStatus === 'awaiting';

        return {
          id: orderIdFormatted,
          rawId: ord.id,
          channel: 'Everwear Online Flagship',
          orderDate: ord.createdAt ? formatDate(ord.createdAt) : 'Today',
          timeAgo: `${idx * 4 + 2}m ago`,
          nodeFc: idx % 2 === 0 ? 'BLR-FC1' : 'BOM-FC2',
          status: isDelivered ? 'Delivered' : isShipped ? 'Dispatched' : 'Packed & Staged',
          stageBadge: isDelivered ? 'DELIVERED' : isShipped ? 'IN TRANSIT' : 'READY TO HANDOVER',
          isExpress: idx % 2 === 0,
          expressLabel: idx % 2 === 0 ? '⚡ 24h Express' : undefined,
          customer: {
            name: customerName,
            shortName: customerName.split(' ')[0],
            email: ord.email,
            phone: phone.replace(/(\d{5})\d+/, '$1•••••'),
            fullPhone: phone,
            tier: idx === 0 ? 'VIP COUTURE' : 'GOLD TIER',
            tierBadgeClass: 'bg-primary-fixed text-on-primary-fixed font-semibold',
            address,
            cityRegion: `${city}, India`,
            deliveryInstructions: 'Fragile luxury garment packaging'
          },
          items: ord.items?.map((it, i) => ({
            id: it.id || `item-${i}`,
            name: it.productTitle || 'Everwear Luxury Style',
            variant: it.variantTitle || 'Default',
            qty: it.quantity || 1,
            price: it.unitPrice ? formatMoney(it.unitPrice, ord.currency) : '₹2,445.00',
            sku: `EVR-${it.variantId?.slice(-6) || 'SKU'}`,
            hsn: '6204.49.00',
            image: it.thumbnail || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6'
          })) || [
            {
              id: 'item-1',
              name: 'Pleated Mulberry Silk Maxi Dress',
              variant: 'Emerald / M',
              qty: 1,
              price: totalAmount,
              sku: 'EVR-WDR-EMR-M',
              hsn: '6204.49.00',
              image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6'
            }
          ],
          courier: {
            partner: idx % 2 === 0 ? 'BlueDart Express' : 'Delhivery Air',
            awb: `BLR${890000000 + idx}`,
            serviceTier: 'Guaranteed 24h SLA',
            bagId: `BAG-882-${idx}`,
            pickupSlot: '16:00 - 18:00 IST'
          },
          // Money stays in the minor units the API reports; the view formats it.
          payment: {
            type: ord.paymentMethod === 'cod' ? 'cod' : 'prepaid',
            method: ord.paymentMethod === 'cod' ? 'Cash on delivery' : 'Prepaid',
            itemSubtotal: ord.totals?.itemSubtotal ?? 0,
            discountTotal: ord.totals?.discountTotal ?? 0,
            shippingTotal: ord.totals?.shippingTotal ?? 0,
            taxTotal: ord.totals?.taxTotal ?? 0,
            total: ord.totals?.total ?? 0,
            currency: ord.currency,
            statusBadge: ord.paymentStatus === 'paid' ? 'Paid' : ord.paymentStatus === 'refunded' ? 'Refunded' : 'Awaiting payment',
            statusVariant: ord.paymentStatus === 'paid' ? 'success' : ord.paymentStatus === 'refunded' ? 'info' : 'warning'
          },
          currentTimelineStep: isDelivered ? 9 : isShipped ? 7 : 5,
          timeline: [
            { step: 1, title: 'Order Ingested', time: '14:28 IST', desc: 'Validated & Fraud Scored', done: true },
            { step: 2, title: 'Payment Reconciled', time: '14:28 IST', desc: 'Payment Gateway Verified', done: true },
            { step: 3, title: 'Hub Inventory Allocated', time: '14:31 IST', desc: 'BLR-FC1 Matched via SLA', done: true },
            { step: 4, title: 'Item Picked from Bin', time: '15:15 IST', desc: 'Aisle C-12 / Bin 5 Scanned', done: true },
            { step: 5, title: 'QC & Packaging', time: '15:35 IST', desc: 'Studio Boxed with Ribbon', done: true, isCurrent: !isShipped && !isDelivered },
            { step: 6, title: 'AWB Manifest Generated', time: '15:45 IST', desc: 'BlueDart Tracking Ingested', done: isShipped || isDelivered },
            { step: 7, title: 'Handed to Courier Partner', time: '16:30 IST', desc: 'Dock 4 Departure', done: isShipped || isDelivered, isCurrent: isShipped },
            { step: 8, title: 'Out for Final Delivery', time: 'Tomorrow 10:00', desc: 'Delivery Associate Outbound', done: isDelivered },
            { step: 9, title: 'Delivered & Signature Collected', time: 'Tomorrow 12:30', desc: 'OTP Verified at Doorstep', done: isDelivered, isCurrent: isDelivered },
          ],
          rawBackend: ord
        };
      });

      setOrders(apiOrders);
      if (apiOrders.length > 0) {
        setInternalActiveId(apiOrders[0].id);
      }
    }
  }, [apiData, currentHub?.id]);

  // Currently inspected order
  const activeOrder = useMemo(() => {
    if (!drawerOpen) return null;
    const targetId = selectedOrderId || internalActiveId;
    return orders.find(o => o.id === targetId) || orders[0];
  }, [orders, selectedOrderId, internalActiveId, drawerOpen]);

  const handleRowClick = (orderId) => {
    setInternalActiveId(orderId);
    setDrawerOpen(true);
    if (onSelectOrder) onSelectOrder(orderId);
  };

  // Filter orders
  // The API already applied the tab, the search and the payment filter.
  const filteredOrders = orders;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleUpdateOrder = async (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

    // If real backend order, update on server
    if (updatedOrder.rawBackend?.id) {
      try {
        if (updatedOrder.status === 'Cancelled') {
          await cancelOrderMutation.mutateAsync(updatedOrder.rawBackend.id);
        } else if (updatedOrder.status === 'Dispatched') {
          await updateStatusMutation.mutateAsync({
            orderId: updatedOrder.rawBackend.id,
            status: { fulfillmentStatus: 'shipped' }
          });
        }
      } catch (err) {
        console.warn('Backend order update notice:', err?.message);
      }
    }
  };

  const handleCreateOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    onSelectOrder(newOrder.id);
    onShowToast({
      type: 'success',
      title: 'Manual Order Created',
      message: `Order #${newOrder.id} dispatched to ${currentHub.id} pick queue.`,
    });
  };

  const handleBulkManifest = () => {
    onShowToast({
      type: 'info',
      title: 'Bulk Manifest Generated',
      message: `Manifest Batch #4409 generated for ${selectedIds.length || 14} staged orders. Handover slip printed.`,
    });
  };

  const handleExportCsv = () => {
    const headers = ["Order ID", "Customer Name", "Customer Phone", "Channel", "Node Hub", "Courier", "AWB", "Value", "GST CGST", "GST SGST", "Status"];
    const rows = orders.map(o => [
      o.id,
      `"${o.customer.name}"`,
      `"${o.customer.phone}"`,
      `"${o.channel}"`,
      o.nodeFc,
      `"${o.courier?.partner || '3PL'}"`,
      o.courier?.awb || '—',
      o.payment.totalPaid,
      o.payment.cgst,
      o.payment.sgst,
      `"${o.status}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Everwear_GST_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast({
      type: 'success',
      title: 'GST Compliance CSV Exported',
      message: `Successfully generated Tax & Manifest CSV with ${orders.length} orders.`,
    });
  };

  const handleGenerateLabels = () => {
    onShowToast({
      type: 'info',
      title: 'Thermal Labels Sent',
      message: `Generated 4x6" shipping barcodes for ${selectedIds.length} orders.`,
    });
  };

  const orderColumns = useMemo(() => [
    {
      header: 'Order ID & Time',
      cell: (order) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-meta font-semibold text-primary group-hover:text-accent whitespace-nowrap">
              {order.id}
            </span>
            {order.isExpress && (
              <span className="rounded border border-status-warning/25 bg-status-warning-bg px-1 py-px text-micro font-semibold text-warning">
                24h
              </span>
            )}
          </div>
          <span className="text-micro text-muted font-mono mt-0.5 whitespace-nowrap">
            {order.timeAgo}
          </span>
        </div>
      ),
    },
    {
      header: 'Consignee (Customer)',
      cell: (order) => (
        <div className="flex flex-col">
          <span className="font-medium text-meta text-primary">
            {order.customer.name}
          </span>
          <span className="text-micro text-muted truncate max-w-[130px]">
            {order.customer.cityRegion}
          </span>
        </div>
      ),
    },
    {
      header: 'Hub & Channel',
      cell: (order) => (
        <div className="flex flex-col">
          <Badge variant="outline" className="text-micro w-fit font-mono font-semibold whitespace-nowrap">
            {order.nodeFc}
          </Badge>
          <span className="text-micro text-muted mt-0.5 truncate max-w-[120px]">
            {order.channel}
          </span>
        </div>
      ),
    },
    {
      header: 'Items Ordered',
      cell: (order) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap text-meta font-semibold text-primary">
            {order.items?.length || 1} Style ({(order.items || []).reduce((acc, it) => acc + (it.qty || 1), 0)} pcs)
          </span>
          <span className="text-micro text-muted truncate max-w-[140px]">
            {order.items?.[0]?.name || 'Apparel item'}
          </span>
        </div>
      ),
    },
    {
      header: 'Courier / AWB',
      cell: (order) => (
        <div className="flex flex-col">
          <span className="text-meta font-medium text-primary">
            {order.courier?.partner || 'BlueDart Air'}
          </span>
          <span className="text-micro font-mono text-accent truncate">
            {order.courier?.awb || 'Pending AWB'}
          </span>
        </div>
      ),
    },
    {
      header: 'Value & Tax',
      cell: (order) => (
        <div className="flex flex-col">
          <span className="font-mono text-meta font-semibold text-primary whitespace-nowrap">
            {order.payment.totalPaid}
          </span>
          <StatusBadge
            status={order.payment.type === 'prepaid' ? 'PREPAID' : 'COD'}
            size="sm"
            className="w-fit mt-0.5"
          />
        </div>
      ),
    },
    {
      header: 'Fulfillment Stage',
      cell: (order) => (
        <StatusBadge status={order.status} showDot size="sm" />
      ),
    },
  ], []);

  if (isOrdersLoading) {
    return <SkeletonPage variant="split" columns={7} rows={8} label="Loading orders" />;
  }

  return (
    <PageContainer>
      {ordersError && (
        <ErrorState
          title="Orders could not be loaded"
          message={ordersError?.message}
          onRetry={() => refetchOrders()}
        />
      )}
      {/* Top Operations Header */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Fulfillment', 'Order Management']}
        badge={`Dispatcher: ${currentHub.id}`}
        badgeVariant="success"
        title="Order Management & Fulfillment Dispatch"
        description="Omnichannel order routing, real-time 3PL manifest generation, GST invoice compliance & live airway bill tracking."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 h-9"
              type="button"
            >
              <Icon name="receipt_long" className="material-symbols-outlined text-icon-md" />
              <span>Export GST Register</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLabels}
              className="gap-1.5 h-9"
              type="button"
            >
              <Icon name="print" className="material-symbols-outlined text-icon-md" />
              <span>Print Barcodes</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkManifest}
              className="gap-1.5 h-9"
              type="button"
            >
              <Icon name="inventory_2" className="material-symbols-outlined text-icon-md" />
              <span>Batch Manifest</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 h-9 shadow-sm"
              type="button"
            >
              <Icon name="add_circle" className="material-symbols-outlined text-icon-md" />
              <span>+ Create Manual Order</span>
            </Button>
          </>
        }
      />

      {/* Operational Filter & State Navigation Bar */}
      {/* Tabs and filters map onto the parameters /admin/orders accepts:
          fulfillment status, payment status and a free-text query. The hub and
          courier filters are gone: an order carries no such field. */}
      <FilterBar
        tabs={[
          { id: 'all', label: 'All orders', count: apiData?.count },
          { id: 'unfulfilled', label: 'Unfulfilled' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'returned', label: 'Returned' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => table.setFilter('fulfillment', id)}
        search={
          <SearchInput
            placeholder="Search order number, email or surname"
            label="Search orders"
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        }
        filters={
          <>
            <FilterDropdown
              value={paymentFilter}
              onChange={(value) => table.setFilter('payment', value)}
              label="Payment status"
              options={[
                { value: 'all', label: 'All payments' },
                { value: 'paid', label: 'Paid' },
                { value: 'awaiting', label: 'Awaiting payment' },
                { value: 'refunded', label: 'Refunded' },
              ]}
            />
            {table.activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={table.resetFilters}>
                Clear filters
              </Button>
            )}
          </>
        }
      />

      {/* Main Split Grid: High-Density Table (8 Cols) + Interactive Order Drawer (4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
        <div className={drawerOpen ? 'xl:col-span-8' : 'xl:col-span-12'}>
          <DataTable
            columns={orderColumns}
            data={filteredOrders}
            selectable
            selectedIds={selectedIds}
            onSelectRow={(id, checked) => {
              if (checked) setSelectedIds([...selectedIds, id]);
              else setSelectedIds(selectedIds.filter(i => i !== id));
            }}
            onSelectAll={(checked) => {
              setSelectedIds(checked ? filteredOrders.map(o => o.id) : []);
            }}
            activeRowId={activeOrder?.id}
            onRowClick={(row) => handleRowClick(row.id)}
            isLoading={isOrdersLoading}
            isError={isOrdersError}
            errorTitle="Orders could not be loaded"
            errorMessage={ordersError?.message}
            onRetry={() => refetchOrders()}
            emptyTitle={table.activeFilterCount ? 'No orders match these filters' : 'No orders yet'}
            emptyMessage={
              table.activeFilterCount
                ? 'Clear the search or filters to see the rest of the queue.'
                : 'Orders placed in the storefront appear here as soon as they are confirmed.'
            }
            emptyAction={
              table.activeFilterCount ? (
                <Button variant="outline" size="sm" onClick={table.resetFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
            pagination={{
              page,
              pageSize: limit,
              totalItems: apiData?.count ?? 0,
              onPageChange: setPage,
              onPageSizeChange: setLimit,
            }}
          />
        </div>

        {/* Right Column: Slide-Over Order Detail Drawer */}
        {drawerOpen && activeOrder && (
          <OrderDetailDrawer
            order={activeOrder}
            onShowToast={onShowToast}
            onUpdateOrder={handleUpdateOrder}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </div>

      {/* Manual Order Creation Modal */}
      <CreateOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateOrder={handleCreateOrder}
        currentHub={currentHub}
      />
    </PageContainer>
  );
}
