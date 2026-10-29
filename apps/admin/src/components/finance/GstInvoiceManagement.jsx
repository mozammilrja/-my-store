import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../ui/dialog';
import { Alert } from '../ui/alert';
import {
  INITIAL_GST_METRICS,
  INITIAL_GST_INVOICES,
  INITIAL_HSN_MASTER,
  INITIAL_CREDIT_NOTES,
  INITIAL_EWAY_BILLS
} from '../../data/mockData';

export default function GstInvoiceManagement({ currentHub, onShowToast }) {
  const [invoices, setInvoices] = useState(INITIAL_GST_INVOICES);
  const [activeTab, setActiveTab] = useState('invoices'); // invoices, hsn, credit-notes, eway-bills, reconciliation
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('inv-gst-1');

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState('May 2024');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedHsn, setSelectedHsn] = useState('all');
  const [selectedSlab, setSelectedSlab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isManualInvoiceModalOpen, setIsManualInvoiceModalOpen] = useState(false);
  const [isEwayModalOpen, setIsEwayModalOpen] = useState(false);

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

  // E-way bill form state
  const [ewayForm, setEwayForm] = useState({
    invoiceNumber: 'INV-2024-058912',
    transporter: 'BlueDart Express (BLURAY)',
    vehicleNo: 'KA-04-MA-9921',
    distanceKm: '380',
    toState: 'Tamil Nadu (33)'
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
      hsn: {
        data: INITIAL_HSN_MASTER.map((h, idx) => ({
          num: idx + 1,
          hsn_sc: h.code,
          desc: h.description,
          uqc: 'PCS',
          rt: Number(h.rate.replace('%', ''))
        }))
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

  const handleGenerateEwayBill = (e) => {
    e.preventDefault();
    setIsEwayModalOpen(false);
    if (onShowToast) {
      onShowToast(`E-Way Bill EWB-${Math.floor(100000000000 + Math.random() * 900000000000)} generated with NIC Portal.`);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast(`${label} copied to clipboard!`);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary tracking-widest uppercase">
            <span>EVERWEAR ADMIN</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>FINANCE &amp; COMPLIANCE</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary-container font-bold">GST &amp; TAX INVOICES</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            GST Compliance, Tax Invoices &amp; E-Way Bill Management
          </h1>
          <p className="text-sm text-text-secondary max-w-4xl">
            Indian Goods and Services Tax (GST) filing reconciliation, GSTR-1 &amp; GSTR-3B audit ledger, HSN rate configuration, and credit note issuance.
          </p>
        </div>

        {/* Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadGstr1Json}
            className="gap-1.5 bg-surface-container-lowest shadow-sm"
            title="Download compliant GSTR-1 payload JSON"
          >
            <span className="material-symbols-outlined text-[16px] text-primary-container">data_object</span>
            <span>Download GSTR-1 JSON</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 bg-surface-container-lowest shadow-sm"
            title="Export Ledger Records to CSV"
          >
            <span className="material-symbols-outlined text-[16px] text-text-secondary">table_view</span>
            <span>Export Tax Ledger (CSV)</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEwayModalOpen(true)}
            className="gap-1.5 bg-surface-container-lowest shadow-sm"
            title="NIC Portal Integration"
          >
            <span className="material-symbols-outlined text-[16px] text-text-secondary">local_shipping</span>
            <span>Generate E-Way Bill</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsManualInvoiceModalOpen(true)}
            className="gap-1.5 bg-primary-container text-on-primary hover:bg-primary shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>+ Create Manual Tax Invoice</span>
          </Button>
        </div>
      </div>

      {/* ReUI Metric Stat Overview (6 KPI modules) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric 1 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-text-secondary uppercase">GROSS TAXABLE SALES</span>
              <span className="p-1 rounded-lg bg-surface-subtle text-text-secondary">
                <span className="material-symbols-outlined text-[14px]">storefront</span>
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">{INITIAL_GST_METRICS.grossTaxableSales}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="success" className="text-[10px] font-semibold px-1.5 py-0">
                  {INITIAL_GST_METRICS.grossGrowth}
                </Badge>
                <span className="text-[11px] text-text-secondary truncate">May '24 Omnichannel</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-text-secondary uppercase">TOTAL GST LIABILITY</span>
              <span className="p-1 rounded-lg bg-primary-fixed text-primary">
                <span className="material-symbols-outlined text-[14px]">account_balance</span>
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-container tracking-tight">{INITIAL_GST_METRICS.totalGstLiability}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-text-secondary font-medium">Avg Effective Rate:</span>
                <span className="text-[11px] text-primary-container font-semibold">{INITIAL_GST_METRICS.avgEffectiveRate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-text-secondary uppercase">CGST (INTRA 6%)</span>
              <span className="text-[10px] text-text-secondary">KA - 29</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">{INITIAL_GST_METRICS.cgst}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[11px] text-text-secondary">Karnataka Base Hub</span>
                <span className="text-[10px] text-status-success font-medium">Synced</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-text-secondary uppercase">SGST (INTRA 6%)</span>
              <span className="text-[10px] text-text-secondary">KA - 29</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">{INITIAL_GST_METRICS.sgst}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[11px] text-text-secondary">Karnataka Base Hub</span>
                <span className="text-[10px] text-status-success font-medium">Matched</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 5 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-text-secondary uppercase">IGST (INTER 12%/5%)</span>
              <span className="p-1 rounded-lg bg-status-info-bg text-status-info">
                <span className="material-symbols-outlined text-[14px]">flight_takeoff</span>
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary tracking-tight">{INITIAL_GST_METRICS.igst}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-text-secondary truncate">Rest of India Dispatches</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 6 */}
        <Card className="border border-border-subtle bg-surface-container-lowest">
          <CardContent className="p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-text-secondary uppercase">CREDIT REVERSALS</span>
              <span className="p-1 rounded-lg bg-status-warning-bg text-status-warning">
                <span className="material-symbols-outlined text-[14px]">sync_alt</span>
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-fashion-magenta tracking-tight">{INITIAL_GST_METRICS.creditReversals}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[11px] text-text-secondary">ITC Reclaimed:</span>
                <span className="text-[11px] text-status-success font-semibold">{INITIAL_GST_METRICS.itcReclaimed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dual-Pane Layout: 65% Main Register Table / 35% Full Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Invoices Register & Sub-tabs */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4 min-w-0">
          <Card className="border border-border-subtle bg-surface-container-lowest overflow-hidden">
            {/* Navigation Sub-Tabs */}
            <div className="px-4 pt-2 bg-surface-container-low/50 flex flex-wrap gap-1 border-b border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`px-3 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'invoices'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm border-t-2 border-primary-container'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>Tax Invoices (B2C &amp; B2B)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-primary text-[10px]">
                  {invoices.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hsn')}
                className={`px-3 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'hsn'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm border-t-2 border-primary-container'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">sell</span>
                <span>HSN Rate Master</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('credit-notes')}
                className={`px-3 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'credit-notes'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm border-t-2 border-primary-container'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                <span>Credit Notes (Returns)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-subtle text-text-secondary text-[10px]">
                  {INITIAL_CREDIT_NOTES.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('eway-bills')}
                className={`px-3 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'eway-bills'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm border-t-2 border-primary-container'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                <span>E-Way Bills</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-subtle text-text-secondary text-[10px]">
                  {INITIAL_EWAY_BILLS.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reconciliation')}
                className={`px-3 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'reconciliation'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm border-t-2 border-primary-container'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                <span>Reconciliation &amp; Mismatches</span>
                <span className="px-1.5 py-0.2 rounded-full bg-status-success-bg text-status-success text-[10px] font-bold">
                  0
                </span>
              </button>
            </div>

            {/* Filter & Search Matrix (Active when Invoices Tab is open) */}
            {activeTab === 'invoices' && (
              <div className="p-4 bg-surface-container-lowest grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center border-b border-border-subtle">
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">Financial Period</label>
                  <Select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="h-8 text-xs font-medium"
                  >
                    <option value="May 2024">May 2024 (Active)</option>
                    <option value="April 2024">April 2024 (Filed)</option>
                    <option value="March 2024">March 2024 (Reconciled)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">Place of Supply (State)</label>
                  <Select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="h-8 text-xs font-medium"
                  >
                    <option value="all">All Destination States</option>
                    <option value="Karnataka">Karnataka (29) - Intra</option>
                    <option value="Maharashtra">Maharashtra (27)</option>
                    <option value="Delhi">Delhi (07)</option>
                    <option value="Telangana">Telangana (36)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">HSN Chapter</label>
                  <Select
                    value={selectedHsn}
                    onChange={(e) => setSelectedHsn(e.target.value)}
                    className="h-8 text-xs font-medium"
                  >
                    <option value="all">All Apparel HSN</option>
                    <option value="620442">HSN 6204 (Dresses &amp; Ensembles)</option>
                    <option value="620342">HSN 6203 (Suits &amp; Trousers)</option>
                    <option value="610910">HSN 6109 (Cotton Tees)</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-text-secondary uppercase mb-1">GST Tax Slab</label>
                  <div className="flex items-center gap-1">
                    {['all', '5%', '12%', '18%'].map(slab => (
                      <button
                        key={slab}
                        type="button"
                        onClick={() => setSelectedSlab(slab)}
                        className={`flex-1 py-1 text-center rounded-md text-[11px] font-semibold transition-all ${
                          selectedSlab === slab
                            ? 'bg-primary-fixed text-primary font-bold shadow-sm'
                            : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
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
                  <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                      <TableHead className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap">Invoice Number</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap">Order Ref / Time</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap">Recipient &amp; PoS</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs whitespace-nowrap">HSN Code</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs text-right whitespace-nowrap">Taxable Val</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs text-right whitespace-nowrap">CGST + SGST</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs text-right whitespace-nowrap">IGST</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs text-right whitespace-nowrap">Total (INR)</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="py-2.5 px-3 font-semibold text-xs text-center whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border-subtle">
                    {filteredInvoices.map(inv => {
                      const isSelected = selectedInvoice?.id === inv.id;
                      return (
                        <TableRow
                          key={inv.id}
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary-fixed/20 hover:bg-primary-fixed/30 border-l-4 border-l-primary-container'
                              : 'hover:bg-surface-canvas'
                          }`}
                        >
                          <TableCell className="py-3 px-3 font-semibold text-primary-container">
                            <div className="flex items-center gap-1.5">
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>}
                              <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                            </div>
                            <span className="text-[10px] text-text-secondary block font-normal">{inv.type}</span>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <div className="font-medium text-xs text-text-primary">{inv.orderRef}</div>
                            <div className="text-[11px] text-text-secondary">{inv.dateTime}</div>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <div className="font-medium text-xs text-text-primary">{inv.customer.shortName}</div>
                            <span className="px-1.5 py-0.2 rounded-md bg-surface-subtle text-[10px] text-text-secondary">
                              {inv.posBadge}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3">
                            <span className="font-mono text-xs font-semibold text-text-primary">{inv.hsnCode}</span>
                            <span className="text-[10px] text-text-secondary block">{inv.slab} Slab</span>
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono text-xs text-text-primary">
                            ₹{inv.taxableVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono text-xs text-text-primary">
                            {inv.cgst > 0 ? (
                              <>
                                <div>₹{inv.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                <div className="text-[10px] text-text-secondary">+ ₹{inv.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                              </>
                            ) : (
                              <span className="text-text-secondary">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono text-xs text-text-primary">
                            {inv.igst > 0 ? (
                              `₹${inv.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-text-secondary">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-mono font-bold text-xs text-text-primary">
                            ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center">
                            <Badge variant={inv.status === 'Reconciled' ? 'success' : 'warning'} className="text-[10px]">
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceId(inv.id)}
                              className="p-1 rounded-lg text-text-secondary hover:text-primary-container hover:bg-surface-subtle"
                              title="Inspect Full Invoice"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Apparel GST Schedule (Notification No. 01/2017)</h3>
                  <Badge variant="success">GSTN Schedule Active</Badge>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table className="min-w-[850px] w-full border-collapse">
                    <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                        <TableHead className="font-semibold text-xs whitespace-nowrap">HSN Code</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Chapter / Garment Category</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Rate</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Threshold Rule</TableHead>
                        <TableHead className="font-semibold text-xs text-right whitespace-nowrap">Active SKUs</TableHead>
                        <TableHead className="font-semibold text-xs text-center whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody className="divide-y divide-border-subtle">
                    {INITIAL_HSN_MASTER.map(hsn => (
                      <TableRow key={hsn.code} className="hover:bg-surface-canvas">
                        <TableCell className="font-mono font-bold text-xs text-primary-container">{hsn.code}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-text-primary">{hsn.chapter}</div>
                          <div className="text-[11px] text-text-secondary">{hsn.description}</div>
                        </TableCell>
                        <TableCell className="font-bold text-xs text-text-primary">{hsn.rate}</TableCell>
                        <TableCell className="text-xs text-text-secondary">{hsn.threshold}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{hsn.activeItems}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success" className="text-[10px]">{hsn.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Credit Notes */}
            {activeTab === 'credit-notes' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Returns &amp; Cancellations Credit Ledger</h3>
                  <Badge variant="secondary">{INITIAL_CREDIT_NOTES.length} Records</Badge>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table className="min-w-[850px] w-full border-collapse">
                    <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Credit Note No</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Invoice Ref</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Customer &amp; State</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Reason</TableHead>
                        <TableHead className="font-semibold text-xs text-right whitespace-nowrap">Credit Value</TableHead>
                        <TableHead className="font-semibold text-xs text-right whitespace-nowrap">Tax Reversal</TableHead>
                        <TableHead className="font-semibold text-xs text-center whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody className="divide-y divide-border-subtle">
                    {INITIAL_CREDIT_NOTES.map(crn => (
                      <TableRow key={crn.id} className="hover:bg-surface-canvas">
                        <TableCell className="font-mono font-bold text-xs text-fashion-magenta">{crn.creditNoteNo}</TableCell>
                        <TableCell className="font-mono text-xs">{crn.invoiceRef}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-text-primary">{crn.customer}</div>
                          <div className="text-[10px] text-text-secondary">{crn.state}</div>
                        </TableCell>
                        <TableCell className="text-xs text-text-secondary">{crn.reason}</TableCell>
                        <TableCell className="font-mono text-xs text-right font-semibold">₹{crn.amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-xs text-right text-status-success font-semibold">₹{crn.taxCredit.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">{crn.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: E-Way Bills */}
            {activeTab === 'eway-bills' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Form GST EWB-01 Active Consignments</h3>
                  <Button size="sm" onClick={() => setIsEwayModalOpen(true)} className="gap-1 bg-primary-container text-on-primary">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    New E-Way Bill
                  </Button>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table className="min-w-[850px] w-full border-collapse">
                    <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                        <TableHead className="font-semibold text-xs whitespace-nowrap">E-Way Bill No</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Invoice Ref</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Transporter &amp; Vehicle</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">From / To Route</TableHead>
                        <TableHead className="font-semibold text-xs text-right whitespace-nowrap">Distance</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap">Valid Until</TableHead>
                        <TableHead className="font-semibold text-xs text-center whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody className="divide-y divide-border-subtle">
                    {INITIAL_EWAY_BILLS.map(ewb => (
                      <TableRow key={ewb.id} className="hover:bg-surface-canvas">
                        <TableCell className="font-mono font-bold text-xs text-primary-container">{ewb.ewayBillNo}</TableCell>
                        <TableCell className="font-mono text-xs">{ewb.invoiceNo}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-text-primary">{ewb.transporter}</div>
                          <div className="font-mono text-[10px] text-text-secondary">{ewb.vehicleNo}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="text-text-primary truncate max-w-[180px]">{ewb.fromGstin}</div>
                          <div className="text-text-secondary truncate max-w-[180px]">➔ {ewb.toGstin}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-right">{ewb.distance}</TableCell>
                        <TableCell className="text-[11px] text-text-secondary">{ewb.validUntil}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success" className="text-[10px]">{ewb.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Reconciliation */}
            {activeTab === 'reconciliation' && (
              <div className="p-6 space-y-4">
                <Alert variant="success" className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[24px] text-status-success">verified_user</span>
                    <div>
                      <h4 className="text-sm font-bold text-status-success">GSTR-2B vs Purchase Register 100% Reconciled</h4>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Zero ITC discrepancies found for May 2024 filing cycle. All outward sales invoice IRNs matched against GSTN portal.
                      </p>
                    </div>
                  </div>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <Card className="border border-border-subtle bg-surface-subtle p-4">
                    <div className="text-xs font-semibold text-text-secondary uppercase">GSTR-1 Generated</div>
                    <div className="text-xl font-bold text-text-primary mt-1">1,428 Invoices</div>
                    <div className="text-[11px] text-status-success mt-1">₹4,12,84,900 Sales Value</div>
                  </Card>
                  <Card className="border border-border-subtle bg-surface-subtle p-4">
                    <div className="text-xs font-semibold text-text-secondary uppercase">E-Way Bills Matched</div>
                    <div className="text-xl font-bold text-text-primary mt-1">84 Active Trips</div>
                    <div className="text-[11px] text-status-success mt-1">Zero Transporter Slips</div>
                  </Card>
                  <Card className="border border-border-subtle bg-surface-subtle p-4">
                    <div className="text-xs font-semibold text-text-secondary uppercase">Credit Reversals Reclaimed</div>
                    <div className="text-xl font-bold text-fashion-magenta mt-1">₹41,137 ITC</div>
                    <div className="text-[11px] text-text-secondary mt-1">Auto-adjusted in Table 4B</div>
                  </Card>
                </div>
              </div>
            )}

            {/* Pagination & Summary Footer */}
            <div className="p-4 bg-surface-container-lowest border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary">
              <div>
                Showing <span className="font-semibold text-text-primary">1 to {filteredInvoices.length}</span> of <span className="font-semibold text-text-primary">{invoices.length}</span> entries
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs">Prev</Button>
                <Button variant="default" size="sm" className="h-7 w-7 p-0 text-xs bg-primary-container text-on-primary">1</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">Next</Button>
              </div>
            </div>
          </Card>

          {/* HSN Rate Summary Micro-Card */}
          <Card className="border border-border-subtle bg-surface-container-lowest p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[22px]">category</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Apparel GST Rate Master Schedule (Notification No. 01/2017)</h4>
                  <p className="text-xs text-text-secondary">Fabric, silk and ready-made cotton garments valued &lt; ₹1,000 are taxed at 5%; garments &gt; ₹1,000 at 12% IGST.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] text-text-secondary uppercase">Portal Sync Status</div>
                  <div className="text-xs font-semibold text-status-success">GSTN Active • Live E-Invoicing</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: E-Invoice IRN & Compliant Tax Invoice Interactive Preview */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
          <Card className="border border-border-subtle bg-surface-container-lowest overflow-hidden shadow-sm">
            {/* Document Action Ribbon */}
            <div className="px-4 py-2 bg-surface-subtle flex items-center justify-between border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-[9px] uppercase tracking-wider font-bold">
                  ORIGINAL FOR RECIPIENT
                </Badge>
                <span className="text-[11px] text-text-secondary font-medium">{selectedInvoice?.type}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-7 w-7 p-0"
                  title="Print Tax Invoice"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onShowToast && onShowToast(`PDF downloaded for invoice ${selectedInvoice?.invoiceNumber}`)}
                  className="h-7 text-xs gap-1 bg-primary-container text-on-primary hover:bg-primary"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>PDF</span>
                </Button>
              </div>
            </div>

            {/* Invoice Body Document */}
            {selectedInvoice && (
              <div className="p-4 space-y-4 text-text-primary text-xs">
                {/* Supplier Legal Identity Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-sm tracking-tight text-text-primary">Everwear Retail Pvt. Ltd.</div>
                    <div className="text-[11px] text-text-secondary leading-snug">
                      FC-1 Warehouse, 4th Cross, Peenya Industrial Area Phase 2,<br />
                      Bengaluru, Karnataka - 560058, India
                    </div>
                    <div className="pt-1 space-y-0.5 text-[11px]">
                      <div><span className="text-text-secondary">GSTIN:</span> <span className="font-bold font-mono">29AAAAE1234F1Z5</span></div>
                      <div><span className="text-text-secondary">State / Code:</span> <span className="font-medium">Karnataka (29)</span></div>
                      <div><span className="text-text-secondary">CIN:</span> <span className="font-mono">U18101KA2021PTC148902</span></div>
                    </div>
                  </div>

                  {/* Authentic QR Code Vector */}
                  <div className="flex flex-col items-center p-2 rounded-xl bg-surface-canvas shadow-sm shrink-0 text-center">
                    <svg className="w-16 h-16 text-text-primary" fill="currentColor" viewBox="0 0 100 100">
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
                    <span className="text-[9px] text-text-secondary mt-1 font-bold tracking-wider">GSTN VERIFIED</span>
                  </div>
                </div>

                {/* IRN Hash Metadata Box */}
                <div className="p-2.5 rounded-lg bg-surface-canvas space-y-1 font-mono text-[11px] text-text-secondary border border-border-subtle">
                  <div className="flex justify-between items-center text-text-primary">
                    <span className="text-[10px] font-semibold uppercase">IRN (Invoice Ref No.):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedInvoice.irn, 'IRN')}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                  </div>
                  <div className="truncate text-[10px] text-primary-container font-medium">
                    {selectedInvoice.irn}
                  </div>
                  <div className="flex justify-between text-[10px] pt-1 border-t border-border-subtle/50">
                    <span>Ack No: <strong className="text-text-primary font-mono">{selectedInvoice.ackNo}</strong></span>
                    <span>Ack Date: <strong className="text-text-primary">{selectedInvoice.ackDate}</strong></span>
                  </div>
                </div>

                {/* Document Identity Grid */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-subtle">
                  <div>
                    <span className="text-[9px] text-text-secondary block uppercase font-semibold">Tax Invoice No</span>
                    <span className="text-sm font-bold font-mono text-text-primary">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-secondary block uppercase font-semibold">Invoice Date &amp; Time</span>
                    <span className="text-xs font-semibold text-text-primary">{selectedInvoice.dateTime}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-secondary block uppercase font-semibold">Channel Order ID</span>
                    <span className="text-xs font-medium text-text-primary">{selectedInvoice.orderRef}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-secondary block uppercase font-semibold">Place of Supply</span>
                    <span className="text-xs font-semibold text-text-primary">{selectedInvoice.shipping.posState}</span>
                  </div>
                </div>

                {/* Billing & Shipping Information */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-surface-canvas space-y-1 border border-border-subtle">
                    <span className="text-[9px] text-text-secondary uppercase font-semibold block">Billed To (Customer)</span>
                    <div className="font-semibold text-text-primary">{selectedInvoice.customer.name}</div>
                    <div className="text-text-secondary leading-snug">{selectedInvoice.customer.address}</div>
                    <div className="text-text-secondary pt-0.5">GSTIN: {selectedInvoice.customer.gstin}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-canvas space-y-1 border border-border-subtle">
                    <span className="text-[9px] text-text-secondary uppercase font-semibold block">Shipped To (Delivery Point)</span>
                    <div className="font-semibold text-text-primary">{selectedInvoice.customer.name}</div>
                    <div className="text-text-secondary leading-snug">{selectedInvoice.shipping.address}</div>
                    <div className="text-text-secondary pt-0.5">State Code: {selectedInvoice.shipping.posCode}</div>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="border border-border-subtle rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-surface-subtle font-semibold text-text-secondary">
                      <tr>
                        <th className="p-1.5">Description &amp; HSN</th>
                        <th className="p-1.5 text-center">Qty</th>
                        <th className="p-1.5 text-right">Taxable</th>
                        <th className="p-1.5 text-right">GST</th>
                        <th className="p-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {selectedInvoice.items.map(item => (
                        <tr key={item.id}>
                          <td className="p-1.5">
                            <div className="font-medium text-text-primary">{item.desc}</div>
                            <div className="text-[10px] text-text-secondary font-mono">HSN: {item.hsn}</div>
                          </td>
                          <td className="p-1.5 text-center font-mono">{item.qty}</td>
                          <td className="p-1.5 text-right font-mono">₹{item.taxable.toFixed(2)}</td>
                          <td className="p-1.5 text-right font-mono text-[10px]">
                            {item.rate} (₹{item.taxAmt.toFixed(2)})
                          </td>
                          <td className="p-1.5 text-right font-mono font-semibold">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tax Breakdown & Computation Box */}
                <div className="p-3 rounded-lg bg-surface-canvas space-y-1.5 border border-border-subtle text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Taxable Value:</span>
                    <span className="font-mono font-medium">₹{selectedInvoice.taxableVal.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.isIntra ? (
                    <>
                      <div className="flex justify-between text-text-secondary">
                        <span>Central GST (CGST 6%):</span>
                        <span className="font-mono">₹{selectedInvoice.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-text-secondary">
                        <span>State GST (SGST 6%):</span>
                        <span className="font-mono">₹{selectedInvoice.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-text-secondary">
                      <span>Integrated GST (IGST {selectedInvoice.slab}):</span>
                      <span className="font-mono">₹{selectedInvoice.igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-border-subtle flex justify-between items-center text-sm font-bold text-text-primary">
                    <span>Invoice Total (INR):</span>
                    <span className="font-mono text-base text-primary-container">
                      ₹{selectedInvoice.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Signatory & Verification Footer */}
                <div className="pt-2 flex justify-between items-end border-t border-border-subtle text-[11px] text-text-secondary">
                  <div>
                    <div>Computer Generated Invoice</div>
                    <div className="text-[10px]">Tax is payable under Reverse Charge: No</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-text-primary">For Everwear Retail Pvt. Ltd.</div>
                    <div className="text-[10px] text-status-success font-semibold mt-1">
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
      <Dialog open={isManualInvoiceModalOpen} onClose={() => setIsManualInvoiceModalOpen(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">receipt_long</span>
            <span>Create Manual Tax Invoice</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleCreateManualInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Recipient / Customer Name</label>
                <Input
                  required
                  value={manualForm.customerName}
                  onChange={(e) => setManualForm(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Phone Number</label>
                <Input
                  required
                  value={manualForm.customerPhone}
                  onChange={(e) => setManualForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Delivery / Billing Address</label>
              <Input
                required
                value={manualForm.customerAddress}
                onChange={(e) => setManualForm(prev => ({ ...prev, customerAddress: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Destination State &amp; Code</label>
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
                <label className="text-xs font-medium text-text-secondary">Applicable GST Slab</label>
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
                <label className="text-xs font-medium text-text-secondary">Garment / Item Description</label>
                <Input
                  required
                  value={manualForm.itemDesc}
                  onChange={(e) => setManualForm(prev => ({ ...prev, itemDesc: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">HSN Code</label>
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
                <label className="text-xs font-medium text-text-secondary">Quantity (Pcs)</label>
                <Input
                  type="number"
                  min="1"
                  value={manualForm.qty}
                  onChange={(e) => setManualForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Taxable Value (INR)</label>
                <Input
                  type="number"
                  min="100"
                  step="0.01"
                  value={manualForm.taxableVal}
                  onChange={(e) => setManualForm(prev => ({ ...prev, taxableVal: Number(e.target.value) }))}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsManualInvoiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="bg-primary-container text-on-primary hover:bg-primary">
                Issue Tax Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate E-Way Bill Modal */}
      <Dialog open={isEwayModalOpen} onClose={() => setIsEwayModalOpen(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">local_shipping</span>
            <span>Generate E-Way Bill (NIC Portal Integration)</span>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleGenerateEwayBill} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Source Tax Invoice</label>
              <Select
                value={ewayForm.invoiceNumber}
                onChange={(e) => setEwayForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              >
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.invoiceNumber}>
                    {inv.invoiceNumber} • {inv.customer.name} (₹{inv.total.toFixed(2)})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Transporter Partner</label>
                <Input
                  value={ewayForm.transporter}
                  onChange={(e) => setEwayForm(prev => ({ ...prev, transporter: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Vehicle Number</label>
                <Input
                  value={ewayForm.vehicleNo}
                  onChange={(e) => setEwayForm(prev => ({ ...prev, vehicleNo: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Approximate Distance (km)</label>
                <Input
                  type="number"
                  value={ewayForm.distanceKm}
                  onChange={(e) => setEwayForm(prev => ({ ...prev, distanceKm: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Destination State</label>
                <Input
                  value={ewayForm.toState}
                  onChange={(e) => setEwayForm(prev => ({ ...prev, toState: e.target.value }))}
                />
              </div>
            </div>

            <Alert variant="info" className="text-xs">
              Part-A and Part-B will be synchronized directly to the NIC e-Way Bill System under Everwear Retail GSTIN 29AAAAE1234F1Z5.
            </Alert>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEwayModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="bg-primary-container text-on-primary hover:bg-primary">
                Transmit &amp; Print EWB-01
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
