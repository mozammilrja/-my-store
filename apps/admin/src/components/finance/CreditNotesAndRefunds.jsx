import React, { useState, useEffect, useMemo } from 'react';
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
  ErrorState,
  SkeletonPage,
  Thumbnail,
  TablePagination,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable, TableToolbar } from '../shared/DataTable';
import { adminApi } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useCreditNotesQuery } from '../../hooks/useAdminQueries';
import { EmptyState } from '../shared/FeedbackAndOverlays';

export function CreditNotesAndRefunds({ onNavigate, onShowToast }) {
  const [selectedNoteId, setSelectedNoteId] = useState('#CN-2024-001420');
  const [taxPeriod, setTaxPeriod] = useState('May 2024 (FY 24-25)');
  const [disbursementFilter, setDisbursementFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'reconciled', 'syncing', 'disputed'
  const [searchFilter, setSearchFilter] = useState('');
  const [notesData, setNotesData] = useState([]);

  // TanStack Query for credit notes
  const {
    data: creditNotesData,
    isLoading: isCreditNotesLoading,
    isError: isCreditNotesError,
    error: creditNotesError,
    refetch: refetchCreditNotes,
  } = useCreditNotesQuery();

  useEffect(() => {
    if (creditNotesData?.creditNotes) {
      const live = creditNotesData.creditNotes.map(cn => ({
        id: `#${cn.creditNoteNumber}`,
        invoice: `#${cn.invoiceNumber}`,
        date: new Date(cn.createdAt).toLocaleDateString(),
        customer: cn.customerName,
        reason: cn.reason,
        originalAmt: `₹${(cn.refundAmount / 100).toLocaleString()}`,
        refundAmt: `₹${(cn.refundAmount / 100).toLocaleString()}`,
        // The note records its own state; it used to read "Reconciled" for all.
        status: { issued: 'Issued', settled: 'Settled', canceled: 'Cancelled' }[cn.status] ?? cn.status,
        statusClass:
          cn.status === 'settled'
            ? 'bg-status-success-bg text-success'
            : cn.status === 'canceled'
              ? 'bg-status-danger-bg text-danger'
              : 'bg-status-info-bg text-info',
      }));
      setNotesData(live);
    }
  }, [creditNotesData]);

  const noteStats = useMemo(() => {
    const raw = creditNotesData?.creditNotes ?? [];
    const sum = (rows) => rows.reduce((n, c) => n + (c.refundAmount ?? 0), 0);
    const settled = raw.filter((c) => c.status === 'settled');
    const issued = raw.filter((c) => c.status === 'issued');
    return {
      total: raw.length,
      refundMinor: sum(raw),
      settled: settled.length,
      settledMinor: sum(settled),
      issued: issued.length,
      issuedMinor: sum(issued),
      canceled: raw.filter((c) => c.status === 'canceled').length,
    };
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
  // One shared pager over the rows this module actually holds.
  const notesPager = useClientTable(filteredNotes);

  if (isCreditNotesLoading) {
    return <SkeletonPage variant="table" stats={6} statsCols={6} columns={7} label="Loading credit notes" />;
  }


  const creditNoteColumns = [
    {
      key: 'id',
      header: 'Credit Note ID',
      cell: (note) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-6 rounded-full ${selectedNoteId === note.id ? 'bg-primary-container' : 'bg-transparent'}`} />
          <div>
            <span className="font-semibold text-primary block text-body">{note.id}</span>
            <span className="text-caption text-muted">{note.time}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'invoice',
      header: 'Original Invoice / Order',
      cell: (note) => (
        <>
          <div className="font-medium text-primary">{note.invoice}</div>
          <div className="text-caption text-muted">{note.orderId}</div>
        </>
      ),
    },
    {
      key: 'customer',
      header: 'Customer / Reason',
      cell: (note) => (
        <>
          <div className="font-medium text-primary truncate max-w-[130px]">{note.customer}</div>
          <span
            title={note.reason}
            className="inline-block max-w-[11rem] truncate rounded border border-subtle bg-surface-subtle px-1.5 py-0.5 text-micro text-muted"
          >
            {note.reason}
          </span>
        </>
      ),
    },
    { key: 'taxableValue', header: 'Taxable Value', align: 'right', className: 'text-num text-primary font-semibold', accessor: 'taxableValue' },
    {
      key: 'gstReversal',
      header: 'GST Reversal',
      align: 'right',
      cell: (note) => (
        <>
          <div className="text-num text-success font-semibold">{note.gstReversal}</div>
          <span className="text-micro text-muted">{note.gstType}</span>
        </>
      ),
    },
    {
      key: 'channel',
      header: 'Settlement Channel',
      cell: (note) => (
        <>
          <div className="flex items-center gap-1.5">
            <Icon name={note.channelIcon} className={`material-symbols-outlined text-icon ${note.channelColor}`} />
            <span className="text-label text-primary">{note.channel}</span>
          </div>
          <span className="text-micro text-muted">{note.channelSub}</span>
        </>
      ),
    },
    {
      key: 'status',
      fit: true,
      header: 'Status',
      cell: (note) => (
        <span className={`px-2 py-0.5 rounded-full text-caption font-semibold ${note.statusBadge}`}>{note.status}</span>
      ),
    },
    {
      key: 'action',
      fit: true,
      header: 'Action',
      align: 'center',
      cell: (note) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowToast?.(`Credit Note options for ${note.id}`);
          }}
          className="p-1 rounded hover:bg-surface-subtle text-muted hover:text-primary"
          type="button"
          title="More actions"
          aria-label="More actions"
        >
          <Icon name="more_vert" className="material-symbols-outlined text-icon-md" />
        </button>
      ),
    },
  ];

  return (
    <PageContainer>
      {creditNotesError && (
        <ErrorState
          title="Credit notes could not be loaded"
          message={creditNotesError?.message}
          onRetry={() => refetchCreditNotes()}
        />
      )}
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
              <Icon name="sync" className="material-symbols-outlined text-icon text-muted" />
              <span>Reconcile Reversals</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.('Generating GSTR-1B statutory amendment register...')}
              className="gap-1.5"
              type="button"
            >
              <Icon name="file_download" className="material-symbols-outlined text-icon text-muted" />
              <span>Export GSTR-1B</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onShowToast?.('Opening Manual Credit Note creation form...')}
              className="gap-1.5 bg-primary-container text-on-accent hover:bg-primary-container-hover shadow-sm"
              type="button"
            >
              <Icon name="add_circle" className="material-symbols-outlined text-icon-md" />
              <span>Issue Credit Note</span>
            </Button>
          </>
        }
      />

      {/* Figures below are counted from the credit notes the API returns. They
          were fixed strings before: a 42.84 lakh total and 1,340 notes against
          a register holding a fraction of that. */}
      <ContentGrid columns={4}>
        <StatsCard
          title="Credit notes"
          value={noteStats.total}
          icon="receipt_long"
          subtitle="In the register"
        />
        <StatsCard
          title="Refund value"
          value={formatMoney(noteStats.refundMinor, 'inr')}
          icon="account_balance_wallet"
          subtitle="Across every note"
        />
        <StatsCard
          title="Settled"
          value={noteStats.settled}
          icon="check_circle"
          iconColor="text-success"
          subtitle={formatMoney(noteStats.settledMinor, 'inr')}
        />
        <StatsCard
          title="Awaiting settlement"
          value={noteStats.issued}
          icon="pending"
          iconColor="text-warning"
          subtitle={formatMoney(noteStats.issuedMinor, 'inr')}
        />
      </ContentGrid>

      {/* Filter & Segment Bar */}
      <FilterBar
        tabs={[
          { id: 'all', label: 'All', count: noteStats.total },
          { id: 'settled', label: 'Settled', count: noteStats.settled },
          { id: 'issued', label: 'Issued', count: noteStats.issued },
          { id: 'canceled', label: 'Cancelled', count: noteStats.canceled },
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
        <DataTable
          data={notesPager.pageRows}
          columns={creditNoteColumns}
          keyField="id"
          className="min-w-[980px]"
          containerClassName="xl:col-span-8"
          activeRowId={selectedNoteId}
          onRowClick={(note) => setSelectedNoteId(note.id)}
          emptyIcon="receipt_long"
          emptyTitle="No credit notes match these filters"
          emptyMessage="No credit note matches the current search, channel or status selection."
          pagination={{
            page: notesPager.page,
            pageSize: notesPager.limit,
            totalItems: notesPager.total,
            onPageChange: notesPager.setPage,
            onPageSizeChange: notesPager.setLimit,
          }}
          toolbar={
            <TableToolbar
              className="p-4"
              left={
                <div className="flex items-center gap-2">
                  <span className="text-subheading text-primary font-semibold">Statutory Credit Register Ledger</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-caption font-semibold">
                    Active Batch 24-05-C
                  </span>
                </div>
              }
              right={
                <div className="flex items-center gap-2 text-muted text-caption">
                  <span>SORTED BY: ISSUED DATE (DESC)</span>
                  <Icon name="swap_vert" className="material-symbols-outlined text-icon text-primary" />
                </div>
              }
            />
          }
        />

        {/* 35% Inspector Panel (Exact from Stitch design) */}
          {!selectedNote ? (
            <EmptyState icon="receipt_long" title="No credit note selected" message="Pick a credit note from the register to inspect it." />
          ) : (
        <div className="xl:col-span-4 space-y-space-md">
          {/* Detailed Inspector Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle overflow-hidden">
            {/* Inspector Header */}
            <div className="p-4 bg-surface-subtle/50 flex items-center justify-between border-b border-subtle">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-caption font-semibold">
                    GSTR-1 Ready
                  </span>
                  <span className="text-caption text-muted">IRN: {selectedNote.irn}</span>
                </div>
                <h2 className="text-subheading text-primary font-semibold">Credit Note {selectedNote.id}</h2>
              </div>
              <button
                onClick={() => onShowToast?.(`Minimizing inspector for ${selectedNote.id}`)}
                className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-subtle"
                title="Close / Minimize"
                type="button"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-lg" />
              </button>
            </div>

            <div className="p-4 space-y-space-md">
              {/* Linked Invoice & Fulfillment Reference */}
              <div className="p-3 rounded-xl bg-surface-canvas border border-subtle space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-caption uppercase tracking-wider text-muted">
                    Origin tax invoice
                  </span>
                  <button
                    type="button"
                    onClick={() => onShowToast?.(`Opening original tax invoice PDF for ${selectedNote.invoice}...`)}
                    className="shrink-0 text-caption font-semibold text-accent hover:underline"
                  >
                    View PDF
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-body">
                  <div>
                    <span className="text-muted text-micro block">Invoice Number:</span>
                    <span className="font-semibold text-primary">{selectedNote.invoice}</span>
                  </div>
                  <div>
                    <span className="text-muted text-micro block">Original Invoice Date:</span>
                    <span className="font-medium text-primary">{selectedNote.date}</span>
                  </div>
                  <div>
                    <span className="text-muted text-micro block">Fulfillment Order:</span>
                    <span className="font-medium text-primary">{selectedNote.orderId}</span>
                  </div>
                  <div>
                    <span className="text-muted text-micro block">FC Inspection Ref:</span>
                    <span className="font-medium text-primary">{selectedNote.qcRef}</span>
                  </div>
                </div>
              </div>

              {/* Fashion Merchandise Item Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-canvas border border-subtle">
                <Thumbnail src={selectedNote.productImage} alt={selectedNote.productName} className="w-14 h-16 rounded-lg shadow-xs shrink-0" imgClassName="object-cover" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-caption text-muted uppercase tracking-wider">
                    SKU: {selectedNote.sku}
                  </span>
                  <div className="font-semibold text-primary truncate text-body">
                    {selectedNote.productName}
                  </div>
                  <div className="text-muted text-caption">
                    {selectedNote.productMeta}
                  </div>
                  <div className="text-danger text-micro">
                    {selectedNote.defectReason}
                  </div>
                </div>
              </div>

              {/* GSTIN & Statutory Tax Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted uppercase">TAX REVERSAL BREAKDOWN (GSTR-1B)</span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-micro text-muted border border-subtle">
                    29AABCE1234F1Z8
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-canvas border border-subtle space-y-2">
                  <div className="flex items-center justify-between text-body">
                    <span className="text-muted">Gross Merchandise Value (Original)</span>
                    <span className="text-num text-primary">{selectedNote.mrp}</span>
                  </div>
                  <div className="flex items-center justify-between text-body">
                    <span className="text-muted">Base Taxable Net Value</span>
                    <span className="text-num text-primary font-medium">{selectedNote.taxableValue}</span>
                  </div>
                  <div className="flex items-center justify-between text-body text-secondary">
                    <span>Central GST (CGST @ 6.0%)</span>
                    <span className="text-num text-success font-medium">{selectedNote.cgst}</span>
                  </div>
                  <div className="flex items-center justify-between text-body text-secondary">
                    <span>State GST (SGST @ 6.0%)</span>
                    <span className="text-num text-success font-medium">{selectedNote.sgst}</span>
                  </div>
                  <div className="flex items-center justify-between text-body text-secondary">
                    <span>Integrated GST (IGST @ 0.0%)</span>
                    <span className="text-num">{selectedNote.igst}</span>
                  </div>
                  {/* Inline Reversal Balance Bar */}
                  <div className="pt-2 border-t border-subtle flex items-center justify-between text-label-lg">
                    <span className="font-semibold text-primary">Statutory Credit Note Total</span>
                    <span className="text-subheading font-semibold text-primary">{selectedNote.totalNote}</span>
                  </div>
                </div>
              </div>

              {/* Customer Settlement Channel & Bonus Details */}
              <div className="p-3 rounded-xl bg-surface-canvas border border-subtle space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted uppercase">DISBURSEMENT EXECUTION</span>
                  <span className="text-caption text-accent font-semibold">{selectedNote.channel}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-surface-container-lowest border border-subtle shadow-xs text-accent shrink-0">
                    <Icon name="account_balance_wallet" className="material-symbols-outlined text-icon-xl" />
                  </div>
                  <div className="space-y-1 text-body text-body">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-primary">Wallet Credited:</span>
                      <span className="font-semibold text-accent">{selectedNote.creditedWallet}</span>
                    </div>
                    <div className="text-meta text-muted leading-relaxed">
                      {selectedNote.bonusNote}
                    </div>
                    <div className="text-micro text-muted pt-0.5">
                      TRANSACTION RRN: <span className="font-mono text-primary whitespace-nowrap">{selectedNote.rrn}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Signature & E-Invoice Clearance Hash */}
              <div className="p-3 rounded-xl bg-surface-canvas border border-subtle space-y-1.5 text-caption text-muted">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-success font-semibold">
                    <Icon name="verified" className="material-symbols-outlined text-icon" />
                    <span>GST PORTAL DIGITALLY SIGNED</span>
                  </div>
                  <span>24/05/2024 14:28:44</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-lowest border border-subtle font-mono text-micro text-muted break-all select-all">
                  SHA256: {selectedNote.hash}
                </div>
                <div className="flex items-center justify-between text-micro pt-1">
                  <span>Signatory: {selectedNote.signatory}</span>
                  <span>NIC Gateway: Online</span>
                </div>
              </div>

              {/* Bottom Action Suite */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => onShowToast?.(`Downloading PDF Credit Note for ${selectedNote.id}...`)}
                  className="w-full h-9 rounded-xl bg-primary-container text-on-accent hover:bg-primary-container/90 text-label font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  type="button"
                >
                  <Icon name="download" className="material-symbols-outlined text-icon-md" />
                  <span>Download PDF Credit Note (Form GST-01)</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onShowToast?.(`Resent statutory notice to ${selectedNote.customer}.`)}
                    className="h-8 rounded-xl bg-surface-canvas border border-subtle text-primary hover:bg-surface-subtle text-label font-medium flex items-center justify-center gap-1.5 transition-colors"
                    type="button"
                  >
                    <Icon name="send" className="material-symbols-outlined text-icon text-muted" />
                    <span>Resend Notice</span>
                  </button>
                  <button
                    onClick={() => onShowToast?.(`Retried settlement gateway ping for ${selectedNote.id}.`)}
                    className="h-8 rounded-xl bg-surface-canvas border border-subtle text-primary hover:bg-surface-subtle text-label font-medium flex items-center justify-center gap-1.5 transition-colors"
                    type="button"
                  >
                    <Icon name="replay" className="material-symbols-outlined text-icon text-muted" />
                    <span>Retry Gateway</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Regulatory Compliance Advisory Card */}
          <div className="p-4 bg-surface-container-lowest rounded-xl shadow-sm border border-subtle space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="policy" className="material-symbols-outlined text-icon-lg text-accent" />
              <span className="text-subheading text-primary font-semibold">Statutory Rule 54(1) Compliance</span>
            </div>
            <p className="text-body text-secondary leading-relaxed">
              Pursuant to Section 34 of the CGST Act, credit notes for outward supplies executed in May 2024 must be declared in GSTR-1 by 11th June 2024. Tax liability adjustments will reflect against outward tax payable in GSTR-3B.
            </p>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-success"></span>
                <span className="text-caption text-muted">Auto-Reversal Lock Active</span>
              </div>
              <button
                onClick={() => onShowToast?.('Opening GST Compliance circular reference...')}
                className="text-label text-accent font-semibold hover:underline"
                type="button"
              >
                View Compliance Policy →
              </button>
            </div>
          </div>
        </div>
          )}
      </div>
    </PageContainer>
  );
}
