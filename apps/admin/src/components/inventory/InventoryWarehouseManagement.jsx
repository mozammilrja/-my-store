import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Input,
  Select,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  Alert,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  FilterBar,
  SearchInput,
  FilterDropdown,
  TablePagination,
  DEFAULT_PAGE_SIZE,
  ErrorState,
  SkeletonPage,
  Thumbnail,
} from '../ui';
import { INITIAL_INVENTORY, INITIAL_INVENTORY_METRICS, HUBS } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { useProductsQuery, useInventoryQuery, useAdjustInventoryMutation } from '../../hooks/useAdminQueries';

export default function InventoryWarehouseManagement({ currentHub, onShowToast }) {
  const [inventoryList, setInventoryList] = useState(INITIAL_INVENTORY);
  const [selectedHub, setSelectedHub] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockHealthFilter, setStockHealthFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TanStack Query for direct inventory telemetry and adjustment mutation
  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventoryQuery();
  const { data: productsData, isLoading: isProductsLoading } = useProductsQuery({ limit: 50 });
  const adjustInventoryMutation = useAdjustInventoryMutation();

  // Populate stock allocations from real backend inventory telemetry
  useEffect(() => {
    if (inventoryData?.inventory?.length > 0) {
      const liveItems = inventoryData.inventory.map((inv, idx) => {
        const stock = inv.stock ?? 25;
        const reserved = inv.allocated ?? Math.min(stock, Math.floor(stock * 0.15));
        const ats = Math.max(0, stock - reserved);
        return {
          id: `live-inv-${inv.productId}-${inv.id || idx}`,
          productId: inv.productId,
          variantId: inv.id,
          name: inv.productTitle,
          sku: inv.sku,
          variant: inv.variantTitle || 'Standard',
          ean: `89044${Math.floor(1000000 + Math.random() * 9000000)}`,
          category: 'Apparel & Couture',
          hub: inv.hubId || 'BLR-FC1',
          bin: `Aisle ${(idx % 5) + 1} / Bin ${(idx % 12) + 1}`,
          onHand: stock,
          reserved,
          ats,
          safety: inv.reorderPoint || 10,
          status: stock === 0 ? 'Depleted' : ats < (inv.reorderPoint || 10) ? 'Critical Low-Stock' : stock > 100 ? 'Overstocked' : 'Healthy',
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=200',
        };
      });
      setInventoryList(prev => [...liveItems, ...prev.filter(m => !liveItems.some(l => l.sku === m.sku))]);
    } else if (productsData?.products?.length > 0) {
      const liveItems = [];
      productsData.products.forEach(p => {
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
  }, [inventoryData, productsData]);

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

    if (selectedItem.productId && selectedItem.variantId && adjustmentDelta !== 0) {
      adjustInventoryMutation.mutateAsync({
        productId: selectedItem.productId,
        variantId: selectedItem.variantId,
        adjustment: adjustmentDelta,
        reason: adjustmentReason,
      }).catch(err => console.warn('Could not persist inventory adjustment:', err));
    }

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

  useEffect(() => {
    setPage(1);
  }, [filteredInventory.length]);

  const pagedInventory = useMemo(
    () => filteredInventory.slice((page - 1) * pageSize, page * pageSize),
    [filteredInventory, page, pageSize]
  );

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
    return <StatusBadge status={status} />;
  };

  const newPhysicalCalculated = selectedItem ? Math.max(0, selectedItem.onHand + adjustmentDelta) : 0;

  if (isInventoryLoading || isProductsLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={8} label="Loading inventory" />;
  }

  return (
    <PageContainer>
      {inventoryError && (
        <ErrorState
          title="Inventory could not be loaded"
          message={inventoryError?.message}
          onRetry={() => refetchInventory()}
        />
      )}
      {/* Top Breadcrumb & Title Section */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Catalog & Inventory', 'Inventory & Warehouses']}
        title="Omnichannel Inventory & Multi-Node Warehousing"
        badge="4 Nodes Active"
        badgeVariant="success"
        description="Real-time stock ledger, multi-hub allocation (BLR-FC1, BOM-FC2, DEL-FC3, CCU-FC4), reserved buffer holds, and automated replenishment alerts."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              className="gap-1.5"
            >
              <Icon name="sync_alt" className="material-symbols-outlined text-icon text-muted" />
              <span>Stock Transfer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast && onShowToast('Cycle count audit scheduled for BLR-FC1 aisle C-12.')}
              className="gap-1.5"
            >
              <Icon name="fact_check" className="material-symbols-outlined text-icon text-muted" />
              <span>Reconcile Count</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGrnModalOpen(true)}
              className="gap-1.5"
            >
              <Icon name="download" className="material-symbols-outlined text-icon text-muted" />
              <span>Receive Goods (GRN)</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDrawerOpen(prev => !prev)}
              className="gap-1.5 bg-primary-container text-on-accent hover:bg-primary-container-hover shadow-sm"
            >
              <Icon name="add_circle" className="material-symbols-outlined text-icon-md" />
              <span>{isDrawerOpen ? 'Close Adjustment' : '+ Stock Adjustment'}</span>
            </Button>
          </>
        }
      />

      {/* KPI Metrics Grid */}
      <ContentGrid columns={6}>
        <StatsCard
          title="Total SKUs"
          value={INITIAL_INVENTORY_METRICS.totalSkus}
          icon="qr_code_2"
          trend={INITIAL_INVENTORY_METRICS.totalSkusGrowth}
          trendType="up"
        />
        <StatsCard
          title="On-Hand Physical"
          value={`${INITIAL_INVENTORY_METRICS.onHandPhysical.split(' ')[0]} pcs`}
          icon="inventory_2"
          trendLabel={`Valuation: ${INITIAL_INVENTORY_METRICS.valuation}`}
        />
        <StatsCard
          title="Available-to-Sell"
          value={`${INITIAL_INVENTORY_METRICS.ats.split(' ')[0]} pcs`}
          icon="storefront"
          iconColor="text-success"
          trendLabel={INITIAL_INVENTORY_METRICS.atsNote}
        />
        <StatsCard
          title="Reserved / Staged"
          value={`${INITIAL_INVENTORY_METRICS.reserved.split(' ')[0]} pcs`}
          icon="lock_clock"
          iconColor="text-info"
          trendLabel={INITIAL_INVENTORY_METRICS.reservedNote}
        />
        <StatsCard
          title="Critical Low-Stock"
          value={INITIAL_INVENTORY_METRICS.criticalLow}
          icon="warning"
          iconColor="text-danger"
          badge="Critical"
          badgeVariant="destructive"
          trendLabel={INITIAL_INVENTORY_METRICS.criticalNote}
        />
        <StatsCard
          title="Cycle Accuracy"
          value={INITIAL_INVENTORY_METRICS.cycleAccuracy}
          icon="verified"
          iconColor="text-success"
          trendLabel={INITIAL_INVENTORY_METRICS.accuracyNote}
        />
      </ContentGrid>

      {/* Operational Filter & Control Bar */}
      <FilterBar
        tabs={[
          { id: 'all', label: 'ALL' },
          { id: 'critical', label: 'CRITICAL (<10)' },
          { id: 'healthy', label: 'HEALTHY' },
          { id: 'overstocked', label: 'OVERSTOCKED (>1000)' },
          { id: 'depleted', label: 'DEPLETED (0)' }
        ]}
        activeTab={stockHealthFilter}
        onTabChange={setStockHealthFilter}
        search={
          <SearchInput
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            onClear={() => setSearchQuery('')}
            placeholder="Filter SKU, EAN, Bin..."
            className="w-full sm:w-64"
          />
        }
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={selectedHub}
              onChange={setSelectedHub}
              options={[
                { value: 'all', label: 'All Warehouses & Hubs' },
                { value: 'BLR-FC1', label: 'BLR-FC1 • Bengaluru Primary' },
                { value: 'BOM-FC2', label: 'BOM-FC2 • Mumbai Western DC' },
                { value: 'DEL-FC3', label: 'DEL-FC3 • Delhi NCR Hub' },
                { value: 'CCU-FC4', label: 'CCU-FC4 • Kolkata East Regional' },
              ]}
            />
            <FilterDropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'dresses', label: 'Dresses' },
                { value: "men's denim", label: "Men's Denim" },
                { value: 'ethnic kurti', label: 'Ethnic Kurti' },
                { value: 'activewear', label: 'Activewear' },
              ]}
            />
          </div>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1 h-8.5"
            title="Export CSV"
            type="button"
          >
            <Icon name="file_download" className="material-symbols-outlined text-icon" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      {/* Primary Two-Column Workbench (Main Table + Stock Adjustment Drawer) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Inventory Data Table */}
        <div className={`${isDrawerOpen ? 'xl:col-span-8' : 'xl:col-span-12'} flex flex-col transition-all duration-300`}>
          <Card className="border border-subtle bg-surface-container-lowest overflow-hidden">
            <CardHeader className="p-4 bg-surface-subtle/50 border-b border-subtle flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-body font-semibold text-primary">Live Inventory Ledger</CardTitle>
                <Badge variant="secondary" className="text-micro">
                  {filteredInventory.length} SKUs Listed
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-meta text-muted">
                <span>Sorted by: <strong className="text-primary">Stock Health (Ascending)</strong></span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[1020px] w-full border-collapse">
                <TableHeader sticky>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[260px] whitespace-nowrap">
                      SKU &amp; Garment Variant
                    </TableHead>
                    <TableHead className="w-[120px] whitespace-nowrap">
                      Category
                    </TableHead>
                    <TableHead className="w-[140px] whitespace-nowrap">
                      Hub &amp; Bin
                    </TableHead>
                    <TableHead className="text-right w-[90px] whitespace-nowrap">
                      On-Hand
                    </TableHead>
                    <TableHead className="text-right w-[90px] whitespace-nowrap">
                      Reserved
                    </TableHead>
                    <TableHead className="text-right w-[110px] whitespace-nowrap">
                      ATS (Avail)
                    </TableHead>
                    <TableHead className="text-right w-[90px] whitespace-nowrap">
                      Incoming
                    </TableHead>
                    <TableHead className="text-right w-[95px] whitespace-nowrap">
                      Velocity
                    </TableHead>
                    <TableHead className="text-center w-[130px] whitespace-nowrap">
                      Status
                    </TableHead>
                    <TableHead className="text-right w-[85px] whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border-subtle/60">
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-12 text-center text-body text-secondary">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Icon name="inventory_2" className="material-symbols-outlined text-icon-2xl text-muted/50" />
                          <span>No inventory items matching your selected criteria.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHub('all');
                              setSelectedCategory('all');
                              setStockHealthFilter('all');
                              setSearchQuery('');
                            }}
                            className="text-meta text-accent font-semibold hover:underline mt-1"
                          >
                            Reset filters
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedInventory.map(item => {
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
                                <Thumbnail src={item.image} alt={item.name} className="w-full h-full" imgClassName="object-cover" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-meta font-semibold text-primary truncate max-w-[190px]">
                                  {item.name}
                                </span>
                                <span className="font-mono text-micro text-muted mt-0.5 whitespace-nowrap">
                                  {item.sku} • {item.variant}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-surface-subtle text-primary text-micro border border-subtle">
                              {item.category}
                            </span>
                          </TableCell>

                          {/* Hub & Bin */}
                          <TableCell className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col min-w-0">
                              <span className="text-meta font-semibold text-primary flex items-center gap-1">
                                <Icon name="location_on" className="material-symbols-outlined text-icon-sm text-accent" />
                                {item.hub}
                              </span>
                              <span className="text-micro text-muted flex items-center gap-1 mt-0.5">
                                <Icon name="inventory_2" className="material-symbols-outlined text-icon-sm text-muted" />
                                {item.bin}
                              </span>
                            </div>
                          </TableCell>

                          {/* On-Hand */}
                          <TableCell className="py-3 px-3 text-right font-mono font-semibold text-meta text-primary whitespace-nowrap">
                            {item.onHand}
                          </TableCell>

                          {/* Reserved */}
                          <TableCell className="py-3 px-3 text-right font-mono text-meta text-muted whitespace-nowrap">
                            {item.reserved}
                          </TableCell>

                          {/* ATS (Avail) */}
                          <TableCell className="py-3 px-3 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-semibold text-meta ${
 item.ats <= 10
 ? 'bg-status-danger-bg text-danger ring-1 ring-status-danger/30'
 : 'bg-status-success-bg text-success ring-1 ring-status-success/30'
 }`}
                            >
                              {item.ats}
                            </span>
                          </TableCell>

                          {/* Incoming */}
                          <TableCell className="py-3 px-3 text-right font-mono text-meta text-info font-semibold whitespace-nowrap">
                            +{item.incoming}
                          </TableCell>

                          {/* Velocity */}
                          <TableCell className="py-3 px-3 text-right font-mono text-meta text-primary whitespace-nowrap">
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
                                className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-subtle transition-all cursor-pointer"
                                title="Quick Adjust"
                              >
                                <Icon name="tune" className="material-symbols-outlined text-icon" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferData(prev => ({ ...prev, sku: item.sku, fromHub: item.hub }));
                                  setIsTransferModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-subtle transition-all cursor-pointer"
                                title="Transfer SKU"
                              >
                                <Icon name="sync_alt" className="material-symbols-outlined text-icon" />
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

            <TablePagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={filteredInventory.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />

            {/* Ledger Summary Bar & Footer */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-subtle bg-surface-subtle px-space-md py-space-sm text-meta text-muted sm:flex-row">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-success" />
                <span>Ledger synced: <strong className="text-primary">live</strong></span>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-text-faint" />
                <span className="tabular-nums">
                  {filteredInventory.length} of {inventoryList.length} SKUs match
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Icon name="file_download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                Export ledger CSV
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side Drawer: Quick Stock Adjustment & Bin Audit */}
        {isDrawerOpen && selectedItem && (
          <div className="xl:col-span-4 flex flex-col space-y-4">
            <Card className="border border-subtle bg-surface-container-lowest shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-subtle flex flex-row items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon name="tune" className="p-1 rounded-md bg-primary-fixed text-on-primary-fixed material-symbols-outlined text-icon" />
                    <CardTitle className="text-heading font-semibold text-primary">Stock Adjustment &amp; Audit</CardTitle>
                  </div>
                  <p className="text-caption text-muted uppercase">SKU: {selectedItem.sku} ({selectedItem.variant})</p>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusBadge(selectedItem.status)}
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 text-muted hover:text-primary rounded-lg transition-colors" title="Close" aria-label="Close"
                  >
                    <Icon name="close" className="material-symbols-outlined text-icon-md" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Item Preview Snippet */}
                <div className="p-3 rounded-xl bg-surface-subtle flex items-center gap-3">
                  <div className="w-12 h-14 rounded-lg bg-surface-container overflow-hidden shrink-0 shadow-sm">
                    <Thumbnail src={selectedItem.image} alt={selectedItem.name} className="w-full h-full" imgClassName="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="text-meta font-semibold text-primary truncate">{selectedItem.name}</div>
                    <div className="text-micro text-muted font-mono whitespace-nowrap">EAN: {selectedItem.ean}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-micro text-muted">On-Hand: <strong className="text-primary">{selectedItem.onHand}</strong></span>
                      <span className="text-faint">•</span>
                      <span className="text-micro text-muted">ATS: <strong className={selectedItem.ats <= 10 ? 'text-danger' : 'text-success'}>{selectedItem.ats}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Adjustment Form Inputs */}
                <div className="space-y-3">
                  {/* Hub & Storage Location Target */}
                  <div className="space-y-1">
                    <label className="text-caption text-muted uppercase">Target Hub &amp; Storage Bin</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={targetHub}
                        onChange={(e) => setTargetHub(e.target.value)}
                        className="h-9 text-meta"
                      >
                        <option value="BLR-FC1">BLR-FC1 (Primary)</option>
                        <option value="BOM-FC2">BOM-FC2 (Mumbai)</option>
                        <option value="DEL-FC3">DEL-FC3 (NCR)</option>
                        <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                      </Select>
                      <Input
                        value={targetBin}
                        onChange={(e) => setTargetBin(e.target.value)}
                        className="h-9 text-meta"
                        placeholder="Bin Location"
                      />
                    </div>
                  </div>

                  {/* Reason Code Selector */}
                  <div className="space-y-1">
                    <label className="text-caption text-muted uppercase">Variance Reason Code</label>
                    <Select
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="h-9 text-meta"
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
                    <label className="text-caption text-muted uppercase">Adjustment Quantity (Pcs)</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface-subtle rounded-xl p-1 flex-1 justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleAdjustCount(-1)}
                          className="w-8 h-8 font-semibold text-heading bg-surface-container-lowest hover:bg-surface-subtle"
                        >
                          -
                        </Button>
                        <span className={`font-mono font-semibold text-body ${
 adjustmentDelta > 0 ? 'text-success' : adjustmentDelta < 0 ? 'text-danger' : 'text-primary'
 }`}>
                          {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta} pcs
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleAdjustCount(1)}
                          className="w-8 h-8 font-semibold text-heading bg-surface-container-lowest hover:bg-surface-subtle"
                        >
                          +
                        </Button>
                      </div>
                      <div className="text-right px-2">
                        <span className="text-micro text-muted block">New Physical:</span>
                        <span className="text-meta font-semibold text-primary">{newPhysicalCalculated} pcs</span>
                      </div>
                    </div>
                  </div>

                  {/* Auditor Memo */}
                  <div className="space-y-1">
                    <label className="text-caption text-muted uppercase">Auditor Memo / Barcode Tag</label>
                    <textarea
                      value={auditorMemo}
                      onChange={(e) => setAuditorMemo(e.target.value)}
                      className="w-full p-2.5 bg-surface-subtle rounded-xl text-meta text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary-container resize-none"
                      rows={2}
                      placeholder="Enter verification notes..."
                    />
                  </div>

                  {/* SLA Alert Banner */}
                  {newPhysicalCalculated < 10 && (
                    <Alert variant="warning" className="p-2.5 text-meta">
                      <div className="flex items-start gap-2">
                        <Icon name="info" className="material-symbols-outlined text-icon text-warning shrink-0 mt-0.5" />
                        <p className="text-micro text-warning leading-relaxed">
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
                      className="flex-1 bg-primary-container text-on-accent hover:bg-primary-container-hover text-meta font-semibold h-10 gap-1.5"
                    >
                      <Icon name="check_circle" className="material-symbols-outlined text-icon" />
                      Confirm Stock Movement
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDrawerOpen(false)}
                      className="text-meta h-10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Mini Audit Trail */}
                <div className="pt-2 border-t border-subtle space-y-2">
                  <div className="flex items-center justify-between text-caption text-muted uppercase">
                    <span>Recent Ledger Activity</span>
                    <span className="text-accent cursor-pointer hover:underline">View Full Trail</span>
                  </div>
                  <div className="space-y-1.5 text-meta text-muted">
                    <div className="flex items-center justify-between py-1 border-b border-subtle/50">
                      <span>PO-9912 Arrival (+50 pcs)</span>
                      <span className="font-mono text-micro whitespace-nowrap">Yesterday, 18:20</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Cycle Audit Variance (-2 pcs)</span>
                      <span className="font-mono text-micro whitespace-nowrap">May 21, 11:04</span>
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
            <Icon name="sync_alt" className="material-symbols-outlined text-accent" />
            <span>Inter-Hub Stock Transfer Manifest</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleConfirmTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-meta font-medium text-muted">Source Origin Hub</label>
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
                <label className="text-meta font-medium text-muted">Destination Target Hub</label>
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
              <label className="text-meta font-medium text-muted">Garment SKU</label>
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
                <label className="text-meta font-medium text-muted">Transfer Quantity (Units)</label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={transferData.qty}
                  onChange={(e) => setTransferData(prev => ({ ...prev, qty: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-meta font-medium text-muted">Logistics Carrier Mode</label>
                <Input
                  value={transferData.vehicleNote}
                  onChange={(e) => setTransferData(prev => ({ ...prev, vehicleNote: e.target.value }))}
                  placeholder="e.g. Dedicated Air Freight"
                />
              </div>
            </div>

            <Alert variant="info" className="text-meta">
              E-Way Bill requirement: Inter-state transfers exceeding ₹50,000 threshold will trigger auto-generation of Form GST EWB-01.
            </Alert>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="bg-primary-container text-on-accent hover:bg-primary-container-hover">
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
            <Icon name="download" className="material-symbols-outlined text-accent" />
            <span>Goods Receipt Note (GRN) Inbound Entry</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleConfirmGrn} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-meta font-medium text-muted">PO Reference Number</label>
                <Input
                  value={grnData.poRef}
                  onChange={(e) => setGrnData(prev => ({ ...prev, poRef: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-meta font-medium text-muted">Supplier Name</label>
                <Input
                  value={grnData.supplier}
                  onChange={(e) => setGrnData(prev => ({ ...prev, supplier: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-meta font-medium text-muted">Target Receiving Hub</label>
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
                <label className="text-meta font-medium text-muted">Staging Bin</label>
                <Input
                  value={grnData.binLocation}
                  onChange={(e) => setGrnData(prev => ({ ...prev, binLocation: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-meta font-medium text-muted">Target SKU</label>
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
                <label className="text-meta font-medium text-muted">Units Verified &amp; Received</label>
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
              <Button type="submit" variant="default" className="bg-primary-container text-on-accent hover:bg-primary-container-hover">
                Book to Active Inventory
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
