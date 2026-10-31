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
import { useCreditNotesQuery, useInvoicesQuery } from '../../hooks/useAdminQueries';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { SectionCard } from '../shared/Layout';

export function CreditNotesAndRefunds({ onNavigate, onShowToast }) {
  const [selectedNoteId, setSelectedNoteId] = useState('#CN-2024-001420');
  const [taxPeriod, setTaxPeriod] = useState('May 2024 (FY 24-25)');
  const [disbursementFilter, setDisbursementFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'settled', 'issued', 'canceled'
  const [sortDesc, setSortDesc] = useState(true);
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
  // A credit note records only the refund amount. The tax it reverses belongs
  // to the invoice it was raised against, so the split comes from there rather
  // than from a rate assumed here.
  const { data: invoicesData } = useInvoicesQuery();

  useEffect(() => {
    if (creditNotesData?.creditNotes) {
      const byNumber = new Map(
        (invoicesData?.invoices ?? []).map((inv) => [inv.invoiceNumber, inv])
      );
      const rupees = (minor) => Math.round((Number(minor) || 0) / 100);
      const inr = (minor) => `₹${rupees(minor).toLocaleString('en-IN')}`;

      const live = creditNotesData.creditNotes.map((cn) => {
        const invoice = byNumber.get(cn.invoiceNumber);
        // What share of the invoice is being credited back.
        const share =
          invoice && invoice.grandTotal > 0 ? (cn.refundAmount ?? 0) / invoice.grandTotal : null;
        const part = (amount) => (share === null ? null : Math.round((amount ?? 0) * share));

        const cgst = part(invoice?.cgstTotal);
        const sgst = part(invoice?.sgstTotal);
        const igst = part(invoice?.igstTotal);
        const taxable = part(invoice?.subtotal);
        const gstReversal = cgst === null ? null : cgst + sgst + igst;

        return {
          id: `#${cn.creditNoteNumber}`,
          invoice: `#${cn.invoiceNumber}`,
          orderId: cn.orderId,
          issuedAt: new Date(cn.createdAt).getTime(),
          date: new Date(cn.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          customer: cn.customerName,
          reason: cn.reason,
          taxableValue: taxable === null ? null : inr(taxable),
          cgst: cgst === null ? null : inr(cgst),
          sgst: sgst === null ? null : inr(sgst),
          igst: igst === null ? null : inr(igst),
          gstReversal: gstReversal === null ? null : inr(gstReversal),
          refundAmt: inr(cn.refundAmount),
          totalNote: inr(cn.refundAmount),
          status: { issued: 'Issued', settled: 'Settled', canceled: 'Cancelled' }[cn.status] ?? cn.status,
          statusClass:
            cn.status === 'settled'
              ? 'bg-status-success-bg text-success'
              : cn.status === 'canceled'
                ? 'bg-status-danger-bg text-danger'
                : 'bg-status-info-bg text-info',
        };
      });
      setNotesData(live);
    }
  }, [creditNotesData, invoicesData]);

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
    if (statusTab === 'settled' && note.status !== 'Settled') return false;
    if (statusTab === 'issued' && note.status !== 'Issued') return false;
    if (statusTab === 'canceled' && note.status !== 'Cancelled') return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      if (!note.id.toLowerCase().includes(q) && !note.invoice.toLowerCase().includes(q) && !note.customer.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => (sortDesc ? b.issuedAt - a.issuedAt : a.issuedAt - b.issuedAt));

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
            <span className="block text-body font-semibold text-primary">{note.id}</span>
            <span className="text-caption text-muted">{note.date}</span>
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
    {
      key: 'taxableValue',
      header: 'Taxable value',
      align: 'right',
      cell: (note) =>
        note.taxableValue ?? <span className="text-faint">Invoice not found</span>,
    },
    {
      key: 'gstReversal',
      header: 'GST Reversal',
      align: 'right',
      cell: (note) =>
        note.gstReversal === null ? (
          <span className="text-faint">—</span>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-num font-semibold text-success">{note.gstReversal}</span>
            <span className="text-micro text-muted">
              {note.igst !== '₹0' && note.igst !== null ? 'IGST' : 'CGST + SGST'}
            </span>
          </div>
        ),
    },
    {
      key: 'refund',
      header: 'Refund total',
      align: 'right',
      cell: (note) => <span className="text-num font-semibold text-primary">{note.refundAmt}</span>,
    },
    {
      key: 'status',
      fit: true,
      header: 'Status',
      cell: (note) => (
        <span className={`px-2 py-0.5 rounded-full text-caption font-semibold ${note.statusBadge}`}>{note.status}</span>
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
                </div>
              }
              right={
                <button
                  type="button"
                  onClick={() => setSortDesc((previous) => !previous)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-caption text-muted transition-colors hover:bg-surface-subtle hover:text-primary"
                  title="Change the order credit notes are listed in"
                >
                  <span>Issued date: {sortDesc ? 'newest first' : 'oldest first'}</span>
                  <Icon
                    name={sortDesc ? 'arrow_downward' : 'arrow_upward'}
                    aria-hidden="true"
                    className="material-symbols-outlined text-icon text-primary"
                  />
                </button>
              }
            />
          }
        />

        {/* The panel used to print an IRN, a wallet RRN, a QC reference, a
            product thumbnail and a signing hash. A credit note records none of
            those, so every one of those lines rendered blank. */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {!selectedNote ? (
            <EmptyState
              icon="receipt_long"
              title="No credit note selected"
              message="Pick a credit note from the register to inspect it."
            />
          ) : (
            <>
              <SectionCard
                title={selectedNote.id}
                description={`Raised ${selectedNote.date} against ${selectedNote.invoice}`}
                action={
                  <span
                    className={`rounded-full px-2 py-0.5 text-caption font-semibold ${selectedNote.statusClass}`}
                  >
                    {selectedNote.status}
                  </span>
                }
              >
                <dl className="flex flex-col gap-space-sm">
                  <div className="flex items-start justify-between gap-space-md">
                    <dt className="text-meta text-muted">Customer</dt>
                    <dd className="text-right text-body text-primary">{selectedNote.customer}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-space-md">
                    <dt className="text-meta text-muted">Reason</dt>
                    <dd className="text-right text-body text-primary">{selectedNote.reason}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-space-md">
                    <dt className="text-meta text-muted">Order</dt>
                    <dd className="text-right font-mono text-num text-secondary">
                      {selectedNote.orderId}
                    </dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard
                title="Tax reversed"
                description={
                  selectedNote.taxableValue
                    ? 'Apportioned from the invoice this note was raised against.'
                    : 'The originating invoice is not in the register, so the split cannot be shown.'
                }
              >
                {!selectedNote.taxableValue ? (
                  <EmptyState
                    icon="search_off"
                    title="Invoice not found"
                    message={`No invoice matching ${selectedNote.invoice} is in the register.`}
                  />
                ) : (
                  <dl className="flex flex-col gap-space-sm">
                    {[
                      ['Taxable value', selectedNote.taxableValue],
                      ['CGST', selectedNote.cgst],
                      ['SGST', selectedNote.sgst],
                      ['IGST', selectedNote.igst],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-space-md">
                        <dt className="text-meta text-muted">{label}</dt>
                        <dd className="text-num tabular-nums text-primary">{value}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-space-md border-t border-subtle pt-space-sm">
                      <dt className="text-body font-semibold text-primary">Credit note total</dt>
                      <dd className="text-num font-semibold tabular-nums text-primary">
                        {selectedNote.totalNote}
                      </dd>
                    </div>
                  </dl>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
