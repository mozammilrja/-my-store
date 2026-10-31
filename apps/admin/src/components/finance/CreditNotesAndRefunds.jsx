import React, { useState, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  FilterBar,
  SearchInput,
} from '../ui';
import { notesList } from '../../data/mockData';
import { adminApi } from '../../lib/api';
import { useCreditNotesQuery } from '../../hooks/useAdminQueries';

export function CreditNotesAndRefunds({ onNavigate, onShowToast }) {
  const [selectedNoteId, setSelectedNoteId] = useState('#CN-2024-001420');
  const [taxPeriod, setTaxPeriod] = useState('May 2024 (FY 24-25)');
  const [disbursementFilter, setDisbursementFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'reconciled', 'syncing', 'disputed'
  const [searchFilter, setSearchFilter] = useState('');
  const [notesData, setNotesData] = useState(notesList);

  // TanStack Query for credit notes
  const { data: creditNotesData, isLoading: isCreditNotesLoading } = useCreditNotesQuery();

  useEffect(() => {
    if (creditNotesData?.creditNotes?.length) {
      const live = creditNotesData.creditNotes.map(cn => ({
        id: `#${cn.creditNoteNumber}`,
        invoice: `#${cn.invoiceNumber}`,
        date: new Date(cn.createdAt).toLocaleDateString(),
        customer: cn.customerName,
        type: 'Return Refund',
        reason: cn.reason,
        originalAmt: `₹${(cn.refundAmount / 100).toLocaleString()}`,
        taxReversal: `₹${Math.round((cn.refundAmount * 0.12) / 100).toLocaleString()}`,
        refundAmt: `₹${(cn.refundAmount / 100).toLocaleString()}`,
        disbursement: 'Source Payment Gateway',
        status: 'Reconciled',
        statusClass: 'bg-status-success-bg text-status-success',
      }));
      setNotesData(prev => [...live, ...prev.filter(p => !live.some(l => l.id === p.id))]);
    }
  }, [creditNotesData]);

  const selectedNote = notesData.find(n => n.id === selectedNoteId) || notesData[0];

  const filteredNotes = notesData.filter(note => {
    if (statusTab === 'reconciled' && note.status !== 'Reconciled') return false;
    if (statusTab === 'syncing' && note.status !== 'GSTR-1 Synced') return false;
    if (statusTab === 'disputed' && note.status !== 'Disputed / Hold') return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      if (!note.id.toLowerCase().includes(q) && !note.invoice.toLowerCase().includes(q) && !note.customer.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <PageContainer>
      {/* Sub-header & Title Region */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Finance & Compliance', 'Credit Notes & Refunds']}
        title="Credit Notes, Return Adjustments & Wallet Refund Ledger"
        description="Statutory GST credit note issuance against customer returns, store credit wallet balances, failed delivery tax offsets, and reversal ledgers."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.('Reconciling gateway reversal logs with GST ledger...')}
              className="gap-1.5"
              type="button"
            >
              <Icon name="sync" className="material-symbols-outlined text-[16px] text-text-secondary" />
              <span>Reconcile Reversals</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.('Generating GSTR-1B statutory amendment register...')}
              className="gap-1.5"
              type="button"
            >
              <Icon name="file_download" className="material-symbols-outlined text-[16px] text-text-secondary" />
              <span>Export GSTR-1B</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onShowToast?.('Opening Manual Credit Note creation form...')}
              className="gap-1.5 bg-primary-container text-on-primary hover:bg-primary shadow-sm"
              type="button"
            >
              <Icon name="add_circle" className="material-symbols-outlined text-[18px]" />
              <span>Issue Credit Note</span>
            </Button>
          </>
        }
      />

      {/* KPI Metrics Strip */}
      <ContentGrid columns={5}>
        <StatsCard
          title="Active Credit Notes (MTD)"
          value="₹42,84,100"
          icon="receipt_long"
          trend="+8.4%"
          trendType="up"
          trendLabel="1,340 notes issued"
        />
        <StatsCard
          title="GST Reversal Claimed"
          value="₹4,12,890"
          icon="account_balance"
          iconColor="text-status-info"
          badge="Filed"
          badgeVariant="info"
          trendLabel="CGST + SGST + IGST"
        />
        <StatsCard
          title="Store Credit Float"
          value="₹28.40 L"
          icon="account_balance_wallet"
          badge="Float"
          badgeVariant="secondary"
          trendLabel="Unspent wallet liability"
        />
        <StatsCard
          title="Bank Refund TAT"
          value="4.2 Hours"
          icon="bolt"
          iconColor="text-status-success"
          badge="99.1%"
          badgeVariant="success"
          trendLabel="Razorpay Instant API"
        />
        <StatsCard
          title="Pending Approvals"
          value="14 Flagged"
          icon="error_outline"
          iconColor="text-status-warning"
          badge="Action Required"
          badgeVariant="warning"
          trendLabel="RTO Reroute"
        />
      </ContentGrid>

      {/* Filter & Segment Bar */}
      <FilterBar
        tabs={[
          { id: 'all', label: 'All', count: '1,340' },
          { id: 'reconciled', label: 'Reconciled', count: '1,288' },
          { id: 'syncing', label: 'GSTR-1 Syncing', count: '38' },
          { id: 'disputed', label: 'Disputed / Hold', count: '14' },
        ]}
        activeTab={statusTab}
        onTabChange={setStatusTab}
        search={
          <SearchInput
            value={searchFilter}
            onChange={(val) => setSearchFilter(val)}
            onClear={() => setSearchFilter('')}
            placeholder="Filter CN ID, Invoice, HSN..."
            className="w-full sm:w-64"
          />
        }
      />

      {/* Main Content Layout (65% Table / 35% Inspector) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* 65% Main Table Module */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col">
          <div className="p-4 bg-surface-container-lowest flex items-center justify-between border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Statutory Credit Register Ledger</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-xs-caps text-label-xs-caps font-semibold">
                Active Batch 24-05-C
              </span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary font-label-xs-caps text-label-xs-caps">
              <span>SORTED BY: ISSUED DATE (DESC)</span>
              <Icon name="swap_vert" className="material-symbols-outlined text-[16px] text-text-primary" />
            </div>
          </div>

          {/* Responsive Table Viewport */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left font-body-sm text-body-sm min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-surface-canvas text-text-secondary font-label-xs-caps text-label-xs-caps uppercase tracking-wider border-b border-border-subtle select-none sticky top-0 z-10 backdrop-blur-sm">
                  <th className="py-2.5 px-3 whitespace-nowrap">Credit Note ID</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Original Invoice / Order</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Customer / Reason</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">GST Reversal</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Settlement Channel</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-text-primary">
                {filteredNotes.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  return (
                    <tr
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected ? 'bg-primary-fixed/20' : 'hover:bg-surface-subtle'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-6 rounded-full ${isSelected ? 'bg-primary-container' : 'bg-transparent'}`}></div>
                          <div>
                            <span className="font-semibold text-text-primary block font-body-sm text-body-sm">{note.id}</span>
                            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">{note.time}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-text-primary">{note.invoice}</div>
                        <div className="font-label-xs-caps text-label-xs-caps text-text-secondary">{note.orderId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-text-primary truncate max-w-[130px]">{note.customer}</div>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-surface-canvas text-text-secondary font-label-xs-caps text-[10px] border border-border-subtle">
                          {note.reason}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-table-cell-num text-table-cell-num text-text-primary font-semibold">
                        {note.taxableValue}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-table-cell-num text-table-cell-num text-status-success font-semibold">{note.gstReversal}</div>
                        <span className="font-label-xs-caps text-[10px] text-text-secondary">{note.gstType}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Icon name={note.channelIcon} className={`material-symbols-outlined text-[16px] ${note.channelColor}`} />
                          <span className="font-label-sm text-label-sm text-text-primary">{note.channel}</span>
                        </div>
                        <span className="font-label-xs-caps text-[10px] text-text-secondary">{note.channelSub}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-label-xs-caps text-label-xs-caps font-semibold ${note.statusBadge}`}>
                          {note.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowToast?.(`Credit Note options for ${note.id}`);
                          }}
                          className="p-1 rounded hover:bg-surface-canvas text-text-secondary hover:text-text-primary"
                          type="button"
                        >
                          <Icon name="more_vert" className="material-symbols-outlined text-[18px]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 bg-surface-container-lowest border-t border-border-subtle flex items-center justify-between text-text-secondary font-body-sm text-body-sm">
            <div className="flex items-center gap-2">
              <span>Showing 1 to {filteredNotes.length} of 1,340 credit note entries</span>
              <span className="w-1 h-1 rounded-full bg-border-strong"></span>
              <span className="font-label-xs-caps text-label-xs-caps">Auto-sync with ClearTax every 15 mins</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded-lg hover:bg-surface-canvas text-text-secondary hover:text-text-primary disabled:opacity-40" disabled type="button">
                <Icon name="chevron_left" className="material-symbols-outlined text-[18px]" />
              </button>
              <span className="px-2 py-0.5 rounded bg-surface-subtle font-label-sm text-label-sm font-semibold text-text-primary">1</span>
              <button className="px-2 py-0.5 rounded hover:bg-surface-canvas font-label-sm text-label-sm text-text-secondary" type="button">2</button>
              <button className="px-2 py-0.5 rounded hover:bg-surface-canvas font-label-sm text-label-sm text-text-secondary" type="button">3</button>
              <span className="text-text-secondary">...</span>
              <button className="px-2 py-0.5 rounded hover:bg-surface-canvas font-label-sm text-label-sm text-text-secondary" type="button">224</button>
              <button className="p-1 rounded-lg hover:bg-surface-canvas text-text-secondary hover:text-text-primary" type="button">
                <Icon name="chevron_right" className="material-symbols-outlined text-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* 35% Inspector Panel (Exact from Stitch design) */}
        <div className="xl:col-span-4 space-y-space-md">
          {/* Detailed Inspector Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle overflow-hidden">
            {/* Inspector Header */}
            <div className="p-4 bg-surface-subtle/50 flex items-center justify-between border-b border-border-subtle">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-status-success font-label-xs-caps text-label-xs-caps font-semibold">
                    GSTR-1 Ready
                  </span>
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">IRN: {selectedNote.irn}</span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-text-primary font-semibold">Credit Note {selectedNote.id}</h2>
              </div>
              <button
                onClick={() => onShowToast?.(`Minimizing inspector for ${selectedNote.id}`)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-canvas"
                title="Close / Minimize"
                type="button"
              >
                <Icon name="close" className="material-symbols-outlined text-[20px]" />
              </button>
            </div>

            <div className="p-4 space-y-space-md">
              {/* Linked Invoice & Fulfillment Reference */}
              <div className="p-3 rounded-xl bg-surface-canvas border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">ORIGIN TAX INVOICE REFERENCE</span>
                  <span
                    onClick={() => onShowToast?.(`Opening original tax invoice PDF for ${selectedNote.invoice}...`)}
                    className="font-label-xs-caps text-label-xs-caps text-primary font-semibold hover:underline cursor-pointer"
                  >
                    View PDF Original
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-body-sm text-body-sm">
                  <div>
                    <span className="text-text-secondary text-[11px] block">Invoice Number:</span>
                    <span className="font-semibold text-text-primary">{selectedNote.invoice}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary text-[11px] block">Original Invoice Date:</span>
                    <span className="font-medium text-text-primary">{selectedNote.date}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary text-[11px] block">Fulfillment Order:</span>
                    <span className="font-medium text-text-primary">{selectedNote.orderId}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary text-[11px] block">FC Inspection Ref:</span>
                    <span className="font-medium text-text-primary">{selectedNote.qcRef}</span>
                  </div>
                </div>
              </div>

              {/* Fashion Merchandise Item Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-canvas border border-border-subtle">
                <img
                  className="w-14 h-16 rounded-lg object-cover shadow-xs shrink-0 border border-border-subtle"
                  src={selectedNote.productImage}
                  alt={selectedNote.productName}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="font-label-xs-caps text-[10px] text-text-secondary uppercase tracking-wider">
                    SKU: {selectedNote.sku}
                  </span>
                  <div className="font-semibold text-text-primary truncate font-body-sm text-body-sm">
                    {selectedNote.productName}
                  </div>
                  <div className="text-text-secondary font-label-xs-caps text-label-xs-caps">
                    {selectedNote.productMeta}
                  </div>
                  <div className="text-status-danger font-label-xs-caps text-[10px]">
                    {selectedNote.defectReason}
                  </div>
                </div>
              </div>

              {/* GSTIN & Statutory Tax Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">TAX REVERSAL BREAKDOWN (GSTR-1B)</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-subtle font-label-xs-caps text-[10px] text-text-secondary border border-border-subtle">
                    29AABCE1234F1Z8
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="text-text-secondary">Gross Merchandise Value (Original)</span>
                    <span className="font-table-cell-num text-table-cell-num text-text-primary">{selectedNote.mrp}</span>
                  </div>
                  <div className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="text-text-secondary">Base Taxable Net Value</span>
                    <span className="font-table-cell-num text-table-cell-num text-text-primary font-medium">{selectedNote.taxableValue}</span>
                  </div>
                  <div className="flex items-center justify-between font-body-sm text-body-sm text-text-secondary">
                    <span>Central GST (CGST @ 6.0%)</span>
                    <span className="font-table-cell-num text-table-cell-num text-status-success font-medium">{selectedNote.cgst}</span>
                  </div>
                  <div className="flex items-center justify-between font-body-sm text-body-sm text-text-secondary">
                    <span>State GST (SGST @ 6.0%)</span>
                    <span className="font-table-cell-num text-table-cell-num text-status-success font-medium">{selectedNote.sgst}</span>
                  </div>
                  <div className="flex items-center justify-between font-body-sm text-body-sm text-text-secondary">
                    <span>Integrated GST (IGST @ 0.0%)</span>
                    <span className="font-table-cell-num text-table-cell-num">{selectedNote.igst}</span>
                  </div>
                  {/* Inline Reversal Balance Bar */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between font-label-md text-label-md">
                    <span className="font-semibold text-text-primary">Statutory Credit Note Total</span>
                    <span className="font-table-cell-num text-headline-sm font-semibold text-text-primary">{selectedNote.totalNote}</span>
                  </div>
                </div>
              </div>

              {/* Customer Settlement Channel & Bonus Details */}
              <div className="p-3 rounded-xl bg-surface-canvas border border-border-subtle space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase">DISBURSEMENT EXECUTION</span>
                  <span className="font-label-xs-caps text-label-xs-caps text-fashion-magenta font-semibold">{selectedNote.channel}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-surface-container-lowest border border-border-subtle shadow-xs text-fashion-magenta shrink-0">
                    <Icon name="account_balance_wallet" className="material-symbols-outlined text-[24px]" />
                  </div>
                  <div className="space-y-1 text-body-sm text-body-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text-primary">Wallet Credited:</span>
                      <span className="font-table-cell-num font-bold text-fashion-magenta">{selectedNote.creditedWallet}</span>
                    </div>
                    <div className="text-[12px] text-text-secondary leading-relaxed">
                      {selectedNote.bonusNote}
                    </div>
                    <div className="font-label-xs-caps text-[10px] text-text-secondary pt-0.5">
                      TRANSACTION RRN: <span className="font-mono text-text-primary">{selectedNote.rrn}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Signature & E-Invoice Clearance Hash */}
              <div className="p-3 rounded-xl bg-surface-canvas border border-border-subtle space-y-1.5 font-label-xs-caps text-label-xs-caps text-text-secondary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-status-success font-semibold">
                    <Icon name="verified" className="material-symbols-outlined text-[16px]" />
                    <span>GST PORTAL DIGITALLY SIGNED</span>
                  </div>
                  <span>24/05/2024 14:28:44</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest border border-border-subtle font-mono text-[10px] text-text-secondary break-all select-all">
                  SHA256: {selectedNote.hash}
                </div>
                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span>Signatory: {selectedNote.signatory}</span>
                  <span>NIC Gateway: Online</span>
                </div>
              </div>

              {/* Bottom Action Suite */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => onShowToast?.(`Downloading PDF Credit Note for ${selectedNote.id}...`)}
                  className="w-full h-9 rounded-xl bg-primary-container text-on-primary hover:bg-primary-container/90 font-label-sm text-label-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  type="button"
                >
                  <Icon name="download" className="material-symbols-outlined text-[18px]" />
                  <span>Download PDF Credit Note (Form GST-01)</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onShowToast?.(`Resent statutory notice to ${selectedNote.customer}.`)}
                    className="h-8 rounded-xl bg-surface-canvas border border-border-subtle text-text-primary hover:bg-surface-subtle font-label-sm text-label-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                    type="button"
                  >
                    <Icon name="send" className="material-symbols-outlined text-[16px] text-text-secondary" />
                    <span>Resend Notice</span>
                  </button>
                  <button
                    onClick={() => onShowToast?.(`Retried settlement gateway ping for ${selectedNote.id}.`)}
                    className="h-8 rounded-xl bg-surface-canvas border border-border-subtle text-text-primary hover:bg-surface-subtle font-label-sm text-label-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                    type="button"
                  >
                    <Icon name="replay" className="material-symbols-outlined text-[16px] text-text-secondary" />
                    <span>Retry Gateway</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Regulatory Compliance Advisory Card */}
          <div className="p-4 bg-surface-container-lowest rounded-xl shadow-sm border border-border-subtle space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="policy" className="material-symbols-outlined text-[20px] text-primary" />
              <span className="font-headline-sm text-headline-sm text-text-primary font-semibold">Statutory Rule 54(1) Compliance</span>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
              Pursuant to Section 34 of the CGST Act, credit notes for outward supplies executed in May 2024 must be declared in GSTR-1 by 11th June 2024. Tax liability adjustments will reflect against outward tax payable in GSTR-3B.
            </p>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success"></span>
                <span className="font-label-xs-caps text-label-xs-caps text-text-secondary">Auto-Reversal Lock Active</span>
              </div>
              <button
                onClick={() => onShowToast?.('Opening GST Compliance circular reference...')}
                className="font-label-sm text-label-sm text-primary font-semibold hover:underline"
                type="button"
              >
                View Compliance Policy →
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
