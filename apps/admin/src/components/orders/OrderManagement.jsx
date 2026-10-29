import React, { useState, useMemo } from 'react';
import { INITIAL_ORDERS } from '../../data/mockData';
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
  const [activeTab, setActiveTab] = useState('Packed & Ready');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All Hubs');
  const [courierFilter, setCourierFilter] = useState('All 3PL');
  const [selectedIds, setSelectedIds] = useState(['EVR-984210-BLR']);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState('25');

  const [internalActiveId, setInternalActiveId] = useState('EVR-984210-BLR');
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Currently inspected order (defaults to selectedOrderId, internalActiveId or first order)
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
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = ord.id.toLowerCase().includes(q);
        const matchesName = ord.customer.name.toLowerCase().includes(q);
        const matchesAwb = ord.courier.awb.toLowerCase().includes(q);
        const matchesPhone = (ord.customer.fullPhone || ord.customer.phone).toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesAwb && !matchesPhone) return false;
      }
      // Payment filter
      if (paymentFilter !== 'All') {
        if (paymentFilter.includes('COD') && ord.payment.type !== 'cod') return false;
        if (paymentFilter.includes('Prepaid') && ord.payment.type !== 'prepaid') return false;
      }
      // Warehouse filter
      if (warehouseFilter !== 'All Hubs') {
        if (!ord.nodeFc.includes(warehouseFilter.split(' ')[0])) return false;
      }
      // Courier filter
      if (courierFilter !== 'All 3PL') {
        const cName = courierFilter.replace('Courier: ', '');
        if (!ord.courier.partner.toLowerCase().includes(cName.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, searchQuery, paymentFilter, warehouseFilter, courierFilter]);

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

  const handleUpdateOrder = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
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
      `"${o.courier.partner}"`,
      o.courier.awb,
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

  const handleAssignCourier = () => {
    onShowToast({
      type: 'warning',
      title: 'Carrier Load-Balancing Active',
      message: 'Automated 3PL load allocator assigned BlueDart & Delhivery based on air cargo capacity.',
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

        {/* Page Title & High-Velocity Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
              Order Management & Fulfillment Dispatch
            </h1>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Manage nationwide customer orders, bulk manifesting, carrier allocation, and order exceptions.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkManifest}
              className="gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
              <span>Bulk Manifest</span>
              <Badge variant="default" className="ml-1 px-1.5 py-0 text-[10px]">
                {selectedIds.length || 14}
              </Badge>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">receipt_long</span>
              <span>Export GST (CSV)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLabels}
              className="gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">label</span>
              <span>Generate Labels</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAssignCourier}
              className="gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">local_shipping</span>
              <span>Assign Courier</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Create Manual Order</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Operational Metrical Pulse - ReUI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-space-sm">
        <Card className="hover:border-primary/30 transition-all">
          <CardContent className="p-3 flex flex-col justify-between h-full">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">All Active Today</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-metric-stat text-metric-stat text-text-primary tracking-tight tabular-nums">84,210</span>
              <span className="text-status-success font-label-xs-caps text-[10px] font-semibold">+8.4%</span>
            </div>
            <Progress value={84} className="mt-2 h-1 bg-surface-subtle" indicatorClassName="bg-primary-container" />
          </CardContent>
        </Card>

        <Card className="hover:border-amber-300 transition-all">
          <CardContent className="p-3 flex flex-col justify-between h-full">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">To Pick & Pack</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-metric-stat text-metric-stat text-status-warning tracking-tight tabular-nums">1,428</span>
              <span className="text-status-warning font-label-xs-caps text-[10px] font-semibold">Priority</span>
            </div>
            <Progress value={42} className="mt-2 h-1 bg-surface-subtle" indicatorClassName="bg-status-warning" />
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-300 transition-all">
          <CardContent className="p-3 flex flex-col justify-between h-full">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">Ready for Courier</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-metric-stat text-metric-stat text-status-success tracking-tight tabular-nums">892</span>
              <span className="text-text-secondary font-label-xs-caps text-[10px]">Staged</span>
            </div>
            <Progress value={65} className="mt-2 h-1 bg-surface-subtle" indicatorClassName="bg-status-success" />
          </CardContent>
        </Card>

        <Card className="hover:border-blue-300 transition-all">
          <CardContent className="p-3 flex flex-col justify-between h-full">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">In-Transit Hubs</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-metric-stat text-metric-stat text-status-info tracking-tight tabular-nums">12,400</span>
              <span className="text-status-info font-label-xs-caps text-[10px]">99.2% SLA</span>
            </div>
            <Progress value={78} className="mt-2 h-1 bg-surface-subtle" indicatorClassName="bg-status-info" />
          </CardContent>
        </Card>

        <Card className="hover:border-primary/30 transition-all">
          <CardContent className="p-3 flex flex-col justify-between h-full">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">Delivered</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-metric-stat text-metric-stat text-text-primary tracking-tight tabular-nums">68,120</span>
              <span className="text-status-success font-label-xs-caps text-[10px]">80.9%</span>
            </div>
            <Progress value={91} className="mt-2 h-1 bg-surface-subtle" indicatorClassName="bg-status-success" />
          </CardContent>
        </Card>

        <Card className="hover:border-rose-300 transition-all">
          <CardContent className="p-3 flex flex-col justify-between h-full">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">RTO & Reversals</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-metric-stat text-metric-stat text-status-danger tracking-tight tabular-nums">1,370</span>
              <span className="text-status-danger font-label-xs-caps text-[10px] font-semibold">1.62% RT</span>
            </div>
            <Progress value={16} className="mt-2 h-1 bg-surface-subtle" indicatorClassName="bg-status-danger" />
          </CardContent>
        </Card>
      </div>

      {/* Omnichannel Search & Intelligent Filter Array */}
      <Card className="overflow-visible shadow-xs border border-border-subtle">
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Row 1: Search Bar + Filter Dropdowns + Date Range & Save */}
          <div className="flex flex-wrap xl:flex-nowrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                search
              </span>
              <Input
                className="pl-9 pr-24 h-9 bg-surface-canvas focus:bg-surface-container-lowest w-full rounded-xl border border-border-subtle"
                placeholder="Search by Order ID (e.g. EVR-984210-BLR), AWB, Customer phone, or Email..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    Filter Active
                  </Badge>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-secondary hover:text-text-primary cursor-pointer" 
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filters in Top Searchbar Row */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Payment Filter */}
              <Select 
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-auto h-9 text-xs min-w-[125px] rounded-xl"
              >
                <option value="All">Payment: All</option>
                <option value="Paid (Prepaid)">Payment: Paid</option>
                <option value="Cash on Delivery (COD)">Payment: COD</option>
                <option value="Pending Gate">Payment: Pending</option>
                <option value="Refunded">Payment: Refunded</option>
              </Select>

              {/* Warehouse Filter */}
              <Select 
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-auto h-9 text-xs min-w-[135px] rounded-xl"
              >
                <option value="All Hubs">Warehouse: All</option>
                <option value="BLR-FC1">Warehouse: BLR</option>
                <option value="BOM-FC2">Warehouse: BOM</option>
                <option value="DEL-FC1">Warehouse: DEL</option>
              </Select>

              {/* Courier Partner Filter */}
              <Select 
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="w-auto h-9 text-xs min-w-[125px] rounded-xl"
                dropdownAlign="right"
              >
                <option value="All 3PL">Courier: All</option>
                <option value="BlueDart Express">Courier: BlueDart</option>
                <option value="Delhivery Direct">Courier: Delhivery</option>
                <option value="Shadowfax Hyper">Courier: Shadowfax</option>
                <option value="XpressBees Surface">Courier: XpressBees</option>
              </Select>

              {/* Date Range Button */}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => onShowToast({ type: 'info', title: 'Date Range Selector', message: 'Current view: May 18 - May 24, 2024' })}
                className="gap-1.5 h-9 shrink-0 whitespace-nowrap hidden sm:inline-flex rounded-xl"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">date_range</span>
                <span className="text-xs font-medium">May 18 – May 24, 2024</span>
              </Button>

              {/* Save Search */}
              <Button 
                variant="outline"
                size="icon"
                onClick={() => onShowToast({ type: 'success', title: 'Segment Saved', message: 'Fulfillment search segment bookmarked.' })}
                className="h-9 w-9 shrink-0 rounded-xl"
                title="Save Search Segment"
              >
                <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
              </Button>

              {(paymentFilter !== 'All' || warehouseFilter !== 'All Hubs' || courierFilter !== 'All 3PL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentFilter('All');
                    setWarehouseFilter('All Hubs');
                    setCourierFilter('All 3PL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-primary-container font-semibold hover:underline whitespace-nowrap px-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Status Tab Pills Across Full Width */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar w-full pt-0.5">
            {[
              { label: 'All Orders', count: '84,210' },
              { label: 'Unfulfilled / To Pick', count: '1,428', warn: true },
              { label: 'Packed & Ready', count: '892', active: true },
              { label: 'Dispatched / In-Transit', count: '12,400' },
              { label: 'Delivered', count: '68,120' },
              { label: 'RTO / Returned', count: '1,370' },
              { label: 'Cancelled', count: '1,120' },
            ].map((tab) => {
              const isTabActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  className={`shrink-0 px-3 py-1 rounded-full font-label-xs-caps text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    isTabActive
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : tab.warn
                      ? 'bg-status-warning-bg text-status-warning hover:bg-amber-100 dark:hover:bg-amber-950/40'
                      : 'bg-surface-subtle hover:bg-secondary-fixed text-text-secondary'
                  }`}
                  type="button"
                >
                  {tab.label} <span className={`ml-1 ${isTabActive ? 'bg-white/20 px-1 rounded-full text-white' : 'opacity-70'}`}>{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Dual-Pane Enterprise Fulfilment Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
        {/* LEFT PANE: Orders Table (Takes 8 cols when drawer open, full 12 cols when drawer closed) */}
        <Card className={`${drawerOpen ? 'xl:col-span-8' : 'xl:col-span-12'} overflow-hidden flex flex-col transition-all duration-200`}>
          {/* Table Sub-toolbar */}
          <div className="px-space-md py-2.5 bg-surface-subtle flex items-center justify-between border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <Checkbox
                checked={selectedIds.length > 0 && selectedIds.length === filteredOrders.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="font-label-xs-caps text-label-xs-caps font-semibold uppercase tracking-wider text-text-primary">
                Showing 1-{filteredOrders.length} of 892 Ready Orders
              </span>
              <Badge variant="default" className="text-[10px] font-bold">
                {selectedIds.length} Selected
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant={drawerOpen ? "subtle" : "outline"}
                size="sm"
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="h-7 px-2.5 text-xs gap-1.5 font-medium border border-border-subtle"
                title={drawerOpen ? "Hide detail drawer" : "Show detail drawer"}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {drawerOpen ? 'dock_to_right' : 'side_navigation'}
                </span>
                <span>{drawerOpen ? 'Full Table' : 'Split View'}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleExportCsv}
                className="h-7 w-7 text-secondary hover:text-text-primary"
                title="Export Segment" 
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
              </Button>
            </div>
          </div>

          {/* ReUI Data Table */}
          <div className="overflow-x-auto scrollbar-thin w-full">
            <table className="min-w-[825px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                  <th className="w-9 min-w-[36px] text-center py-2.5 px-3 whitespace-nowrap">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="w-[170px] min-w-[170px] py-2.5 px-3 whitespace-nowrap">Order Details</th>
                  <th className="w-[150px] min-w-[150px] py-2.5 px-3 whitespace-nowrap">Customer / Region</th>
                  <th className="w-[110px] min-w-[110px] py-2.5 px-3 whitespace-nowrap">Items Staged</th>
                  <th className="w-[115px] min-w-[115px] py-2.5 px-3 text-right whitespace-nowrap">Value &amp; Pay</th>
                  <th className="w-[165px] min-w-[165px] py-2.5 px-3 whitespace-nowrap">Dispatch SLA &amp; Partner</th>
                  <th className="w-[75px] min-w-[75px] py-2.5 px-3 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {filteredOrders.map((ord) => {
                  const isSelected = selectedIds.includes(ord.id);
                  const isCurrentActive = drawerOpen && activeOrder?.id === ord.id;

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => handleRowClick(ord.id)}
                      className={`cursor-pointer transition-colors ${
                        isCurrentActive
                          ? 'bg-surface-container-low border-l-4 border-l-primary'
                          : 'hover:bg-surface-canvas'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(ord.id, e)}
                        />
                      </td>

                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-primary tracking-tight whitespace-nowrap">
                              {ord.id}
                            </span>
                            {ord.isExpress && (
                              <Badge variant="destructive" className="text-[9px] font-semibold py-0 px-1 whitespace-nowrap">
                                {ord.expressLabel || '⚡ Express'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-text-secondary whitespace-nowrap">
                            {ord.orderDate}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                            <span className="px-1.5 py-0.2 rounded bg-surface-subtle border border-border-subtle font-mono text-[10px] text-text-secondary font-medium whitespace-nowrap">
                              {ord.nodeFc}
                            </span>
                            <Badge variant={ord.status === 'Packed & Staged' ? 'success' : 'outline'} className="text-[10px] py-0 px-1.5 whitespace-nowrap">
                              {ord.status}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-semibold text-xs text-text-primary whitespace-nowrap">
                              {ord.customer.shortName}
                            </span>
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold whitespace-nowrap ${ord.customer.tierBadgeClass}`}>
                              {ord.customer.tier}
                            </span>
                          </div>
                          <span className="text-text-secondary text-[11px] whitespace-nowrap">{ord.customer.cityRegion}</span>
                          <span className="text-text-secondary/70 font-mono text-[10px] whitespace-nowrap">{ord.customer.phone}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <div className="flex -space-x-2 overflow-hidden p-0.5 shrink-0">
                            {ord.items.map((it, idx) => (
                              <img
                                key={idx}
                                className="inline-block h-8 w-8 rounded-lg object-cover shadow-xs bg-surface-subtle ring-1.5 ring-surface-container-lowest"
                                alt={it.name}
                                src={it.image}
                              />
                            ))}
                          </div>
                          <div className="flex flex-col whitespace-nowrap">
                            <span className="text-xs font-semibold text-text-primary whitespace-nowrap">
                              {ord.items.length} {ord.items.length === 1 ? 'Item' : 'Items'}
                            </span>
                            <span className="text-text-secondary text-[10px] whitespace-nowrap">
                              {ord.items.map(i => i.size).join(', ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">
                        <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-text-primary tabular-nums whitespace-nowrap">
                            ₹{ord.payment.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <Badge 
                            variant={ord.payment.type === 'cod' ? 'warning' : 'success'} 
                            className="text-[10px] py-0 px-1.5 whitespace-nowrap"
                          >
                            {ord.payment.status}
                          </Badge>
                          <span className="font-mono text-text-secondary/70 text-[10px] whitespace-nowrap">{ord.payment.reference}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 whitespace-nowrap">
                          <span className="text-xs font-semibold text-text-primary whitespace-nowrap">
                            {ord.courier.partner}
                          </span>
                          <span className="font-mono text-[10px] text-text-secondary whitespace-nowrap">AWB #{ord.courier.awb}</span>
                          <div className="inline-flex items-center gap-1.5 text-status-success text-[10px] font-semibold whitespace-nowrap mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0"></span>
                            <span>SLA: {ord.courier.slaRemaining}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Button
                            variant={isCurrentActive ? "primary" : "subtle"}
                            size="icon"
                            onClick={() => handleRowClick(ord.id)}
                            className="h-7 w-7"
                            title="Inspect Order Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </Button>
                          <Button
                            variant="subtle"
                            size="icon"
                            onClick={() => onShowToast({ type: 'info', title: 'Tax Invoice', message: `Tax invoice EW-INV for ${ord.id} sent to printer.` })}
                            className="h-7 w-7 text-secondary hover:text-text-primary"
                            title="Print Tax Invoice"
                          >
                            <span className="material-symbols-outlined text-[16px]">print</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination & Velocity Summary Bar */}
          <div className="px-space-md py-3 bg-surface-canvas flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto border-t border-border-subtle">
            <div className="flex items-center gap-2 text-text-secondary text-xs whitespace-nowrap">
              <span className="whitespace-nowrap font-medium">Rows per page:</span>
              <Select 
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(e.target.value)}
                className="w-16 h-7 py-0 px-2 text-xs"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
              <span className="text-text-secondary whitespace-nowrap">Showing 1-{filteredOrders.length} of 892 items</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-secondary/40" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </Button>
              <Button variant="primary" size="sm" className="h-7 w-7 p-0 text-xs">1</Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs text-text-primary">2</Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs text-text-primary">3</Button>
              <span className="text-secondary px-1 text-xs">...</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs text-text-primary">36</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* RIGHT PANE: Expansive Order Drill-Down Detail Drawer */}
        {drawerOpen && activeOrder && (
          <OrderDetailDrawer
            order={activeOrder}
            onShowToast={onShowToast}
            onUpdateOrder={handleUpdateOrder}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateOrder={handleCreateOrder}
        currentHub={currentHub}
      />
    </div>
  );
}
