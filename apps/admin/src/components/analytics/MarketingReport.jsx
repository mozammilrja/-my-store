import React from 'react';
import { DataTable, TablePagination, SectionCard, Meter, StatusBadge } from '../shared';
import { useClientTable, useTableSort } from '../../hooks/useClientTable';
import { formatCount } from '../../lib/format';
import { PROMOTION_SORT } from './analytics-data';
import { ReportPanel, SummaryStat, SummaryStrip } from './analytics-parts';

/**
 * Marketing: which codes are being used, and how close they are to running
 * out.
 *
 * Redemptions are counted on the code itself, so unlike every other figure on
 * these screens they span the code's whole life rather than the selected
 * range. That is stated rather than quietly left for the reader to discover
 * when the numbers refuse to move with the dates.
 *
 * The API records whether a code is active and how often it has been
 * redeemed. It does not record an expiry, so no code is reported as expired:
 * a state that cannot be read from the records is not invented for the sake
 * of a fuller legend.
 */
export function MarketingReport({ data }) {
  const promotions = data?.promotions ?? [];
  const sort = useTableSort(promotions, PROMOTION_SORT, { key: 'usageCount', direction: 'desc' });
  const pager = useClientTable(sort.rows);

  const live = promotions.filter((p) => p.active).length;
  const redemptions = promotions.reduce((n, p) => n + (p.usageCount ?? 0), 0);
  const capped = promotions.filter((p) => p.usageLimit > 0);
  const nearLimit = capped.filter((p) => p.usageCount / p.usageLimit >= 0.9).length;

  return (
    <ReportPanel id="marketing">
      <SummaryStrip className="lg:grid-cols-4">
        <SummaryStat
          label="Codes live"
          value={`${formatCount(live)} of ${formatCount(promotions.length)}`}
          note="Paused codes stay listed, with their history"
        />
        <SummaryStat
          label="Total redemptions"
          value={formatCount(redemptions)}
          note="Counted on the code, over its whole life"
        />
        <SummaryStat
          label="Codes with a limit"
          value={formatCount(capped.length)}
          note="The rest can be redeemed without a cap"
        />
        <SummaryStat
          label="At or near their limit"
          value={formatCount(nearLimit)}
          note="Nine tenths of the cap redeemed, or more"
        />
      </SummaryStrip>

      <SectionCard
        title="Promotion usage"
        description="Redemptions are counted on the code itself, so they span its whole life rather than the selected range. The records carry no expiry date, so a code reads as live or paused and never as expired."
        contentClassName="p-0"
      >
        <DataTable
          sortKey={sort.sortKey}
          sortDirection={sort.sortDirection}
          onSort={sort.onSort}
          columns={[
            {
              key: 'code',
              header: 'Coupon code',
              sortable: true,
              grow: true,
              accessor: (p) => <span className="font-mono text-num text-primary">{p.code}</span>,
            },
            {
              key: 'state',
              fit: true,
              header: 'State',
              sortable: true,
              accessor: (p) => (
                <StatusBadge
                  status={p.active ? 'Live' : 'Paused'}
                  variant={p.active ? 'success' : 'secondary'}
                  showDot
                />
              ),
            },
            {
              key: 'usageCount',
              fit: true,
              header: 'Redemptions',
              align: 'right',
              sortable: true,
              accessor: (p) => formatCount(p.usageCount),
            },
            {
              key: 'usageLimit',
              fit: true,
              header: 'Limit',
              align: 'right',
              sortable: true,
              accessor: (p) =>
                p.usageLimit === null || p.usageLimit === undefined ? (
                  <span className="text-faint">No limit</span>
                ) : (
                  formatCount(p.usageLimit)
                ),
            },
            {
              key: 'burn',
              header: 'Usage against limit',
              sortable: true,
              className: 'w-[24%] min-w-[10rem]',
              accessor: (p) => (
                <Meter
                  value={p.usageCount}
                  max={p.usageLimit}
                  label={`${p.code}: ${p.usageCount} redemptions against a limit of ${p.usageLimit}`}
                />
              ),
            },
          ]}
          data={pager.pageRows}
          keyField="code"
          emptyIcon="sell"
          emptyTitle="No promotions yet"
          emptyMessage="Codes created in Promotions & coupons appear here."
          caption="Promotion codes and how often they have been redeemed"
        />
        <TablePagination
          currentPage={pager.page}
          pageSize={pager.limit}
          totalItems={pager.total}
          onPageChange={pager.setPage}
          onPageSizeChange={pager.setLimit}
          alwaysShow
        />
      </SectionCard>
    </ReportPanel>
  );
}

export default MarketingReport;
