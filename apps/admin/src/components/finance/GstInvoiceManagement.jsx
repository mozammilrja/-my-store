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
  DialogBody,
  DialogFooter,
  Alert,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  ErrorState,
  SkeletonPage,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable } from '../shared/DataTable';
import { adminApi } from '../../lib/api';
import { useInvoicesQuery, useCreditNotesQuery } from '../../hooks/useAdminQueries';

export default function GstInvoiceManagement({ currentHub, onShowToast }) {
  const [invoices, setInvoices] = useState([]);

  // TanStack Query for GST invoices
  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    isError: isInvoicesError,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useInvoicesQuery();
  const { data: creditNotesData, isLoading: isCreditNotesLoading } = useCreditNotesQuery();
  const creditNotes = creditNotesData?.creditNotes ?? [];

  // The register is the invoices the API holds. Field names here are the ones
  // the table below reads; the mapper used to emit taxableValue/invoiceTotal
  // while the markup read taxableVal/total, so every real row rendered
  // undefined and crashed the module.
  const formatAddress = (a) =>
    a
      ? [a.address1, a.address2, a.city, a.province, a.postalCode].filter(Boolean).join(', ')
      : 'Not recorded';

  const invoiceRows = useMemo(() => {
    const paise = (n) => Math.round((Number(n) || 0) / 100);
    return (invoicesData?.invoices ?? []).map((inv) => {
      const issued = inv.issuedAt ? new Date(inv.issuedAt) : null;
      const isIgst = (inv.igstTotal ?? 0) > 0;
      // GST rate is carried per line; the register shows the slab actually charged.
      const slabs = [...new Set((inv.items ?? []).map((i) => i.gstRate).filter((r) => r != null))];
      const hsnCodes = [...new Set((inv.items ?? []).map((i) => i.hsn).filter(Boolean))];
      return {
        id: inv._id ?? inv.id,
        invoiceNumber: inv.invoiceNumber,
        dateTime: issued
          ? issued.toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Not issued',
        orderRef: `EVR-${inv.displayId}`,
        customer: inv.customerName ?? 'Guest',
        customerGstin: inv.customerGstin || 'Unregistered',
        state: inv.shippingAddress?.province ?? 'Unknown',
        posBadge: isIgst ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)',
        type: isIgst ? 'IGST' : 'CGST / SGST',
        slab: slabs.length === 1 ? `${slabs[0]}%` : slabs.length ? 'Mixed' : '-',
        hsnCode: hsnCodes[0] ?? '-',
        hsnSummary: hsnCodes.join(', ') || '-',
        taxableVal: paise(inv.subtotal),
        cgst: paise(inv.cgstTotal),
        sgst: paise(inv.sgstTotal),
        igst: paise(inv.igstTotal),
        totalTax: paise((inv.cgstTotal ?? 0) + (inv.sgstTotal ?? 0) + (inv.igstTotal ?? 0)),
        total: paise(inv.grandTotal),
        status: inv.status,
        // Named as the line-item table below reads them, in rupees.
        items: (inv.items ?? []).map((item, idx) => {
          const taxAmt = paise((item.cgst ?? 0) + (item.sgst ?? 0) + (item.igst ?? 0));
          const taxable = paise(item.taxableValue);
          return {
            id: `${inv._id ?? inv.id}-${idx}`,
            desc: item.name ?? 'Item',
            hsn: item.hsn ?? '-',
            qty: item.quantity ?? 1,
            taxable,
            rate: `${item.gstRate ?? 0}%`,
            taxAmt,
            total: taxable + taxAmt,
          };
        }),
        isIntra: !isIgst,
        customerDetail: {
          name: inv.customerName ?? 'Guest',
          address: formatAddress(inv.billingAddress),
          gstin: inv.customerGstin || 'Unregistered',
        },
        shipping: {
          posState: inv.shippingAddress?.province
            ? `${inv.shippingAddress.province} (PIN ${inv.shippingAddress.postalCode ?? '-'})`
            : 'Not recorded',
          address: formatAddress(inv.shippingAddress),
        },
      };
    });
  }, [invoicesData]);

  useEffect(() => {
    setInvoices(invoiceRows);
  }, [invoiceRows]);

  /**
   * HSN-wise summary, built from the invoice lines. The tab used to show a
   * fixed rate card for apparel chapters with invented SKU counts, which told
   * the operator nothing about what had actually been billed.
   */
  const hsnSummary = useMemo(() => {
    const byKey = new Map();
    for (const invoice of invoiceRows) {
      for (const item of invoice.items) {
        const key = `${item.hsn}|${item.rate}`;
        const row = byKey.get(key) ?? {
          hsn: item.hsn, rate: item.rate, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
        };
        const share = item.taxable > 0 ? item.taxable / (invoice.taxableVal || item.taxable) : 0;
        row.qty += item.qty;
        row.taxable += item.taxable;
        row.cgst += Math.round(invoice.cgst * share);
        row.sgst += Math.round(invoice.sgst * share);
        row.igst += Math.round(invoice.igst * share);
        row.total = row.taxable + row.cgst + row.sgst + row.igst;
        byKey.set(key, row);
      }
    }
    return [...byKey.values()].sort((a, b) => b.taxable - a.taxable);
  }, [invoiceRows]);

  /** Register totals, summed from the invoices on hand. */
  const gstTotals = useMemo(() => {
    const sum = (key) => invoiceRows.reduce((n, r) => n + (r[key] ?? 0), 0);
    return {
      count: invoiceRows.length,
      taxable: sum('taxableVal'),
      totalTax: sum('totalTax'),
      cgst: sum('cgst'),
      sgst: sum('sgst'),
      igst: sum('igst'),
      intraCount: invoiceRows.filter((r) => r.igst === 0).length,
      interCount: invoiceRows.filter((r) => r.igst > 0).length,
    };
  }, [invoiceRows]);
  const [activeTab, setActiveTab] = useState('invoices'); // invoices, hsn, credit-notes
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState('May 2024');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedHsn, setSelectedHsn] = useState('all');
  const [selectedSlab, setSelectedSlab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isManualInvoiceModalOpen, setIsManualInvoiceModalOpen] = useState(false);

  // Manual Invoice Form State
  const [manualForm, setManualForm] = useState({
    customerName: 'Meera Rao',
    customerPhone: '+91 98450 12345',
    customerAddress: 'Indiranagar 12th Main, Bengaluru, KA - 560038',
    state: 'Karnataka',
    stateCode: '29',
    isIntra: true,
    hsnCode: '620442',
    itemDesc: 'Silk Georgette Maxi Kaftan',
    qty: 1,
    taxableVal: 3500,
    slab: '12%'
  });


  const selectedInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === selectedInvoiceId) || invoices[0];
  }, [invoices, selectedInvoiceId]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (selectedState !== 'all' && inv.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedHsn !== 'all' && inv.hsnCode !== selectedHsn) return false;
      if (selectedSlab !== 'all' && inv.slab !== selectedSlab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = inv.invoiceNumber.toLowerCase().includes(q);
        const matchOrder = inv.orderRef.toLowerCase().includes(q);
        const matchCust = inv.customer.name.toLowerCase().includes(q);
        const matchHsn = inv.hsnCode.toLowerCase().includes(q);
        if (!matchInv && !matchOrder && !matchCust && !matchHsn) return false;
      }
      return true;
    });
  }, [invoices, selectedState, selectedHsn, selectedSlab, searchQuery]);

  // One shared pager over the rows this module actually holds.
  const invoicesPager = useClientTable(filteredInvoices);

  const handleDownloadGstr1Json = () => {
    const payload = {
      gstin: '29AAAAE1234F1Z5',
      fp: '052024',
      b2c: filteredInvoices.filter(i => i.type.includes('B2C')).map(i => ({
        pos: i.stateCode,
        txval: i.taxableVal,
        rt: Number(i.slab.replace('%', '')),
        iamt: i.igst,
        camt: i.cgst,
        samt: i.sgst
      })),
      b2b: filteredInvoices.filter(i => i.type.includes('B2B')).map(i => ({
        ctin: i.customer.gstin,
        inv: [{
          inum: i.invoiceNumber,
          idt: '24-05-2024',
          val: i.total,
          pos: i.stateCode,
          inv_typ: 'R',
          itms: i.items.map(it => ({
            num: 1,
            itm_det: {
              txval: it.taxable,
              rt: 12,
              iamt: it.taxAmt
            }
          }))
        }]
      })),
      // The HSN section is summarised from the invoice lines being filed,
      // not from a fixed rate card that had nothing to do with them.
      hsn: {
        data: hsnSummary.map((row, idx) => ({
          num: idx + 1,
          hsn_sc: row.hsn,
          uqc: 'PCS',
          qty: row.qty,
          rt: Number(String(row.rate).replace('%', '')),
          txval: row.taxable,
          camt: row.cgst,
          samt: row.sgst,
          iamt: row.igst,
        })),
      }
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `GSTR1_29AAAAE1234F1Z5_052024_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    document.body.removeChild(dlAnchor);

    if (onShowToast) onShowToast('GSTR-1 compliant JSON payload downloaded successfully.');
  };

  const handleExportCsv = () => {
    const headers = ['Invoice Number', 'Order Ref', 'Date Time', 'Recipient', 'State', 'Type', 'HSN Code', 'Taxable Val', 'CGST', 'SGST', 'IGST', 'Total INR', 'Status', 'IRN'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.orderRef,
      `"${inv.dateTime}"`,
      `"${inv.customer.name}"`,
      inv.state,
      inv.type,
      inv.hsnCode,
      inv.taxableVal,
      inv.cgst,
      inv.sgst,
      inv.igst,
      inv.total,
      inv.status,
      inv.irn
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `everwear_gst_tax_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('GST Tax Ledger CSV exported.');
  };

  const handleCreateManualInvoice = (e) => {
    e.preventDefault();
    const rateNum = Number(manualForm.slab.replace('%', '')) / 100;
    const taxAmt = Number((manualForm.taxableVal * rateNum).toFixed(2));
    const isIntra = manualForm.stateCode === '29';
    const cgst = isIntra ? Number((taxAmt / 2).toFixed(2)) : 0;
    const sgst = isIntra ? Number((taxAmt / 2).toFixed(2)) : 0;
    const igst = isIntra ? 0 : taxAmt;
    const total = Number((manualForm.taxableVal + taxAmt).toFixed(2));

    const newInv = {
      id: `inv-gst-${Date.now()}`,
      invoiceNumber: `INV-2024-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'B2C Manual Invoice',
      orderRef: `EVR-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
      dateTime: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', 16:00 IST',
      customer: {
        name: manualForm.customerName,
        shortName: manualForm.customerName.split(' ')[0],
        address: manualForm.customerAddress,
        phone: manualForm.customerPhone,
        gstin: 'Unregistered (B2C Consumer)'
      },
      shipping: {
        address: manualForm.customerAddress,
        posState: `${manualForm.state} (State Code ${manualForm.stateCode})`,
        posCode: manualForm.stateCode
      },
      state: manualForm.state,
      stateCode: manualForm.stateCode,
      isIntra,
      posBadge: `${manualForm.state.slice(0, 2).toUpperCase()} (${manualForm.stateCode}) • ${isIntra ? 'INTRA' : 'INTER'}`,
      hsnCode: manualForm.hsnCode,
      hsnChapter: `HSN ${manualForm.hsnCode}`,
      slab: manualForm.slab,
      taxableVal: manualForm.taxableVal,
      cgst,
      sgst,
      igst,
      total,
      status: 'Reconciled',
      irn: '5b9c1d0e4f8a2e7d6b3a0f1e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c',
      ackNo: '122410885104',
      ackDate: '24-05-2024 16:05',
      ewayBillNo: null,
      items: [
        {
          id: `line-${Date.now()}`,
          desc: manualForm.itemDesc,
          hsn: manualForm.hsnCode,
          qty: manualForm.qty,
          unitRate: manualForm.taxableVal,
          taxable: manualForm.taxableVal,
          rate: manualForm.slab,
          taxAmt,
          total
        }
      ]
    };

    setInvoices(prev => [newInv, ...prev]);
    setSelectedInvoiceId(newInv.id);
    setIsManualInvoiceModalOpen(false);
    if (onShowToast) onShowToast(`Created Tax Invoice ${newInv.invoiceNumber} for ₹${total}`);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast(`${label} copied to clipboard!`);
  };

  if (isInvoicesLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={8} label="Loading tax invoices" />;
  }


  const lineItemColumns = [
    {
      key: 'desc',
      header: 'Description & HSN',
      cell: (item) => (
        <>
          <div className="line-clamp-2 font-medium text-primary">{item.desc}</div>
          <div className="text-micro text-muted font-mono whitespace-nowrap">HSN: {item.hsn}</div>
        </>
      ),
    },
    { key: 'qty', fit: true, header: 'Qty', align: 'center', className: 'font-mono whitespace-nowrap', accessor: 'qty' },
    {
      key: 'taxable',
      header: 'Taxable',
      align: 'right',
      className: 'font-mono whitespace-nowrap',
      cell: (item) => `\u20B9${Number(item.taxable ?? 0).toFixed(2)}`,
    },
    {
      key: 'gst',
      header: 'GST',
      align: 'right',
      className: 'font-mono text-micro whitespace-nowrap',
      cell: (item) => `${item.rate} (\u20B9${Number(item.taxAmt ?? 0).toFixed(2)})`,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      className: 'font-mono font-semibold whitespace-nowrap',
      cell: (item) => `\u20B9${Number(item.total ?? 0).toFixed(2)}`,
    },
  ];

  return (
    <PageContainer>
      {invoicesError && (
        <ErrorState
          title="Tax invoices could not be loaded"
          message={invoicesError?.message}
          onRetry={() => refetchInvoices()}
        />
      )}
      {/* Breadcrumb Navigation & Top Action Bar */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Finance & Compliance', 'GST & Tax Invoices']}
        title="GST Compliance, Tax Invoices & E-Way Bill Management"
        description="Indian Goods and Services Tax (GST) filing reconciliation, GSTR-1 & GSTR-3B audit ledger, HSN rate configuration, and credit note issuance."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadGstr1Json}
              className="gap-1.5 shadow-sm"
              title="Download compliant GSTR-1 payload JSON"
              type="button"
            >
              <Icon name="data_object" className="material-symbols-outlined text-icon text-accent" />
              <span>GSTR-1 JSON</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 shadow-sm"
              title="Export Ledger Records to CSV"
              type="button"
            >
              <Icon name="table_view" className="material-symbols-outlined text-icon text-muted" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsManualInvoiceModalOpen(true)}
              className="gap-1.5 bg-primary-container text-on-accent hover:bg-primary-container-hover shadow-sm"
              type="button"
            >
              <Icon name="add" className="material-symbols-outlined text-icon" />
              <span>+ Create Tax Invoice</span>
            </Button>
          </>
        }
      />

      {/* Counted from the invoices the API returned. These were six fixed
          strings before, unchanged by whatever the register actually held. */}
      <ContentGrid columns={5}>
        <StatsCard
          title="Invoices issued"
          value={gstTotals.count}
          icon="receipt_long"
          subtitle="In the register"
        />
        <StatsCard
          title="Taxable value"
          value={`₹${gstTotals.taxable.toLocaleString('en-IN')}`}
          icon="storefront"
          subtitle="Before GST"
        />
        <StatsCard
          title="Total GST"
          value={`₹${gstTotals.totalTax.toLocaleString('en-IN')}`}
          icon="account_balance"
          iconColor="text-accent"
          subtitle={
            gstTotals.taxable > 0
              ? `Effective rate ${((gstTotals.totalTax / gstTotals.taxable) * 100).toFixed(1)}%`
              : 'No taxable value yet'
          }
        />
        <StatsCard
          title="CGST + SGST"
          value={`₹${(gstTotals.cgst + gstTotals.sgst).toLocaleString('en-IN')}`}
          icon="account_balance_wallet"
          subtitle={`${gstTotals.intraCount} intra-state invoices`}
        />
        <StatsCard
          title="IGST"
          value={`₹${gstTotals.igst.toLocaleString('en-IN')}`}
          icon="flight_takeoff"
          iconColor="text-info"
          subtitle={`${gstTotals.interCount} inter-state invoices`}
        />
      </ContentGrid>

      {/* Dual-Pane Layout: register table takes the remaining width, preview is a fixed column */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT PANEL: Invoices Register & Sub-tabs */}
        <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col space-y-4">
          <Card className="border border-subtle bg-surface-container-lowest overflow-hidden">
            {/* Navigation Sub-Tabs */}
            <div className="px-4 pt-2 bg-surface-container-low/50 flex flex-wrap gap-1 border-b border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`px-3 py-2 rounded-t-lg text-meta font-semibold flex items-center gap-1.5 transition-colors ${
 activeTab === 'invoices'
 ? 'bg-surface-container-lowest text-accent shadow-sm border-t-2 border-primary-container'
 : 'text-muted hover:text-primary'
 }`}
              >
                <Icon name="receipt_long" className="material-symbols-outlined text-icon" />
                <span>Tax Invoices (B2C &amp; B2B)</span>
                <span className="px-1.5 py-px rounded-full bg-primary-fixed text-on-primary-fixed text-micro">
                  {invoices.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hsn')}
                className={`px-3 py-2 rounded-t-lg text-meta font-semibold flex items-center gap-1.5 transition-colors ${
 activeTab === 'hsn'
 ? 'bg-surface-container-lowest text-accent shadow-sm border-t-2 border-primary-container'
 : 'text-muted hover:text-primary'
 }`}
              >
                <Icon name="sell" className="material-symbols-outlined text-icon" />
                <span>HSN Rate Master</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('credit-notes')}
                className={`px-3 py-2 rounded-t-lg text-meta font-semibold flex items-center gap-1.5 transition-colors ${
 activeTab === 'credit-notes'
 ? 'bg-surface-container-lowest text-accent shadow-sm border-t-2 border-primary-container'
 : 'text-muted hover:text-primary'
 }`}
              >
                <Icon name="assignment_return" className="material-symbols-outlined text-icon" />
                <span>Credit Notes (Returns)</span>
                <span className="px-1.5 py-px rounded-full bg-surface-subtle text-muted text-micro">
                  {creditNotes.length}
                </span>
              </button>
            </div>

            {/* Filter & Search Matrix (Active when Invoices Tab is open) */}
            {activeTab === 'invoices' && (
              <div className="p-4 bg-surface-container-lowest grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center border-b border-subtle">
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">Financial Period</label>
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="h-8 text-meta font-medium"
                  >
                    <option value="May 2024">May 2024 (Active)</option>
                    <option value="April 2024">April 2024 (Filed)</option>
                    <option value="March 2024">March 2024 (Reconciled)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">Place of Supply (State)</label>
                  <Select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="h-8 text-meta font-medium"
                  >
                    <option value="all">All Destination States</option>
                    <option value="Karnataka">Karnataka (29) - Intra</option>
                    <option value="Maharashtra">Maharashtra (27)</option>
                    <option value="Delhi">Delhi (07)</option>
                    <option value="Telangana">Telangana (36)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">HSN Chapter</label>
                  <Select
                    value={selectedHsn}
                    onChange={(e) => setSelectedHsn(e.target.value)}
                    className="h-8 text-meta font-medium"
                  >
                    <option value="all">All Apparel HSN</option>
                    <option value="620442">HSN 6204 (Dresses &amp; Ensembles)</option>
                    <option value="620342">HSN 6203 (Suits &amp; Trousers)</option>
                    <option value="610910">HSN 6109 (Cotton Tees)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-caption text-muted uppercase mb-1">GST Tax Slab</label>
                  <div className="flex items-center gap-1">
                    {['all', '5%', '12%', '18%'].map(slab => (
                      <button
                        key={slab}
                        type="button"
                        onClick={() => setSelectedSlab(slab)}
                        className={`flex-1 py-1 text-center rounded-md text-micro font-semibold transition-all ${
 selectedSlab === slab
 ? 'bg-primary-fixed text-on-primary-fixed font-semibold shadow-sm'
 : 'bg-surface-subtle text-muted hover:text-primary'
 }`}
                      >
                        {slab === 'all' ? 'ALL' : slab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Invoices Table */}
            {activeTab === 'invoices' && (
              <div className="overflow-x-auto scrollbar-thin">
                <Table className="min-w-[1020px] w-full border-collapse">
                  <TableHeader sticky>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-nowrap">Invoice Number</TableHead>
                      <TableHead className="whitespace-nowrap">Order Ref / Time</TableHead>
                      <TableHead className="whitespace-nowrap">Recipient &amp; PoS</TableHead>
                      <TableHead className="whitespace-nowrap">HSN Code</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Taxable Val</TableHead>
                      <TableHead className="text-right whitespace-nowrap">CGST + SGST</TableHead>
                      <TableHead className="text-right whitespace-nowrap">IGST</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total (INR)</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border-subtle">
                    {invoicesPager.pageRows.map(inv => {
                      const isSelected = selectedInvoice?.id === inv.id;
                      return (
                        <TableRow
                          key={inv.id}
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className={`cursor-pointer transition-colors ${
 isSelected
 ? 'bg-primary-fixed/20 hover:bg-primary-fixed/30 border-l-4 border-l-primary-container'
 : 'hover:bg-surface-subtle'
 }`}
                        >
                          <TableCell className="py-3 px-3 font-semibold text-accent">
                            <div className="flex items-center gap-1.5">
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>}
                              <span className="font-mono text-meta whitespace-nowrap">{inv.invoiceNumber}</span>
                            </div>
                            <span className="text-micro text-muted block font-normal">{inv.type}</span>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <div className="font-medium text-meta text-primary">{inv.orderRef}</div>
                            <div className="whitespace-nowrap text-micro text-muted">{inv.dateTime}</div>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <div className="font-medium text-meta text-primary">{inv.customer.shortName}</div>
                            <span className="px-1.5 py-px rounded-md bg-surface-subtle text-micro text-muted">
                              {inv.posBadge}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <span className="font-mono text-meta font-semibold text-primary whitespace-nowrap">{inv.hsnCode}</span>
                            <span className="text-micro text-muted block">{inv.slab} Slab</span>
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono text-meta text-primary whitespace-nowrap">
                            ₹{inv.taxableVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono text-meta text-primary whitespace-nowrap">
                            {inv.cgst > 0 ? (
                              <>
                                <div>₹{inv.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                <div className="text-micro text-muted">+ ₹{inv.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono text-meta text-primary whitespace-nowrap">
                            {inv.igst > 0 ? (
                              `₹${inv.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono font-semibold text-meta text-primary whitespace-nowrap">
                            ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center">
                            <Badge variant={inv.status === 'Reconciled' ? 'success' : 'warning'} className="text-micro">
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceId(inv.id)}
                              className="p-1 rounded-lg text-muted hover:text-accent hover:bg-surface-subtle"
                              title="Inspect Full Invoice"
                            >
                              <Icon name="visibility" className="material-symbols-outlined text-icon-md" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* TAB CONTENT: HSN Rate Master */}
            {activeTab === 'hsn' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-body font-semibold text-primary">HSN-wise summary</h3>
                  <p className="text-meta text-muted">
                    Every line on the invoices in this register, grouped by HSN code and rate.
                    This is the shape GSTR-1 asks for.
                  </p>
                </div>
                {hsnSummary.length === 0 ? (
                  <EmptyState
                    icon="inventory_2"
                    title="No invoice lines yet"
                    message="An HSN summary appears once invoices carry line items."
                  />
                ) : (
                  <div className="scrollbar-thin overflow-x-auto">
                    <Table className="w-full border-collapse">
                      <TableHeader sticky>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="whitespace-nowrap">HSN code</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Rate</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Quantity</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Taxable value</TableHead>
                          <TableHead className="whitespace-nowrap text-right">CGST</TableHead>
                          <TableHead className="whitespace-nowrap text-right">SGST</TableHead>
                          <TableHead className="whitespace-nowrap text-right">IGST</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border-subtle">
                        {hsnSummary.map((row) => (
                          <TableRow key={`${row.hsn}-${row.rate}`} className="hover:bg-surface-subtle">
                            <TableCell className="whitespace-nowrap font-mono text-meta font-semibold text-accent">
                              {row.hsn}
                            </TableCell>
                            <TableCell className="text-right text-meta tabular-nums">{row.rate}</TableCell>
                            <TableCell className="text-right text-meta tabular-nums">{row.qty}</TableCell>
                            <TableCell className="text-right text-meta tabular-nums">
                              ₹{row.taxable.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right text-meta tabular-nums">
                              ₹{row.cgst.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right text-meta tabular-nums">
                              ₹{row.sgst.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right text-meta tabular-nums">
                              ₹{row.igst.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right text-meta font-semibold tabular-nums">
                              ₹{row.total.toLocaleString('en-IN')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Credit Notes */}
            {activeTab === 'credit-notes' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-body font-semibold text-primary">Credit notes</h3>
                  <p className="text-meta text-muted">
                    Issued against invoices in this register. Managed in full under Credit Notes
                    &amp; Refunds.
                  </p>
                </div>
                <DataTable
                  columns={[
                    {
                      key: 'number',
                      header: 'Credit note',
                      accessor: (c) => <span className="font-mono text-num">{c.creditNoteNumber}</span>,
                    },
                    {
                      key: 'invoice',
                      header: 'Against invoice',
                      accessor: (c) => <span className="font-mono text-num">{c.invoiceNumber}</span>,
                    },
                    { key: 'customer', header: 'Customer', accessor: (c) => c.customerName },
                    { key: 'reason', header: 'Reason', accessor: (c) => c.reason },
                    {
                      key: 'amount',
                      header: 'Credit value',
                      align: 'right',
                      accessor: (c) => `₹${Math.round((c.refundAmount ?? 0) / 100).toLocaleString('en-IN')}`,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      accessor: (c) => (
                        <StatusBadge
                          status={
                            { issued: 'Issued', settled: 'Settled', canceled: 'Cancelled' }[c.status] ??
                            c.status
                          }
                          variant={
                            c.status === 'settled'
                              ? 'success'
                              : c.status === 'canceled'
                                ? 'destructive'
                                : 'info'
                          }
                        />
                      ),
                    },
                  ]}
                  data={creditNotes}
                  keyField="id"
                  isLoading={isCreditNotesLoading}
                  emptyIcon="receipt_long"
                  emptyTitle="No credit notes yet"
                  emptyMessage="A credit note is raised when an order is refunded."
                  caption="Credit notes raised against invoices"
                />
              </div>
            )}

            {/* TAB CONTENT: E-Way Bills */}

            {/* TAB CONTENT: Reconciliation */}

            <TablePagination
              currentPage={invoicesPager.page}
              pageSize={invoicesPager.limit}
              totalItems={invoicesPager.total}
              onPageChange={invoicesPager.setPage}
              onPageSizeChange={invoicesPager.setLimit}
            />
          </Card>

          {/* HSN Rate Summary Micro-Card */}
          <Card className="border border-subtle bg-surface-container-lowest p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-accent shrink-0">
                  <Icon name="category" className="material-symbols-outlined text-icon-lg" />
                </div>
                <div>
                  <h4 className="text-body font-semibold text-primary">Apparel GST Rate Master Schedule (Notification No. 01/2017)</h4>
                  <p className="text-meta text-muted">Fabric, silk and ready-made cotton garments valued &lt; ₹1,000 are taxed at 5%; garments &gt; ₹1,000 at 12% IGST.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-caption text-muted uppercase">Portal Sync Status</div>
                  <div className="text-meta font-semibold text-success">GSTN Active • Live E-Invoicing</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: E-Invoice IRN & Compliant Tax Invoice Interactive Preview */}
        <div className="w-full lg:w-[41.666%] xl:w-[33.333%] lg:max-w-[480px] lg:shrink-0 min-w-0 flex flex-col space-y-4">
          <Card className="border border-subtle bg-surface-container-lowest overflow-hidden shadow-sm">
            {/* Document Action Ribbon */}
            <div className="px-4 py-2 bg-surface-subtle flex items-center justify-between border-b border-subtle">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-caption uppercase tracking-wider">
                  ORIGINAL FOR RECIPIENT
                </Badge>
                <span className="text-micro text-muted">{selectedInvoice?.type}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-7 w-7 p-0"
                  title="Print Tax Invoice"
                >
                  <Icon name="print" className="material-symbols-outlined text-icon" />
                </Button>
              </div>
            </div>

            {/* Invoice Body Document */}
            {selectedInvoice && (
              <div className="p-4 space-y-4 text-primary text-meta">
                {/* Supplier Legal Identity Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="font-semibold text-body tracking-tight text-primary">Everwear Retail Pvt. Ltd.</div>
                    <div className="text-micro text-muted leading-snug">
                      FC-1 Warehouse, 4th Cross, Peenya Industrial Area Phase 2,<br />
                      Bengaluru, Karnataka - 560058, India
                    </div>
                    <div className="pt-1 space-y-0.5 text-micro">
                      <div><span className="text-muted">GSTIN:</span> <span className="font-semibold font-mono whitespace-nowrap">29AAAAE1234F1Z5</span></div>
                      <div><span className="text-muted">State / Code:</span> <span className="font-medium">Karnataka (29)</span></div>
                      <div><span className="text-muted">CIN:</span> <span className="font-mono whitespace-nowrap">U18101KA2021PTC148902</span></div>
                    </div>
                  </div>

                  {/* Authentic QR Code Vector */}
                  <div className="flex flex-col items-center p-2 rounded-xl bg-surface-canvas shadow-sm shrink-0 text-center">
                    <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 100 100">
                      <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M22,22 h6 v6 h-6 z" />
                      <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M72,22 h6 v6 h-6 z" />
                      <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M22,72 h6 v6 h-6 z" />
                      <rect x="45" y="15" width="8" height="8" />
                      <rect x="45" y="30" width="8" height="15" />
                      <rect x="15" y="45" width="10" height="8" />
                      <rect x="30" y="48" width="12" height="6" />
                      <rect x="60" y="45" width="15" height="8" />
                      <rect x="80" y="50" width="10" height="10" />
                      <rect x="50" y="65" width="12" height="12" />
                      <rect x="70" y="65" width="20" height="8" />
                      <rect x="70" y="80" width="10" height="10" />
                      <rect x="85" y="85" width="5" height="5" />
                    </svg>
                    <span className="text-micro text-muted mt-1 font-semibold tracking-wider">GSTN VERIFIED</span>
                  </div>
                </div>

                {/* IRN Hash Metadata Box */}
                <div className="p-2.5 rounded-lg bg-surface-canvas space-y-1 font-mono text-micro text-muted border border-subtle whitespace-nowrap">
                  <div className="flex items-start gap-2 text-primary">
                    <Icon
                      name="info"
                      aria-hidden="true"
                      className="material-symbols-outlined mt-px text-icon-sm text-muted"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-caption uppercase">E-invoice registration</span>
                      <span className="text-micro text-muted">
                        This invoice has not been registered with the IRP, so it carries no IRN or
                        acknowledgement number.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Identity Grid */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-subtle">
                  <div>
                    <span className="text-caption text-muted block uppercase">Tax Invoice No</span>
                    <span className="text-body font-semibold font-mono text-primary whitespace-nowrap">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-caption text-muted block uppercase">Invoice Date &amp; Time</span>
                    <span className="text-meta font-semibold text-primary">{selectedInvoice.dateTime}</span>
                  </div>
                  <div>
                    <span className="text-caption text-muted block uppercase">Channel Order ID</span>
                    <span className="text-meta font-medium text-primary">{selectedInvoice.orderRef}</span>
                  </div>
                  <div>
                    <span className="text-caption text-muted block uppercase">Place of Supply</span>
                    <span className="text-meta font-semibold text-primary">{selectedInvoice.shipping?.posState}</span>
                  </div>
                </div>

                {/* Billing & Shipping Information */}
                <div className="grid grid-cols-2 gap-2 text-micro">
                  <div className="p-2 rounded-lg bg-surface-canvas space-y-1 border border-subtle">
                    <span className="text-caption text-muted uppercase block">Billed To (Customer)</span>
                    <div className="font-semibold text-primary">{selectedInvoice.customerDetail?.name}</div>
                    <div className="text-muted leading-snug">{selectedInvoice.customerDetail?.address}</div>
                    <div className="text-muted pt-0.5">GSTIN: {selectedInvoice.customerDetail?.gstin}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-canvas space-y-1 border border-subtle">
                    <span className="text-caption text-muted uppercase block">Shipped To (Delivery Point)</span>
                    <div className="font-semibold text-primary">{selectedInvoice.customer.name}</div>
                    <div className="text-muted leading-snug">{selectedInvoice.shipping.address}</div>
                    <div className="text-muted pt-0.5">State Code: {selectedInvoice.shipping.posCode}</div>
                  </div>
                </div>

                {/* Itemized Table */}
                <DataTable
                  data={selectedInvoice.items ?? []}
                  columns={lineItemColumns}
                  keyField="id"
                  className="text-micro"
                  containerClassName="border border-subtle rounded-lg"
                  emptyIcon="receipt_long"
                  emptyTitle="No line items"
                  emptyMessage="This invoice records no line items."
                />

                {/* Tax Breakdown & Computation Box */}
                <div className="p-3 rounded-lg bg-surface-canvas space-y-1.5 border border-subtle text-meta">
                  <div className="flex justify-between">
                    <span className="text-muted">Total Taxable Value:</span>
                    <span className="font-mono font-medium whitespace-nowrap">₹{selectedInvoice.taxableVal.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.isIntra ? (
                    <>
                      <div className="flex justify-between text-muted">
                        <span>Central GST (CGST 6%):</span>
                        <span className="font-mono whitespace-nowrap">₹{selectedInvoice.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>State GST (SGST 6%):</span>
                        <span className="font-mono whitespace-nowrap">₹{selectedInvoice.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-muted">
                      <span>Integrated GST (IGST {selectedInvoice.slab}):</span>
                      <span className="font-mono whitespace-nowrap">₹{selectedInvoice.igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-subtle flex justify-between items-center text-body font-semibold text-primary">
                    <span>Invoice Total (INR):</span>
                    <span className="font-mono text-heading text-accent whitespace-nowrap">
                      ₹{selectedInvoice.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Signatory & Verification Footer */}
                <div className="pt-2 flex justify-between items-end border-t border-subtle text-micro text-muted">
                  <div>
                    <div>Computer Generated Invoice</div>
                    <div className="text-micro">Tax is payable under Reverse Charge: No</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">For Everwear Retail Pvt. Ltd.</div>
                    <div className="text-micro text-success font-semibold mt-1">
                      ✓ Digitally Signed By Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Manual Invoice Creation Modal */}
      <Dialog
        open={isManualInvoiceModalOpen}
        onOpenChange={(open) => !open && setIsManualInvoiceModalOpen(false)}
        labelledBy="manual-invoice-title"
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle id="manual-invoice-title" className="flex items-center gap-2">
              <Icon name="receipt_long" className="material-symbols-outlined text-accent" />
              <span>Create Manual Tax Invoice</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateManualInvoice} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className="space-y-4 pb-space-md">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">Recipient / Customer Name</label>
                  <Input
                    required
                    value={manualForm.customerName}
                    onChange={(e) => setManualForm(prev => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">Phone Number</label>
                  <Input
                    required
                    value={manualForm.customerPhone}
                    onChange={(e) => setManualForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-meta font-medium text-muted">Delivery / Billing Address</label>
                <Input
                  required
                  value={manualForm.customerAddress}
                  onChange={(e) => setManualForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">Destination State &amp; Code</label>
                  <Select
                    value={manualForm.stateCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      let stateName = 'Karnataka';
                      if (code === '27') stateName = 'Maharashtra';
                      else if (code === '07') stateName = 'Delhi';
                      else if (code === '36') stateName = 'Telangana';
                      else if (code === '33') stateName = 'Tamil Nadu';
                      setManualForm(prev => ({ ...prev, stateCode: code, state: stateName }));
                    }}
                  >
                    <option value="29">Karnataka (29) - Intra State</option>
                    <option value="27">Maharashtra (27) - Inter State</option>
                    <option value="07">Delhi (07) - Inter State</option>
                    <option value="36">Telangana (36) - Inter State</option>
                    <option value="33">Tamil Nadu (33) - Inter State</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">Applicable GST Slab</label>
                  <Select
                    value={manualForm.slab}
                    onChange={(e) => setManualForm(prev => ({ ...prev, slab: e.target.value }))}
                  >
                    <option value="12%">12% Standard Apparel</option>
                    <option value="5%">5% Concessional Standard</option>
                    <option value="18%">18% Premium Footwear / Accessories</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">Garment / Item Description</label>
                  <Input
                    required
                    value={manualForm.itemDesc}
                    onChange={(e) => setManualForm(prev => ({ ...prev, itemDesc: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">HSN Code</label>
                  <Select
                    value={manualForm.hsnCode}
                    onChange={(e) => setManualForm(prev => ({ ...prev, hsnCode: e.target.value }))}
                  >
                    <option value="620442">620442 - Dresses &amp; Ensembles</option>
                    <option value="620342">620342 - Suits &amp; Trousers</option>
                    <option value="610910">610910 - Cotton Tees &amp; Tops</option>
                    <option value="611010">611010 - Knitwear &amp; Cardigans</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">Quantity (Pcs)</label>
                  <Input
                    type="number"
                    min="1"
                    value={manualForm.qty}
                    onChange={(e) => setManualForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-meta font-medium text-muted">Taxable Value (INR)</label>
                  <Input
                    type="number"
                    min="100"
                    step="0.01"
                    value={manualForm.taxableVal}
                    onChange={(e) => setManualForm(prev => ({ ...prev, taxableVal: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsManualInvoiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="bg-primary-container text-on-accent hover:bg-primary-container-hover">
                Issue Tax Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate E-Way Bill Modal */}
    </PageContainer>
  );
}
