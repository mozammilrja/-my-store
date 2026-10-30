import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_ORDERS } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { formatMoney, formatDate } from '../../lib/format';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { CreateOrderModal } from './CreateOrderModal';
import {
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

  // Fetch real orders from Everwear API on mount
  useEffect(() => {
    adminApi.orders({ limit: 50 })
      .then((data) => {
        if (data?.orders && data.orders.length > 0) {
          const apiOrders = data.orders.map((ord, idx) => {
            const customerName = ord.shippingAddress 
              ? `${ord.shippingAddress.firstName || ''} ${ord.shippingAddress.lastName || ''}`.trim() || ord.email.split('@')[0]
              : ord.email.split('@')[0];
            const phone = ord.shippingAddress?.phone || '+91 98800 12345';
            const city = ord.shippingAddress?.city || 'Bengaluru';
            const address = ord.shippingAddress 
              ? `${ord.shippingAddress.address1 || ''}, ${ord.shippingAddress.city || ''}`
              : 'Bengaluru, India';
            const totalAmount = ord.totals?.total ? formatMoney(ord.totals.total, ord.currency) : (ord.total ? formatMoney(ord.total, ord.currency) : '₹4,890.00');

            const orderIdFormatted = ord.displayId ? `EVR-${ord.displayId}-${currentHub.id.slice(0, 3)}` : ord.id;
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
                tierBadgeClass: 'bg-primary-fixed text-on-primary-fixed font-bold',
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
      })
      .catch((err) => {
        console.warn('Backend orders fetch notice:', err?.message);
      });
  }, [currentHub.id]);

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
          await adminApi.cancelOrder(updatedOrder.rawBackend.id);
        } else if (updatedOrder.status === 'Dispatched') {
          await adminApi.setOrderStatus(updatedOrder.rawBackend.id, { fulfillmentStatus: 'shipped' });
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

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Top Navigation & Operations Header */}
      <div className="flex flex-col gap-space-sm">
        {/* Breadcrumb & System State Indicator */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-1.5 font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">
            <span>Everwear Admin</span>
            <span className="text-secondary/40">/</span>
            <span>Fulfillment</span>
            <span className="text-secondary/40">/</span>
            <span className="text-primary font-semibold">Order Management</span>
          </nav>
          <div className="flex items-center gap-space-sm text-text-secondary font-label-xs-caps text-label-xs-caps">
            <Badge variant="success" className="gap-1 font-medium shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
              Dispatcher Active: {currentHub.id}
            </Badge>
            <span className="text-secondary/30">•</span>
            <span className="font-mono text-text-secondary">AUTO-MANIFEST BATCH #4409</span>
          </div>
        </div>

        {/* Page Title & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
              Order Management & Fulfillment Dispatch
            </h1>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Omnichannel order routing, real-time 3PL manifest generation, GST invoice compliance & live airway bill tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 h-9"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Export GST Register</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLabels}
              className="gap-1.5 h-9"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print Barcodes</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkManifest}
              className="gap-1.5 h-9"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span>Batch Manifest</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 h-9 shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Create Manual Order</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Operational Filter & State Navigation Bar */}
      <Card>
        <CardContent className="p-space-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {[
              { id: 'All', label: 'All Orders', count: orders.length },
              { id: 'Packed & Ready', label: 'Packed & Ready', count: orders.filter(o => o.status === 'Packed & Staged').length || 14 },
              { id: 'In Transit', label: 'In Transit', count: orders.filter(o => o.status === 'Dispatched').length || 8 },
              { id: 'Delivered', label: 'Delivered', count: orders.filter(o => o.status === 'Delivered').length || 6 },
              { id: 'Exceptions', label: 'Exceptions', count: 3 },
            ].map((tab) => {
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isTabActive
                      ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                      : 'bg-surface-subtle hover:bg-surface-container text-on-surface-variant'
                  }`}
                  type="button"
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isTabActive ? 'bg-white/20 text-white' : 'bg-surface-container text-text-secondary'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search & Param Filters */}
          <div className="flex flex-wrap items-center gap-space-xs">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-secondary text-[16px] pointer-events-none">
                search
              </span>
              <Input
                type="text"
                placeholder="Search Order, AWB, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 h-8.5 bg-surface-canvas text-xs"
              />
            </div>

            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-8.5 text-xs bg-surface-canvas font-medium"
            >
              <option>All Payments</option>
              <option>Prepaid (UPI / Cards)</option>
              <option>COD (Cash on Delivery)</option>
            </Select>

            <Select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="h-8.5 text-xs bg-surface-canvas font-medium"
            >
              <option>All Hubs</option>
              <option>BLR-FC1 (Bengaluru)</option>
              <option>BOM-FC2 (Mumbai)</option>
              <option>DEL-FC3 (Delhi NCR)</option>
              <option>CCU-FC4 (Kolkata)</option>
            </Select>

            <Select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="h-8.5 text-xs bg-surface-canvas font-medium"
            >
              <option>All 3PL Couriers</option>
              <option>BlueDart Express</option>
              <option>Delhivery Air</option>
              <option>Shadowfax Air</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Split Grid: High-Density Table (8 Cols) + Interactive Order Drawer (4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
        {/* Left Column: Orders Table */}
        <Card className={`${drawerOpen ? 'xl:col-span-8' : 'xl:col-span-12'} overflow-hidden shadow-xs transition-all`}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-surface-subtle">
                <TableRow className="border-b border-border-subtle">
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Order ID &amp; Time</TableHead>
                  <TableHead className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Consignee (Customer)</TableHead>
                  <TableHead className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Hub &amp; Channel</TableHead>
                  <TableHead className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Items Ordered</TableHead>
                  <TableHead className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Courier / AWB</TableHead>
                  <TableHead className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Value &amp; Tax</TableHead>
                  <TableHead className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary">Fulfillment Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-text-secondary">
                      No orders found matching the filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedIds.includes(order.id);
                    const isActive = activeOrder?.id === order.id;

                    return (
                      <TableRow
                        key={order.id}
                        onClick={() => handleRowClick(order.id)}
                        className={`cursor-pointer transition-colors border-b border-border-subtle/50 hover:bg-surface-subtle/70 ${
                          isActive ? 'bg-primary-fixed/20 border-l-4 border-l-primary-container' : ''
                        }`}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleToggleSelect(order.id, e)}
                          />
                        </TableCell>

                        {/* Order ID & Time */}
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-text-primary group-hover:text-primary">
                                {order.id}
                              </span>
                              {order.isExpress && (
                                <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                                  24h
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-text-secondary font-mono mt-0.5">
                              {order.timeAgo}
                            </span>
                          </div>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs text-text-primary">
                              {order.customer.name}
                            </span>
                            <span className="text-[11px] text-text-secondary truncate max-w-[130px]">
                              {order.customer.cityRegion}
                            </span>
                          </div>
                        </TableCell>

                        {/* Hub & Channel */}
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge variant="outline" className="text-[10px] w-fit font-mono font-bold">
                              {order.nodeFc}
                            </Badge>
                            <span className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[120px]">
                              {order.channel}
                            </span>
                          </div>
                        </TableCell>

                        {/* Items */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-text-primary">
                              {order.items?.length || 1} Style ({(order.items || []).reduce((acc, it) => acc + (it.qty || 1), 0)} pcs)
                            </span>
                            <span className="text-[11px] text-text-secondary truncate max-w-[140px]">
                              {order.items?.[0]?.name || 'Apparel item'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Courier / AWB */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-text-primary">
                              {order.courier?.partner || 'BlueDart Air'}
                            </span>
                            <span className="text-[11px] font-mono text-primary truncate">
                              {order.courier?.awb || 'Pending AWB'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Value & Tax */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-text-primary">
                              {order.payment.totalPaid}
                            </span>
                            <Badge 
                              variant={order.payment.type === 'prepaid' ? 'success' : 'warning'} 
                              className="text-[9px] py-0 px-1 font-semibold w-fit mt-0.5"
                            >
                              {order.payment.type === 'prepaid' ? 'PREPAID' : 'COD'}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Fulfillment Stage */}
                        <TableCell>
                          <Badge 
                            variant={
                              order.status === 'Delivered' ? 'success' :
                              order.status === 'Dispatched' ? 'info' :
                              order.status === 'Cancelled' ? 'destructive' : 'warning'
                            }
                            className="text-[10px] py-0.5 px-2 font-semibold"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer with Paging */}
          <div className="p-space-sm bg-surface-subtle border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm text-xs text-text-secondary">
            <div>
              Showing <span className="font-semibold text-text-primary">{filteredOrders.length}</span> of {orders.length} active dispatches across hubs
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                Previous
              </Button>
              <span className="font-mono text-text-primary">Page 1 of 1</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                Next
              </Button>
            </div>
          </div>
        </Card>

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
    </div>
  );
}
