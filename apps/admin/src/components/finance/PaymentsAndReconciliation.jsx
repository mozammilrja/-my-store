import React, { useState, useMemo } from 'react';
import { Select } from '../ui/select';

export function PaymentsAndReconciliation({ onNavigate, onShowToast }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'batches', 'cod', 'discrepancies', 'disputes'
  const [selectedTxnId, setSelectedTxnId] = useState('984210');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDisputesModalOpen, setIsDisputesModalOpen] = useState(false);
  const [isReMatchModalOpen, setIsReMatchModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Manual re-match form state
  const [reMatchUtr, setReMatchUtr] = useState('');

  const transactions = [
    {
      id: '984210',
      txnCode: '#TXN-984210',
      orderRef: 'ORD-2024-88412',
      customer: 'Rohan Parekh',
      initials: 'RP',
      initialsBg: 'bg-primary-fixed text-on-primary-fixed',
      method: 'Razorpay UPI',
      methodIcon: 'account_balance',
      methodColor: 'text-primary',
      methodType: 'UPI',
      gross: '₹4,890.00',
      grossNum: 4890.00,
      mdr: '₹57.70',
      mdrNum: 57.70,
      mdrBase: '-₹48.90',
      gstOnMdr: '-₹8.80',
      net: '₹4,832.30',
      netNum: 4832.30,
      utr: 'UTR9841220912',
      status: 'Settled',
      statusBadge: 'bg-status-success-bg text-status-success',
      reconMatch: 'Auto-Matched',
      reconIcon: 'done_all',
      reconBadge: 'bg-status-success-bg text-status-success',
      batch: '#SETTL-89214',
      source: 'Razorpay Node-04',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Settlement Ingestion Reconciled', time: 'May 24, 2024 • 14:38:12 IST by AutoWorker', color: 'bg-status-success' },
        { title: 'Bank Credit Confirmation Received', time: 'May 24, 2024 • 14:15:02 IST via HDFC API', color: 'bg-primary-container' },
        { title: 'Payment Captured by Gateway', time: 'May 24, 2024 • 11:22:45 IST via UPI App', color: 'bg-secondary' }
      ]
    },
    {
      id: '984211',
      txnCode: '#TXN-984211',
      orderRef: 'ORD-2024-88415',
      customer: 'Meera Kapoor',
      initials: 'MK',
      initialsBg: 'bg-secondary-fixed text-on-secondary-fixed',
      method: 'PayU Credit Card',
      methodIcon: 'credit_card',
      methodColor: 'text-fashion-magenta',
      methodType: 'Credit Card',
      gross: '₹12,400.00',
      grossNum: 12400.00,
      mdr: '₹219.48',
      mdrNum: 219.48,
      mdrBase: '-₹186.00',
      gstOnMdr: '-₹33.48',
      net: '₹12,180.52',
      netNum: 12180.52,
      utr: 'UTR9841221104',
      status: 'Settled',
      statusBadge: 'bg-status-success-bg text-status-success',
      reconMatch: 'Auto-Matched',
      reconIcon: 'done_all',
      reconBadge: 'bg-status-success-bg text-status-success',
      batch: '#SETTL-89214',
      source: 'PayU Enterprise PG',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Settlement Ingestion Reconciled', time: 'May 24, 2024 • 14:38:12 IST by AutoWorker', color: 'bg-status-success' },
        { title: 'Bank Credit Confirmation Received', time: 'May 24, 2024 • 14:12:10 IST via PayU API', color: 'bg-primary-container' },
        { title: 'Payment Captured by Gateway', time: 'May 24, 2024 • 11:05:19 IST via 3DS2 Visa', color: 'bg-secondary' }
      ]
    },
    {
      id: '984212',
      txnCode: '#TXN-984212',
      orderRef: 'ORD-2024-88420',
      customer: 'Vikram Nair',
      initials: 'VN',
      initialsBg: 'bg-error-container text-on-error-container',
      method: 'Razorpay UPI',
      methodIcon: 'account_balance',
      methodColor: 'text-primary',
      methodType: 'UPI',
      gross: '₹3,450.00',
      grossNum: 3450.00,
      mdr: '₹40.71',
      mdrNum: 40.71,
      mdrBase: '-₹34.50',
      gstOnMdr: '-₹6.21',
      net: '₹3,409.29',
      netNum: 3409.29,
      utr: 'MISSING_UTR',
      status: 'Discrepancy',
      statusBadge: 'bg-status-danger-bg text-status-danger',
      reconMatch: 'Manual Review',
      reconIcon: 'warning',
      reconBadge: 'bg-status-danger-bg text-status-danger',
      batch: '#SETTL-89215-PENDING',
      source: 'Razorpay Node-04',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Discrepancy Flagged: Missing Bank UTR', time: 'May 24, 2024 • 14:38:15 IST by ReconGuard', color: 'bg-status-danger' },
        { title: 'Gateway Payload Received without Clearing Ref', time: 'May 24, 2024 • 13:40:00 IST', color: 'bg-status-warning' },
        { title: 'Order Created in System', time: 'May 24, 2024 • 13:35:10 IST via Web', color: 'bg-secondary' }
      ]
    },
    {
      id: '984213',
      txnCode: '#TXN-984213',
      orderRef: 'ORD-2024-88424',
      customer: 'Deepak Sen',
      initials: 'DS',
      initialsBg: 'bg-surface-subtle text-text-secondary',
      method: 'COD (BlueDart)',
      methodIcon: 'local_shipping',
      methodColor: 'text-status-warning',
      methodType: 'COD',
      gross: '₹1,899.00',
      grossNum: 1899.00,
      mdr: '₹45.00',
      mdrNum: 45.00,
      mdrBase: '-₹45.00',
      gstOnMdr: '₹0.00 (Exempt)',
      net: '₹1,854.00',
      netNum: 1854.00,
      utr: 'BD-DEL-40192',
      status: 'In Clearing',
      statusBadge: 'bg-status-info-bg text-status-info',
      reconMatch: '3PL Clearing',
      reconIcon: 'sync',
      reconBadge: 'bg-status-info-bg text-status-info',
      batch: '#3PL-BD-DEL-89',
      source: 'BlueDart Courier Feed',
      account: 'Cash Remittance Hub',
      timeline: [
        { title: 'Cash Ingested at BlueDart Regional Hub', time: 'May 24, 2024 • 12:10:00 IST', color: 'bg-status-info' },
        { title: 'Doorstep Delivery Completed & Cash Collected', time: 'May 24, 2024 • 10:45:00 IST', color: 'bg-status-success' }
      ]
    },
    {
      id: '984214',
      txnCode: '#TXN-984214',
      orderRef: 'ORD-2024-88429',
      customer: 'Aarti Gupta',
      initials: 'AG',
      initialsBg: 'bg-secondary-fixed text-on-secondary-fixed',
      method: 'HDFC NetBanking',
      methodIcon: 'domain',
      methodColor: 'text-status-info',
      methodType: 'NetBanking',
      gross: '₹6,250.00',
      grossNum: 6250.00,
      mdr: '₹18.00',
      mdrNum: 18.00,
      mdrBase: '-₹15.25',
      gstOnMdr: '-₹2.75',
      net: '₹6,232.00',
      netNum: 6232.00,
      utr: 'HDFC9912048',
      status: 'Settled',
      statusBadge: 'bg-status-success-bg text-status-success',
      reconMatch: 'Auto-Matched',
      reconIcon: 'done_all',
      reconBadge: 'bg-status-success-bg text-status-success',
      batch: '#SETTL-89214',
      source: 'HDFC Corporate Aggregator',
      account: 'HDFC •••• 9014',
      timeline: [
        { title: 'Settlement Ingestion Reconciled', time: 'May 24, 2024 • 14:38:12 IST by AutoWorker', color: 'bg-status-success' },
        { title: 'Host-to-Host Confirmation Cleared', time: 'May 24, 2024 • 14:02:18 IST', color: 'bg-primary-container' },
        { title: 'NetBanking Auth Successful', time: 'May 24, 2024 • 13:58:00 IST', color: 'bg-secondary' }
      ]
    },
    {
      id: '984215',
      txnCode: '#TXN-984215',
      orderRef: 'ORD-2024-88432',
      customer: 'Kunal Chawla',
      initials: 'KC',
      initialsBg: 'bg-status-warning-bg text-status-warning',
      method: 'PayU Credit Card',
      methodIcon: 'credit_card',
      methodColor: 'text-fashion-magenta',
      methodType: 'Credit Card',
      gross: '₹8,999.00',
      grossNum: 8999.00,
      mdr: '₹159.28',
      mdrNum: 159.28,
      mdrBase: '-₹135.00',
      gstOnMdr: '-₹24.28',
      net: '₹8,839.72',
      netNum: 8839.72,
      utr: 'CB-HOLD-002',
      status: 'Chargeback Hold',
      statusBadge: 'bg-status-warning-bg text-status-warning',
      reconMatch: 'Disputed',
      reconIcon: 'flag',
      reconBadge: 'bg-status-warning-bg text-status-warning',
      batch: '#DISPUTE-2024-08',
      source: 'PayU Dispute Desk',
      account: 'Escrow Reserve Account',
      timeline: [
        { title: 'Card Issuer Chargeback Inquiry Filed', time: 'May 24, 2024 • 13:10:00 IST (Reason: Unrecognized Txn)', color: 'bg-status-warning' },
        { title: 'Funds Held in Merchant Escrow', time: 'May 24, 2024 • 13:11:00 IST', color: 'bg-status-danger' },
        { title: 'Original Payment Settled', time: 'May 22, 2024 • 10:00:00 IST', color: 'bg-secondary' }
      ]
    }
  ];

  const disputesList = [
    { id: 'DSP-01', order: 'ORD-2024-88432', customer: 'Kunal Chawla', amount: '₹8,999.00', reason: 'Unrecognized Charge', cardBrand: 'Mastercard', daysLeft: '4 Days' },
    { id: 'DSP-02', order: 'ORD-2024-87910', customer: 'Pooja Verma', amount: '₹4,250.00', reason: 'Defective Garment (Claimed)', cardBrand: 'Visa Signature', daysLeft: '6 Days' },
    { id: 'DSP-03', order: 'ORD-2024-87422', customer: 'Siddharth Rao', amount: '₹14,200.00', reason: 'Package Not Received', cardBrand: 'Amex Platinum', daysLeft: '2 Days (Urgent)' },
  ];

  const selectedTxn = useMemo(() => {
    return transactions.find(t => t.id === selectedTxnId) || transactions[0];
  }, [selectedTxnId, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (activeTab === 'discrepancies' && t.status !== 'Discrepancy') return false;
      if (activeTab === 'disputes' && t.status !== 'Chargeback Hold') return false;
      if (activeTab === 'cod' && t.methodType !== 'COD') return false;
      if (methodFilter !== 'ALL' && t.methodType !== methodFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !t.txnCode.toLowerCase().includes(q) &&
          !t.orderRef.toLowerCase().includes(q) &&
          !t.customer.toLowerCase().includes(q) &&
          !t.utr.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeTab, methodFilter, statusFilter, searchQuery, transactions]);

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (onShowToast) onShowToast('Gateway API telemetry synced successfully across Razorpay, PayU, and Cashfree.');
    }, 1200);
  };

  const handleDownloadLedger = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<EVERWEAR_SETTLEMENT_LEDGER>
  <GENERATED_DATE>${new Date().toISOString()}</GENERATED_DATE>
  <BATCH_ID>SETTL-89214</BATCH_ID>
  <TOTAL_SETTLED_INR>124890400</TOTAL_SETTLED_INR>
  <ENTRIES_COUNT>${transactions.length}</ENTRIES_COUNT>
