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
  PageBody,
  SkeletonPage,
} from '../ui';
import { useClientTable } from '../../hooks/useClientTable';
import { DataTable, TableToolbar } from '../shared/DataTable';
import { formatMoney } from '../../lib/format';
import { useCreditNotesQuery, useInvoicesQuery } from '../../hooks/useAdminQueries';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { SectionCard } from '../shared/Layout';

/** The three states a credit note carries, in the guide's tones. */
const STATUS_VARIANT = { Settled: 'success', Issued: 'info', Cancelled: 'destructive' };

export function CreditNotesAndRefunds({ onNavigate, onShowToast }) {
  const [selectedNoteId, setSelectedNoteId] = useState(null);
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

  // Nothing in the register at all, as against nothing matching the filters.
  const noNotes = noteStats.total === 0;
  const noMatches = !noNotes && filteredNotes.length === 0;
  const clearFilters = () => {
    setStatusTab('all');
    setSearchFilter('');
  };

  if (isCreditNotesLoading) {
    return <SkeletonPage variant="table" stats={4} statsCols={4} columns={7} label="Loading credit notes" />;
  }


  const creditNoteColumns = [
    {
      key: 'id',
      header: 'Credit note',
      cell: (note) => (
        <div className="flex flex-col">
          <span className="font-mono text-body font-semibold text-primary">{note.id}</span>
          <span className="text-micro text-muted">{note.date}</span>
        </div>
      ),
    },
    {
      key: 'invoice',
      header: 'Invoice / order',
      cell: (note) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium text-primary">{note.invoice}</span>
          <span className="font-mono text-micro text-muted">{note.orderId}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer / reason',
      cell: (note) => (
        <div className="flex min-w-0 flex-col items-start gap-space-xs">
          <span className="max-w-32 truncate font-medium text-primary" title={note.customer}>{note.customer}</span>
          <Badge variant="secondary" size="sm" className="max-w-44 font-normal" title={note.reason}>
            <span className="truncate">{note.reason}</span>
          </Badge>
        </div>
      ),
    },
    {
      key: 'taxableValue',
      header: 'Taxable value',
      align: 'right',
      cell: (note) =>
        note.taxableValue ? (
          <span className="tabular-nums text-primary">{note.taxableValue}</span>
        ) : (
          <span className="text-faint">Invoice not found</span>
        ),
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
            <span className="text-num font-semibold tabular-nums text-success">{note.gstReversal}</span>
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
      cell: (note) => <span className="text-num font-semibold tabular-nums text-primary">{note.refundAmt}</span>,
    },
    {
      key: 'status',
      fit: true,
      header: 'Status',
      cell: (note) => <StatusBadge status={note.status} variant={STATUS_VARIANT[note.status]} />,
    },
  ];

  return (
    <PageContainer>
      {/* Sub-header & Title Region */}
      <PageHeader
        kicker="Finance & compliance"
        title="Credit notes & refunds"
        description="Credit notes issued against returns."
      />
      <PageBody
        error={creditNotesError}
        hasData={creditNotesData != null}
        title="Credit notes could not be loaded"
        onRetry={refetchCreditNotes}
      >

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
        {!noNotes && (
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
              placeholder="Filter note, invoice or customer"
              label="Filter credit notes"
              className="w-full sm:w-64"
            />
          }
        />
        )}

        {/* Main Content Layout (65% Table / 35% Inspector) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
          {/* 65% Main Table Module */}
          {noNotes ? (
            <EmptyState
              icon="receipt_long"
              title="No credit notes yet"
              description="Credit notes raised against returned orders will be listed here once the first refund is issued."
              className="py-16 xl:col-span-12"
            />
          ) : (
          <DataTable
            data={notesPager.pageRows}
            columns={creditNoteColumns}
            keyField="id"
            className="min-w-[980px]"
            containerClassName={noMatches ? 'xl:col-span-12' : 'xl:col-span-8'}
            activeRowId={selectedNoteId ?? selectedNote?.id}
            onRowClick={(note) => setSelectedNoteId(note.id)}
            emptyIcon="receipt_long"
            emptyTitle="No credit notes match these filters"
            emptyMessage="No credit note matches the current search or status selection."
            emptyAction={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
            pagination={{
              page: notesPager.page,
              pageSize: notesPager.limit,
              totalItems: notesPager.total,
              onPageChange: notesPager.setPage,
              onPageSizeChange: notesPager.setLimit,
            }}
            toolbar={
              <TableToolbar
                className="px-space-md py-space-sm"
                left={
                  <span className="text-subheading font-semibold text-primary">Credit register</span>
                }
                right={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortDesc((previous) => !previous)}
                    title="Change the order credit notes are listed in"
                  >
                    <span>Issued date: {sortDesc ? 'newest first' : 'oldest first'}</span>
                    <Icon
                      name={sortDesc ? 'arrow_downward' : 'arrow_upward'}
                      aria-hidden="true"
                      className="material-symbols-outlined text-icon-sm"
                    />
                  </Button>
                }
              />
            }
          />
          )}

          {/* The panel used to print an IRN, a wallet RRN, a QC reference, a
              product thumbnail and a signing hash. A credit note records none of
              those, so every one of those lines rendered blank. */}
          {!noNotes && !noMatches && (
          <div className="xl:col-span-4 flex flex-col gap-space-md">
            {!selectedNote ? (
              <EmptyState
                icon="receipt_long"
                title="No credit note selected"
                description="Pick a credit note from the register to inspect it."
              />
            ) : (
              <>
                <SectionCard
                  title={selectedNote.id}
                  description={`Raised ${selectedNote.date} against ${selectedNote.invoice}`}
                  action={<StatusBadge status={selectedNote.status} variant={STATUS_VARIANT[selectedNote.status]} />}
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
                      description={`No invoice matching ${selectedNote.invoice} is in the register.`}
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
          )}
        </div>
      </PageBody>
    </PageContainer>
  );
}
