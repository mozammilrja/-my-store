import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../ui/dialog';
import { Alert } from '../ui/alert';
import { INITIAL_INVENTORY, INITIAL_INVENTORY_METRICS, HUBS } from '../../data/mockData';
import { adminApi } from '../../lib/api';

export default function InventoryWarehouseManagement({ currentHub, onShowToast }) {
  const [inventoryList, setInventoryList] = useState(INITIAL_INVENTORY);
  const [selectedHub, setSelectedHub] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockHealthFilter, setStockHealthFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real products from backend to populate stock allocations
  useEffect(() => {
    adminApi.products({ limit: 50 })
      .then(res => {
        if (res?.products?.length > 0) {
          const liveItems = [];
          res.products.forEach(p => {
            (p.variants || []).forEach((v, vIdx) => {
              const stock = v.inventoryQuantity ?? 25;
              liveItems.push({
                id: `live-inv-${p.id}-${v.id || vIdx}`,
                productId: p.id,
                variantId: v.id,
                name: p.title,
                sku: v.sku || `EVR-${p.handle.slice(0, 4).toUpperCase()}-${v.title || 'M'}`,
                variant: v.title || 'Standard',
                ean: `89044${Math.floor(1000000 + Math.random() * 9000000)}`,
                category: p.categoryIds?.[0] ? 'Apparel' : 'Fashion Wear',
                hub: 'BLR-FC1',
                bin: `Aisle ${(vIdx % 5) + 1} / Bin ${(vIdx % 12) + 1}`,
                onHand: stock,
                reserved: Math.min(stock, Math.floor(stock * 0.15)),
                ats: Math.max(0, stock - Math.floor(stock * 0.15)),
                safety: 10,
                status: stock === 0 ? 'Depleted' : stock < 10 ? 'Critical Low-Stock' : stock > 100 ? 'Overstocked' : 'Healthy',
                image: p.thumbnail || p.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=200',
              });
            });
          });

          if (liveItems.length > 0) {
            setInventoryList(prev => [...liveItems, ...prev.filter(m => !liveItems.some(l => l.sku === m.sku))]);
          }
        }
      })
      .catch(err => {
        console.warn('Could not load products for inventory view:', err?.message);
      });
  }, []);
  
  // Selected SKU for right adjustment drawer
  const [selectedItemId, setSelectedItemId] = useState('inv-2');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  
  // Stock Adjustment Form State
  const [adjustmentDelta, setAdjustmentDelta] = useState(-4);
  const [adjustmentReason, setAdjustmentReason] = useState('damage');
  const [targetBin, setTargetBin] = useState('Aisle C-12 / Bin 5');
  const [targetHub, setTargetHub] = useState('BLR-FC1');
  const [auditorMemo, setAuditorMemo] = useState('QC inspector tag #8491. Hem thread pulled during final sorting.');

  // Modals state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    fromHub: 'BLR-FC1',
    toHub: 'DEL-FC3',
    sku: 'EVR-WDR-EMR-L',
    qty: 10,
    vehicleNote: 'BlueDart Air Fast-Transit'
  });

  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [grnData, setGrnData] = useState({
    poRef: 'PO-2024-9982',
    supplier: 'Arvind Luxury Textiles Ltd',
    hub: 'BLR-FC1',
    sku: 'EVR-WDR-EMR-M',
    unitsReceived: 100,
    binLocation: 'Aisle C-12 / B4'
  });

  const selectedItem = useMemo(() => {
    return inventoryList.find(item => item.id === selectedItemId) || inventoryList[0];
  }, [inventoryList, selectedItemId]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventoryList.filter(item => {
      // Hub filter
      if (selectedHub !== 'all' && item.hub !== selectedHub) return false;
      // Category filter
      if (selectedCategory !== 'all' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      // Health filter
      if (stockHealthFilter === 'critical' && item.status !== 'Critical Low-Stock') return false;
      if (stockHealthFilter === 'healthy' && item.status !== 'Healthy') return false;
      if (stockHealthFilter === 'overstocked' && item.status !== 'Overstocked') return false;
      if (stockHealthFilter === 'depleted' && item.status !== 'Depleted') return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesEan = item.ean.toLowerCase().includes(q);
        const matchesBin = item.bin.toLowerCase().includes(q);
        if (!matchesSku && !matchesName && !matchesEan && !matchesBin) return false;
      }
      return true;
    });
  }, [inventoryList, selectedHub, selectedCategory, stockHealthFilter, searchQuery]);

  const handleAdjustCount = (diff) => {
    setAdjustmentDelta(prev => prev + diff);
  };

  const handleApplyAdjustment = () => {
    if (!selectedItem) return;
    const newPhysical = Math.max(0, selectedItem.onHand + adjustmentDelta);
    const newAts = Math.max(0, newPhysical - selectedItem.reserved);

    setInventoryList(prev => prev.map(item => {
      if (item.id === selectedItem.id) {
        let newStatus = item.status;
        if (newPhysical === 0) newStatus = 'Depleted';
        else if (newAts < 10) newStatus = 'Critical Low-Stock';
        else if (newPhysical > 1000) newStatus = 'Overstocked';
        else newStatus = 'Healthy';

        return {
          ...item,
          onHand: newPhysical,
          ats: newAts,
          status: newStatus,
          bin: targetBin,
          hub: targetHub
        };
      }
      return item;
    }));

    if (onShowToast) {
      onShowToast(`Stock adjusted for ${selectedItem.sku}: ${adjustmentDelta >= 0 ? '+' : ''}${adjustmentDelta} pcs saved to ${targetHub} ledger.`);
    }
    setAdjustmentDelta(0);
  };

  const handleConfirmTransfer = (e) => {
    e.preventDefault();
    setIsTransferModalOpen(false);
    if (onShowToast) {
      onShowToast(`Transfer of ${transferData.qty} pcs (${transferData.sku}) initiated: ${transferData.fromHub} ➔ ${transferData.toHub}`);
    }
  };

  const handleConfirmGrn = (e) => {
    e.preventDefault();
    setInventoryList(prev => prev.map(item => {
      if (item.sku === grnData.sku) {
        return {
          ...item,
          onHand: item.onHand + Number(grnData.unitsReceived),
          ats: item.ats + Number(grnData.unitsReceived)
        };
      }
      return item;
    }));
    setIsGrnModalOpen(false);
    if (onShowToast) {
      onShowToast(`GRN Goods Receipt: +${grnData.unitsReceived} pcs booked into ${grnData.hub} (${grnData.poRef})`);
    }
  };

  const handleExportCsv = () => {
    const headers = ['SKU', 'Garment Name', 'Variant', 'Category', 'Hub', 'Bin', 'On-Hand', 'Reserved', 'ATS', 'Incoming', 'Velocity', 'Status'];
    const rows = filteredInventory.map(item => [
      item.sku,
      `"${item.name}"`,
      item.variant,
      item.category,
      item.hub,
      `"${item.bin}"`,
      item.onHand,
      item.reserved,
      item.ats,
      item.incoming,
      item.velocity,
      item.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `everwear_inventory_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Inventory ledger CSV downloaded.');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'Critical Low-Stock':
        return <Badge variant="destructive">Critical (&lt;10)</Badge>;
      case 'Low Stock':
        return <Badge variant="warning">Low Stock</Badge>;
      case 'Overstocked':
        return <Badge variant="secondary">Overstocked (&gt;1000)</Badge>;
      case 'Depleted':
        return <Badge variant="destructive">Depleted (0)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const newPhysicalCalculated = selectedItem ? Math.max(0, selectedItem.onHand + adjustmentDelta) : 0;

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Breadcrumb & Title Section */}
      <Card className="border border-border-subtle bg-surface-container-lowest">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-text-secondary tracking-wider font-semibold uppercase">
                <span>EVERWEAR ADMIN</span>
                <span className="text-border-strong">/</span>
                <span>CATALOG &amp; INVENTORY</span>
                <span className="text-border-strong">/</span>
                <span className="text-primary-container font-bold">INVENTORY &amp; WAREHOUSES</span>
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                Omnichannel Inventory &amp; Multi-Node Warehousing
                <Badge variant="success" className="text-xs font-semibold">4 Nodes Active</Badge>
              </h1>
              <p className="text-sm text-text-secondary max-w-4xl">
                Real-time stock ledger, multi-hub allocation (BLR-FC1, BOM-FC2, DEL-FC3, CCU-FC4), reserved buffer holds, and automated replenishment alerts.
              </p>
            </div>

            {/* Quick Actions Header CTAs */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(true)}
                className="gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-text-secondary">sync_alt</span>
                Stock Transfer (Inter-Hub)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShowToast && onShowToast('Cycle count audit scheduled for BLR-FC1 aisle C-12.')}
                className="gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-text-secondary">fact_check</span>
                Reconcile Cycle Count
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGrnModalOpen(true)}
                className="gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-text-secondary">download</span>
                Receive Goods (GRN)
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsDrawerOpen(prev => !prev)}
                className="gap-1.5 bg-primary-container text-on-primary hover:bg-primary shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                {isDrawerOpen ? 'Close Adjustment' : '+ Stock Adjustment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Metrics Grid (ReUI Card) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Total SKUs</span>
              <span className="p-1 rounded-lg bg-surface-subtle text-text-secondary material-symbols-outlined text-[16px]">qr_code_2</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">{INITIAL_INVENTORY_METRICS.totalSkus}</div>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-status-success font-semibold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>{INITIAL_INVENTORY_METRICS.totalSkusGrowth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">On-Hand Physical</span>
              <span className="p-1 rounded-lg bg-surface-subtle text-text-secondary material-symbols-outlined text-[16px]">inventory_2</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">
                {INITIAL_INVENTORY_METRICS.onHandPhysical.split(' ')[0]} <span className="text-xs font-normal text-text-secondary">pcs</span>
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                Valuation: <span className="font-semibold text-text-primary">{INITIAL_INVENTORY_METRICS.valuation}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Available-to-Sell</span>
              <span className="p-1 rounded-lg bg-status-success-bg text-status-success material-symbols-outlined text-[16px]">storefront</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-status-success tracking-tight">
                {INITIAL_INVENTORY_METRICS.ats.split(' ')[0]} <span className="text-xs font-normal text-text-secondary">pcs</span>
              </div>
              <div className="mt-1 text-[11px] text-text-secondary truncate">
                {INITIAL_INVENTORY_METRICS.atsNote}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Reserved / Staged</span>
              <span className="p-1 rounded-lg bg-status-info-bg text-status-info material-symbols-outlined text-[16px]">lock_clock</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">
                {INITIAL_INVENTORY_METRICS.reserved.split(' ')[0]} <span className="text-xs font-normal text-text-secondary">pcs</span>
              </div>
              <div className="mt-1 text-[11px] text-status-info font-medium">
                {INITIAL_INVENTORY_METRICS.reservedNote}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5 */}
        <Card className="border border-status-danger/30 bg-status-danger-bg/40">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-status-danger tracking-wider uppercase">Critical Low-Stock</span>
              <span className="p-1 rounded-lg bg-surface-container-lowest text-status-danger material-symbols-outlined text-[16px]">warning</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-status-danger tracking-tight">{INITIAL_INVENTORY_METRICS.criticalLow}</div>
              <div className="mt-1 text-[11px] text-status-danger font-medium">
                {INITIAL_INVENTORY_METRICS.criticalNote}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">Cycle Accuracy</span>
              <span className="p-1 rounded-lg bg-status-success-bg text-status-success material-symbols-outlined text-[16px]">verified</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">{INITIAL_INVENTORY_METRICS.cycleAccuracy}</div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {INITIAL_INVENTORY_METRICS.accuracyNote}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Filter & Control Bar */}
      <Card className="border border-border-subtle bg-surface-container-lowest">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Hub Selector */}
              <div className="relative min-w-[200px]">
                <Select
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                  className="h-9 font-medium"
                >
                  <option value="all">All Warehouses &amp; Hubs</option>
                  <option value="BLR-FC1">BLR-FC1 • Bengaluru Primary</option>
                  <option value="BOM-FC2">BOM-FC2 • Mumbai Western DC</option>
                  <option value="DEL-FC3">DEL-FC3 • Delhi NCR Hub</option>
                  <option value="CCU-FC4">CCU-FC4 • Kolkata East Regional</option>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="relative min-w-[150px]">
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-9 font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="dresses">Dresses</option>
                  <option value="men's denim">Men's Denim</option>
                  <option value="ethnic kurti">Ethnic Kurti</option>
                  <option value="activewear">Activewear</option>
                </Select>
              </div>

              {/* Stock Health Segment Pills */}
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'critical', label: 'CRITICAL (<10)' },
                  { id: 'healthy', label: 'HEALTHY' },
                  { id: 'overstocked', label: 'OVERSTOCKED (>1000)' },
                  { id: 'depleted', label: 'DEPLETED (0)' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStockHealthFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      stockHealthFilter === tab.id
                        ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-text-secondary text-[18px] pointer-events-none">search</span>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter SKU, EAN, Bin..."
                  className="h-9 pl-8 pr-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-text-secondary hover:text-text-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-1 h-9"
                title="Export CSV"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Two-Column Workbench (Main Table + Stock Adjustment Drawer) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Inventory Data Table */}
        <div className={`${isDrawerOpen ? 'xl:col-span-8' : 'xl:col-span-12'} flex flex-col transition-all duration-300`}>
          <Card className="border border-border-subtle bg-surface-container-lowest overflow-hidden">
            <CardHeader className="p-4 bg-surface-subtle/50 border-b border-border-subtle flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-text-primary">Live Inventory Ledger</CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {filteredInventory.length} SKUs Listed
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span>Sorted by: <strong className="text-text-primary">Stock Health (Ascending)</strong></span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1020px] w-full border-collapse">
                <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-3 px-3 font-semibold text-xs text-text-secondary uppercase tracking-wider w-[260px] whitespace-nowrap">
                      SKU &amp; Garment Variant
                    </TableHead>
                    <TableHead className="py-3 px-3 font-semibold text-xs text-text-secondary uppercase tracking-wider w-[120px] whitespace-nowrap">
                      Category
                    </TableHead>
                    <TableHead className="py-3 px-3 font-semibold text-xs text-text-secondary uppercase tracking-wider w-[140px] whitespace-nowrap">
                      Hub &amp; Bin
                    </TableHead>
                    <TableHead className="py-3 px-3 text-right font-semibold text-xs text-text-secondary uppercase tracking-wider w-[90px] whitespace-nowrap">
                      On-Hand
                    </TableHead>
                    <TableHead className="py-3 px-3 text-right font-semibold text-xs text-text-secondary uppercase tracking-wider w-[90px] whitespace-nowrap">
                      Reserved
                    </TableHead>
                    <TableHead className="py-3 px-3 text-right font-semibold text-xs text-text-secondary uppercase tracking-wider w-[110px] whitespace-nowrap">
                      ATS (Avail)
                    </TableHead>
                    <TableHead className="py-3 px-3 text-right font-semibold text-xs text-text-secondary uppercase tracking-wider w-[90px] whitespace-nowrap">
                      Incoming
                    </TableHead>
                    <TableHead className="py-3 px-3 text-right font-semibold text-xs text-text-secondary uppercase tracking-wider w-[95px] whitespace-nowrap">
                      Velocity
                    </TableHead>
                    <TableHead className="py-3 px-3 text-center font-semibold text-xs text-text-secondary uppercase tracking-wider w-[130px] whitespace-nowrap">
                      Status
                    </TableHead>
                    <TableHead className="py-3 px-3 text-right font-semibold text-xs text-text-secondary uppercase tracking-wider w-[85px] whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border-subtle/60">
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-12 text-center text-sm text-text-secondary">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[32px] text-text-secondary/50">inventory_2</span>
                          <span>No inventory items matching your selected criteria.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHub('all');
                              setSelectedCategory('all');
                              setStockHealthFilter('all');
                              setSearchQuery('');
                            }}
                            className="text-xs text-primary-container font-semibold hover:underline mt-1"
                          >
                            Reset filters
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map(item => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <TableRow
                          key={item.id}
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setIsDrawerOpen(true);
                            setTargetHub(item.hub);
                            setTargetBin(item.bin);
                            setAdjustmentDelta(-2);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary-fixed/20 hover:bg-primary-fixed/30 border-l-4 border-l-primary-container'
                              : 'hover:bg-surface-subtle'
                          }`}
                        >
                          {/* SKU & Garment Variant */}
                          <TableCell className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-xs bg-surface-container ring-1 ring-border-subtle">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-text-primary truncate max-w-[190px]">
                                  {item.name}
                                </span>
                                <span className="font-mono text-[11px] text-text-secondary mt-0.5">
                                  {item.sku} • {item.variant}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-text-primary text-[11px] font-medium border border-border-subtle">
                              {item.category}
                            </span>
                          </TableCell>

                          {/* Hub & Bin */}
                          <TableCell className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-text-primary flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-primary-container">location_on</span>
                                {item.hub}
                              </span>
                              <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[13px] text-text-secondary">inventory_2</span>
                                {item.bin}
                              </span>
                            </div>
                          </TableCell>

                          {/* On-Hand */}
                          <TableCell className="py-3 px-3 text-right font-mono font-semibold text-xs text-text-primary whitespace-nowrap">
                            {item.onHand}
                          </TableCell>

                          {/* Reserved */}
                          <TableCell className="py-3 px-3 text-right font-mono text-xs text-text-secondary whitespace-nowrap">
                            {item.reserved}
                          </TableCell>

                          {/* ATS (Avail) */}
                          <TableCell className="py-3 px-3 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                                item.ats <= 10
                                  ? 'bg-status-danger-bg text-status-danger ring-1 ring-status-danger/30'
                                  : 'bg-status-success-bg text-status-success ring-1 ring-status-success/30'
                              }`}
                            >
                              {item.ats}
                            </span>
                          </TableCell>

                          {/* Incoming */}
                          <TableCell className="py-3 px-3 text-right font-mono text-xs text-status-info font-semibold whitespace-nowrap">
                            +{item.incoming}
                          </TableCell>

                          {/* Velocity */}
                          <TableCell className="py-3 px-3 text-right font-mono text-xs text-text-primary whitespace-nowrap">
                            {item.velocity}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3 px-3 text-center whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  setIsDrawerOpen(true);
                                  setTargetHub(item.hub);
                                  setTargetBin(item.bin);
                                }}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary-container hover:bg-surface-subtle transition-all cursor-pointer"
                                title="Quick Adjust"
                              >
                                <span className="material-symbols-outlined text-[17px]">tune</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferData(prev => ({ ...prev, sku: item.sku, fromHub: item.hub }));
                                  setIsTransferModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary-container hover:bg-surface-subtle transition-all cursor-pointer"
                                title="Transfer SKU"
                              >
                                <span className="material-symbols-outlined text-[17px]">sync_alt</span>
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Ledger Summary Bar & Footer */}
            <div className="p-4 bg-surface-subtle/30 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success"></span>
                <span>Ledger Synced: <strong className="text-text-primary">Live Active</strong></span>
                <span>•</span>
                <span>Showing {filteredInventory.length} of {inventoryList.length} SKUs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1 h-7 text-xs">
                  <span className="material-symbols-outlined text-[14px]">file_download</span>
                  Export Ledger CSV
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side Drawer: Quick Stock Adjustment & Bin Audit */}
        {isDrawerOpen && selectedItem && (
          <div className="xl:col-span-4 flex flex-col space-y-4">
            <Card className="border border-border-subtle bg-surface-container-lowest shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-border-subtle flex flex-row items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-primary-fixed text-primary material-symbols-outlined text-[16px]">tune</span>
                    <CardTitle className="text-base font-semibold text-text-primary">Stock Adjustment &amp; Audit</CardTitle>
                  </div>
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">SKU: {selectedItem.sku} ({selectedItem.variant})</p>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusBadge(selectedItem.status)}
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Item Preview Snippet */}
                <div className="p-3 rounded-xl bg-surface-subtle flex items-center gap-3">
                  <div className="w-12 h-14 rounded-lg bg-surface-container overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={selectedItem.image}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="text-xs font-semibold text-text-primary truncate">{selectedItem.name}</div>
                    <div className="text-[11px] text-text-secondary font-mono">EAN: {selectedItem.ean}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-text-secondary">On-Hand: <strong className="text-text-primary">{selectedItem.onHand}</strong></span>
                      <span className="text-border-strong">•</span>
                      <span className="text-[11px] text-text-secondary">ATS: <strong className={selectedItem.ats <= 10 ? 'text-status-danger' : 'text-status-success'}>{selectedItem.ats}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Adjustment Form Inputs */}
                <div className="space-y-3">
                  {/* Hub & Storage Location Target */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary uppercase">Target Hub &amp; Storage Bin</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={targetHub}
                        onChange={(e) => setTargetHub(e.target.value)}
                        className="h-9 text-xs"
                      >
                        <option value="BLR-FC1">BLR-FC1 (Primary)</option>
                        <option value="BOM-FC2">BOM-FC2 (Mumbai)</option>
                        <option value="DEL-FC3">DEL-FC3 (NCR)</option>
                        <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                      </Select>
                      <Input
                        value={targetBin}
                        onChange={(e) => setTargetBin(e.target.value)}
                        className="h-9 text-xs"
                        placeholder="Bin Location"
                      />
                    </div>
                  </div>

                  {/* Reason Code Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary uppercase">Variance Reason Code</label>
                    <Select
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="h-9 text-xs"
                    >
                      <option value="damage">Damaged in QC Inspection (-)</option>
                      <option value="cycle">Cycle Count Physical Variance (+/-)</option>
                      <option value="return">Returned Garment Restock (+)</option>
                      <option value="sample">Marketing / Fashion Sample Pull (-)</option>
                      <option value="shrinkage">Inventory Shrinkage / Theft (-)</option>
                    </Select>
                  </div>

                  {/* Quantity Stepper & Direct Delta */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary uppercase">Adjustment Quantity (Pcs)</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface-subtle rounded-xl p-1 flex-1 justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleAdjustCount(-1)}
                          className="w-8 h-8 font-bold text-base bg-surface-container-lowest hover:bg-surface-subtle"
                        >
                          -
                        </Button>
                        <span className={`font-mono font-semibold text-sm ${
                          adjustmentDelta > 0 ? 'text-status-success' : adjustmentDelta < 0 ? 'text-status-danger' : 'text-text-primary'
                        }`}>
                          {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta} pcs
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleAdjustCount(1)}
                          className="w-8 h-8 font-bold text-base bg-surface-container-lowest hover:bg-surface-subtle"
                        >
                          +
                        </Button>
                      </div>
                      <div className="text-right px-2">
                        <span className="text-[10px] text-text-secondary block">New Physical:</span>
                        <span className="text-xs font-bold text-text-primary">{newPhysicalCalculated} pcs</span>
                      </div>
                    </div>
                  </div>

                  {/* Auditor Memo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary uppercase">Auditor Memo / Barcode Tag</label>
                    <textarea
                      value={auditorMemo}
                      onChange={(e) => setAuditorMemo(e.target.value)}
                      className="w-full p-2.5 bg-surface-subtle rounded-xl text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-container resize-none"
                      rows={2}
                      placeholder="Enter verification notes..."
                    />
                  </div>

                  {/* SLA Alert Banner */}
                  {newPhysicalCalculated < 10 && (
                    <Alert variant="warning" className="p-2.5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[16px] text-status-warning shrink-0 mt-0.5">info</span>
                        <p className="text-[11px] text-status-warning leading-relaxed">
                          Stock level ({newPhysicalCalculated} pcs) triggers reorder threshold for {selectedItem.hub}.
                        </p>
                      </div>
                    </Alert>
                  )}

                  {/* Action CTAs */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleApplyAdjustment}
                      className="flex-1 bg-primary-container text-on-primary hover:bg-primary text-xs font-semibold h-10 gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Confirm Stock Movement
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDrawerOpen(false)}
                      className="text-xs h-10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Mini Audit Trail */}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary uppercase">
                    <span>Recent Ledger Activity</span>
                    <span className="text-primary-container cursor-pointer hover:underline">View Full Trail</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-text-secondary">
                    <div className="flex items-center justify-between py-1 border-b border-border-subtle/50">
                      <span>PO-9912 Arrival (+50 pcs)</span>
                      <span className="font-mono text-[11px]">Yesterday, 18:20</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Cycle Audit Variance (-2 pcs)</span>
                      <span className="font-mono text-[11px]">May 21, 11:04</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Stock Transfer Modal */}
      <Dialog open={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">sync_alt</span>
            <span>Inter-Hub Stock Transfer Manifest</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleConfirmTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Source Origin Hub</label>
                <Select
                  value={transferData.fromHub}
                  onChange={(e) => setTransferData(prev => ({ ...prev, fromHub: e.target.value }))}
                >
                  <option value="BLR-FC1">BLR-FC1 (Bengaluru)</option>
                  <option value="BOM-FC2">BOM-FC2 (Mumbai)</option>
                  <option value="DEL-FC3">DEL-FC3 (Delhi NCR)</option>
                  <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Destination Target Hub</label>
                <Select
                  value={transferData.toHub}
                  onChange={(e) => setTransferData(prev => ({ ...prev, toHub: e.target.value }))}
                >
                  <option value="DEL-FC3">DEL-FC3 (Delhi NCR)</option>
                  <option value="BLR-FC1">BLR-FC1 (Bengaluru)</option>
                  <option value="BOM-FC2">BOM-FC2 (Mumbai)</option>
                  <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Garment SKU</label>
              <Select
                value={transferData.sku}
                onChange={(e) => setTransferData(prev => ({ ...prev, sku: e.target.value }))}
              >
                {inventoryList.map(item => (
                  <option key={item.sku} value={item.sku}>
                    {item.sku} - {item.name} ({item.variant}) • ATS: {item.ats}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Transfer Quantity (Units)</label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={transferData.qty}
                  onChange={(e) => setTransferData(prev => ({ ...prev, qty: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Logistics Carrier Mode</label>
                <Input
                  value={transferData.vehicleNote}
                  onChange={(e) => setTransferData(prev => ({ ...prev, vehicleNote: e.target.value }))}
                  placeholder="e.g. Dedicated Air Freight"
                />
              </div>
            </div>

            <Alert variant="info" className="text-xs">
              E-Way Bill requirement: Inter-state transfers exceeding ₹50,000 threshold will trigger auto-generation of Form GST EWB-01.
            </Alert>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="bg-primary-container text-on-primary hover:bg-primary">
                Dispatch Transfer Manifest
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Goods GRN Modal */}
      <Dialog open={isGrnModalOpen} onClose={() => setIsGrnModalOpen(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">download</span>
            <span>Goods Receipt Note (GRN) Inbound Entry</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleConfirmGrn} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">PO Reference Number</label>
                <Input
                  value={grnData.poRef}
                  onChange={(e) => setGrnData(prev => ({ ...prev, poRef: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Supplier Name</label>
                <Input
                  value={grnData.supplier}
                  onChange={(e) => setGrnData(prev => ({ ...prev, supplier: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Target Receiving Hub</label>
                <Select
                  value={grnData.hub}
                  onChange={(e) => setGrnData(prev => ({ ...prev, hub: e.target.value }))}
                >
                  <option value="BLR-FC1">BLR-FC1 (Bengaluru Hub)</option>
                  <option value="BOM-FC2">BOM-FC2 (Mumbai DC)</option>
                  <option value="DEL-FC3">DEL-FC3 (Delhi NCR)</option>
                  <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Staging Bin</label>
                <Input
                  value={grnData.binLocation}
                  onChange={(e) => setGrnData(prev => ({ ...prev, binLocation: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Target SKU</label>
                <Select
                  value={grnData.sku}
                  onChange={(e) => setGrnData(prev => ({ ...prev, sku: e.target.value }))}
                >
                  {inventoryList.map(item => (
                    <option key={item.sku} value={item.sku}>
                      {item.sku} - {item.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Units Verified &amp; Received</label>
                <Input
                  type="number"
                  min="1"
                  value={grnData.unitsReceived}
                  onChange={(e) => setGrnData(prev => ({ ...prev, unitsReceived: Number(e.target.value) }))}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsGrnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="bg-primary-container text-on-primary hover:bg-primary">
                Book to Active Inventory
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
