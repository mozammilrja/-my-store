import React from 'react';
import {
  DataTable,
  SectionCard,
  RankedBars,
  SplitBreakdown,
  BarCell,
  StatusBadge,
} from '../shared';
import { useTableSort } from '../../hooks/useClientTable';
import { formatCount } from '../../lib/format';
import {
  METHOD,
  PO_LABEL,
  INVOICE_STATE,
  INVOICE_SORT,
  partsInOrder,
} from './analytics-data';
import {
  Panel,
  Region,
  ReportPanel,
  SummaryStat,
  SummaryStrip,
} from './analytics-parts';

/**
 * Finance and procurement: what the range owes, what it ordered, and what it
 * gave back.
 *
 * The registers were the densest thing on the old single page and the first
 * to be skipped. They get their own section and their own room here: the tax
 * ledger reads as a ledger, with its columns aligned and its totals stated
 * rather than left for the reader to add up.
 */
export function FinanceReport({ data, totals, money }) {
  const invoices = data?.invoices ?? [];
  const purchaseOrders = data?.purchaseOrders ?? [];
  const methodParts = partsInOrder(data?.paymentMethods, METHOD, 'method', { amount: true });
  const invoiceSort = useTableSort(invoices, INVOICE_SORT, { key: 'grandTotal', direction: 'desc' });

  const invoiceTotals = invoices.reduce(
    (acc, row) => ({
      count: acc.count + row.count,
      taxable: acc.taxable + row.taxable,
      tax: acc.tax + row.cgst + row.sgst + row.igst,
      grandTotal: acc.grandTotal + row.grandTotal,
    }),
    { count: 0, taxable: 0, tax: 0, grandTotal: 0 }
  );

  const poMax = Math.max(...purchaseOrders.map((p) => p.amount), 0);
  const poCommitted = purchaseOrders.reduce((n, p) => n + p.amount, 0);
  const returnsRecorded = (data?.returnReasons ?? []).reduce((n, r) => n + r.count, 0);

  // Seven columns, none of them hugging: with `fit` the six money columns
  // packed against the right edge and left the status column a third of the
  // table wide, so every heading had to be abbreviated to nothing.
  const amountColumn = (key, header) => ({
    key,
    header,
    align: 'right',
    sortable: true,
    accessor: (row) => <span className="text-secondary">{money(row[key])}</span>,
  });

  return (
    <ReportPanel id="finance">
      <SummaryStrip className="lg:grid-cols-4">
        <SummaryStat
          label="Tax collected"
          value={money(totals?.tax ?? 0)}
          note="Held for the tax authority, not revenue"
        />
        <SummaryStat
          label="Invoices issued"
          value={formatCount(invoiceTotals.count)}
          note={`${money(invoiceTotals.grandTotal)} invoiced in this range`}
        />
        <SummaryStat
          label="Committed to suppliers"
          value={money(poCommitted)}
          note={`${formatCount(purchaseOrders.reduce((n, p) => n + p.count, 0))} purchase orders raised`}
        />
        <SummaryStat
          label="Returns recorded"
          value={formatCount(returnsRecorded)}
          note="Return requests with a reason on file"
        />
      </SummaryStrip>

      <SectionCard
        title="GST and tax invoices"
        description="Tax invoices issued in this range, by status. An invoice is raised when an order is paid."
        contentClassName="p-0"
        footer={
          invoices.length > 0 && (
            <dl className="flex flex-wrap items-center gap-x-space-xl gap-y-1 px-space-sm text-meta text-muted">
              <div className="flex items-baseline gap-2">
                <dt>Taxable</dt>
                <dd className="text-num tabular-nums text-primary">{money(invoiceTotals.taxable)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Tax</dt>
                <dd className="text-num tabular-nums text-primary">{money(invoiceTotals.tax)}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>Invoiced</dt>
                <dd className="text-num tabular-nums text-primary">{money(invoiceTotals.grandTotal)}</dd>
              </div>
            </dl>
          )
        }
      >
        <DataTable
          sortKey={invoiceSort.sortKey}
          sortDirection={invoiceSort.sortDirection}
          onSort={invoiceSort.onSort}
          columns={[
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              accessor: (row) => (
                <StatusBadge
                  status={INVOICE_STATE[row.status]?.label ?? 'Issued'}
                  variant={INVOICE_STATE[row.status]?.variant ?? 'info'}
                />
              ),
            },
            {
              key: 'count',
              header: 'Count',
              align: 'right',
              sortable: true,
              accessor: (row) => formatCount(row.count),
            },
            amountColumn('taxable', 'Taxable'),
            amountColumn('cgst', 'CGST'),
            amountColumn('sgst', 'SGST'),
            amountColumn('igst', 'IGST'),
            {
              key: 'grandTotal',
              header: 'Total',
              align: 'right',
              sortable: true,
              accessor: (row) => <span className="text-num text-primary">{money(row.grandTotal)}</span>,
            },
          ]}
          data={invoiceSort.rows}
          keyField="status"
          emptyIcon="receipt_long"
          emptyTitle="No invoices in this range"
          emptyMessage="An invoice is raised when an order is paid. Widen the range to see earlier ones."
          caption="GST invoice totals by status"
        />
      </SectionCard>

      {/* Three readings of similar weight, so three columns rather than a
          short region beside a tall stack. */}
      <Panel columns={3}>
        <Region
          title="Payments by method"
          hint="Orders placed in this range, excluding cancelled ones, by how they were paid."
        >
          <SplitBreakdown
            parts={methodParts}
            formatValue={money}
            emptyMessage="No payments were recorded in this range."
          />
        </Region>

        <Region title="Purchase orders" hint="Raised with suppliers in this range, by committed value.">
          {purchaseOrders.length === 0 ? (
            <p className="text-meta text-muted">
              No purchase orders in this range — procurement raised nothing with suppliers over
              these dates.
            </p>
          ) : (
            <ul className="flex flex-col gap-space-md">
              {[...purchaseOrders]
                .sort((a, b) => b.amount - a.amount)
                .map((row) => (
                  <li key={row.status} className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-space-md">
                      <span className="truncate text-body-lg text-secondary">
                        {PO_LABEL[row.status] ?? row.status}
                        <span className="ml-2 text-meta text-faint">
                          {row.count} {row.count === 1 ? 'order' : 'orders'}
                        </span>
                      </span>
                      <span className="shrink-0 text-num tabular-nums text-primary">
                        {money(row.amount)}
                      </span>
                    </div>
                    <BarCell
                      value={row.amount}
                      max={poMax}
                      share={poCommitted > 0 ? Math.round((row.amount / poCommitted) * 100) : 0}
                      label={`${PO_LABEL[row.status] ?? row.status}: ${money(row.amount)} of ${money(
                        poCommitted
                      )} committed`}
                    />
                  </li>
                ))}
            </ul>
          )}
        </Region>

        <Region title="Why customers returned" hint="Reasons recorded on return requests in this range.">
          <RankedBars
            rows={(data?.returnReasons ?? []).map((r) => ({
              key: r.reason,
              label: r.reason,
              value: r.count,
            }))}
            // Five reasons with one return each max-scale into a column of
            // full-width bars that says nothing; measured against the whole,
            // the shape is real.
            scale="total"
            formatValue={formatCount}
            emptyMessage="Nothing was returned in this range."
          />
        </Region>
      </Panel>
    </ReportPanel>
  );
}

export default FinanceReport;
