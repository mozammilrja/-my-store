import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { INITIAL_RETURNS } from '../../data/mockData';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
  Progress,
} from '../ui';

export function ReturnsAndExchanges({ onShowToast, currentHub }) {
  const [returnsList, setReturnsList] = useState(INITIAL_RETURNS);
  const [selectedReturnId, setSelectedReturnId] = useState('RET-2024-89211');
  const [activeTab, setActiveTab] = useState('Pending QC');
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [dispositionFilter, setDispositionFilter] = useState('All');
  const [refundFilter, setRefundFilter] = useState('All');
  const [manualReturnOpen, setManualReturnOpen] = useState(false);

  // Manual return modal state
  const [newOrderRef, setNewOrderRef] = useState('EVR-984210-BLR');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newProduct, setNewProduct] = useState('Mulberry Silk Pleated Midi Dress');
  const [newReason, setNewReason] = useState('Size/Fit Issue');
  const [newRefundAmount, setNewRefundAmount] = useState(2799);
  const [newUpiId, setNewUpiId] = useState('customer@upi');

  // Currently inspected return item
  const activeReturn = useMemo(() => {
    return returnsList.find(r => r.id === selectedReturnId) || returnsList[0];
  }, [returnsList, selectedReturnId]);

  // Checklist state for active return
  const [checklist, setChecklist] = useState({
    tags: true,
    clean: true,
    zeroDefect: true,
  });

  // Selected disposition grade
  const [selectedGrade, setSelectedGrade] = useState('A');

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returnsList.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesOrder = item.orderRef.toLowerCase().includes(q);
        const matchesCustomer = item.customer.name.toLowerCase().includes(q);
        const matchesAwb = item.courier.awb.toLowerCase().includes(q);
        if (!matchesId && !matchesOrder && !matchesCustomer && !matchesAwb) return false;
      }
      if (reasonFilter !== 'All' && item.returnReason !== reasonFilter) {
        return false;
      }
      return true;
    });
  }, [returnsList, searchQuery, reasonFilter]);

  const handleApproveRefund = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#059669', '#10b981', '#6d28d9', '#2563eb']
    });

    setReturnsList(prev => prev.map(r => {
      if (r.id === activeReturn.id) {
        return {
          ...r,
          qcStatus: `Passed Grade ${selectedGrade}`,
          qcGrade: selectedGrade,
        };
      }
      return r;
    }));

    onShowToast({
      type: 'success',
      title: 'Refund Disbursed Instantly',
      message: `₹${activeReturn.refundValue.toLocaleString('en-IN')} sent via ${activeReturn.settlementEngine} to ${activeReturn.customer.upiId}. Grade ${selectedGrade} inventory restocked.`,
      duration: 5000,
    });
  };

  const handleConvertToCredit = () => {
    const bonus = Math.round(activeReturn.refundValue * 1.1);
    onShowToast({
      type: 'info',
      title: 'Store Credit Issued',
      message: `Added ₹${bonus.toLocaleString('en-IN')} (+10% loyalty bonus) to ${activeReturn.customer.name}'s Everwear Wallet.`,
    });
  };

  const handleRejectReturn = () => {
    onShowToast({
      type: 'danger',
      title: 'Return Rejected',
      message: `Flagged ${activeReturn.id} for QC non-compliance. RTO return parcel routed back to customer.`,
    });
  };

  const handleBulkQcPass = () => {
    onShowToast({
      type: 'success',
      title: 'Bulk QC Verified',
      message: '14 staged Grade-A items approved and sent to automated bin replenishment queue.',
    });
  };

  const handleExportCsv = () => {
    const headers = ["Return ID", "Order Ref", "Customer Name", "Customer City", "Product", "Variant", "Reason", "Refund Value", "Courier", "AWB", "QC Status"];
    const rows = returnsList.map(r => [
      r.id,
      r.orderRef,
      `"${r.customer.name}"`,
      `"${r.customer.location}"`,
      `"${r.productTitle}"`,
      `"${r.variant}"`,
      `"${r.returnReason}"`,
      r.refundValue,
      r.courier.partner,
      r.courier.awb,
      `"${r.qcStatus}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Everwear_Reverse_Logistics_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast({
      type: 'success',
      title: 'Reverse Manifest Exported',
      message: `Downloaded CSV with ${returnsList.length} reverse logistics records.`,
    });
  };

  const handleCreateReturn = (e) => {
    e.preventDefault();
    if (!newCustomerName) return;

    const randomId = `RET-2024-${Math.floor(10000 + Math.random() * 90000)}`;
    const newEntry = {
      id: randomId,
      orderRef: newOrderRef || 'EVR-984210-BLR',
      productTitle: newProduct,
      variant: 'Standard Fashion Variant',
      customer: {
        name: newCustomerName,
        location: `${currentHub.location.split(' ')[0]}, India`,
        phone: '+91 98800•••••',
        upiId: newUpiId || 'customer@upi'
      },
      courier: {
        partner: 'BlueDart Express',
        awb: `REV${Math.floor(1000000 + Math.random() * 9000000)}`,
        dockStatus: 'Delivered to Dock'
      },
      qcStatus: 'Pending Grading',
      qcGrade: null,
      refundValue: Number(newRefundAmount),
      settlementEngine: 'Razorpay Instant UPI',
      paymentMethod: 'Razorpay UPI',
      returnReason: newReason,
      customerNote: 'Manual concierge return logged at hub dock station.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRc7p8-sFVXf_4tMKl_INWCswdgvyHVPmUN_QEIGfHhb-FdAAYqf-IJW6dDBOp8Oq8upu2YDuVnnNI_yA6V_cjyzBcP9y2WUAP50JmlnjYjXgR8Xe5UTSI_zsJUdaQeg-KJMo8tCAwhjaXR9V6nKKhmYZJy5F-BcetGkiRPBb41ZlKtAH5QVFcGVl3b8HsgOQEN36lKupdRUArLfZkGbfWb_cJPLWGj371Ao8_U7zJ',
      checklist: { tags: true, clean: true, zeroDefect: true },
      timeline: [
        { step: 'Manual Return Ingested', time: 'Just now', actor: `Dispatcher: ${currentHub.leadDispatcher}`, color: 'bg-status-success' },
        { step: 'Received in Hub Dock', time: 'Just now', actor: currentHub.id, color: 'bg-primary-container' }
      ]
    };

    setReturnsList([newEntry, ...returnsList]);
    setSelectedReturnId(newEntry.id);
    setManualReturnOpen(false);

    onShowToast({
      type: 'success',
      title: 'Return Request Created',
      message: `Return ${newEntry.id} logged for ${newCustomerName}. Dock station assigned.`,
    });
  };

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Editorial Header & Action Ribbon */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-2">
          <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-widest uppercase">EVERWEAR ADMIN</span>
          <span className="text-text-secondary font-label-xs-caps text-[10px]">/</span>
          <span className="font-label-xs-caps text-label-xs-caps text-text-secondary tracking-widest uppercase">FULFILLMENT & ORDERS</span>
          <span className="text-text-secondary font-label-xs-caps text-[10px]">/</span>
          <span className="font-label-xs-caps text-label-xs-caps text-primary font-semibold tracking-widest uppercase">RETURNS & EXCHANGES</span>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pt-1">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
              Returns, Reverse Logistics & Refund Operations
            </h1>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 max-w-3xl">
              End-to-end customer return lifecycle: pickup dispatch, QC grading, inventory disposition, and instant UPI/bank refund disbursement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkQcPass}
              className="gap-1.5 h-9"
            >
              <span className="material-symbols-outlined text-[16px] text-status-success">verified</span>
              <span>Bulk QC Pass</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 h-9"
            >
              <span className="material-symbols-outlined text-[16px] text-text-secondary">file_download</span>
              <span>Export Reverse Manifest (CSV)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast({ type: 'info', title: 'RTO Telemetry', message: 'Current RTO Rate is 1.62% nationwide. Top reason: Customer Unreachable.' })}
              className="gap-1.5 h-9"
            >
              <span className="material-symbols-outlined text-[16px] text-text-secondary">summarize</span>
              <span>RTO Summary</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setManualReturnOpen(true)}
              className="gap-1.5 h-9 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Initiate Manual Return</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 6 Metrical Pulse Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-md">
        <Card className="hover:border-primary/30 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">Total Requests</span>
              <span className="p-1 rounded-md bg-surface-subtle text-text-secondary material-symbols-outlined text-[16px]">
                swap_horizontal_circle
              </span>
            </div>
            <div className="mt-2">
              <div className="font-metric-stat text-metric-stat text-text-primary tabular-nums">1,420</div>
              <div className="flex items-center gap-1 mt-1 font-label-sm text-[11px] text-status-success">
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                <span>1.8% rate (-0.4% MoM)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">Awaiting Pickup</span>
              <span className="p-1 rounded-md bg-status-warning-bg text-status-warning material-symbols-outlined text-[16px]">
                schedule
              </span>
            </div>
            <div className="mt-2">
              <div className="font-metric-stat text-metric-stat text-text-primary tabular-nums">412</div>
              <div className="font-label-sm text-[11px] text-text-secondary truncate mt-1">BlueDart / Delhivery SLA</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">In-Transit to FC</span>
              <span className="p-1 rounded-md bg-status-info-bg text-status-info material-symbols-outlined text-[16px]">
                local_shipping
              </span>
            </div>
            <div className="mt-2">
              <div className="font-metric-stat text-metric-stat text-text-primary tabular-nums">328</div>
              <div className="font-label-sm text-[11px] text-text-secondary truncate mt-1">Dock arrival 24-48h</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">Inbound QC Dock</span>
              <span className="p-1 rounded-md bg-surface-subtle text-primary material-symbols-outlined text-[16px]">
                rule
              </span>
            </div>
            <div className="mt-2">
              <div className="font-metric-stat text-metric-stat text-text-primary tabular-nums">186</div>
              <div className="flex items-center gap-1 mt-1 font-label-sm text-[11px] text-status-warning">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-warning"></span>
                <span>Pending grading</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-rose-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">Refund Approval</span>
              <span className="p-1 rounded-md bg-status-danger-bg text-status-danger material-symbols-outlined text-[16px]">
                account_balance_wallet
              </span>
            </div>
            <div className="mt-2">
              <div className="font-metric-stat text-metric-stat text-status-danger tabular-nums">94</div>
              <div className="font-label-sm text-[11px] text-text-secondary truncate mt-1">₹3,14,200 pending</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">Restocked (MTD)</span>
              <span className="p-1 rounded-md bg-status-success-bg text-status-success material-symbols-outlined text-[16px]">
                inventory_2
              </span>
            </div>
            <div className="mt-2">
              <div className="font-metric-stat text-metric-stat text-text-primary tabular-nums">
                864 <span className="font-body-sm text-[13px] text-text-secondary font-normal">pcs</span>
              </div>
              <div className="font-label-sm text-[11px] text-status-success truncate mt-1">61% Grade-A recovery</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Array & Queue Triage Tabs */}
      <Card>
        <CardContent className="p-space-md space-y-space-sm">
          <div className="flex items-center justify-between gap-space-md overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-1.5 text-label-sm font-label-sm shrink-0">
              {[
                { label: 'All Returns', count: '1,420' },
                { label: 'Pending QC', count: '186', active: true },
                { label: 'Refund Queue', count: '94', danger: true },
                { label: 'Exchanges', count: '142' },
                { label: 'Completed', count: '840' },
                { label: 'Rejected / Fraud RTO', count: '48' },
              ].map((tab) => {
                const isTabActive = activeTab === tab.label;
                return (
                  <button
                    key={tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs whitespace-nowrap ${
                      isTabActive
                        ? 'bg-primary-container text-on-primary shadow-xs'
                        : tab.danger
                        ? 'text-status-danger bg-status-danger-bg hover:bg-rose-100'
                        : 'bg-surface-subtle text-text-primary hover:bg-surface-container'
                    }`}
                    type="button"
                  >
                    {tab.label} <span className={`ml-1 font-semibold ${isTabActive ? 'bg-white/20 px-1 rounded-full text-white' : 'opacity-80'}`}>{tab.count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">Dock Speed</span>
              <Badge variant="success" className="text-xs font-semibold">
                11.4 min / SKU QC
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm pt-2">
            <div className="md:col-span-4 relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-text-secondary text-[18px]">search</span>
              <Input
                className="pl-9 h-9 bg-surface-canvas text-xs"
                placeholder="Search Return ID, Order Ref, Customer, AWB..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="All">All Return Reasons (5 Types)</option>
                <option value="Size/Fit Issue">Size/Fit Issue</option>
                <option value="Fabric/Quality Defect">Fabric/Quality Defect</option>
                <option value="Color Mismatch">Color Mismatch</option>
                <option value="Damaged in Transit">Damaged in Transit</option>
                <option value="Buyer Remorse">Buyer Remorse</option>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select
                value={dispositionFilter}
                onChange={(e) => setDispositionFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="All">All Dispositions</option>
                <option value="Restock Grade A (Pristine)">Restock Grade A (Pristine)</option>
                <option value="Refurbish/Steam Grade B">Refurbish/Steam Grade B</option>
                <option value="Liquidation/Scrap Grade C">Liquidation/Scrap Grade C</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select
                value={refundFilter}
                onChange={(e) => setRefundFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="All">Refund Status</option>
                <option value="Hold for Inspection">Hold for Inspection</option>
                <option value="Refund Initiated">Refund Initiated</option>
                <option value="UPI Reconciled">UPI Reconciled</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dual-Pane Reverse Logistics Triage Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left Pane: Inbound Queue & Triage (8 cols) */}
        <Card className="lg:col-span-7 xl:col-span-8 overflow-hidden flex flex-col">
          <div className="p-space-md flex items-center justify-between border-b border-border-subtle bg-surface-container-lowest">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm font-semibold text-text-primary">Inbound Queue & Triage</span>
              <Badge variant="secondary" className="text-label-xs-caps">
                Showing {filteredReturns.length} of 186 pending
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onShowToast({ type: 'info', title: 'Queue Refreshed', message: 'Checked latest 3PL reverse manifests.' })} className="h-7 w-7 text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <Table className="min-w-[960px] w-full border-collapse">
              <TableHeader className="bg-surface-canvas/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                <TableRow className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
                  <TableHead className="py-2.5 px-3 whitespace-nowrap">Return &amp; Order Ref</TableHead>
                  <TableHead className="py-2.5 px-3 whitespace-nowrap">Garment &amp; Variant</TableHead>
                  <TableHead className="py-2.5 px-3 whitespace-nowrap">Customer &amp; Location</TableHead>
                  <TableHead className="py-2.5 px-3 whitespace-nowrap">Logistics AWB &amp; Dock</TableHead>
                  <TableHead className="py-2.5 px-3 whitespace-nowrap">QC Status</TableHead>
                  <TableHead className="py-2.5 px-3 text-right whitespace-nowrap">Refund / Value</TableHead>
                  <TableHead className="py-2.5 px-3 text-center whitespace-nowrap">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border-subtle/50">
                {filteredReturns.map((item) => {
                  const isSelected = activeReturn?.id === item.id;
                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => setSelectedReturnId(item.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-surface-container-low border-l-4 border-l-primary'
                          : 'hover:bg-surface-canvas'
                      }`}
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm font-semibold text-primary">
                            {item.id}
                          </span>
                          <span className="font-label-xs-caps text-[11px] text-text-secondary font-mono">
                            {item.orderRef}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-text-primary truncate max-w-[170px]" title={item.productTitle}>
                            {item.productTitle}
                          </span>
                          <span className="font-label-xs-caps text-[11px] text-text-secondary">
                            {item.variant}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-text-primary font-medium text-xs">
                            {item.customer.name}
                          </span>
                          <span className="font-label-xs-caps text-[11px] text-text-secondary">
                            {item.customer.location}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-table-cell-num text-table-cell-num text-text-primary text-xs font-mono">
                            {item.courier.partner} #{item.courier.awb}
                          </span>
                          <span className="font-label-xs-caps text-[11px] text-status-success font-medium">
                            {item.courier.dockStatus}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3">
                        <Badge
                          variant={
                            item.qcStatus.includes('Passed') ? 'success' :
                            item.qcStatus.includes('Defect') ? 'destructive' : 'warning'
                          }
                          className="text-[10px] py-0 px-2"
                        >
                          {item.qcStatus}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-table-cell-num text-table-cell-num font-semibold text-text-primary tabular-nums">
                            ₹{item.refundValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="font-label-xs-caps text-[10px] text-text-secondary">
                            {item.paymentMethod}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={isSelected ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setSelectedReturnId(item.id)}
                          className="h-7 text-xs py-0 px-2"
                        >
                          {isSelected ? 'Active QC' : 'Inspect'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="p-space-md flex flex-wrap items-center justify-between gap-space-sm bg-surface-canvas text-text-secondary font-label-sm text-label-sm border-t border-border-subtle">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <span className="font-semibold text-text-primary">10</span>
              <span className="mx-2">|</span>
              <span>Showing 1-{filteredReturns.length} of 186 items</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled>Previous</Button>
              <Button variant="primary" size="sm" className="h-7 w-7 p-0 text-xs">1</Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs">2</Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-xs">3</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Next</Button>
            </div>
          </div>
        </Card>

        {/* Right Pane: Dock Triage & QC Grading Station (4/5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-space-md">
          <Card className="shadow-md">
            <CardContent className="p-space-md flex flex-col gap-space-md">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[10px] font-bold">
                      Dock Triage Station #04
                    </Badge>
                    <Badge variant={activeReturn.qcStatus.includes('Passed') ? 'success' : 'warning'} className="text-[10px] font-semibold">
                      {activeReturn.qcStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary mt-1">
                    {activeReturn.id}
                  </h2>
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    {activeReturn.productTitle} • {activeReturn.variant}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-metric-stat text-[22px] leading-tight text-primary font-bold tabular-nums">
                    ₹{activeReturn.refundValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block font-label-xs-caps text-[10px] text-text-secondary uppercase">REFUND VALUE</span>
                </div>
              </div>

              {/* Garment Image & Customer Note */}
              <div className="bg-surface-canvas p-space-sm rounded-lg flex gap-space-sm items-center border border-border-subtle/50">
                <img 
                  className="w-16 h-20 rounded-md object-cover shrink-0 shadow-xs bg-surface-subtle" 
                  alt={activeReturn.productTitle} 
                  src={activeReturn.image} 
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
                    Customer Note & Reason
                  </span>
                  <span className="font-label-sm text-label-sm font-bold text-text-primary mt-0.5">
                    {activeReturn.returnReason}
                  </span>
                  <p className="font-body-sm text-[12px] text-text-secondary italic mt-1 line-clamp-2">
                    "{activeReturn.customerNote}"
                  </p>
                </div>
              </div>

              {/* Garment Physical Checklist */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                  Garment Physical Checklist
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <label 
                    onClick={() => setChecklist(prev => ({ ...prev, tags: !prev.tags }))}
                    className="flex flex-col p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container transition-colors border border-border-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-xs-caps text-[11px] text-text-secondary">Brand Tags</span>
                      <Checkbox checked={checklist.tags} onChange={() => {}} />
                    </div>
                    <span className="font-label-sm text-[12px] font-semibold text-status-success mt-1">
                      {checklist.tags ? 'Intact' : 'Missing'}
                    </span>
                  </label>

                  <label 
                    onClick={() => setChecklist(prev => ({ ...prev, clean: !prev.clean }))}
                    className="flex flex-col p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container transition-colors border border-border-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-xs-caps text-[11px] text-text-secondary">Wear / Odor</span>
                      <Checkbox checked={checklist.clean} onChange={() => {}} />
                    </div>
                    <span className="font-label-sm text-[12px] font-semibold text-status-success mt-1">
                      {checklist.clean ? 'Clean' : 'Soiled'}
                    </span>
                  </label>

                  <label 
                    onClick={() => setChecklist(prev => ({ ...prev, zeroDefect: !prev.zeroDefect }))}
                    className="flex flex-col p-2 rounded-lg bg-surface-subtle cursor-pointer hover:bg-surface-container transition-colors border border-border-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-xs-caps text-[11px] text-text-secondary">Seam / Tear</span>
                      <Checkbox checked={checklist.zeroDefect} onChange={() => {}} />
                    </div>
                    <span className="font-label-sm text-[12px] font-semibold text-status-success mt-1">
                      {checklist.zeroDefect ? 'Zero Defect' : 'Damaged'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Assigned Disposition Grade */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold">
                  Assigned Disposition Grade
                </span>
                <div className="space-y-1.5 mt-1">
                  <label 
                    onClick={() => setSelectedGrade('A')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                      selectedGrade === 'A' ? 'bg-status-success-bg border-status-success/30' : 'bg-surface-canvas border-border-subtle'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="disposition" 
                      checked={selectedGrade === 'A'} 
                      onChange={() => setSelectedGrade('A')}
                      className="mt-1 accent-primary" 
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-sm text-label-sm font-semibold text-text-primary">Grade A — Pristine Restock</span>
                        <Badge variant="success" className="text-[10px] py-0 px-1.5">Recommended</Badge>
                      </div>
                      <span className="font-body-sm text-[11px] text-text-secondary mt-0.5">
                        Route instantly to {currentHub.id} Aisle C-12 / Bin 5 for inventory replenishment.
                      </span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setSelectedGrade('B')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                      selectedGrade === 'B' ? 'bg-status-warning-bg border-status-warning/30' : 'bg-surface-canvas border-border-subtle'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="disposition" 
                      checked={selectedGrade === 'B'} 
                      onChange={() => setSelectedGrade('B')}
                      className="mt-1 accent-primary" 
                    />
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm font-semibold text-text-primary">Grade B — Refurbish / Steam Required</span>
                      <span className="font-body-sm text-[11px] text-text-secondary mt-0.5">
                        Mild linting or packaging wrinkles. Route to Steam & Polybag Bay.
                      </span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setSelectedGrade('C')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                      selectedGrade === 'C' ? 'bg-status-danger-bg border-status-danger/30' : 'bg-surface-canvas border-border-subtle'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="disposition" 
                      checked={selectedGrade === 'C'} 
                      onChange={() => setSelectedGrade('C')}
                      className="mt-1 accent-primary" 
                    />
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm font-semibold text-text-primary">Grade C — Liquidation / Salvage Scrap</span>
                      <span className="font-body-sm text-[11px] text-text-secondary mt-0.5">
                        Permanent stains or damaged fibers. Discard or scrap wholesale.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Settlement Engine Summary */}
              <div className="bg-surface-canvas p-space-sm rounded-lg flex flex-col gap-1.5 border border-border-subtle/50">
                <div className="flex items-center justify-between text-label-xs-caps font-label-xs-caps text-text-secondary">
                  <span>SETTLEMENT ENGINE</span>
                  <span>{activeReturn.settlementEngine.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between font-body-sm text-body-sm">
                  <span className="text-text-secondary">Original Transaction:</span>
                  <span className="text-text-primary font-medium">₹{activeReturn.refundValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-body-sm text-body-sm">
                  <span className="text-text-secondary">Return Deductions:</span>
                  <span className="text-status-success font-medium">₹0.00 (Everwear Assurance)</span>
                </div>
                <div className="flex items-center justify-between font-body-sm text-body-sm">
                  <span className="text-text-secondary">Customer UPI ID:</span>
                  <span className="text-text-primary font-mono text-[12px]">{activeReturn.customer.upiId}</span>
                </div>
                <Separator className="my-0.5" />
                <div className="flex items-center justify-between pt-0.5 font-headline-sm text-headline-sm text-text-primary">
                  <span className="font-bold">Net Refund Amount:</span>
                  <span className="text-status-success font-bold tabular-nums">₹{activeReturn.refundValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Operational Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="primary"
                  size="default"
                  onClick={handleApproveRefund}
                  className="w-full gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>Approve QC & Disburse Instant UPI Refund (₹{activeReturn.refundValue})</span>
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleConvertToCredit}
                  className="w-full gap-1.5 text-fashion-magenta hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30"
                >
                  <span className="material-symbols-outlined text-[16px]">stars</span>
                  <span>Convert to Store Credit (+10% Bonus: ₹{Math.round(activeReturn.refundValue * 1.1)})</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRejectReturn}
                  className="w-full text-status-danger hover:bg-status-danger-bg hover:text-status-danger text-xs font-semibold"
                >
                  Reject Return & Dispatch Back to Customer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Audit Trail Card */}
          <Card>
            <CardContent className="p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm font-semibold text-text-primary">Audit Trail</span>
                <Badge variant="secondary" className="text-[10px]">LIVE LOGS</Badge>
              </div>
              <div className="relative pl-5 space-y-3 mt-1 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
                {activeReturn.timeline.map((step, idx) => (
                  <div key={idx} className="relative flex flex-col">
                    <div className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ${step.color} shadow-xs`}></div>
                    <span className="font-label-sm text-label-sm font-semibold text-text-primary">{step.step}</span>
                    <span className="font-body-sm text-[11px] text-text-secondary">{step.time} • {step.actor}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual Return Modal */}
      <Dialog open={manualReturnOpen} onOpenChange={setManualReturnOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border-subtle bg-surface-subtle flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">assignment_return</span>
              <div>
                <DialogTitle>Initiate Manual Return</DialogTitle>
                <DialogDescription className="text-xs">
                  Create customer reverse pickup for {currentHub.id}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setManualReturnOpen(false)}
              className="h-8 w-8 text-secondary"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </Button>
          </DialogHeader>

          <form onSubmit={handleCreateReturn} className="p-space-lg space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Original Order Ref *</label>
              <Input
                required
                type="text"
                value={newOrderRef}
                onChange={(e) => setNewOrderRef(e.target.value)}
                placeholder="EVR-984210-BLR"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Customer Full Name *</label>
              <Input
                required
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Deepa Sengupta"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Garment Item</label>
              <Input
                type="text"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Return Reason</label>
                <Select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option>Size/Fit Issue</option>
                  <option>Fabric/Quality Defect</option>
                  <option>Color Mismatch</option>
                  <option>Damaged in Transit</option>
                  <option>Buyer Remorse</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Refund Amount (₹)</label>
                <Input
                  type="number"
                  value={newRefundAmount}
                  onChange={(e) => setNewRefundAmount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">UPI ID for Refund Settlement</label>
              <Input
                type="text"
                value={newUpiId}
                onChange={(e) => setNewUpiId(e.target.value)}
                placeholder="name@okaxis"
                className="h-9 text-xs font-mono"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManualReturnOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="gap-1.5 text-xs shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Dispatch Pickup</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
