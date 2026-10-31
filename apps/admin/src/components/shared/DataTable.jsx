import React, { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Checkbox,
  Button,
  Icon,
  Card,
  Select,
} from '../ui';
import { Skeleton } from './Skeleton';

/**
 * TableEmptyState
 * Shown inside the table body when a query returns nothing, so the header and
 * toolbar stay put and the viewer keeps their filters.
 */
export function TableEmptyState({
  icon = "search_off",
  title = "No results found",
  message = "No records match your search, filter or hub selection.",
  action,
  colSpan = 8,
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-14 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-subtle bg-surface-subtle text-faint">
            <Icon name={icon} className="material-symbols-outlined text-icon-lg" />
          </span>
          <div className="flex flex-col gap-1">
            <h4 className="text-body font-semibold text-primary">{title}</h4>
            <p className="text-meta leading-relaxed text-muted">{message}</p>
          </div>
          {action && <div className="pt-1">{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * TableErrorState
 * A failed fetch never leaves skeletons on screen: the body swaps to this,
 * with the reason and a retry.
 */
export function TableErrorState({
  title = "Could not load these records",
  message = "The Everwear API did not answer. Check the connection and try again.",
  onRetry,
  colSpan = 8,
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-14 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-status-danger/25 bg-status-danger-bg text-danger">
            <Icon name="error" className="material-symbols-outlined text-icon-lg" />
          </span>
          <div className="flex flex-col gap-1">
            <h4 className="text-body font-semibold text-primary">{title}</h4>
            <p className="text-meta leading-relaxed text-muted">{message}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <Icon name="refresh" className="material-symbols-outlined text-icon" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * TableLoadingState
 * Placeholder rows at the same height as real ones, with widths on a fixed
 * cycle so nothing shifts when the data arrives.
 */
export function TableLoadingState({ colSpan = 8, rows = 5, selectable = false }) {
  const cycle = ["70%", "45%", "60%", "35%", "55%", "40%", "65%"];
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={`skeleton-${rIdx}`} className="hover:bg-transparent">
          {Array.from({ length: colSpan }).map((_, cIdx) => (
            <TableCell key={`cell-${rIdx}-${cIdx}`} className="py-3">
              {selectable && cIdx === 0 ? (
                <Skeleton rounded="sm" className="h-4 w-4" />
              ) : (
                <Skeleton className="h-3.5" style={{ width: cycle[(rIdx + cIdx) % cycle.length] }} />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** The one page-size ladder the whole admin uses. */
export const PAGE_SIZES = [10, 20, 50, 100]
export const DEFAULT_PAGE_SIZE = 10

/**
 * TablePagination
 * Record range and page size on the left, the stepper on the right. Renders
 * nothing when everything already fits on one page, so a short table does not
 * carry an empty control strip.
 */
export function TablePagination({
  currentPage = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZES,
  alwaysShow = false,
  className,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(Math.max(1, currentPage), totalPages)
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  // One page of results needs no controls; an empty result needs none either.
  if (!alwaysShow && totalPages <= 1 && totalItems <= Math.min(...pageSizeOptions)) return null

  return (
    <div
      className={cn(
        "flex h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-subtle bg-surface-subtle px-space-md text-meta text-muted",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          {totalItems === 0 ? (
            "No records"
          ) : (
            <>
              <span className="font-medium tabular-nums text-primary">{startItem}</span>–
              <span className="font-medium tabular-nums text-primary">{endItem}</span> of{" "}
              <span className="font-medium tabular-nums text-primary">{totalItems.toLocaleString()}</span>
            </>
          )}
        </span>

        {onPageSizeChange && totalItems > Math.min(...pageSizeOptions) && (
          <label className="hidden items-center gap-1.5 md:flex">
            <span>Rows</span>
            <Select
              className="h-8 w-[4.5rem] px-2 text-meta"
              wrapperClassName="w-auto"
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              options={pageSizeOptions.map((opt) => ({ value: String(opt), label: String(opt) }))}
            />
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange && onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <Icon name="chevron_left" aria-hidden="true" className="material-symbols-outlined text-icon" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <span className="px-1 tabular-nums text-primary">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange && onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <Icon name="chevron_right" aria-hidden="true" className="material-symbols-outlined text-icon" />
        </Button>
      </div>
    </div>
  );
}

/**
 * TableToolbar
 * Search, status pills, filters and exports above a table. Wraps onto extra
 * rows rather than letting a control slide out of reach.
 */
export function TableToolbar({ left, right, children, className, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch justify-between gap-space-sm border-b border-subtle p-space-sm lg:flex-row lg:items-center",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-space-xs">
        {left}
        {children}
      </div>
      {right && (
        <div className="flex shrink-0 flex-wrap items-center gap-space-xs">{right}</div>
      )}
    </div>
  );
}

/**
 * TableActions
 * The bulk-action bar that appears once rows are selected.
 */
export function TableActions({ selectedCount = 0, onClearSelection, children, className }) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex animate-fade-in flex-wrap items-center justify-between gap-space-md rounded-xl border border-primary/30 bg-primary-fixed/50 px-space-md py-2",
        className
      )}
    >
      <div className="flex items-center gap-2 text-meta font-semibold text-on-primary-fixed">
        <Icon name="check_box" className="material-symbols-outlined text-icon-md" />
        <span className="tabular-nums">
          {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
        </span>
        {onClearSelection && (
          <Button variant="link" className="ml-2 text-micro" onClick={onClearSelection}>
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * DataTable
 * Column definitions, optional selection, row click-through, and the four
 * states every data region owes its viewer: loading, error, empty, loaded.
 */
export function DataTable({
  columns = [],
  data = [],
  keyField = "id",
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  activeRowId,
  onRowClick,
  // Optional per-row classes: a string, or (row, index) => string. Lets a module
  // tint rows by state (a discrepancy, a suspension) without forking the table.
  rowClassName,
  isLoading = false,
  isError = false,
  errorTitle,
  errorMessage,
  onRetry,
  loadingRows = 5,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  emptyAction,
  pagination,
  clientPagination = false,
  toolbar,
  caption,
  stickyHeader = true,
  containerClassName,
  className,
  ...props
}) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(DEFAULT_PAGE_SIZE);

  const totalCols = columns.length + (selectable ? 1 : 0);
  const activePage = pagination?.page ?? internalPage;
  const activePageSize = pagination?.pageSize ?? internalPageSize;

  const displayData = useMemo(() => {
    if (!clientPagination) return data;
    const start = (activePage - 1) * activePageSize;
    return data.slice(start, start + activePageSize);
  }, [data, clientPagination, activePage, activePageSize]);

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <Card className={cn("flex min-w-0 flex-col overflow-hidden", containerClassName)}>
      {toolbar}

      <Table
        className={className}
        containerClassName={cn("max-h-[70vh]", stickyHeader && "overflow-y-auto")}
        {...props}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader sticky={stickyHeader}>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-10 text-center">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                  aria-label={allSelected ? "Clear selection" : "Select all rows"}
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                key={col.key || idx}
                className={cn(
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right",
                  // `fit` columns hug their content instead of taking a share of
                  // the slack: a 1px width plus nowrap is the auto-layout idiom
                  // for "as narrow as the text allows".
                  col.fit && "w-px whitespace-nowrap",
                  // `grow` hands one column all the leftover width. Without it
                  // the slack is shared between every non-`fit` column, which
                  // is what a report of mostly text columns wants.
                  col.grow && "w-full",
                  col.headerClassName
                )}
                style={{ width: col.fit ? "1px" : col.width }}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isError ? (
            <TableErrorState
              colSpan={totalCols}
              title={errorTitle}
              message={errorMessage}
              onRetry={onRetry}
            />
          ) : isLoading ? (
            <TableLoadingState colSpan={totalCols} rows={loadingRows} selectable={selectable} />
          ) : displayData.length === 0 ? (
            <TableEmptyState
              colSpan={totalCols}
              icon={emptyIcon}
              title={emptyTitle}
              message={emptyMessage}
              action={emptyAction}
            />
          ) : (
            displayData.map((row, rIdx) => {
              const rowKey = row[keyField] ?? rIdx;
              const isSelected = selectedIds.includes(rowKey);
              const isActive = activeRowId === rowKey;
              const isClickable = Boolean(onRowClick);

              return (
                <TableRow
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  data-state={isSelected ? "selected" : undefined}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    isClickable && "cursor-pointer",
                    isActive && "bg-primary-fixed/50 hover:bg-primary-fixed/60",
                    typeof rowClassName === "function" ? rowClassName(row, rIdx) : rowClassName
                  )}
                >
                  {selectable && (
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelectRow && onSelectRow(rowKey, !isSelected);
                        }}
                        aria-label={`Select row ${rIdx + 1}`}
                      />
                    </TableCell>
                  )}

                  {columns.map((col, cIdx) => {
                    const cellValue =
                      typeof col.accessor === "function"
                        ? col.accessor(row)
                        : col.accessor
                        ? row[col.accessor]
                        : null;

                    return (
                      <TableCell
                        key={col.key || cIdx}
                        className={cn(
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right tabular-nums",
                          col.fit && "w-px whitespace-nowrap",
                          col.grow && "w-full",
                          col.className
                        )}
                      >
                        {col.cell ? col.cell(row, rIdx) : cellValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {pagination && !isError && (
        <TablePagination
          currentPage={pagination.page ?? internalPage}
          pageSize={pagination.pageSize ?? internalPageSize}
          totalItems={pagination.totalItems ?? data.length}
          onPageChange={pagination.onPageChange ?? setInternalPage}
          onPageSizeChange={pagination.onPageSizeChange ?? setInternalPageSize}
          pageSizeOptions={pagination.pageSizeOptions}
        />
      )}
    </Card>
  );
}
