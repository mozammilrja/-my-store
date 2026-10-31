import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_ORDERS } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { CreateOrderModal } from './CreateOrderModal';
import { useOrdersQuery, useCancelOrderMutation, useUpdateOrderStatusMutation } from '../../hooks/useAdminQueries';
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
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All Hubs');
  const [courierFilter, setCourierFilter] = useState('All 3PL');
  const [selectedIds, setSelectedIds] = useState(['EVR-984210-BLR']);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState('25');

  const [internalActiveId, setInternalActiveId] = useState('EVR-984210-BLR');
  const [drawerOpen, setDrawerOpen] = useState(true);

  // TanStack Query: orders data fetching and mutations
  const {
    data: apiData,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrdersQuery({ limit: 50 });
  const cancelOrderMutation = useCancelOrderMutation();
  const updateStatusMutation = useUpdateOrderStatusMutation();

  // Sync orders whenever query data changes
  useEffect(() => {
    if (apiData?.orders && apiData.orders.length > 0) {
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
          payment: {
            type: ord.paymentStatus === 'paid' ? 'prepaid' : 'cod',
            method: ord.paymentStatus === 'paid' ? 'Razorpay UPI (Instant)' : 'Cash on Delivery',
            totalPaid: totalAmount,
            subtotal: totalAmount,
            discount: '₹0.00',
            shipping: '₹0.00',
            cgst: '₹240.00',
            sgst: '₹240.00',
            igst: '₹0.00',
            statusBadge: ord.paymentStatus === 'paid' ? 'PAID (VERIFIED)' : 'PENDING ON DELIVERY',
            statusVariant: ord.paymentStatus === 'paid' ? 'success' : 'warning'
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

      setOrders([...apiOrders, ...INITIAL_ORDERS]);
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
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      // Tab filter
      if (activeTab === 'Packed & Ready' && ord.status !== 'Packed & Staged' && ord.status !== 'Packed & Ready') return false;
      if (activeTab === 'In Transit' && ord.status !== 'Dispatched' && ord.status !== 'In Transit') return false;
      if (activeTab === 'Delivered' && ord.status !== 'Delivered') return false;
      if (activeTab === 'Exceptions' && ord.status !== 'On Hold' && ord.status !== 'Cancelled') return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = ord.id.toLowerCase().includes(q);
        const matchesName = ord.customer.name.toLowerCase().includes(q);
        const matchesAwb = ord.courier?.awb?.toLowerCase().includes(q);
        const matchesPhone = (ord.customer.fullPhone || ord.customer.phone || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesAwb && !matchesPhone) return false;
      }
      // Payment filter
      if (paymentFilter !== 'All') {
        if (paymentFilter.includes('COD') && ord.payment?.type !== 'cod') return false;
        if (paymentFilter.includes('Prepaid') && ord.payment?.type !== 'prepaid') return false;
      }
      // Warehouse filter
      if (warehouseFilter !== 'All Hubs') {
        if (!ord.nodeFc?.includes(warehouseFilter.split(' ')[0])) return false;
      }
      // Courier filter
      if (courierFilter !== 'All 3PL') {
        const cName = courierFilter.replace('Courier: ', '');
        if (!ord.courier?.partner?.toLowerCase().includes(cName.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, activeTab, searchQuery, paymentFilter, warehouseFilter, courierFilter]);

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
      <FilterBar
        tabs={[
          { id: 'All', label: 'All Orders', count: orders.length },
          { id: 'Packed & Ready', label: 'Packed & Ready', count: orders.filter(o => o.status === 'Packed & Staged').length || 14 },
          { id: 'In Transit', label: 'In Transit', count: orders.filter(o => o.status === 'Dispatched').length || 8 },
          { id: 'Delivered', label: 'Delivered', count: orders.filter(o => o.status === 'Delivered').length || 6 },
          { id: 'Exceptions', label: 'Exceptions', count: 3 },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={
          <SearchInput
            placeholder="Search Order, AWB, Phone..."
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        }
        filters={
          <>
            <FilterDropdown
              value={paymentFilter}
              onChange={setPaymentFilter}
              options={['All Payments', 'Prepaid (UPI / Cards)', 'COD (Cash on Delivery)']}
            />
            <FilterDropdown
              value={warehouseFilter}
              onChange={setWarehouseFilter}
              options={['All Hubs', 'BLR-FC1 (Bengaluru)', 'BOM-FC2 (Mumbai)', 'DEL-FC3 (Delhi NCR)', 'CCU-FC4 (Kolkata)']}
            />
            <FilterDropdown
              value={courierFilter}
              onChange={setCourierFilter}
              options={['All 3PL Couriers', 'BlueDart Express', 'Delhivery Air', 'Shadowfax Air']}
            />
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
            emptyTitle="No orders found"
            emptyMessage="No orders match your active filter criteria."
            pagination={{
              page: 1,
              pageSize: Number(rowsPerPage),
              totalItems: filteredOrders.length,
              onPageSizeChange: (sz) => setRowsPerPage(String(sz)),
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
