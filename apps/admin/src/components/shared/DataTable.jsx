import React, { useState, useMemo } from 'react';
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

/**
 * TableEmptyState
 * Default clean empty state displayed when no rows match criteria.
 */
export function TableEmptyState({
  icon = "search_off",
  title = "No results found",
  message = "No records match your active search, filter or hub criteria.",
  action,
  colSpan = 8,
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-16">
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-secondary">
            <Icon name={icon} className="material-symbols-outlined text-[24px]" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-text-primary">{title}</h4>
            <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
          </div>
          {action && <div className="pt-1">{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * TableLoadingState
 * Shimmer skeleton rows displayed while data is fetching.
 */
export function TableLoadingState({ colSpan = 8, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={`skeleton-${rIdx}`} className="animate-pulse border-b border-border-subtle/40">
          {Array.from({ length: colSpan }).map((_, cIdx) => (
            <TableCell key={`cell-${rIdx}-${cIdx}`} className="py-3">
              <div
                className="h-4 bg-surface-container-high rounded-md"
                style={{
                  width: cIdx === 0 ? "24px" : `${Math.floor(40 + ((rIdx + cIdx) % 5) * 12)}%`,
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * TablePagination
 * Standard pagination controls with record range, page stepper and rows per page.
 */
export function TablePagination({
  currentPage = 1,
  pageSize = 25,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "p-space-sm bg-surface-subtle border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm text-xs text-text-secondary",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-text-primary">{startItem}</span>–
          <span className="font-semibold text-text-primary">{endItem}</span> of{" "}
          <span className="font-semibold text-text-primary">{totalItems}</span> records
        </span>

        {onPageSizeChange && (
          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-border-subtle">
            <span className="text-[11px] text-text-secondary">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-6 px-1.5 py-0 text-xs rounded bg-surface-canvas border border-border-subtle text-text-primary"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          type="button"
        >
          <Icon name="chevron_left" className="material-symbols-outlined text-[16px] mr-1" />
          Previous
        </Button>

        <span className="font-mono text-text-primary px-2">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          type="button"
        >
          Next
          <Icon name="chevron_right" className="material-symbols-outlined text-[16px] ml-1" />
        </Button>
      </div>
    </div>
  );
}

/**
 * TableToolbar
 * Container for search, status pills, filter dropdowns and export buttons above tables.
 */
export function TableToolbar({
  left,
  right,
  children,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "p-space-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm border-b border-border-subtle/50",
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-space-xs flex-1">
        {left}
        {children}
      </div>
      {right && (
        <div className="flex flex-wrap items-center gap-space-xs shrink-0">
          {right}
        </div>
      )}
    </div>
  );
}

/**
 * TableActions
 * Bulk action floating or inline bar displayed when rows are selected.
 */
export function TableActions({
  selectedCount = 0,
  onClearSelection,
  children,
  className,
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "px-space-md py-2 bg-primary-fixed/30 border border-primary/30 rounded-xl flex items-center justify-between gap-space-md animate-fade-in",
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Icon name="check_box" className="material-symbols-outlined text-[18px]" />
        <span>{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
        {onClearSelection && (
          <button
            onClick={onClearSelection}
            className="text-[11px] underline text-text-secondary hover:text-text-primary ml-2"
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}

/**
 * DataTable
 * Universal, high-performance data table component.
 * Supports column definitions, row actions, row selection, active selection drawer,
 * loading state, empty state, client & server pagination.
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
  isLoading = false,
  loadingRows = 5,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  emptyAction,
  pagination, // boolean or object { page, pageSize, totalItems, onPageChange, onPageSizeChange }
  clientPagination = false,
  toolbar,
  containerClassName,
  className,
  ...props
}) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(25);

  const totalCols = columns.length + (selectable ? 1 : 0);

  // Handle client-side pagination slicing
  const activePage = pagination?.page ?? internalPage;
  const activePageSize = pagination?.pageSize ?? internalPageSize;

  const displayData = useMemo(() => {
    if (!clientPagination) return data;
    const start = (activePage - 1) * activePageSize;
    return data.slice(start, start + activePageSize);
  }, [data, clientPagination, activePage, activePageSize]);

  const allSelected =
    data.length > 0 && selectedIds.length === data.length;

  const handleToggleSelectAll = (checked) => {
    if (onSelectAll) {
      onSelectAll(checked);
    }
  };

  const handleRowCheckbox = (id, e) => {
    e.stopPropagation();
    if (onSelectRow) {
      onSelectRow(id, !selectedIds.includes(id));
    }
  };

  return (
    <Card className={cn("overflow-hidden shadow-xs border-border-subtle", containerClassName)}>
      {toolbar}

      <div className="overflow-x-auto w-full">
        <Table className={className} {...props}>
          <TableHeader className="bg-surface-subtle">
            <TableRow className="border-b border-border-subtle">
              {selectable && (
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={allSelected}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                  />
                </TableHead>
              )}
              {columns.map((col, idx) => (
                <TableHead
                  key={col.key || idx}
                  className={cn(
                    "font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary whitespace-nowrap",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.headerClassName
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableLoadingState colSpan={totalCols} rows={loadingRows} />
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
                    className={cn(
                      "border-b border-border-subtle/50 transition-colors",
                      isClickable && "cursor-pointer hover:bg-surface-subtle/70",
                      isActive && "bg-primary-fixed/20 border-l-4 border-l-primary-container",
                      isSelected && "bg-surface-container-high/40"
                    )}
                  >
                    {selectable && (
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleRowCheckbox(rowKey, e)}
                        />
                      </TableCell>
                    )}

                    {columns.map((col, cIdx) => {
                      const cellValue = typeof col.accessor === "function"
                        ? col.accessor(row)
                        : col.accessor
                        ? row[col.accessor]
                        : null;

                      return (
                        <TableCell
                          key={col.key || cIdx}
                          className={cn(
                            col.align === "center" && "text-center",
                            col.align === "right" && "text-right",
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
      </div>

      {pagination && (
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
