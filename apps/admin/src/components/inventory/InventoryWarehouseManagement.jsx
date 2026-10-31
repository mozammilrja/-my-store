import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Icon,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
  DialogBody,
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
import { useInventoryQuery, useAdjustInventoryMutation } from '../../hooks/useAdminQueries';

/** Matches the API's own default when the store has never saved a setting. */
const DEFAULT_LOW_STOCK = 5;

const UNCATEGORISED = '__none__';

/** The four states a variant can be in, from what the variant carries. */
const stockStatus = (stock, tracked, threshold) => {
  if (!tracked) return 'Not tracked';
  if (stock === 0) return 'Out of stock';
  if (stock <= threshold) return 'Low stock';
  return 'In stock';
};

/** Which status tab a row belongs to. */
const STATUS_TAB = {
  'In stock': 'in',
  'Low stock': 'low',
  'Out of stock': 'out',
  'Not tracked': 'untracked',
};

/** Worst first, which is the order a stock controller wants to work in. */
const STATUS_RANK = {
  'Out of stock': 0,
  'Low stock': 1,
  'In stock': 2,
  'Not tracked': 3,
};

const SORT_COLUMNS = {
  name: { label: 'SKU & variant', compare: (a, b) => a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku) },
  category: {
    label: 'Category',
    compare: (a, b) => (a.category ?? '\uffff').localeCompare(b.category ?? '\uffff'),
  },
  onHand: { label: 'On hand', compare: (a, b) => a.onHand - b.onHand },
  status: { label: 'Stock health', compare: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] },
};

/** Quotes a CSV field, doubling any quote inside it. */
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/**
 * A column heading that sorts. The arrow shows the direction of the column in
 * force; the others only show theirs on hover, so the active one is obvious.
 */
