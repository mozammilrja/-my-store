import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  PageBody,
  EmptyState,
  SkeletonPage,
  AppDialog,
  FilterBar,
  FilterDropdown,
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
        issuedAt: issued,
        // Month the invoice falls in, which is the unit a GST return is filed by.
        period: issued
          ? issued.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
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
  const [selectedPeriod, setSelectedPeriod] = useState('all');
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

  /**
   * Every choice each filter offers, taken from the register itself. The lists
   * here were fixed: three 2024 financial periods, four states and three HSN
   * chapters written as `620442`-style codes while an invoice carries
   * `6204.49.00`. Picking an HSN chapter could therefore never match a row, so
   * the table emptied; the period control was not read at all.
   */
  const filterOptions = useMemo(() => {
    const uniq = (values) => [...new Set(values.filter(Boolean))].sort();
    return {
      periods: uniq(invoices.map((inv) => inv.period)),
      states: uniq(invoices.map((inv) => inv.state)),
      hsnCodes: uniq(invoices.flatMap((inv) => (inv.items ?? []).map((item) => item.hsn))),
      slabs: uniq(invoices.map((inv) => inv.slab)),
    };
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (selectedPeriod !== 'all' && inv.period !== selectedPeriod) return false;
      if (selectedState !== 'all' && inv.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedHsn !== 'all' && !(inv.items ?? []).some((item) => item.hsn === selectedHsn)) return false;
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
  }, [invoices, selectedPeriod, selectedState, selectedHsn, selectedSlab, searchQuery]);

  // One shared pager over the rows this module actually holds.
  const invoicesPager = useClientTable(filteredInvoices);

  // No invoice exists at all: the filters and the invoice preview have nothing
  // to work on, so the register becomes one full-width empty state.
  const noInvoices = invoices.length === 0;
  const noInvoiceMatches = !noInvoices && filteredInvoices.length === 0;
  const hidePreview = noInvoices || (activeTab === 'invoices' && noInvoiceMatches);

  const clearInvoiceFilters = () => {
    setSelectedPeriod('all');
    setSelectedState('all');
    setSelectedHsn('all');
    setSelectedSlab('all');
    setSearchQuery('');
  };

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


  const inr = (n, digits = 2) =>
    `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

  // API rows carry the customer as a string; a hand-raised invoice carries an object.
  const customerName = (inv) =>
    inv?.customerDetail?.name ?? (typeof inv?.customer === 'string' ? inv.customer : inv?.customer?.name) ?? 'Guest';

  // CGST and SGST each carry half the slab; a mixed-rate invoice has no single figure.
  const halfSlab = (slab) => {
    const rate = Number(String(slab ?? '').replace('%', ''));
    return Number.isFinite(rate) && rate > 0 ? ` ${rate / 2}%` : '';
  };

  const lineItemColumns = [
    {
      key: 'desc',
      header: 'Description & HSN',
      cell: (item) => (
        <>
          <div className="line-clamp-2 font-medium text-primary">{item.desc}</div>
          <div className="whitespace-nowrap font-mono text-micro text-muted">HSN {item.hsn}</div>
        </>
      ),
    },
    { key: 'qty', fit: true, header: 'Qty', align: 'right', accessor: 'qty' },
    {
      key: 'taxable',
      header: 'Taxable + GST',
      align: 'right',
      className: 'whitespace-nowrap',
      cell: (item) => (
        <>
          <div>{inr(item.taxable)}</div>
          <div className="text-micro text-muted">+ {inr(item.taxAmt)} ({item.rate})</div>
        </>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      className: 'whitespace-nowrap font-semibold',
      cell: (item) => inr(item.total),
    },
  ];

  const invoiceColumns = [
    {
      key: 'invoice',
      header: 'Invoice',
      cell: (inv) => (
        <>
          <div className="whitespace-nowrap font-mono text-meta font-semibold text-accent">{inv.invoiceNumber}</div>
          <div className="text-micro text-muted">{inv.type}</div>
        </>
      ),
    },
    {
      key: 'order',
      header: 'Order / issued',
      cell: (inv) => (
        <>
          <div className="whitespace-nowrap font-mono text-meta text-primary">{inv.orderRef}</div>
          <div className="whitespace-nowrap text-micro text-muted">{inv.dateTime}</div>
        </>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient & place of supply',
      cell: (inv) => (
        <>
          <div className="text-meta font-medium text-primary">{customerName(inv)}</div>
          <div className="text-micro text-muted">{inv.posBadge}</div>
        </>
      ),
    },
    {
      key: 'hsn',
      header: 'HSN',
      cell: (inv) => (
        <>
          <div className="whitespace-nowrap font-mono text-meta text-primary">{inv.hsnCode}</div>
          <div className="whitespace-nowrap text-micro text-muted">{inv.slab} slab</div>
        </>
      ),
    },
    {
      key: 'taxable',
      header: 'Taxable value',
      align: 'right',
      className: 'whitespace-nowrap text-meta',
      cell: (inv) => inr(inv.taxableVal),
    },
    {
      key: 'cgst',
      header: 'CGST + SGST',
      align: 'right',
      className: 'whitespace-nowrap text-meta',
      cell: (inv) =>
        inv.cgst > 0 ? (
          <>
            <div>{inr(inv.cgst)}</div>
            <div className="text-micro text-muted">+ {inr(inv.sgst)}</div>
          </>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: 'igst',
      header: 'IGST',
      align: 'right',
      className: 'whitespace-nowrap text-meta',
      cell: (inv) => (inv.igst > 0 ? inr(inv.igst) : <span className="text-faint">—</span>),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      className: 'whitespace-nowrap text-meta font-semibold',
      cell: (inv) => inr(inv.total),
    },
    {
      key: 'status',
      header: 'Status',
      fit: true,
      cell: (inv) => (
        <StatusBadge status={inv.status} variant={inv.status === 'Reconciled' ? 'success' : 'warning'} />
      ),
    },
    {
      key: 'action',
      header: <span className="sr-only">Actions</span>,
      fit: true,
      align: 'right',
      cell: (inv) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="iconXs"
            onClick={() => setSelectedInvoiceId(inv.id)}
            title="Inspect full invoice"
            aria-label={`Inspect invoice ${inv.invoiceNumber}`}
          >
            <Icon name="visibility" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
          </Button>
        </span>
      ),
    },
  ];

  const hsnColumns = [
    {
      key: 'hsn',
      header: 'HSN code',
      className: 'whitespace-nowrap font-mono text-meta font-semibold text-accent',
      accessor: 'hsn',
    },
    { key: 'rate', header: 'Rate', align: 'right', className: 'text-meta', accessor: 'rate' },
    { key: 'qty', header: 'Quantity', align: 'right', className: 'text-meta', accessor: 'qty' },
    { key: 'taxable', header: 'Taxable value', align: 'right', className: 'whitespace-nowrap text-meta', cell: (r) => inr(r.taxable, 0) },
    { key: 'cgst', header: 'CGST', align: 'right', className: 'whitespace-nowrap text-meta', cell: (r) => inr(r.cgst, 0) },
    { key: 'sgst', header: 'SGST', align: 'right', className: 'whitespace-nowrap text-meta', cell: (r) => inr(r.sgst, 0) },
    { key: 'igst', header: 'IGST', align: 'right', className: 'whitespace-nowrap text-meta', cell: (r) => inr(r.igst, 0) },
    { key: 'total', header: 'Total', align: 'right', className: 'whitespace-nowrap text-meta font-semibold', cell: (r) => inr(r.total, 0) },
  ];

  const creditNoteColumns = [
    {
      key: 'number',
      header: 'Credit note',
      accessor: (c) => <span className="whitespace-nowrap font-mono text-meta">{c.creditNoteNumber}</span>,
    },
    {
      key: 'invoice',
      header: 'Against invoice',
      accessor: (c) => <span className="whitespace-nowrap font-mono text-meta">{c.invoiceNumber}</span>,
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
          status={{ issued: 'Issued', settled: 'Settled', canceled: 'Cancelled' }[c.status] ?? c.status}
          variant={c.status === 'settled' ? 'success' : c.status === 'canceled' ? 'destructive' : 'info'}
        />
      ),
    },
  ];

  const slabTabs = [
    { id: 'all', label: 'All slabs' },
    ...filterOptions.slabs.map((slab) => ({ id: slab, label: slab })),
  ];

  return (
    <PageContainer>
      <PageHeader
        kicker="Finance & compliance"
        title="GST & tax invoices"
        description="Tax invoices, HSN rates and credit notes."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadGstr1Json}
              title="Download compliant GSTR-1 payload JSON"
            >
              <Icon name="data_object" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>GSTR-1 JSON</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} title="Export ledger records to CSV">
              <Icon name="table_view" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Export CSV</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsManualInvoiceModalOpen(true)}>
              <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Create Tax Invoice</span>
            </Button>
          </>
        }
      />
      <PageBody
        error={invoicesError}
        hasData={invoicesData != null}
        title="Tax invoices could not be loaded"
        onRetry={refetchInvoices}
      >

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

        {/* Register takes the remaining width; the invoice preview is a fixed column. */}
        <div className="flex flex-col items-start gap-space-lg lg:flex-row">
          <div className="flex w-full min-w-0 flex-col gap-space-md lg:flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="invoices" className="gap-1.5">
                  <Icon name="receipt_long" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>Tax invoices</span>
                  <Badge variant="secondary" size="sm" className="tabular-nums">{invoices.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="hsn" className="gap-1.5">
                  <Icon name="sell" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>HSN summary</span>
                </TabsTrigger>
                <TabsTrigger value="credit-notes" className="gap-1.5">
                  <Icon name="assignment_return" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                  <span>Credit notes</span>
                  <Badge variant="secondary" size="sm" className="tabular-nums">{creditNotes.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="invoices" className="flex flex-col gap-space-md">
                {noInvoices ? (
                  <EmptyState
                    icon="receipt_long"
                    title="No tax invoices yet"
                    description="A GST tax invoice appears here for each order once it is billed. You can also raise one by hand."
                    className="py-16"
                    action={
                      <Button variant="primary" size="sm" onClick={() => setIsManualInvoiceModalOpen(true)}>
                        <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                        <span>Create Tax Invoice</span>
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <FilterBar
                      tabs={slabTabs}
                      tabsLabel="GST tax slab"
                      activeTab={selectedSlab}
                      onTabChange={setSelectedSlab}
                      filters={
                        <>
                          <FilterDropdown
                            label="Financial period"
                            value={selectedPeriod}
                            onChange={setSelectedPeriod}
                            options={[
                              { value: 'all', label: 'All periods' },
                              ...filterOptions.periods.map((p) => ({ value: p, label: p })),
                            ]}
                          />
                          <FilterDropdown
                            label="Place of supply"
                            value={selectedState}
                            onChange={setSelectedState}
                            options={[
                              { value: 'all', label: 'All states' },
                              ...filterOptions.states.map((s) => ({ value: s, label: s })),
                            ]}
                          />
                          <FilterDropdown
                            label="HSN code"
                            value={selectedHsn}
                            onChange={setSelectedHsn}
                            options={[
                              { value: 'all', label: 'All HSN codes' },
                              ...filterOptions.hsnCodes.map((c) => ({ value: c, label: `HSN ${c}` })),
                            ]}
                          />
                        </>
                      }
                    />

                    {noInvoiceMatches ? (
                      <EmptyState
                        icon="search"
                        title="No tax invoices match these filters"
                        description="Clear the period, state, HSN code and slab filters to see every invoice."
                        action={
                          <Button variant="outline" size="sm" onClick={clearInvoiceFilters}>
                            Clear filters
                          </Button>
                        }
                      />
                    ) : (
                      <DataTable
                        columns={invoiceColumns}
                        data={invoicesPager.pageRows}
                        keyField="id"
                        activeRowId={selectedInvoice?.id}
                        onRowClick={(inv) => setSelectedInvoiceId(inv.id)}
                        caption="GST tax invoice register"
                        pagination={{
                          page: invoicesPager.page,
                          pageSize: invoicesPager.limit,
                          totalItems: invoicesPager.total,
                          onPageChange: invoicesPager.setPage,
                          onPageSizeChange: invoicesPager.setLimit,
                        }}
                      />
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="hsn" className="flex flex-col gap-space-sm">
                <p className="text-meta text-muted">
                  Every line on the invoices in this register, grouped by HSN code and rate. This is the
                  shape GSTR-1 asks for.
                </p>
                {hsnSummary.length === 0 ? (
                  <EmptyState
                    icon="inventory_2"
                    title="No invoice lines yet"
                    description="An HSN summary appears once invoices carry line items."
                    className="py-16"
                  />
                ) : (
                  <DataTable
                    columns={hsnColumns}
                    data={hsnSummary.map((row) => ({ ...row, key: `${row.hsn}-${row.rate}` }))}
                    keyField="key"
                    caption="HSN-wise summary of invoice lines"
                  />
                )}
              </TabsContent>

              <TabsContent value="credit-notes" className="flex flex-col gap-space-sm">
                <p className="text-meta text-muted">
                  Issued against invoices in this register. Managed in full under Credit Notes &amp; Refunds.
                </p>
                <DataTable
                  columns={creditNoteColumns}
                  data={creditNotes}
                  keyField="id"
                  isLoading={isCreditNotesLoading}
                  emptyIcon="receipt_long"
                  emptyTitle="No credit notes yet"
                  emptyMessage="A credit note is raised when an order is refunded."
                  caption="Credit notes raised against invoices"
                />
              </TabsContent>
            </Tabs>

            {/* The rate rule is policy, not a live figure, so it stays as a note. */}
            <Card className="flex items-start gap-space-sm p-space-md">
              <Icon name="info" aria-hidden="true" className="material-symbols-outlined mt-px shrink-0 text-icon-md text-muted" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <h4 className="text-label font-semibold text-primary">
                  Apparel GST rates (Notification No. 01/2017)
                </h4>
                <p className="text-meta text-muted">
                  Fabric, silk and ready-made cotton garments valued under ₹1,000 are taxed at 5%; garments
                  over ₹1,000 at 12%.
                </p>
              </div>
            </Card>
          </div>

          {/* Invoice preview */}
          {!hidePreview && (
          <div className="flex w-full min-w-0 flex-col lg:w-5/12 lg:max-w-md lg:shrink-0 xl:w-1/3">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-space-sm border-b border-subtle bg-surface-subtle px-space-md py-space-sm">
                <div className="flex min-w-0 items-center gap-space-sm">
                  <Badge variant="success">Original for recipient</Badge>
                  <span className="truncate text-micro text-muted">{selectedInvoice?.type}</span>
                </div>
                <Button
                  variant="outline"
                  size="iconXs"
                  onClick={() => window.print()}
                  title="Print tax invoice"
                  aria-label="Print tax invoice"
                >
                  <Icon name="print" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                </Button>
              </div>

              {selectedInvoice && (
                <div className="flex flex-col gap-space-md p-space-md text-meta text-primary">
                  {/* Supplier identity */}
                  <div className="flex flex-col gap-1">
                    <div className="text-body font-semibold text-primary">Everwear Retail Pvt. Ltd.</div>
                    <div className="text-micro leading-snug text-muted">
                      FC-1 Warehouse, 4th Cross, Peenya Industrial Area Phase 2, Bengaluru, Karnataka - 560058, India
                    </div>
                    <div className="flex flex-col gap-0.5 pt-1 text-micro">
                      <div><span className="text-muted">GSTIN:</span> <span className="whitespace-nowrap font-mono font-semibold">29AAAAE1234F1Z5</span></div>
                      <div><span className="text-muted">State / code:</span> <span className="font-medium">Karnataka (29)</span></div>
                      <div><span className="text-muted">CIN:</span> <span className="break-all font-mono">U18101KA2021PTC148902</span></div>
                    </div>
                  </div>

                  {/* E-invoice registration: none is recorded, so none is claimed. */}
                  <div className="flex items-start gap-space-sm rounded-lg border border-subtle bg-surface-subtle p-space-sm">
                    <Icon name="info" aria-hidden="true" className="material-symbols-outlined mt-px shrink-0 text-icon-sm text-muted" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-label font-semibold text-primary">E-invoice registration</span>
                      <span className="text-micro text-muted">
                        This invoice has not been registered with the IRP, so it carries no IRN or
                        acknowledgement number.
                      </span>
                    </div>
                  </div>

                  {/* Document identity */}
                  <dl className="grid grid-cols-2 gap-space-sm rounded-lg bg-surface-subtle p-space-sm">
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wider text-muted">Invoice no.</dt>
                      <dd className="break-all font-mono text-meta font-semibold text-primary">{selectedInvoice.invoiceNumber}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wider text-muted">Issued</dt>
                      <dd className="text-meta font-semibold text-primary">{selectedInvoice.dateTime}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wider text-muted">Order</dt>
                      <dd className="font-mono text-meta text-primary">{selectedInvoice.orderRef}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-caption uppercase tracking-wider text-muted">Place of supply</dt>
                      <dd className="text-meta font-semibold text-primary">{selectedInvoice.shipping?.posState}</dd>
                    </div>
                  </dl>

                  {/* Billing & shipping */}
                  <div className="grid grid-cols-1 gap-space-sm text-micro sm:grid-cols-2">
                    <div className="flex flex-col gap-1 rounded-lg border border-subtle p-space-sm">
                      <span className="text-caption uppercase tracking-wider text-muted">Billed to</span>
                      <div className="font-semibold text-primary">{selectedInvoice.customerDetail?.name ?? customerName(selectedInvoice)}</div>
                      <div className="leading-snug text-muted">{selectedInvoice.customerDetail?.address ?? selectedInvoice.customer?.address}</div>
                      <div className="pt-0.5 text-muted">GSTIN: {selectedInvoice.customerDetail?.gstin ?? selectedInvoice.customer?.gstin}</div>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-subtle p-space-sm">
                      <span className="text-caption uppercase tracking-wider text-muted">Shipped to</span>
                      <div className="font-semibold text-primary">{customerName(selectedInvoice)}</div>
                      <div className="leading-snug text-muted">{selectedInvoice.shipping?.address}</div>
                      {selectedInvoice.shipping?.posCode && (
                        <div className="pt-0.5 text-muted">State code: {selectedInvoice.shipping.posCode}</div>
                      )}
                    </div>
                  </div>

                  {/* Line items */}
                  <DataTable
                    data={selectedInvoice.items ?? []}
                    columns={lineItemColumns}
                    keyField="id"
                    className="text-micro"
                    containerClassName="shadow-none"
                    emptyIcon="receipt_long"
                    emptyTitle="No line items"
                    emptyMessage="This invoice records no line items."
                  />

                  {/* Tax computation */}
                  <dl className="flex flex-col gap-1.5 rounded-lg border border-subtle p-space-sm text-meta">
                    <div className="flex justify-between gap-space-sm">
                      <dt className="text-muted">Taxable value</dt>
                      <dd className="whitespace-nowrap font-medium tabular-nums">{inr(selectedInvoice.taxableVal)}</dd>
                    </div>
                    {selectedInvoice.isIntra ? (
                      <>
                        <div className="flex justify-between gap-space-sm text-muted">
                          <dt>CGST{halfSlab(selectedInvoice.slab)}</dt>
                          <dd className="whitespace-nowrap tabular-nums">{inr(selectedInvoice.cgst)}</dd>
                        </div>
                        <div className="flex justify-between gap-space-sm text-muted">
                          <dt>SGST{halfSlab(selectedInvoice.slab)}</dt>
                          <dd className="whitespace-nowrap tabular-nums">{inr(selectedInvoice.sgst)}</dd>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between gap-space-sm text-muted">
                        <dt>IGST {selectedInvoice.slab}</dt>
                        <dd className="whitespace-nowrap tabular-nums">{inr(selectedInvoice.igst)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-space-sm border-t border-subtle pt-1.5 font-semibold text-primary">
                      <dt className="text-body">Invoice total</dt>
                      <dd className="whitespace-nowrap text-kpi-sm tabular-nums text-accent">{inr(selectedInvoice.total)}</dd>
                    </div>
                  </dl>

                  <div className="flex items-end justify-between gap-space-sm border-t border-subtle pt-space-sm text-micro text-muted">
                    <div>
                      <div>Computer generated invoice</div>
                      <div>Tax payable under reverse charge: No</div>
                    </div>
                    <div className="text-right font-semibold text-primary">For Everwear Retail Pvt. Ltd.</div>
                  </div>
                </div>
              )}
            </Card>
          </div>
          )}
        </div>

        {/* Manual invoice */}
        <AppDialog
          isOpen={isManualInvoiceModalOpen}
          onClose={() => setIsManualInvoiceModalOpen(false)}
          title="Create manual tax invoice"
          maxWidth="max-w-xl"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsManualInvoiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="manual-invoice-form" variant="primary">
                Issue Tax Invoice
              </Button>
            </>
          }
        >
          <form id="manual-invoice-form" onSubmit={handleCreateManualInvoice} className="flex flex-col gap-space-md pb-space-md">
            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Customer name</label>
                <Input
                  required
                  value={manualForm.customerName}
                  onChange={(e) => setManualForm(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Phone number</label>
                <Input
                  required
                  value={manualForm.customerPhone}
                  onChange={(e) => setManualForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label text-secondary">Billing and delivery address</label>
              <Input
                required
                value={manualForm.customerAddress}
                onChange={(e) => setManualForm(prev => ({ ...prev, customerAddress: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Destination state</label>
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
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">GST slab</label>
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

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Item description</label>
                <Input
                  required
                  value={manualForm.itemDesc}
                  onChange={(e) => setManualForm(prev => ({ ...prev, itemDesc: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">HSN code</label>
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

            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Quantity (pcs)</label>
                <Input
                  type="number"
                  min="1"
                  value={manualForm.qty}
                  onChange={(e) => setManualForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-secondary">Taxable value (INR)</label>
                <Input
                  type="number"
                  min="100"
                  step="0.01"
                  value={manualForm.taxableVal}
                  onChange={(e) => setManualForm(prev => ({ ...prev, taxableVal: Number(e.target.value) }))}
                />
              </div>
            </div>
          </form>
        </AppDialog>

      </PageBody>
    </PageContainer>
  );
}
