import React, { useState, useEffect, useMemo } from 'react';
import { formatMoney, formatDate } from '../../lib/format';
import { downloadCsv, datedFilename } from '../../lib/export';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { CreateOrderModal } from './CreateOrderModal';
import { useOrdersQuery, useCancelOrderMutation, useUpdateOrderStatusMutation } from '../../hooks/useAdminQueries';
import { useServerTable } from '../../hooks/useServerTable';
import {
  Icon,
  Button,
  PageContainer,
  PageHeader,
  FilterBar,
  SearchInput,
  FilterDropdown,
  DataTable,
  TableActions,
  StatusBadge,
  PageBody,
  SkeletonPage,
} from '../ui';

const CARRIER_LABELS = { delhivery: 'Delhivery', bluedart: 'Blue Dart', custom: 'Own courier' };

/** The order's state in one word, from the fields the API reports. */
export const orderStatusLabel = (ord) => {
  if (ord.status === 'canceled') return 'Cancelled';
  switch (ord.fulfillmentStatus) {
    case 'delivered':
      return 'Delivered';
    case 'shipped':
      return 'Shipped';
    case 'returned':
      return 'Returned';
    default:
      return 'Unfulfilled';
  }
};

/** One API order, shaped for the table and the inspector. */
export const toOrderRow = (ord) => {
  const ship = ord.shippingAddress ?? null;
  const customerName =
    (ship && `${ship.firstName || ''} ${ship.lastName || ''}`.trim()) || ord.email.split('@')[0];
  const address = ship
    ? [ship.address1, ship.address2, ship.city, ship.postalCode].filter(Boolean).join(', ')
    : null;

  return {
    id: ord.displayId ? `#${ord.displayId}` : ord.id,
    rawId: ord.id,
    orderDate: ord.createdAt ? formatDate(ord.createdAt) : null,
    status: orderStatusLabel(ord),
    customer: {
      name: customerName,
      email: ord.email,
      phone: ship?.phone || null,
      address,
      city: ship?.city || null,
    },
    items: (ord.items ?? []).map((it, i) => ({
      id: it.id || `item-${i}`,
      name: it.productTitle || it.title || 'Item',
      variant: it.variantTitle || null,
      qty: it.quantity || 1,
      price: formatMoney(it.unitPrice ?? 0, ord.currency),
      sku: it.sku || null,
      image: it.thumbnail || null,
    })),
    shippingMethod: ord.shippingOption?.name ?? null,
    shipment: ord.shipment
      ? {
          carrier: CARRIER_LABELS[ord.shipment.carrier] ?? ord.shipment.carrier,
          awb: ord.shipment.awb,
          status: ord.shipment.status,
        }
      : null,
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
      paymentStatus: ord.paymentStatus,
      statusBadge:
        ord.paymentStatus === 'paid' ? 'Paid' : ord.paymentStatus === 'refunded' ? 'Refunded' : 'Awaiting payment',
      statusVariant:
        ord.paymentStatus === 'paid' ? 'success' : ord.paymentStatus === 'refunded' ? 'info' : 'warning',
    },
    rawBackend: ord,
  };
};

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
    const apiOrders = apiData.orders.map(toOrderRow);
    setOrders(apiOrders);
    if (apiOrders.length > 0) {
      setInternalActiveId(apiOrders[0].id);
    }
  }, [apiData]);

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

  /**
   * Status changes go to the API; the row is updated in place first so the
   * inspector answers at once, and put back from the server if it refuses.
   */
  const handleUpdateOrder = async (updatedOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));

    const backendId = updatedOrder.rawBackend?.id;
    if (!backendId) return;
    const previous = orders.find((o) => o.id === updatedOrder.id);
    if (!previous || previous.status === updatedOrder.status) return;

    try {
      if (updatedOrder.status === 'Cancelled') {
        await cancelOrderMutation.mutateAsync(backendId);
      } else if (updatedOrder.status === 'Shipped' || updatedOrder.status === 'Dispatched') {
        await updateStatusMutation.mutateAsync({ orderId: backendId, status: { fulfillmentStatus: 'shipped' } });
      } else if (updatedOrder.status === 'Delivered') {
        await updateStatusMutation.mutateAsync({ orderId: backendId, status: { fulfillmentStatus: 'delivered' } });
      } else {
        return;
      }
      onShowToast({
        type: 'success',
        title: `Order ${updatedOrder.status.toLowerCase()}`,
        message: `${updatedOrder.id} is now ${updatedOrder.status.toLowerCase()}.`,
      });
    } catch (err) {
      setOrders((prev) => prev.map((o) => (o.id === previous.id ? previous : o)));
      onShowToast({
        type: 'error',
        title: 'Status not changed',
        message: err?.message || `${updatedOrder.id} was left as it was.`,
      });
    }
  };

  const handleCreateOrder = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setInternalActiveId(newOrder.id);
    setDrawerOpen(true);
    onSelectOrder?.(newOrder.id);
    onShowToast({
      type: 'success',
      title: 'Manual order added',
      message: `${newOrder.id} is listed for this session. It is not saved to the store.`,
    });
  };

  /** Writes the given orders, as the operator sees them, to a CSV file. */
  const exportOrders = (rows, label) => {
    const written = downloadCsv({
      filename: datedFilename(label),
      columns: [
        { header: 'Order', value: (o) => o.id },
        { header: 'Placed', value: (o) => o.orderDate ?? '' },
        { header: 'Customer', value: (o) => o.customer.name },
        { header: 'Email', value: (o) => o.customer.email },
        { header: 'City', value: (o) => o.customer.city ?? '' },
        { header: 'Items', value: (o) => o.items.reduce((n, it) => n + (it.qty || 1), 0) },
        { header: 'Payment', value: (o) => o.payment.method },
        { header: 'Payment status', value: (o) => o.payment.statusBadge },
        { header: 'Tax', value: (o) => formatMoney(o.payment.taxTotal, o.payment.currency) },
        { header: 'Total', value: (o) => formatMoney(o.payment.total, o.payment.currency) },
        { header: 'Status', value: (o) => o.status },
        { header: 'Carrier', value: (o) => o.shipment?.carrier ?? '' },
        { header: 'AWB', value: (o) => o.shipment?.awb ?? '' },
      ],
      rows,
    });
    onShowToast({
      type: 'success',
      title: 'Orders exported',
      message: `${written} ${written === 1 ? 'order' : 'orders'} written to a CSV file.`,
    });
  };

  const handleExportCsv = () => exportOrders(orders, 'orders');
  const handleExportSelected = () =>
    exportOrders(
      orders.filter((o) => selectedIds.includes(o.id)),
      'orders-selected'
    );

  const orderColumns = useMemo(() => [
    {
      key: 'order',
      header: 'Order',
      cell: (order) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-mono text-meta text-primary">{order.id}</span>
          <span className="whitespace-nowrap text-micro text-muted">{order.orderDate ?? 'Date not recorded'}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (order) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-meta text-primary">{order.customer.name}</span>
          <span className="max-w-32 truncate text-micro text-muted">
            {order.customer.city ?? order.customer.email}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      cell: (order) => {
        const pieces = order.items.reduce((n, it) => n + (it.qty || 1), 0);
        return (
          <div className="flex min-w-0 flex-col">
            <span className="whitespace-nowrap text-meta text-primary">
              {pieces} {pieces === 1 ? 'piece' : 'pieces'}
            </span>
            <span className="max-w-36 truncate text-micro text-muted">{order.items[0]?.name ?? 'No items'}</span>
          </div>
        );
      },
    },
    {
      key: 'shipment',
      header: 'Shipment',
      cell: (order) =>
        order.shipment ? (
          <div className="flex flex-col">
            <span className="text-meta text-primary">{order.shipment.carrier}</span>
            <span className="truncate font-mono text-micro text-muted">{order.shipment.awb}</span>
          </div>
        ) : (
          <span className="text-meta text-faint">Not shipped</span>
        ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (order) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="whitespace-nowrap text-num tabular-nums text-primary">
            {formatMoney(order.payment.total, order.payment.currency)}
          </span>
          <StatusBadge
            status={order.payment.statusBadge}
            variant={order.payment.statusVariant}
            size="sm"
          />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (order) => (
        <StatusBadge
          status={order.status}
          variant={
            order.status === 'Delivered'
              ? 'success'
              : order.status === 'Shipped'
                ? 'info'
                : order.status === 'Cancelled'
                  ? 'destructive'
                  : order.status === 'Returned'
                    ? 'secondary'
                    : 'warning'
          }
          showDot
          size="sm"
        />
      ),
    },
  ], []);

  if (isOrdersLoading) {
    return <SkeletonPage variant="split" columns={6} rows={8} label="Loading orders" />;
  }

  return (
    <PageContainer>
      <PageHeader
        kicker="Fulfillment & orders"
        title="Orders"
        description="Every order with its payment and fulfilment state."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={orders.length === 0}>
              <Icon name="file_download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Export CSV</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
              <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Create manual order</span>
            </Button>
          </>
        }
      />
      <PageBody
        error={ordersError}
        hasData={apiData != null}
        title="Orders could not be loaded"
        onRetry={refetchOrders}
      >
        {/* Tabs and filters map onto the parameters /admin/orders accepts:
            fulfillment status, payment status and a free-text query. */}
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
              placeholder="Search order, email or surname"
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

        <TableActions selectedCount={selectedIds.length} onClearSelection={() => setSelectedIds([])}>
          <Button variant="outline" size="sm" onClick={handleExportSelected}>
            <Icon name="file_download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
            <span>Export selected</span>
          </Button>
        </TableActions>

        <div className="grid grid-cols-1 items-start gap-space-md xl:grid-cols-12">
          <div className={drawerOpen && activeOrder ? 'min-w-0 xl:col-span-8' : 'min-w-0 xl:col-span-12'}>
            <DataTable
              columns={orderColumns}
              data={filteredOrders}
              selectable
              selectedIds={selectedIds}
              onSelectRow={(id, checked) => {
                if (checked) setSelectedIds([...selectedIds, id]);
                else setSelectedIds(selectedIds.filter((i) => i !== id));
              }}
              onSelectAll={(checked) => {
                setSelectedIds(checked ? filteredOrders.map((o) => o.id) : []);
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

          {drawerOpen && activeOrder && (
            <OrderDetailDrawer
              key={activeOrder.id}
              order={activeOrder}
              onShowToast={onShowToast}
              onUpdateOrder={handleUpdateOrder}
              isUpdating={cancelOrderMutation.isPending || updateStatusMutation.isPending}
              onClose={() => setDrawerOpen(false)}
            />
          )}
        </div>

        <CreateOrderModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreateOrder={handleCreateOrder}
        />
      </PageBody>
    </PageContainer>
  );
}