function SortableHead({ column, label, sort, onSort, className, align = 'left' }) {
  const isActive = sort.key === column;
  const direction = isActive ? sort.dir : 'asc';
  return (
    <TableHead
      className={className}
      aria-sort={isActive ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group flex w-full items-center gap-1 whitespace-nowrap uppercase transition-colors hover:text-primary ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        } ${isActive ? 'text-primary' : 'text-secondary'}`}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <Icon
          name={direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          aria-hidden="true"
          className={`material-symbols-outlined text-icon-sm transition-opacity ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
          }`}
        />
      </button>
    </TableHead>
  );
}

export default function InventoryWarehouseManagement({ currentHub, onShowToast }) {
  const [inventoryList, setInventoryList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockHealthFilter, setStockHealthFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState({ key: 'status', dir: 'asc' });

  // TanStack Query for direct inventory telemetry and adjustment mutation
  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventoryQuery();
  const adjustInventoryMutation = useAdjustInventoryMutation();

  /** The store's own low stock mark, so the ledger agrees with the dashboard. */
  const lowStockThreshold = inventoryData?.lowStockThreshold ?? DEFAULT_LOW_STOCK;

  // Populate stock allocations from real backend inventory telemetry
  useEffect(() => {
    if (!inventoryData?.inventory) return;
    // Only what a variant actually carries, plus the product's categories and
    // thumbnail. Reserved stock, available-to-sell, EAN, bin location and
    // reorder point were all invented here: the EAN was re-randomised on every
    // render, and "reserved" was a flat 15% of whatever the stock happened to
    // be. The columns that showed them are gone rather than blank.
    const liveItems = inventoryData.inventory.map((inv, idx) => {
      const stock = inv.stock ?? 0;
      const tracked = inv.manageInventory !== false;
      return {
        id: `live-inv-${inv.productId}-${inv.id || idx}`,
        productId: inv.productId,
        variantId: inv.id,
        name: inv.productTitle,
        handle: inv.productHandle,
        sku: inv.sku,
        variant: inv.variantTitle || 'Standard',
        options: inv.options ?? {},
        categories: inv.categories ?? [],
        category: inv.categories?.[0] ?? null,
        image: inv.thumbnail ?? null,
        onHand: stock,
        tracked,
        allowBackorder: inv.allowBackorder ?? false,
        status: stockStatus(stock, tracked, inventoryData.lowStockThreshold ?? DEFAULT_LOW_STOCK),
      };
    });
    setInventoryList(liveItems);
  }, [inventoryData]);

  /** Stock totals, counted from the variants on hand. */
  const stockTotals = useMemo(() => {
    const tracked = inventoryList.filter((i) => i.tracked);
    return {
      tracked: tracked.length,
      untracked: inventoryList.length - tracked.length,
      units: tracked.reduce((n, i) => n + (i.onHand ?? 0), 0),
      low: tracked.filter((i) => i.onHand > 0 && i.onHand <= lowStockThreshold).length,
      out: tracked.filter((i) => i.onHand === 0).length,
      backorder: tracked.filter((i) => i.onHand === 0 && i.allowBackorder).length,
    };
  }, [inventoryList, lowStockThreshold]);

  /** Every category the listed variants actually belong to. */
  const categoryOptions = useMemo(() => {
    const names = new Set();
    let uncategorised = false;
    for (const item of inventoryList) {
      if (item.categories.length === 0) uncategorised = true;
      for (const name of item.categories) names.add(name);
    }
    return [
      { value: 'all', label: 'All categories' },
      ...[...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name })),
      ...(uncategorised ? [{ value: UNCATEGORISED, label: 'Uncategorised' }] : []),
    ];
  }, [inventoryList]);

  /** How many variants each status tab would show. */
  const statusCounts = useMemo(() => {
    const counts = { all: inventoryList.length, in: 0, low: 0, out: 0, untracked: 0 };
    for (const item of inventoryList) counts[STATUS_TAB[item.status]] += 1;
    return counts;
  }, [inventoryList]);

  // Selected SKU for right adjustment drawer
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  
  // Stock Adjustment Form State
  const [adjustmentDelta, setAdjustmentDelta] = useState(-4);
  const [adjustmentReason, setAdjustmentReason] = useState('damage');
  const [auditorMemo, setAuditorMemo] = useState('');

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

  /**
   * The SKU pickers list every variant in the ledger, which is hundreds of
   * rows: the Select shows a filter box of its own once a list is this long.
   */
  const skuOptions = useMemo(
    () =>
      inventoryList.map((item) => ({
        value: item.sku,
        label: `${item.sku} - ${item.name} (${item.variant}) - ${item.tracked ? `${item.onHand} on hand` : 'not tracked'}`,
      })),
    [inventoryList]
  );

  const selectedItem = useMemo(() => {
    return inventoryList.find(item => item.id === selectedItemId) || inventoryList[0];
  }, [inventoryList, selectedItemId]);

  // Filtered Inventory
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /**
   * The filters all read fields the row actually has. They used to test
   * `item.hub`, `item.ean` and `item.bin`, none of which the API returns:
   * every hub choice emptied the table and typing in the search box threw on
   * the first keystroke.
   */
  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = inventoryList.filter(item => {
      if (selectedCategory === UNCATEGORISED) {
        if (item.categories.length > 0) return false;
      } else if (selectedCategory !== 'all' && !item.categories.includes(selectedCategory)) {
        return false;
      }
      if (stockHealthFilter !== 'all' && STATUS_TAB[item.status] !== stockHealthFilter) return false;
      if (q) {
        const haystack = [
          item.sku,
          item.name,
          item.variant,
          ...item.categories,
          ...Object.values(item.options ?? {}),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const compare = SORT_COLUMNS[sort.key]?.compare ?? SORT_COLUMNS.status.compare;
    const direction = sort.dir === 'desc' ? -1 : 1;
    // Sorted on a copy: filter() already made one, but a tie has to settle on
    // something stable, so SKU breaks it.
    return filtered.sort((a, b) => compare(a, b) * direction || a.sku.localeCompare(b.sku));
  }, [inventoryList, selectedCategory, stockHealthFilter, searchQuery, sort]);

  /** A new column sorts ascending; the column in force flips direction. */
  const handleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  const drawerRef = useRef(null);

  /**
   * Row click and the row's adjust button both land here. The button also
   * pulls the panel into view and focuses it: with the drawer already open on
   * the row you clicked, selecting it again changed nothing on screen and the
   * button read as dead.
   */
  const openAdjustment = useCallback((item, { focus = false } = {}) => {
    setSelectedItemId(item.id);
    setIsDrawerOpen(true);
    setAdjustmentDelta(0);
    if (!focus) return;
    window.setTimeout(() => {
      const panel = drawerRef.current;
      if (!panel) return;
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      panel.focus({ preventScroll: true });
    }, 0);
  }, []);

  const handleAdjustCount = (diff) => {
    setAdjustmentDelta(prev => prev + diff);
  };

  const handleApplyAdjustment = () => {
    if (!selectedItem) return;
    const newPhysical = Math.max(0, selectedItem.onHand + adjustmentDelta);

    setInventoryList(prev => prev.map(item => (
      item.id === selectedItem.id
        ? {
            ...item,
            onHand: newPhysical,
            status: stockStatus(newPhysical, item.tracked, lowStockThreshold),
          }
        : item
    )));

    if (selectedItem.productId && selectedItem.variantId && adjustmentDelta !== 0) {
      adjustInventoryMutation.mutateAsync({
        productId: selectedItem.productId,
        variantId: selectedItem.variantId,
        adjustment: adjustmentDelta,
        reason: adjustmentReason,
      }).catch(err => console.warn('Could not persist inventory adjustment:', err));
    }

    if (onShowToast) {
      onShowToast(`Stock adjusted for ${selectedItem.sku}: ${adjustmentDelta >= 0 ? '+' : ''}${adjustmentDelta} pcs. Now ${newPhysical} on hand.`);
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
    const received = Number(grnData.unitsReceived) || 0;
    setInventoryList(prev => prev.map(item => (
      item.sku === grnData.sku
        ? {
            ...item,
            onHand: item.onHand + received,
            status: stockStatus(item.onHand + received, item.tracked, lowStockThreshold),
          }
        : item
    )));
    setIsGrnModalOpen(false);
    if (onShowToast) {
      onShowToast(`GRN Goods Receipt: +${grnData.unitsReceived} pcs booked into ${grnData.hub} (${grnData.poRef})`);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, stockHealthFilter, searchQuery]);

  const pagedInventory = useMemo(
    () => filteredInventory.slice((page - 1) * pageSize, page * pageSize),
    [filteredInventory, page, pageSize]
  );

  const handleExportCsv = () => {
    const headers = ['SKU', 'Garment Name', 'Variant', 'Categories', 'On-Hand', 'Tracking', 'Backorder', 'Status'];
    const rows = filteredInventory.map(item => [
      csvCell(item.sku),
      csvCell(item.name),
      csvCell(item.variant),
      csvCell(item.categories.join(' / ')),
      item.tracked ? item.onHand : '',
      item.tracked ? 'Tracked' : 'Not tracked',
      item.allowBackorder ? 'Allowed' : 'No',
      csvCell(item.status),
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

  if (isInventoryLoading) {
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
        title="Inventory & warehouses"
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

      {/* Counted from the variants the API returned. Valuation, available to
          sell, reserved stock and cycle accuracy are not derivable from what a
          variant carries, so they are no longer claimed. */}
      <ContentGrid columns={4}>
        <StatsCard
          title="Tracked SKUs"
          value={stockTotals.tracked}
          icon="qr_code_2"
          subtitle={`${stockTotals.untracked} not tracked`}
        />
        <StatsCard
          title="Units on hand"
          value={stockTotals.units.toLocaleString('en-IN')}
          icon="inventory_2"
          subtitle="Across tracked variants"
        />
        <StatsCard
          title="Low stock"
          value={stockTotals.low}
          icon="warning"
          iconColor="text-warning"
          subtitle={`${lowStockThreshold} units or fewer`}
        />
        <StatsCard
          title="Out of stock"
          value={stockTotals.out}
          icon="production_quantity_limits"
          iconColor="text-danger"
          subtitle={`${stockTotals.backorder} allow backorder`}
        />
      </ContentGrid>

      {/* Operational Filter & Control Bar */}
      <FilterBar
        tabs={[
          { id: 'all', label: 'ALL', count: statusCounts.all },
          { id: 'out', label: 'OUT OF STOCK', count: statusCounts.out },
          { id: 'low', label: `LOW (<=${lowStockThreshold})`, count: statusCounts.low },
          { id: 'in', label: 'IN STOCK', count: statusCounts.in },
          { id: 'untracked', label: 'NOT TRACKED', count: statusCounts.untracked },
        ]}
        activeTab={stockHealthFilter}
        onTabChange={setStockHealthFilter}
        search={
          <SearchInput
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            onClear={() => setSearchQuery('')}
            placeholder="Filter SKU, garment, category..."
            className="w-full sm:w-64"
          />
        }
        filters={
          /* The warehouse filter that stood here listed four hubs the data has
             no field for, so every choice but "all" emptied the table. The
             categories below are the ones the listed products are really in. */
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              label="Category"
              options={categoryOptions}
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
                <span>
                  Sorted by:{' '}
                  <strong className="text-primary">
                    {SORT_COLUMNS[sort.key].label} ({sort.dir === 'asc' ? 'ascending' : 'descending'})
                  </strong>
                </span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto scrollbar-thin">
              {/* Fixed layout: the columns then keep the widths below and a
                  long garment title truncates instead of shouldering the
                  actions off the right edge of the panel. */}
              <Table className="w-full min-w-[760px] table-fixed border-collapse">
                <TableHeader sticky>
                  <TableRow className="hover:bg-transparent">
                    <SortableHead
                      column="name"
                      label="SKU & garment variant"
                      sort={sort}
                      onSort={handleSort}
                      className="w-[36%]"
                    />
                    <SortableHead
                      column="category"
                      label="Category"
                      sort={sort}
                      onSort={handleSort}
                      className="w-[16%]"
                    />
                    <SortableHead
                      column="onHand"
                      label="On hand"
                      sort={sort}
                      onSort={handleSort}
                      align="right"
                      className="w-[11%]"
                    />
                    <TableHead className="w-[14%] whitespace-nowrap text-center">
                      Tracking
                    </TableHead>
                    <SortableHead
                      column="status"
                      label="Status"
                      sort={sort}
                      onSort={handleSort}
                      align="center"
                      className="w-[14%]"
                    />
                    <TableHead className="w-[9%] whitespace-nowrap text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border-subtle/60">
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-body text-secondary">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Icon name="inventory_2" className="material-symbols-outlined text-icon-2xl text-muted/50" />
                          <span>No inventory items matching your selected criteria.</span>
                          <button
                            type="button"
                            onClick={() => {
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
                          onClick={() => openAdjustment(item)}
                          className={`cursor-pointer transition-colors ${
 isSelected
 ? 'bg-primary-fixed/20 hover:bg-primary-fixed/30 border-l-4 border-l-primary-container'
 : 'hover:bg-surface-subtle'
 }`}
                        >
                          {/* SKU & Garment Variant */}
                          <TableCell className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <Thumbnail
                                src={item.image}
                                alt={item.name}
                                className="h-11 w-11 rounded-lg shadow-xs"
                              />
                              <div className="flex min-w-0 flex-col">
                                <span className="truncate text-meta font-semibold text-primary" title={item.name}>
                                  {item.name}
                                </span>
                                <span
                                  className="mt-0.5 truncate font-mono text-micro text-muted"
                                  title={`${item.sku} - ${item.variant}`}
                                >
                                  {item.sku} • {item.variant}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell className="px-3 py-3 text-meta text-secondary">
                            {item.categories.length > 0 ? (
                              <span className="block truncate" title={item.categories.join(', ')}>
                                {item.categories[0]}
                                {item.categories.length > 1 && (
                                  <span className="text-muted"> +{item.categories.length - 1}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-faint">Uncategorised</span>
                            )}
                          </TableCell>

                          {/* On-Hand */}
                          <TableCell className="whitespace-nowrap px-3 py-3 text-right font-mono text-meta font-semibold text-primary">
                            {item.tracked ? item.onHand.toLocaleString('en-IN') : '—'}
                          </TableCell>

                          <TableCell className="whitespace-nowrap px-3 py-3 text-center text-meta text-muted">
                            {item.tracked
                              ? item.allowBackorder
                                ? 'Backorder allowed'
                                : 'Tracked'
                              : 'Not tracked'}
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
                                onClick={() => openAdjustment(item, { focus: true })}
                                className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-subtle transition-all cursor-pointer"
                                title={`Adjust stock for ${item.sku}`}
                                aria-label={`Adjust stock for ${item.sku}`}
                              >
                                <Icon name="tune" className="material-symbols-outlined text-icon" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferData(prev => ({ ...prev, sku: item.sku }));
                                  setIsTransferModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-subtle transition-all cursor-pointer"
                                title={`Transfer ${item.sku} to another hub`}
                                aria-label={`Transfer ${item.sku} to another hub`}
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
          <div
            ref={drawerRef}
            tabIndex={-1}
            className="xl:col-span-4 flex flex-col space-y-4 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
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
                    <div className="text-micro text-muted font-mono truncate">{selectedItem.sku}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-micro text-muted">
                        On-Hand:{' '}
                        <strong className={selectedItem.onHand <= lowStockThreshold ? 'text-danger' : 'text-primary'}>
                          {selectedItem.tracked ? selectedItem.onHand.toLocaleString('en-IN') : 'not tracked'}
                        </strong>
                      </span>
                      {selectedItem.category && (
                        <>
                          <span className="text-faint">•</span>
                          <span className="text-micro text-muted truncate">{selectedItem.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adjustment Form Inputs */}
                <div className="space-y-3">
                  {/* A hub picker and a bin box stood here. Stock is held per
                      variant, not per location, so whatever was typed went
                      into the toast and nowhere else. */}

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
                        <span className="text-meta font-semibold text-primary">
                          {newPhysicalCalculated.toLocaleString('en-IN')} pcs
                        </span>
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
                  {selectedItem.tracked && newPhysicalCalculated <= lowStockThreshold && (
                    <Alert variant="warning" className="p-2.5 text-meta">
                      <div className="flex items-start gap-2">
                        <Icon name="info" className="material-symbols-outlined text-icon text-warning shrink-0 mt-0.5" />
                        <p className="text-micro text-warning leading-relaxed">
                          {newPhysicalCalculated} pcs is at or under the store's low stock mark of {lowStockThreshold}.
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

                {/* "Recent ledger activity" listed two movements that never
                    happened, the same two for every SKU. The API keeps no
                    record of an adjustment beyond the new stock count, so
                    there is nothing to list until it does. */}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Stock Transfer Modal */}
      <Dialog
        open={isTransferModalOpen}
        onOpenChange={(open) => !open && setIsTransferModalOpen(false)}
        labelledBy="stock-transfer-title"
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle id="stock-transfer-title" className="flex items-center gap-2">
              <Icon name="sync_alt" className="material-symbols-outlined text-accent" />
              <span>Inter-Hub Stock Transfer Manifest</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmTransfer} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className="space-y-4 pb-space-md">
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
                <label className="text-meta font-medium text-muted" htmlFor="transfer-sku">Garment SKU</label>
                <Select
                  id="transfer-sku"
                  value={transferData.sku}
                  onChange={(e) => setTransferData(prev => ({ ...prev, sku: e.target.value }))}
                  aria-label="Garment SKU"
                  searchPlaceholder="Filter by SKU or garment..."
                  options={skuOptions}
                />
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
            </DialogBody>

            <DialogFooter>
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
      <Dialog
        open={isGrnModalOpen}
        onOpenChange={(open) => !open && setIsGrnModalOpen(false)}
        labelledBy="grn-entry-title"
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle id="grn-entry-title" className="flex items-center gap-2">
              <Icon name="download" className="material-symbols-outlined text-accent" />
              <span>Goods Receipt Note (GRN) Inbound Entry</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmGrn} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className="space-y-4 pb-space-md">
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
                  <label className="text-meta font-medium text-muted" htmlFor="grn-sku">Target SKU</label>
                  <Select
                    id="grn-sku"
                    value={grnData.sku}
                    onChange={(e) => setGrnData(prev => ({ ...prev, sku: e.target.value }))}
                    aria-label="Target SKU"
                    searchPlaceholder="Filter by SKU or garment..."
                    options={skuOptions}
                  />
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
            </DialogBody>

            <DialogFooter>
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
