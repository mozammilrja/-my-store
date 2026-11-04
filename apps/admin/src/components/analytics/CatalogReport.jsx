import React, { useMemo } from 'react';
import {
  DataTable,
  TablePagination,
  SearchInput,
  SectionCard,
  BarCell,
} from '../shared';
import { useClientTable, useTableSort } from '../../hooks/useClientTable';
import { formatCount } from '../../lib/format';
import { PRODUCT_SORT, CATEGORY_SORT } from './analytics-data';
import { ReportPanel, SummaryStat, SummaryStrip } from './analytics-parts';

/**
 * Products and categories: what sold, read once.
 *
 * One table per question rather than a ranked chart above a table of the same
 * rows. The share column carries the bar and the figure together, because a
 * bar alone asks the reader to estimate a proportion they could simply be
 * told.
 */
export function CatalogReport({ data, totals, productSearch, onProductSearch, money }) {
  const products = data?.topProducts ?? [];
  const categories = data?.categories ?? [];

  const filtered = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return q ? products.filter((p) => (p.title ?? '').toLowerCase().includes(q)) : products;
  }, [products, productSearch]);

  const productSort = useTableSort(filtered, PRODUCT_SORT, { key: 'revenue', direction: 'desc' });
  const categorySort = useTableSort(categories, CATEGORY_SORT, { key: 'revenue', direction: 'desc' });
  const productPager = useClientTable(productSort.rows);
  const categoryPager = useClientTable(categorySort.rows);

  const productMax = Math.max(...products.map((p) => p.revenue), 0);
  const categoryMax = Math.max(...categories.map((c) => c.revenue), 0);
  // Line revenue sums into gross sales, so a product's share of gross is a
  // real proportion. Categories cannot use the same denominator: a product in
  // two categories is counted in both, so their share is of what the category
  // breakdown itself attributes.
  const grossSales = totals?.grossSales ?? 0;
  const categoryTotal = categories.reduce((n, c) => n + c.revenue, 0);

  const shareOf = (value, whole) => (whole > 0 ? Math.round((value / whole) * 100) : 0);

  return (
    <ReportPanel id="catalog">
      <SummaryStrip>
        <SummaryStat
          label="Products with sales"
          value={formatCount(products.length)}
          note="The twenty strongest lines by revenue"
        />
        <SummaryStat
          label="Categories with sales"
          value={formatCount(categories.length)}
          note="The fifteen strongest categories by revenue"
        />
        <SummaryStat
          label="Low-stock variants"
          value={formatCount(data?.lowStockVariants ?? 0)}
          note="At or below the reorder threshold, store-wide"
        />
      </SummaryStrip>

      <SectionCard
        title="Product performance"
        description="Revenue at the price each line actually sold for, and its share of gross sales."
        action={
          <SearchInput
            value={productSearch}
            onChange={onProductSearch}
            onClear={() => onProductSearch('')}
            label="Search products"
            placeholder="Product name"
          />
        }
        contentClassName="p-0"
      >
        <DataTable
          sortKey={productSort.sortKey}
          sortDirection={productSort.sortDirection}
          onSort={productSort.onSort}
          columns={[
            {
              key: 'title',
              header: 'Product',
              sortable: true,
              grow: true,
              // Long garment names wrapped to four lines on a phone and broke
              // the row rhythm; the full name stays available on hover.
              className: 'max-w-md',
              accessor: (p) => (
                <span className="block truncate text-body-lg text-primary" title={p.title ?? 'Unknown product'}>
                  {p.title ?? 'Unknown product'}
                </span>
              ),
            },
            {
              key: 'share',
              header: 'Share',
              sortable: true,
              className: 'w-1/4 min-w-40',
              accessor: (p) => (
                <BarCell
                  value={p.revenue}
                  max={productMax}
                  share={shareOf(p.revenue, grossSales)}
                  label={`${p.title ?? 'Unknown product'}: ${money(p.revenue)}, ${shareOf(
                    p.revenue,
                    grossSales
                  )}% of gross sales`}
                />
              ),
            },
            { key: 'units', fit: true, header: 'Units', align: 'right', sortable: true, accessor: (p) => formatCount(p.units) },
            {
              key: 'orders',
              fit: true,
              header: 'Order lines',
              align: 'right',
              sortable: true,
              accessor: (p) => formatCount(p.orders),
            },
            {
              key: 'revenue',
              fit: true,
              header: 'Revenue',
              align: 'right',
              sortable: true,
              accessor: (p) => <span className="text-num text-primary">{money(p.revenue)}</span>,
            },
          ]}
          data={productPager.pageRows}
          keyField="productId"
          emptyIcon="inventory_2"
          emptyTitle={productSearch ? 'No products match that search' : 'Nothing sold in this range'}
          emptyMessage={
            productSearch
              ? 'Clear the search to see every product that sold.'
              : 'Widen the date range to see product performance.'
          }
          caption="Products by revenue in the selected range"
        />
        <TablePagination
          currentPage={productPager.page}
          pageSize={productPager.limit}
          totalItems={productPager.total}
          onPageChange={productPager.setPage}
          onPageSizeChange={productPager.setLimit}
          alwaysShow
        />
      </SectionCard>

      <SectionCard
        title="Category performance"
        description="Each sold line counted against every category its product belongs to, so a product in two categories reports in both."
        contentClassName="p-0"
      >
        <DataTable
          sortKey={categorySort.sortKey}
          sortDirection={categorySort.sortDirection}
          onSort={categorySort.onSort}
          columns={[
            {
              key: 'name',
              header: 'Category',
              sortable: true,
              grow: true,
              className: 'max-w-md',
              accessor: (c) => (
                <span className="block truncate text-body-lg text-primary" title={c.name}>
                  {c.name}
                </span>
              ),
            },
            {
              key: 'share',
              header: 'Revenue share',
              sortable: true,
              className: 'w-1/4 min-w-40',
              accessor: (c) => (
                <BarCell
                  value={c.revenue}
                  max={categoryMax}
                  share={shareOf(c.revenue, categoryTotal)}
                  label={`${c.name}: ${money(c.revenue)}, ${shareOf(
                    c.revenue,
                    categoryTotal
                  )}% of category-attributed revenue`}
                />
              ),
            },
            { key: 'units', fit: true, header: 'Units', align: 'right', sortable: true, accessor: (c) => formatCount(c.units) },
            {
              key: 'revenue',
              fit: true,
              header: 'Revenue',
              align: 'right',
              sortable: true,
              accessor: (c) => <span className="text-num text-primary">{money(c.revenue)}</span>,
            },
          ]}
          data={categoryPager.pageRows}
          keyField="categoryId"
          emptyIcon="folder_open"
          emptyTitle="No category sales in this range"
          emptyMessage="Products sold in this range are not assigned to a category."
          caption="Categories by revenue in the selected range"
        />
        <TablePagination
          currentPage={categoryPager.page}
          pageSize={categoryPager.limit}
          totalItems={categoryPager.total}
          onPageChange={categoryPager.setPage}
          onPageSizeChange={categoryPager.setLimit}
          alwaysShow
        />
      </SectionCard>
    </ReportPanel>
  );
}

export default CatalogReport;
