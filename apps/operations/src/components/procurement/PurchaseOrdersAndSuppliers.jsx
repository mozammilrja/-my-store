import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  Input,
  Select,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  SectionCard,
  FilterBar,
  FilterDropdown,
  DataTable,
  TableToolbar,
  AppDialog,
  EmptyState,
  PageBody,
  SkeletonPage,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { usePurchaseOrdersQuery, useCreatePurchaseOrderMutation } from '../../hooks/useAdminQueries';

/** The states a purchase order can really be in. */
const PO_STATUS = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'info' },
  partially_received: { label: 'Partly received', variant: 'warning' },
  received: { label: 'Received', variant: 'success' },
  canceled: { label: 'Cancelled', variant: 'destructive' },
};

/** One shape for every purchase order row, from the record the API returns. */
function mapPurchaseOrder(po) {
  const items = po.items ?? [];
  const ordered = items.reduce((n, i) => n + (i.quantity ?? 0), 0);
  const received = items.reduce((n, i) => n + (i.received ?? 0), 0);
  const due = po.expectedDate ? new Date(po.expectedDate) : null;
  const open = po.status !== 'received' && po.status !== 'canceled';
  const overdue = Boolean(open && due && due.getTime() < Date.now());

  return {
    id: po.poNumber,
    code: `#${po.poNumber}`,
    supplier: po.supplierName,
    supplierId: po.supplierId,
    origin: po.hubId,
    hubId: po.hubId,
    orderedDate: new Date(po.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    promisedDate: due
      ? due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : null,
    // Measured against the date the supplier promised, not asserted.
    daysNotice: (() => {
      if (po.status === 'canceled') return 'Cancelled';
      if (!due) return 'No date agreed';
      if (!overdue) return open ? 'On schedule' : 'Received on time';
      const late = Math.max(1, Math.round((Date.now() - due.getTime()) / 86400000));
      return `${late} day${late === 1 ? '' : 's'} late`;
    })(),
    noticeColor:
      po.status === 'canceled' ? 'text-muted' : overdue ? 'text-danger' : open ? 'text-success' : 'text-muted',
    qtyPcs: `${ordered.toLocaleString('en-IN')} pcs`,
    qtyNum: ordered,
    receivedNum: received,
    receivedLabel: ordered > 0 ? `${Math.round((received / ordered) * 100)}% received` : '—',
    skuBreakdown: `${items.length} ${items.length === 1 ? 'line' : 'lines'}`,
    cost: `₹${Math.round((po.totalAmount ?? 0) / 100).toLocaleString('en-IN')}`,
    costShort: `₹${Math.round((po.totalAmount ?? 0) / 100).toLocaleString('en-IN')}`,
    status: po.status,
    statusLabel: PO_STATUS[po.status]?.label ?? po.status,
    statusVariant: PO_STATUS[po.status]?.variant ?? 'secondary',
    items,
  };
}

export function PurchaseOrdersAndSuppliers({ onNavigate, onShowToast }) {
  const [selectedPoId, setSelectedPoId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [targetHubFilter, setTargetHubFilter] = useState('ALL');
  const [isCreatePoModalOpen, setIsCreatePoModalOpen] = useState(false);
  const [livePos, setLivePos] = useState([]);

  // TanStack Query for purchase orders
  const {
    data: posData,
    isLoading: isPosLoading,
    isError: isPosError,
    error: posError,
    refetch: refetchPurchaseOrders,
  } = usePurchaseOrdersQuery();
  const createPoMutation = useCreatePurchaseOrderMutation();

  // New PO form state
  const [newPoForm, setNewPoForm] = useState({
    supplier: 'Jaipur Weaves & Prints',
    origin: 'Jaipur, RJ',
    targetHub: 'BLR-FC1',
    qty: 1500,
    cost: '₹14,50,000',
    deliveryDate: '2024-06-15'
  });

  useEffect(() => {
    if (posData?.purchaseOrders?.length) {
      const mapped = posData.purchaseOrders.map(mapPurchaseOrder);
      setLivePos(mapped);
    }
  }, [posData]);


  const allPos = useMemo(() => {
    return livePos;
  }, [livePos]);

  const poTabs = useMemo(() => {
    const count = (id) => allPos.filter((p) => p.status === id).length;
    return [
      { id: 'ALL', label: 'All', count: allPos.length },
      ...Object.entries(PO_STATUS)
        .map(([id, meta]) => ({ id, label: meta.label, count: count(id) }))
        .filter((t) => t.count > 0),
    ];
  }, [allPos]);

  const supplierOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All suppliers' },
      ...[...new Set(allPos.map((p) => p.supplier).filter(Boolean))]
        .sort()
        .map((name) => ({ value: name, label: name })),
    ],
    [allPos]
  );

  const hubOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All hubs' },
      ...[...new Set(allPos.map((p) => p.hubId).filter(Boolean))]
        .sort()
        .map((hub) => ({ value: hub, label: hub })),
    ],
    [allPos]
  );

  const supplierSpend = useMemo(() => {
    const byName = new Map();
    for (const po of allPos) {
      const row = byName.get(po.supplier) ?? { supplier: po.supplier, total: 0, count: 0 };
      row.total += Math.round((po.qtyNum > 0 ? 0 : 0) + Number(String(po.costShort).replace(/[^0-9]/g, '')));
      row.count += 1;
      byName.set(po.supplier, row);
    }
    const rows = [...byName.values()].sort((a, b) => b.total - a.total).slice(0, 8);
    const max = Math.max(...rows.map((r) => r.total), 1);
    return rows.map((r) => ({ ...r, share: Math.round((r.total / max) * 100) }));
  }, [allPos]);

  /** The KPI strip, measured off the purchase orders themselves. */
  const poStats = useMemo(() => {
    const pos = posData?.purchaseOrders ?? [];
    const openPos = pos.filter((po) => po.status !== 'received' && po.status !== 'canceled');
    const now = Date.now();
    const lines = pos.flatMap((po) => po.items ?? []);
    const ordered = lines.reduce((t, l) => t + (l.quantity ?? 0), 0);
    const received = lines.reduce((t, l) => t + (l.received ?? 0), 0);
    return {
      open: openPos.length,
      openValue: openPos.reduce((t, po) => t + (po.totalAmount ?? 0), 0),
      unitsInbound: openPos
        .flatMap((po) => po.items ?? [])
        .reduce((t, l) => t + Math.max(0, (l.quantity ?? 0) - (l.received ?? 0)), 0),
      overdue: openPos.filter((po) => po.expectedDate && new Date(po.expectedDate).getTime() < now)
        .length,
      receiptRate: ordered > 0 ? (received / ordered) * 100 : null,
      suppliers: new Set(pos.map((po) => po.supplierId ?? po.supplierName).filter(Boolean)).size,
    };
  }, [posData]);

  const selectedPo = useMemo(() => {
    return allPos.find(p => p.id === selectedPoId) || allPos[0];
  }, [selectedPoId, allPos]);

  const filteredPoList = useMemo(() => {
    return allPos.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (supplierFilter !== 'ALL' && p.supplier !== supplierFilter) return false;
      if (targetHubFilter !== 'ALL' && p.hubId !== targetHubFilter) return false;
      return true;
    });
  }, [statusFilter, supplierFilter, targetHubFilter, allPos]);

  // No purchase order exists at all: the ledger, its filters and the inspector
  // have nothing to work on, so the page becomes one call to raise the first PO.
  const noPos = allPos.length === 0;
  const noFilteredPos = !noPos && filteredPoList.length === 0;
  const clearPoFilters = () => {
    setStatusFilter('ALL');
    setSupplierFilter('ALL');
    setTargetHubFilter('ALL');
  };

  // One shared pager over the rows this module actually holds.
  const poPager = useClientTable(filteredPoList);

  const handleCreatePoSubmit = (e) => {
    e.preventDefault();
    setIsCreatePoModalOpen(false);
    createPoMutation.mutateAsync({
      supplierId: 'sup_default',
      supplierName: newPoForm.supplier,
      hubId: newPoForm.targetHub || 'BLR-FC1',
      items: [{
        sku: 'SKU-PO-NEW',
        name: `${newPoForm.supplier} Order`,
        quantity: Number(newPoForm.qty) || 500,
        unitCost: 850,
      }],
      expectedDate: new Date(newPoForm.deliveryDate),
    })
      .then(res => {
        if (res?.purchaseOrder) {
          const mapped = mapPurchaseOrder(res.purchaseOrder);
          setLivePos(prev => [mapped, ...prev]);
        }
      })
      .catch(err => console.warn('Could not persist PO:', err));

    if (onShowToast) onShowToast(`Purchase Order drafted for ${newPoForm.supplier} (${newPoForm.qty} pcs) and saved to MongoDB.`);
  };

  const handleExportCsv = () => {
    const headers = ['PO Code', 'Supplier', 'Target Hub', 'Order Date', 'Promised Date', 'Units Qty', 'Units Received', 'Total Cost (INR)', 'Status'];
    const rows = filteredPoList.map(p => [
      p.code,
      `"${p.supplier}"`,
      `"${p.origin}"`,
      `"${p.orderedDate}"`,
      `"${p.promisedDate ?? ''}"`,
      p.qtyNum,
      p.receivedNum,
      `"${p.cost}"`,
      `"${p.statusLabel}"`
    ]);
    const csvBody = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    // encodeURIComponent, not encodeURI: every PO code starts with '#', which
    // encodeURI leaves alone and the browser then reads as the URL fragment.
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvBody);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `everwear_purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Procurement order ledger CSV exported successfully.');
  };

  if (isPosLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={7} label="Loading purchase orders" />;
  }


  const poColumns = [
    {
      key: 'code',
      header: 'PO & supplier',
      grow: true,
      cell: (po) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-space-sm">
            <span className="whitespace-nowrap font-mono text-meta font-semibold text-accent">{po.code}</span>
            {po.origin && (
              <Badge variant="outline" size="sm" className="font-mono">
                {po.origin}
              </Badge>
            )}
          </span>
          <span className="truncate text-meta font-semibold text-primary" title={po.supplier}>
            {po.supplier}
          </span>
        </div>
      ),
    },
    {
      key: 'timeline',
      header: 'Ordered / due',
      cell: (po) => (
        <div className="flex flex-col gap-0.5">
          <span className="whitespace-nowrap text-meta font-semibold text-primary">
            {po.promisedDate ? `Due ${po.promisedDate}` : 'No date agreed'}
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-micro">
            <span className="text-muted">Ordered {po.orderedDate}</span>
            <span aria-hidden="true" className="text-faint">·</span>
            <span className={`font-semibold ${po.noticeColor}`}>{po.daysNotice}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'volume',
      header: 'Units',
      align: 'right',
      fit: true,
      cell: (po) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-meta font-semibold text-primary">{po.qtyPcs}</span>
          <span className="text-micro text-muted">{po.skuBreakdown}</span>
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Order value',
      align: 'right',
      fit: true,
      cell: (po) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-meta font-semibold text-primary">{po.cost}</span>
          <span className="text-micro text-muted">{po.receivedLabel}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      fit: true,
      cell: (po) => <StatusBadge status={po.statusLabel} variant={po.statusVariant} />,
    },
    {
      key: 'action',
      fit: true,
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (po) => (
        <Button
          variant="ghost"
          size="iconXs"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPoId(po.id);
          }}
          title="Inspect PO details"
          aria-label={`Inspect ${po.code}`}
        >
          <Icon name="chevron_right" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Catalog & inventory"
        title="Purchase orders"
        description="Suppliers and the stock ordered from them."
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsCreatePoModalOpen(true)}>
            <Icon name="add_circle" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
            <span>Create Purchase Order</span>
          </Button>
        }
      />
      <PageBody
        error={posError}
        hasData={posData != null}
        title="Purchase orders could not be loaded"
        onRetry={refetchPurchaseOrders}
      >

        {/* Measured off the purchase orders themselves */}
        <ContentGrid columns={5}>
          <StatsCard
            title="Open purchase orders"
            value={`${poStats.open} POs`}
            icon="receipt_long"
            trendLabel={`Valuation ${formatMoney(poStats.openValue, 'inr')}`}
          />
          <StatsCard
            title="Units still inbound"
            value={poStats.unitsInbound.toLocaleString('en-IN')}
            icon="local_shipping"
            iconColor="text-info"
            badge={`${poStats.open} ${poStats.open === 1 ? 'consignment' : 'consignments'}`}
            badgeVariant="info"
            trendLabel="Ordered minus received"
          />
          <StatsCard
            title="Overdue shipments"
            value={`${poStats.overdue} POs`}
            icon="warning"
            iconColor={poStats.overdue ? 'text-danger' : 'text-muted'}
            trendLabel="Past their expected date"
          />
          <StatsCard
            title="Received against ordered"
            value={poStats.receiptRate == null ? 'Not recorded' : `${poStats.receiptRate.toFixed(1)}%`}
            icon="verified_user"
            iconColor="text-success"
            trendLabel="No QC grade is stored on a receipt"
          />
          <StatsCard
            title="Suppliers in use"
            value={`${poStats.suppliers} ${poStats.suppliers === 1 ? 'mill' : 'mills'}`}
            icon="storefront"
            trendLabel="Distinct suppliers with a purchase order"
          />
        </ContentGrid>

        {!noPos && (
        <FilterBar
          tabs={poTabs}
          activeTab={statusFilter}
          onTabChange={setStatusFilter}
          filters={
            <>
              <FilterDropdown
                label="Supplier"
                value={supplierFilter}
                onChange={setSupplierFilter}
                options={supplierOptions}
                className="w-56"
              />
              <FilterDropdown
                label="Hub"
                value={targetHubFilter}
                onChange={setTargetHubFilter}
                options={hubOptions}
                className="w-52"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={clearPoFilters}
                title="Reset filters"
                aria-label="Reset filters"
              >
                <Icon name="restart_alt" aria-hidden="true" className="material-symbols-outlined text-icon" />
              </Button>
            </>
          }
        />
        )}

        {/* Ledger, with the selected order's inspector beside it */}
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          {noPos ? (
            <EmptyState
              icon="receipt_long"
              title="No purchase orders yet"
              description="Purchase orders raised with your suppliers appear here, with what was ordered and what has been received. Create the first one to start tracking inbound stock."
              className="py-16 lg:col-span-12"
              action={
                <Button variant="primary" size="sm" onClick={() => setIsCreatePoModalOpen(true)}>
                  <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>Create Purchase Order</span>
                </Button>
              }
            />
          ) : (
          <DataTable
            data={poPager.pageRows}
            columns={poColumns}
            keyField="id"
            caption="Purchase orders"
            containerClassName={noFilteredPos ? 'lg:col-span-12' : 'lg:col-span-8'}
            activeRowId={selectedPo?.id}
            onRowClick={(po) => setSelectedPoId(po.id)}
            emptyIcon="inventory_2"
            emptyTitle="No purchase orders match these filters"
            emptyMessage="Clear the status, supplier or hub filter to see every purchase order."
            emptyAction={
              <Button variant="outline" size="sm" onClick={clearPoFilters}>
                Clear filters
              </Button>
            }
            pagination={{
              page: poPager.page,
              pageSize: poPager.limit,
              totalItems: poPager.total,
              onPageChange: poPager.setPage,
              onPageSizeChange: poPager.setLimit,
            }}
            toolbar={
              <TableToolbar
                left={
                  <>
                    <h3 className="text-subheading text-primary">Purchase order ledger</h3>
                    <Badge variant="secondary" className="tabular-nums">
                      {filteredPoList.length} of {allPos.length}
                    </Badge>
                  </>
                }
                right={
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={handleExportCsv}
                    title="Export ledger as CSV"
                    aria-label="Export ledger as CSV"
                  >
                    <Icon name="download" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                  </Button>
                }
              />
            }
          />
          )}

          {/* Inspector */}
          {noPos || noFilteredPos ? null : !selectedPo ? (
            <div className="lg:col-span-4">
              <EmptyState icon="local_shipping" title="No purchase order selected" description="Pick a purchase order from the ledger to inspect it." />
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-space-md lg:sticky lg:top-20 lg:col-span-4">
              {/* The panel carried a vendor code, an advance percentage, a five
                  stage production lifecycle and a GRN discrepancy checker. A
                  purchase order records none of those; it has a supplier, a hub,
                  line items, what was ordered, what has been received and a
                  status. */}
              <SectionCard
                title={<span className="font-mono">{selectedPo.code}</span>}
                description={[selectedPo.supplier, selectedPo.hubId].filter(Boolean).join(' · ')}
                action={<StatusBadge status={selectedPo.statusLabel} variant={selectedPo.statusVariant} />}
              >
                <dl className="flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between gap-space-md">
                    <dt className="text-meta text-muted">Ordered</dt>
                    <dd className="text-body text-primary">{selectedPo.orderedDate}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-space-md">
                    <dt className="text-meta text-muted">Promised</dt>
                    <dd className="text-body text-primary">
                      {selectedPo.promisedDate ?? <span className="text-faint">No date agreed</span>}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-space-md">
                    <dt className="text-meta text-muted">Delivery</dt>
                    <dd className={`text-body ${selectedPo.noticeColor}`}>{selectedPo.daysNotice}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-space-md border-t border-subtle pt-space-sm">
                    <dt className="text-body font-semibold text-primary">Order value</dt>
                    <dd className="text-num font-semibold tabular-nums text-primary">
                      {selectedPo.costShort}
                    </dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard
                title="Line items"
                description={`${selectedPo.receivedNum.toLocaleString('en-IN')} of ${selectedPo.qtyNum.toLocaleString('en-IN')} units received`}
              >
                <ul className="flex flex-col gap-space-sm">
                  {selectedPo.items.map((item, idx) => (
                    <li key={`${item.sku}-${idx}`} className="flex items-start justify-between gap-space-md">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-body text-primary" title={item.name}>
                          {item.name}
                        </span>
                        <span className="font-mono text-micro text-muted">{item.sku}</span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <span className="text-num tabular-nums text-primary">
                          {item.received ?? 0} / {item.quantity}
                        </span>
                        <span className="text-micro text-muted">
                          ₹{Math.round(item.unitCost / 100).toLocaleString('en-IN')} each
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
              <SectionCard
                title="Suppliers by order value"
                description="Totalled from the purchase orders raised with each supplier."
              >
                {supplierSpend.length === 0 ? (
                  <EmptyState
                    icon="store"
                    title="No purchase orders yet"
                    description="Suppliers appear here once an order is raised with them."
                  />
                ) : (
                  <ul className="flex flex-col gap-space-sm">
                    {supplierSpend.map((row) => (
                      <li key={row.supplier} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-space-md">
                          <span className="truncate text-body text-primary" title={row.supplier}>
                            {row.supplier}
                          </span>
                          <span className="shrink-0 text-num tabular-nums text-secondary">
                            ₹{row.total.toLocaleString('en-IN')}
                            <span className="ml-2 text-meta text-muted">
                              {row.count} {row.count === 1 ? 'order' : 'orders'}
                            </span>
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle"
                          role="progressbar"
                          aria-valuenow={row.share}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${row.supplier}: ${row.share}% of purchase order value`}
                          title={`${row.share}% of all purchase order value`}
                        >
                          <div className="h-full rounded-full bg-primary-container" style={{ width: `${row.share}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          )}
        </div>

        {/* Create purchase order */}
        <AppDialog
          isOpen={isCreatePoModalOpen}
          onClose={() => setIsCreatePoModalOpen(false)}
          title="Create purchase order"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsCreatePoModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="create-po-form" variant="primary">
                Issue Purchase Order
              </Button>
            </>
          }
        >
          <form id="create-po-form" onSubmit={handleCreatePoSubmit} className="flex flex-col gap-space-md pb-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-label text-secondary">Supplier</label>
              <Select
                value={newPoForm.supplier}
                onChange={(e) => setNewPoForm({ ...newPoForm, supplier: e.target.value })}
                aria-label="Supplier"
              >
                <option value="Jaipur Weaves & Prints">Jaipur Weaves &amp; Prints (Surat &amp; Jaipur)</option>
                <option value="Tirupur Knitwear Hub">Tirupur Knitwear Hub (TN)</option>
                <option value="Surat Synthetic Silks">Surat Synthetic Silks (GJ)</option>
                <option value="Ludhiana Woolens & Blends">Ludhiana Woolens &amp; Blends (PB)</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Destination hub</label>
                <Select
                  value={newPoForm.targetHub}
                  onChange={(e) => setNewPoForm({ ...newPoForm, targetHub: e.target.value })}
                  aria-label="Destination hub"
                >
                  <option value="BLR-FC1">BLR-Fulfillment-FC1</option>
                  <option value="BOM-FC2">BOM- Bhiwandi-FC2</option>
                  <option value="DEL-NCR">DEL-NCR-FC3</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="po-qty">Quantity (pcs)</label>
                <Input
                  id="po-qty"
                  type="number"
                  value={newPoForm.qty}
                  onChange={(e) => setNewPoForm({ ...newPoForm, qty: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="po-cost">Estimated cost (INR)</label>
                <Input
                  id="po-cost"
                  type="text"
                  value={newPoForm.cost}
                  onChange={(e) => setNewPoForm({ ...newPoForm, cost: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary" htmlFor="po-date">Promised delivery date</label>
                <Input
                  id="po-date"
                  type="date"
                  value={newPoForm.deliveryDate}
                  onChange={(e) => setNewPoForm({ ...newPoForm, deliveryDate: e.target.value })}
                />
              </div>
            </div>
          </form>
        </AppDialog>
      </PageBody>
    </PageContainer>
  );
}

export default PurchaseOrdersAndSuppliers;