</EVERWEAR_SETTLEMENT_LEDGER>`;
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `everwear_settlement_ledger_${new Date().toISOString().slice(0, 10)}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('Tally / Zoho Books XML ledger export generated.');
  };

  const handleManualRematchSubmit = (e) => {
    e.preventDefault();
    setIsReMatchModalOpen(false);
    if (onShowToast) onShowToast(`Bank UTR ${reMatchUtr || 'UTR9841220999'} linked to ${selectedTxn.txnCode}. Status updated to Settled.`);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col gap-6">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary tracking-wider">
              <span className="hover:text-text-primary transition-colors cursor-pointer" onClick={() => onNavigate && onNavigate('overview')}>
                EVERWEAR ADMIN
              </span>
              <span className="text-secondary/40">/</span>
              <span>FINANCE &amp; COMPLIANCE</span>
              <span className="text-secondary/40">/</span>
              <span className="text-primary-container font-bold">PAYMENTS &amp; RECONCILIATION</span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                Payment Gateway Settlement &amp; Financial Reconciliation
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-success-bg text-status-success text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
                LEDGER SYNC: CURRENT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-lowest text-text-primary hover:bg-surface-subtle shadow-sm transition-all text-xs font-semibold border border-border-subtle cursor-pointer"
              type="button"
            >
              <span className={`material-symbols-outlined text-[18px] text-secondary ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isSyncing ? 'Syncing...' : 'Trigger Gateway Sync'}</span>
            </button>
            <button
              onClick={handleDownloadLedger}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-lowest text-text-primary hover:bg-surface-subtle shadow-sm transition-all text-xs font-semibold border border-border-subtle cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
              <span>Export Tally / Zoho XML</span>
            </button>
            <button
              onClick={() => setIsDisputesModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm text-xs font-semibold cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              <span>Dispute Resolution Center</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-status-danger text-on-error text-[10px] font-bold">
                8
              </span>
            </button>
          </div>
        </div>

        {/* 5 Top Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between border border-border-subtle">
            <div className="absolute -right-3 -top-3 w-16 h-16 bg-primary-container/5 rounded-full blur-xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
                  SETTLED FUNDS (MTD)
                </span>
                <span className="material-symbols-outlined text-[18px] text-status-success">verified</span>
              </div>
              <div className="mt-2 text-[26px] leading-8 font-bold text-text-primary tracking-tight">
                ₹12,48,90,400
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-text-secondary text-[11px]">
              <span className="truncate">Razorpay, Cashfree, Stripe, PayU</span>
              <span className="text-status-success font-bold shrink-0">+14.2%</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between border border-border-subtle">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
                  IN-TRANSIT / UNCLEARED
                </span>
                <span className="material-symbols-outlined text-[18px] text-status-info">hourglass_top</span>
              </div>
              <div className="mt-2 text-[26px] leading-8 font-bold text-text-primary tracking-tight">
                ₹84,20,500
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-text-secondary text-[11px]">
              <span>T+2 Settlement Window</span>
              <span className="text-status-info font-bold">1,420 Txns</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between border border-border-subtle">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
                  COD CASH-IN-TRANSIT
                </span>
                <span className="material-symbols-outlined text-[18px] text-status-warning">local_shipping</span>
              </div>
              <div className="mt-2 text-[26px] leading-8 font-bold text-text-primary tracking-tight">
                ₹32,15,000
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-text-secondary text-[11px]">
              <span className="truncate">BlueDart, Delhivery, SFX</span>
              <span className="text-status-warning font-bold">312 Hubs</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between border border-border-subtle">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
                  GATEWAY FEE &amp; MDR DEDUCTION
                </span>
                <span className="material-symbols-outlined text-[18px] text-secondary">pie_chart</span>
              </div>
              <div className="mt-2 text-[26px] leading-8 font-bold text-text-primary tracking-tight">
                ₹18,45,210
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-text-secondary text-[11px]">
              <span>Blended Effective Rate</span>
              <span className="font-bold text-text-primary">1.48% MDR</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between border border-border-subtle">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-secondary tracking-wider uppercase">
                  UNRECONCILED VARIANCE
                </span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-status-danger text-on-error text-[11px] font-bold">
                  3
                </span>
              </div>
              <div className="mt-2 text-[26px] leading-8 font-bold text-status-danger tracking-tight">
                ₹12,450
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-text-secondary text-[11px]">
              <span>0.001% Total Exposure</span>
              <span className="text-status-danger font-bold">Manual Action</span>
            </div>
          </div>
        </div>

        {/* Gateway Status & Ingestion Pipes (4 Gateway Cards) */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-border-subtle">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary-container">lan</span>
              <h2 className="text-base font-bold text-text-primary">Reconciled Gateway Status &amp; Ingestion Pipes</h2>
            </div>
            <div className="flex items-center gap-4 text-text-secondary text-[11px] font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-success"></span>Matched (99.6%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-warning"></span>Pending Remit (0.39%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-danger"></span>Discrepancy (0.01%)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Gateway 1: Razorpay UPI */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">account_balance</span>
                  <span className="text-sm font-bold text-text-primary">Razorpay UPI</span>
                </div>
                <span className="text-xs font-bold text-status-success">99.8% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '99.8%' }}></div>
                <div className="bg-status-warning h-full" style={{ width: '0.2%' }}></div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                <span>Vol: ₹7,85,12,000</span>
                <span>Batch #89214 Closed</span>
              </div>
            </div>

            {/* Gateway 2: HDFC NetBanking */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-status-info">domain</span>
                  <span className="text-sm font-bold text-text-primary">HDFC NetBanking</span>
                </div>
                <span className="text-xs font-bold text-status-success">100.0% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '100%' }}></div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                <span>Vol: ₹2,10,34,500</span>
                <span>Zero Variance</span>
              </div>
            </div>

            {/* Gateway 3: COD Remittance */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-status-warning">local_shipping</span>
                  <span className="text-sm font-bold text-text-primary">COD Remittance</span>
                </div>
                <span className="text-xs font-bold text-status-warning">98.2% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '98.2%' }}></div>
                <div className="bg-status-warning h-full" style={{ width: '1.8%' }}></div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                <span>Vol: ₹1,48,20,900</span>
                <span>₹2.4L In 3PL Transit</span>
              </div>
            </div>

            {/* Gateway 4: PayU Credit Cards */}
            <div className="bg-surface-subtle p-3 rounded-lg flex flex-col justify-between gap-2.5 border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-fashion-magenta">credit_card</span>
                  <span className="text-sm font-bold text-text-primary">PayU Credit Cards</span>
                </div>
                <span className="text-xs font-bold text-status-success">99.9% Match</span>
              </div>
              <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
                <div className="bg-status-success h-full" style={{ width: '99.9%' }}></div>
                <div className="bg-status-danger h-full" style={{ width: '0.1%' }}></div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                <span>Vol: ₹1,05,23,000</span>
                <span>MDR ₹1.82L Deducted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Split View: Master Ledger Table + Sticky Settlement Drawer */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* Left Table Section */}
          <div className="w-full xl:flex-1 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-border-subtle">
            {/* Table Filter Tabs */}
            <div className="px-4 pt-3 bg-surface-container-lowest flex items-center justify-between overflow-x-auto select-none border-b border-border-subtle">
              <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                    activeTab === 'all'
                      ? 'text-primary-container bg-surface-subtle shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  }`}
                  type="button"
                >
                  <span>All Transactions</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold">
                    42,190
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('batches')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                    activeTab === 'batches'
                      ? 'text-primary-container bg-surface-subtle shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  }`}
                  type="button"
                >
                  <span>Gateway Batches</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-text-secondary text-[10px] font-bold">
                    18
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('cod')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                    activeTab === 'cod'
                      ? 'text-primary-container bg-surface-subtle shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  }`}
                  type="button"
                >
                  <span>3PL COD Remittance</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-text-secondary text-[10px] font-bold">
                    94
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('discrepancies')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                    activeTab === 'discrepancies'
                      ? 'text-status-danger bg-status-danger-bg shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  }`}
                  type="button"
                >
                  <span>Discrepancies</span>
                  <span className="px-2 py-0.5 rounded-full bg-status-danger-bg text-status-danger text-[10px] font-bold">
                    3 Flagged
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('disputes')}
                  className={`px-3.5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                    activeTab === 'disputes'
                      ? 'text-status-warning bg-status-warning-bg shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  }`}
                  type="button"
                >
                  <span>Chargebacks</span>
                  <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning text-[10px] font-bold">
                    8
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 pl-3">
                <button 
                  className="p-1.5 rounded-lg text-secondary hover:text-text-primary hover:bg-surface-subtle" 
                  title="Refresh Feed"
                  type="button"
                  onClick={handleTriggerSync}
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                </button>
              </div>
            </div>

            {/* Filter Search Bar */}
            <div className="p-4 bg-surface-subtle/50 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle">
              <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative w-full max-w-sm">
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-secondary pointer-events-none">
                    search
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 bg-surface-container-lowest rounded-lg text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-container border border-border-subtle"
                    placeholder="Filter by UTR, Order, Customer or Amount..."
                    type="text"
                  />
                </div>
                <div className="w-40">
                  <Select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="h-9"
                  >
                    <option value="ALL">All Methods</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="NetBanking">NetBanking</option>
                    <option value="COD">COD</option>
                  </Select>
                </div>
                <div className="w-44">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Settled">Settled</option>
                    <option value="In Clearing">In Clearing</option>
                    <option value="Discrepancy">Discrepancy</option>
                    <option value="Chargeback Hold">Chargeback Hold</option>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-text-secondary">BATCH WINDOW:</span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-xs font-bold text-text-primary border border-border-subtle">
                  TODAY 00:00 - 23:59 IST
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto scrollbar-thin w-full">
              <table className="w-full text-left border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-surface-subtle text-[11px] text-text-secondary uppercase select-none font-semibold border-b border-border-subtle sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2.5 px-3 whitespace-nowrap">Transaction ID / Order</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Customer</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Method</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Gross Amount</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">MDR + GST</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Net Settled</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Bank UTR / Ref</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Gateway Status</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Recon Match</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-subtle text-xs text-text-primary">
                  {filteredTransactions.map((t) => {
                    const isSelected = selectedTxnId === t.id;
                    const isDiscrepancy = t.status === 'Discrepancy';
                    const isDisputed = t.status === 'Chargeback Hold';

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTxnId(t.id)}
                        className={`hover:bg-surface-subtle/70 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary-fixed/20'
                            : isDiscrepancy
                            ? 'bg-status-danger-bg/25'
                            : isDisputed
                            ? 'bg-status-warning-bg/20'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-primary-container">{t.txnCode}</span>
                            <span className="text-[10px] text-text-secondary font-medium">{t.orderRef}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${t.initialsBg}`}>
                              {t.initials}
                            </div>
                            <span className="font-semibold text-text-primary truncate max-w-[110px]">{t.customer}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                            <span className={`material-symbols-outlined text-[16px] ${t.methodColor}`}>
                              {t.methodIcon}
                            </span>
                            {t.method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">{t.gross}</td>
                        <td className="py-2.5 px-3 text-right text-text-secondary font-medium">{t.mdr}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-status-success">{t.net}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-medium ${
                              t.utr === 'MISSING_UTR'
                                ? 'bg-status-danger-bg text-status-danger font-bold'
                                : 'bg-surface-subtle text-text-secondary border border-border-subtle'
                            }`}
                          >
                            {t.utr}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${t.statusBadge}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.reconBadge}`}>
                            <span className="material-symbols-outlined text-[14px]">{t.reconIcon}</span>
                            {t.reconMatch}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isDiscrepancy ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTxnId(t.id);
                                setIsReMatchModalOpen(true);
                              }}
                              className="p-1 rounded-md text-status-danger hover:bg-status-danger-bg transition-colors"
                              title="Resolve Discrepancy"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">build</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTxnId(t.id);
                              }}
                              className="p-1 rounded-md text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors"
                              title="View Breakdown"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-3 text-text-secondary text-xs border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <span>Showing <span className="font-bold text-text-primary">1 - {filteredTransactions.length}</span> of <span className="font-bold text-text-primary">42,190</span> reconciliation entries</span>
                <span className="text-secondary/40">•</span>
                <span>Batch Settled: ₹12.48 Cr</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <button className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-border-subtle text-text-primary transition-colors cursor-pointer border border-border-subtle">
                  Previous
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary">1</button>
                <button className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-border-subtle text-text-primary transition-colors border border-border-subtle">2</button>
                <button className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-border-subtle text-text-primary transition-colors border border-border-subtle">3</button>
                <span className="px-1 text-secondary">...</span>
                <button className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-border-subtle text-text-primary transition-colors border border-border-subtle">4,219</button>
                <button className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-border-subtle text-text-primary transition-colors cursor-pointer border border-border-subtle">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Detailed Settlement Breakdown Drawer (Sticky) */}
          <div className="w-full xl:w-[410px] shrink-0 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden sticky top-20 border border-border-subtle">
            <div className="p-4 bg-surface-container-low flex items-center justify-between border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary-container">receipt_long</span>
                <span className="text-sm font-bold text-text-primary">Detailed Settlement Breakdown</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedTxn.statusBadge}`}>
                {selectedTxn.status.toUpperCase()}
              </span>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between bg-surface-subtle p-3 rounded-lg border border-border-subtle">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-text-secondary uppercase">CURRENT SELECTION</span>
                  <span className="text-base font-bold text-text-primary mt-0.5">{selectedTxn.txnCode}</span>
                  <span className="text-xs text-text-secondary font-medium">Order: {selectedTxn.orderRef}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-text-secondary uppercase">NET DEPOSITED</span>
                  <div className="text-xl font-bold text-status-success mt-0.5">{selectedTxn.net}</div>
                </div>
              </div>

              {/* Financial Split & Deductions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-text-secondary text-[11px] font-semibold tracking-wider">
                  <span>FINANCIAL SPLIT &amp; DEDUCTIONS</span>
                  <span>STATUTORY GST (18%)</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-secondary font-medium">Cart Gross Total (Customer Paid)</span>
                    <span className="font-bold text-text-primary">{selectedTxn.gross}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-secondary font-medium">Gateway MDR Base Rate (1.00%)</span>
                    <span className="font-semibold text-status-danger">{selectedTxn.mdrBase}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-secondary font-medium">Integrated GST on MDR (18.0%)</span>
                    <span className="font-semibold text-status-danger">{selectedTxn.gstOnMdr}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-secondary font-medium">Everwear Platform Processing</span>
                    <span className="font-semibold text-text-primary">₹0.00 (Waived)</span>
                  </div>
                  <div className="pt-2 flex justify-between items-center font-bold bg-surface-subtle px-2.5 py-1.5 rounded-lg border border-border-subtle">
                    <span className="text-text-primary">Net Bank Credit Amount</span>
                    <span className="text-status-success text-sm">{selectedTxn.net}</span>
                  </div>
                </div>
              </div>

              {/* Banking & Batch Telemetry */}
              <div className="p-3 bg-surface-subtle/70 rounded-lg space-y-2 border border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-secondary uppercase">
                    BANKING &amp; BATCH TELEMETRY
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-status-success">account_balance</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-text-secondary block font-semibold">SETTLEMENT BATCH</span>
                    <span className="font-mono text-xs font-bold text-primary-container">{selectedTxn.batch}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block font-semibold">GATEWAY SOURCE</span>
                    <span className="font-semibold text-text-primary">{selectedTxn.source}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block font-semibold">BANK UTR NUMBER</span>
                    <span className="font-mono text-xs font-medium text-text-primary">{selectedTxn.utr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block font-semibold">CREDIT ACCOUNT</span>
                    <span className="font-mono text-xs font-medium text-text-primary">{selectedTxn.account}</span>
                  </div>
                </div>
              </div>

              {/* Audit Trail & Compliance Timestamp */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-text-secondary uppercase">
                    AUDIT TRAIL &amp; COMPLIANCE TIMESTAMP
                  </span>
                  <span className="text-[10px] font-bold text-status-success">VERIFIED LOG</span>
                </div>
                <div className="space-y-3 relative pl-3.5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-border-subtle">
                  {selectedTxn.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[13px] top-1.5 w-2 h-2 rounded-full ${item.color}`}></div>
                      <div className="text-xs font-bold text-text-primary">{item.title}</div>
                      <div className="text-[11px] text-text-secondary font-medium">{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onShowToast && onShowToast(`Tax Invoice PDF compiled for ${selectedTxn.txnCode}.`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-subtle hover:bg-border-subtle text-text-primary text-xs font-semibold transition-colors border border-border-subtle cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt</span>
                  <span>Tax Invoice</span>
                </button>
                <button
                  onClick={() => setIsReMatchModalOpen(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">rule</span>
                  <span>Manual Re-Match</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 3 Diagnostic Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between border border-border-subtle">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-text-primary">Automated Recon Health</h3>
                <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-status-success text-[10px] font-bold">
                  OPTIMAL
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Real-time multi-currency dual entry checking against Everwear ERP &amp; Banking Host-to-Host (H2H) pipe.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-secondary">H2H Auto-Match Accuracy</span>
                  <span className="text-text-primary">99.98%</span>
                </div>
                <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '99.98%' }}></div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-text-secondary text-[11px] border-t border-surface-subtle font-medium">
              <span>CRON JOB: Run every 15 min</span>
              <span className="text-status-success font-bold">Active (PID: 49102)</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between border border-border-subtle">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-text-primary">Carrier COD Remittances</h3>
                <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning text-[10px] font-bold">
                  CYCLE T+3
                </span>
              </div>
              <div className="space-y-2.5 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">BlueDart Express (Air Cargo)</span>
                  <span className="font-bold text-text-primary">₹18,20,400 <span className="text-[11px] text-status-success font-semibold">(99.1%)</span></span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Delhivery Direct Surface</span>
                  <span className="font-bold text-text-primary">₹10,44,100 <span className="text-[11px] text-status-success font-semibold">(98.0%)</span></span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Shadowfax Hyperlocal &amp; City</span>
                  <span className="font-bold text-text-primary">₹3,50,500 <span className="text-[11px] text-status-warning font-semibold">(95.4%)</span></span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-text-secondary border-t border-surface-subtle font-medium">
              <span>NEXT SETTLEMENT WINDOW</span>
              <span className="font-bold text-text-primary">Tomorrow 11:30 AM</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col justify-between border border-border-subtle">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-text-primary">Direct ERP Ingestion</h3>
                <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-status-info text-[10px] font-bold">
                  ZOHO BOOKS V4
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Push journal entries for gross sales, payment processor fee ledger, and credit note offsets directly to corporate books.
              </p>
              <div className="p-2.5 rounded-lg bg-surface-subtle flex items-center justify-between border border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">sync_saved_locally</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary">Ledger Sync Auto-Lock</span>
                    <span className="text-[10px] text-text-secondary font-medium">Day closing snapshot enabled</span>
                  </div>
                </div>
                <button
                  onClick={() => onShowToast && onShowToast('Ledger sync batch pushed to Zoho Books API successfully.')}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-text-primary hover:bg-border-subtle text-xs font-semibold border border-border-subtle transition-colors cursor-pointer"
                  type="button"
                >
                  Push Now
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-text-secondary border-t border-surface-subtle font-medium">
              <span>LAST SYNC: 14 mins ago</span>
              <span className="text-status-success font-bold">Zero Journal Skew</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disputes Resolution Modal */}
      {isDisputesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-border-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-danger text-[22px]">gavel</span>
                <h3 className="text-lg font-bold text-text-primary">Dispute &amp; Chargeback Resolution Desk</h3>
              </div>
              <button
                onClick={() => setIsDisputesModalOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              Review and submit counter-evidence for chargeback challenges before statutory banking deadlines.
            </p>
            <div className="space-y-3">
              {disputesList.map((d) => (
                <div key={d.id} className="p-3 bg-surface-subtle rounded-xl flex items-center justify-between border border-border-subtle">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-text-primary">{d.id}</span>
                      <span className="text-xs text-text-secondary font-medium">({d.order})</span>
                      <span className="px-1.5 py-0.5 rounded bg-status-danger-bg text-status-danger text-[10px] font-bold">
                        {d.daysLeft}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-text-primary mt-1">
                      {d.customer} • <span className="font-bold">{d.amount}</span> • {d.cardBrand}
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">Claim: {d.reason}</div>
                  </div>
                  <button
                    onClick={() => {
                      setIsDisputesModalOpen(false);
                      if (onShowToast) onShowToast(`Evidence packet compiled and uploaded for ${d.id}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors cursor-pointer"
                    type="button"
                  >
                    Submit Proof
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setIsDisputesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-subtle hover:bg-surface-variant text-text-primary text-xs font-semibold"
                type="button"
              >
                Close Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Re-Match / Override Modal */}
      {isReMatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleManualRematchSubmit}
            className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-subtle space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[22px]">rule</span>
                <h3 className="text-lg font-bold text-text-primary">Manual Settlement Override</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReMatchModalOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="text-xs text-text-secondary">
              Force-reconcile <span className="font-bold text-text-primary">{selectedTxn.txnCode}</span> against host-to-host bank statement.
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                  Bank UTR Reference Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR9841220912"
                  value={reMatchUtr}
                  onChange={(e) => setReMatchUtr(e.target.value)}
                  className="w-full h-9 px-3 bg-surface-subtle rounded-lg text-xs font-mono text-text-primary border border-border-subtle focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">
                  Reconciliation Note / Reason
                </label>
                <textarea
                  rows={2}
                  defaultValue="Verified via HDFC corporate net banking statement CSV"
                  className="w-full p-2 bg-surface-subtle rounded-lg text-xs text-text-primary border border-border-subtle focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-border-subtle flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReMatchModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-variant text-text-primary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary hover:bg-primary text-xs font-semibold shadow-sm"
              >
                Confirm Re-Match
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default PaymentsAndReconciliation;
