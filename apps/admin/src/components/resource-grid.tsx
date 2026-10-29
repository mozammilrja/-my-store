import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTable, type ColumnDef, type PaginationState } from "@tanstack/react-table"
import { RefreshCw, Search } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import type { Paged } from "@/lib/types"

export type GridColumn<TData extends object> = ColumnDef<DataGridFeatures, TData>

type ResourceGridProps<TData extends object> = {
  /** Admin API list path, e.g. "/admin/orders" */
  path: string
  /** Response key that holds the rows, e.g. "orders" */
  resultKey: string
  columns: GridColumn<TData>[]
  searchPlaceholder?: string
  emptyMessage?: ReactNode
  onRowClick?: (row: TData) => void
  toolbar?: ReactNode
}

const useDebounced = <T,>(value: T, delay = 300) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

/**
 * A server-paginated ReUI data grid over one admin list endpoint:
 * search, paging and loading / empty / error states in one place.
 */
export const ResourceGrid = <TData extends { id: string }>({
  path,
  resultKey,
  columns,
  searchPlaceholder = "Search",
  emptyMessage = "Nothing here yet",
  onRowClick,
  toolbar,
}: ResourceGridProps<TData>) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [search, setSearch] = useState("")
  const q = useDebounced(search.trim())

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [q])

  const query = useQuery({
    queryKey: [path, q, pagination],
    queryFn: () =>
      api<Paged<string, TData>>(path, {
        query: {
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
          ...(q ? { q } : {}),
        },
      }),
    placeholderData: keepPreviousData,
  })

  const rows = (query.data?.[resultKey] as TData[] | undefined) ?? []
  const count = query.data?.count ?? 0

  // Plain string headers get ReUI's column header (muted label, sort affordance)
  const gridColumns = useMemo(
    () =>
      columns.map((column) =>
        typeof column.header === "string"
          ? ({
              ...column,
              meta: { ...column.meta, headerTitle: column.header },
              header: ({ column: col }) => <DataGridColumnHeader column={col} />,
            } as GridColumn<TData>)
          : column
      ),
    [columns]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns: gridColumns,
    data: rows,
    getRowId: (row) => row.id,
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    rowCount: count,
  })

  return (
    <Frame>
      <FrameHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-72">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => query.refetch()}
            aria-label="Refresh"
          >
            <RefreshCw className={query.isFetching ? "animate-spin" : undefined} />
          </Button>
        </div>
      </FrameHeader>
      <FramePanel className="p-0">
        {query.isError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Could not load this list</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                {query.error instanceof Error
                  ? query.error.message
                  : "Something went wrong."}
                <Button variant="outline" size="sm" onClick={() => query.refetch()}>
                  <RefreshCw />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <DataGrid
            table={table}
            recordCount={count}
            isLoading={query.isPending}
            onRowClick={onRowClick}
            emptyMessage={emptyMessage}
            tableLayout={{ dense: true, headerBackground: true, headerSticky: true }}
          >
            <DataGridContainer>
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
            <div className="border-t px-4 py-2">
              <DataGridPagination sizes={[20, 50, 100]} />
            </div>
          </DataGrid>
        )}
      </FramePanel>
    </Frame>
  )
}
