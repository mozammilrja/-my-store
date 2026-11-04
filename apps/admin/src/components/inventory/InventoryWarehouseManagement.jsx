import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Icon,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  Alert,
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
  DEFAULT_PAGE_SIZE,
  PageBody,
  SkeletonPage,
  Thumbnail,
  EmptyState,
  AppDialog,
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

  // No inventory exists at all: the filters, the ledger and the adjustment
  // drawer have nothing to work on, so the ledger becomes one empty state.
  const noInventory = inventoryList.length === 0;
  const noInventoryMatches = !noInventory && filteredInventory.length === 0;
  const showDrawer = isDrawerOpen && !noInventory && !noInventoryMatches;

  const clearInventoryFilters = () => {
    setSelectedCategory('all');
    setStockHealthFilter('all');
    setSearchQuery('');
  };

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
    const variant = { 'Out of stock': 'destructive', 'Low stock': 'warning', 'In stock': 'success' }[status] ?? 'secondary';
    return <StatusBadge status={status} variant={variant} />;
  };

  const newPhysicalCalculated = selectedItem ? Math.max(0, selectedItem.onHand + adjustmentDelta) : 0;

  if (isInventoryLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={8} label="Loading inventory" />;
  }

  const inventoryColumns = [
    {
      key: 'name',
      header: 'SKU & variant',
      sortable: true,
      grow: true,
      cell: (item) => (
        <div className="flex min-w-56 items-center gap-space-sm">
          <Thumbnail src={item.image} alt={item.name} className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-col">
            <span className="line-clamp-1 text-meta font-semibold text-primary" title={item.name}>
              {item.name}
            </span>
            <span className="truncate text-micro text-muted" title={`${item.sku} - ${item.variant}`}>
              <span className="font-mono">{item.sku}</span> · {item.variant}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      className: 'whitespace-nowrap text-meta text-secondary',
      cell: (item) =>
        item.categories.length > 0 ? (
          <span title={item.categories.join(', ')}>
            {item.categories[0]}
            {item.categories.length > 1 && <span className="text-muted"> +{item.categories.length - 1}</span>}
          </span>
        ) : (
          <span className="text-faint">Uncategorised</span>
        ),
    },
    {
      key: 'onHand',
      header: 'On hand',
      sortable: true,
      align: 'right',
      fit: true,
      className: 'text-meta font-semibold text-primary',
      cell: (item) => (item.tracked ? item.onHand.toLocaleString('en-IN') : <span className="text-faint">—</span>),
    },
    {
      key: 'tracking',
      header: 'Tracking',
      fit: true,
      className: 'text-meta text-muted',
      cell: (item) => (item.tracked ? (item.allowBackorder ? 'Backorder allowed' : 'Tracked') : 'Not tracked'),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      fit: true,
      cell: (item) => getStatusBadge(item.status),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      fit: true,
      cell: (item) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="iconXs"
            onClick={() => openAdjustment(item, { focus: true })}
            title={`Adjust stock for ${item.sku}`}
            aria-label={`Adjust stock for ${item.sku}`}
          >
            <Icon name="tune" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
          </Button>
          <Button
            variant="ghost"
            size="iconXs"
            onClick={() => {
              setTransferData(prev => ({ ...prev, sku: item.sku }));
              setIsTransferModalOpen(true);
            }}
            title={`Transfer ${item.sku} to another hub`}
            aria-label={`Transfer ${item.sku} to another hub`}
          >
            <Icon name="sync_alt" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Catalog & inventory"
        title="Inventory & warehouses"
        description="Stock on hand for every tracked variant."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsTransferModalOpen(true)}>
              <Icon name="sync_alt" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Stock Transfer</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsGrnModalOpen(true)}>
              <Icon name="download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Receive Goods (GRN)</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(prev => !prev)}>
              <Icon name="add_circle" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>{isDrawerOpen ? 'Close Adjustment' : 'Stock Adjustment'}</span>
            </Button>
          </>
        }
      />
      <PageBody
        error={inventoryError}
        hasData={inventoryData != null}
        title="Inventory could not be loaded"
        onRetry={refetchInventory}
      >

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

        {/* With no inventory at all there is nothing to filter, so the bar goes too. */}
        {!noInventory && (
          <FilterBar
            tabs={[
              { id: 'all', label: 'All', count: statusCounts.all },
              { id: 'out', label: 'Out of stock', count: statusCounts.out },
              { id: 'low', label: `Low (≤${lowStockThreshold})`, count: statusCounts.low },
              { id: 'in', label: 'In stock', count: statusCounts.in },
              { id: 'untracked', label: 'Not tracked', count: statusCounts.untracked },
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
            /* The warehouse filter that stood here listed four hubs the data has
               no field for, so every choice but "all" emptied the table. The
               categories below are the ones the listed products are really in. */
            filters={
              <FilterDropdown
                value={selectedCategory}
                onChange={setSelectedCategory}
                label="Category"
                options={categoryOptions}
              />
            }
            actions={
              <Button variant="outline" size="sm" onClick={handleExportCsv} title="Export CSV">
                <Icon name="file_download" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            }
          />
        )}

        {/* Ledger, with the adjustment panel beside it on wide screens */}
        <div className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-12">
          <div className={`${showDrawer ? 'xl:col-span-8' : 'xl:col-span-12'} flex min-w-0 flex-col`}>
            {noInventory ? (
              <EmptyState
                icon="inventory_2"
                title="No inventory yet"
                description="Stock on hand appears here for every product variant once products are added to the catalog."
                className="py-16"
              />
            ) : noInventoryMatches ? (
              <EmptyState
                icon="search"
                title="No inventory items match these filters"
                description="Clear the search, the stock status and the category to see every SKU."
                action={
                  <Button variant="outline" size="sm" onClick={clearInventoryFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <DataTable
                columns={inventoryColumns}
                data={pagedInventory}
                keyField="id"
                activeRowId={selectedItem?.id}
                onRowClick={(item) => openAdjustment(item)}
                sortKey={sort.key}
                sortDirection={sort.dir}
                onSort={handleSort}
                caption="Inventory ledger"
                toolbar={
                  <TableToolbar
                    left={
                      <>
                        <h3 className="text-subheading text-primary">Inventory ledger</h3>
                        <Badge variant="secondary" className="tabular-nums">
                          {filteredInventory.length} SKUs
                        </Badge>
                      </>
                    }
                  />
                }
                pagination={{
                  page,
                  pageSize,
                  totalItems: filteredInventory.length,
                  onPageChange: setPage,
                  onPageSizeChange: (size) => {
                    setPageSize(size);
                    setPage(1);
                  },
                }}
              />
            )}
          </div>

          {/* Stock adjustment panel */}
          {showDrawer && selectedItem && (
            <div
              ref={drawerRef}
              tabIndex={-1}
              className="flex min-w-0 flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:col-span-4"
            >
              <SectionCard
                title="Stock adjustment"
                description={
                  <>
                    <span className="font-mono">{selectedItem.sku}</span> · {selectedItem.variant}
                  </>
                }
                action={
                  <div className="flex items-center gap-1">
                    {getStatusBadge(selectedItem.status)}
                    <Button
                      variant="ghost"
                      size="iconXs"
                      onClick={() => setIsDrawerOpen(false)}
                      title="Close"
                      aria-label="Close adjustment panel"
                    >
                      <Icon name="close" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                    </Button>
                  </div>
                }
                contentClassName="flex flex-col gap-space-md"
              >
                {/* Item preview */}
                <div className="flex items-center gap-space-sm rounded-lg bg-surface-subtle p-space-sm">
                  <Thumbnail src={selectedItem.image} alt={selectedItem.name} className="h-14 w-12 shrink-0 rounded-lg" imgClassName="object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="truncate text-meta font-semibold text-primary">{selectedItem.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-micro text-muted">
                      <span>
                        On hand{' '}
                        <strong className={`tabular-nums ${selectedItem.onHand <= lowStockThreshold ? 'text-danger' : 'text-primary'}`}>
                          {selectedItem.tracked ? selectedItem.onHand.toLocaleString('en-IN') : 'not tracked'}
                        </strong>
                      </span>
                      {selectedItem.category && (
                        <>
                          <span className="text-faint">·</span>
                          <span className="truncate">{selectedItem.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* A hub picker and a bin box stood here. Stock is held per
                    variant, not per location, so whatever was typed went
                    into the toast and nowhere else. */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-secondary">Reason</label>
                  <Select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    aria-label="Adjustment reason"
                  >
                    <option value="damage">Damaged in QC Inspection (-)</option>
                    <option value="cycle">Cycle Count Physical Variance (+/-)</option>
                    <option value="return">Returned Garment Restock (+)</option>
                    <option value="sample">Marketing / Fashion Sample Pull (-)</option>
                    <option value="shrinkage">Inventory Shrinkage / Theft (-)</option>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-label text-secondary">Adjustment (pcs)</span>
                  <div className="flex items-center gap-space-sm">
                    <div className="flex flex-1 items-center justify-between rounded-lg border border-subtle bg-surface-subtle p-1">
                      <Button
                        variant="outline"
                        size="iconXs"
                        onClick={() => handleAdjustCount(-1)}
                        aria-label="Decrease adjustment by one"
                      >
                        <span aria-hidden="true" className="text-body font-semibold">−</span>
                      </Button>
                      <span className={`text-body font-semibold tabular-nums ${
                        adjustmentDelta > 0 ? 'text-success' : adjustmentDelta < 0 ? 'text-danger' : 'text-primary'
                      }`}>
                        {adjustmentDelta > 0 ? `+${adjustmentDelta}` : adjustmentDelta} pcs
                      </span>
                      <Button
                        variant="outline"
                        size="iconXs"
                        onClick={() => handleAdjustCount(1)}
                        aria-label="Increase adjustment by one"
                      >
                        <span aria-hidden="true" className="text-body font-semibold">+</span>
                      </Button>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-micro text-muted">New on hand</span>
                      <span className="text-meta font-semibold tabular-nums text-primary">
                        {newPhysicalCalculated.toLocaleString('en-IN')} pcs
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label text-secondary" htmlFor="auditor-memo">Auditor memo</label>
                  <Textarea
                    id="auditor-memo"
                    value={auditorMemo}
                    onChange={(e) => setAuditorMemo(e.target.value)}
                    rows={2}
                    className="resize-none"
                    placeholder="Enter verification notes..."
                  />
                </div>

                {selectedItem.tracked && newPhysicalCalculated <= lowStockThreshold && (
                  <Alert variant="warning" className="flex items-start gap-space-sm p-space-sm">
                    <Icon name="info" aria-hidden="true" className="material-symbols-outlined mt-px shrink-0 text-icon-sm text-warning" />
                    <p className="text-meta text-warning">
                      {newPhysicalCalculated} pcs is at or under the store's low stock mark of {lowStockThreshold}.
                    </p>
                  </Alert>
                )}

                <div className="flex items-center gap-space-sm">
                  <Button variant="primary" onClick={handleApplyAdjustment} className="flex-1">
                    <Icon name="check_circle" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                    Confirm Stock Movement
                  </Button>
                  <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                    Cancel
                  </Button>
                </div>

                {/* "Recent ledger activity" listed two movements that never
                    happened, the same two for every SKU. The API keeps no
                    record of an adjustment beyond the new stock count, so
                    there is nothing to list until it does. */}
              </SectionCard>
            </div>
          )}
        </div>

        {/* Stock transfer */}
        <AppDialog
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title="Inter-hub stock transfer"
          maxWidth="max-w-xl"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="stock-transfer-form" variant="primary">
                Dispatch Transfer Manifest
              </Button>
            </>
          }
        >
          <form id="stock-transfer-form" onSubmit={handleConfirmTransfer} className="flex flex-col gap-space-md pb-space-md">
            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Source hub</label>
                <Select
                  value={transferData.fromHub}
                  onChange={(e) => setTransferData(prev => ({ ...prev, fromHub: e.target.value }))}
                  aria-label="Source hub"
                >
                  <option value="BLR-FC1">BLR-FC1 (Bengaluru)</option>
                  <option value="BOM-FC2">BOM-FC2 (Mumbai)</option>
                  <option value="DEL-FC3">DEL-FC3 (Delhi NCR)</option>
                  <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Destination hub</label>
                <Select
                  value={transferData.toHub}
                  onChange={(e) => setTransferData(prev => ({ ...prev, toHub: e.target.value }))}
                  aria-label="Destination hub"
                >
                  <option value="DEL-FC3">DEL-FC3 (Delhi NCR)</option>
                  <option value="BLR-FC1">BLR-FC1 (Bengaluru)</option>
                  <option value="BOM-FC2">BOM-FC2 (Mumbai)</option>
                  <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label text-secondary" htmlFor="transfer-sku">Garment SKU</label>
              <Select
                id="transfer-sku"
                value={transferData.sku}
                onChange={(e) => setTransferData(prev => ({ ...prev, sku: e.target.value }))}
                aria-label="Garment SKU"
                searchPlaceholder="Filter by SKU or garment..."
                options={skuOptions}
              />
            </div>

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="transfer-qty">Quantity (units)</label>
                <Input
                  id="transfer-qty"
                  type="number"
                  min="1"
                  max="500"
                  value={transferData.qty}
                  onChange={(e) => setTransferData(prev => ({ ...prev, qty: Number(e.target.value) }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="transfer-carrier">Carrier mode</label>
                <Input
                  id="transfer-carrier"
                  value={transferData.vehicleNote}
                  onChange={(e) => setTransferData(prev => ({ ...prev, vehicleNote: e.target.value }))}
                  placeholder="e.g. Dedicated Air Freight"
                />
              </div>
            </div>

            <Alert variant="info" className="p-space-sm text-meta">
              Inter-state transfers worth more than ₹50,000 need an e-way bill (Form GST EWB-01).
            </Alert>
          </form>
        </AppDialog>

        {/* Goods receipt */}
        <AppDialog
          isOpen={isGrnModalOpen}
          onClose={() => setIsGrnModalOpen(false)}
          title="Goods receipt note (GRN)"
          maxWidth="max-w-xl"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsGrnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="grn-entry-form" variant="primary">
                Book to Active Inventory
              </Button>
            </>
          }
        >
          <form id="grn-entry-form" onSubmit={handleConfirmGrn} className="flex flex-col gap-space-md pb-space-md">
            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="grn-po">PO reference</label>
                <Input
                  id="grn-po"
                  value={grnData.poRef}
                  onChange={(e) => setGrnData(prev => ({ ...prev, poRef: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="grn-supplier">Supplier</label>
                <Input
                  id="grn-supplier"
                  value={grnData.supplier}
                  onChange={(e) => setGrnData(prev => ({ ...prev, supplier: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Receiving hub</label>
                <Select
                  value={grnData.hub}
                  onChange={(e) => setGrnData(prev => ({ ...prev, hub: e.target.value }))}
                  aria-label="Receiving hub"
                >
                  <option value="BLR-FC1">BLR-FC1 (Bengaluru Hub)</option>
                  <option value="BOM-FC2">BOM-FC2 (Mumbai DC)</option>
                  <option value="DEL-FC3">DEL-FC3 (Delhi NCR)</option>
                  <option value="CCU-FC4">CCU-FC4 (Kolkata)</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="grn-bin">Staging bin</label>
                <Input
                  id="grn-bin"
                  value={grnData.binLocation}
                  onChange={(e) => setGrnData(prev => ({ ...prev, binLocation: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="grn-sku">SKU</label>
                <Select
                  id="grn-sku"
                  value={grnData.sku}
                  onChange={(e) => setGrnData(prev => ({ ...prev, sku: e.target.value }))}
                  aria-label="Target SKU"
                  searchPlaceholder="Filter by SKU or garment..."
                  options={skuOptions}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="grn-units">Units received</label>
                <Input
                  id="grn-units"
                  type="number"
                  min="1"
                  value={grnData.unitsReceived}
                  onChange={(e) => setGrnData(prev => ({ ...prev, unitsReceived: Number(e.target.value) }))}
                />
              </div>
            </div>
          </form>
        </AppDialog>
      </PageBody>
    </PageContainer>
  );
}
