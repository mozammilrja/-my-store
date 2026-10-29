import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTable, type ColumnDef, type PaginationState } from "@tanstack/react-table"
import { RefreshCw, Search } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { GRID_CAPS_HEADER } from "@/lib/typography"
import type { Paged } from "@/lib/types"

export type GridColumn<TData extends object> = ColumnDef<DataGridFeatures, TData>

/** One list filter the admin API reads as a query parameter, e.g. `payment=paid`. */
export type GridFilter = {
  key: string
  label: string
  options: { value: string; label: string }[]
}

type ResourceGridProps<TData extends object> = {
  /** Admin API list path, e.g. "/admin/orders" */
  path: string
  /** Response key that holds the rows, e.g. "orders" */
  resultKey: string
  columns: GridColumn<TData>[]
  searchPlaceholder?: string
  emptyMessage?: ReactNode
  filters?: GridFilter[]
  onRowClick?: (row: TData) => void
  toolbar?: ReactNode
}

/** The option that stands for "no filter"; Radix Select has no empty value. */
const ANY = "any"

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
 * search, filters, paging and loading / empty / error states in one place.
 * Every filter is sent to the API, so the rows on screen are the whole result.
 */
export const ResourceGrid = <TData extends { id: string }>({
  path,
  resultKey,
  columns,
  searchPlaceholder = "Search",
  emptyMessage = "Nothing here yet",
  filters = [],
  onRowClick,
  toolbar,
}: ResourceGridProps<TData>) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [search, setSearch] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()
  // Filters live in the URL, so a filtered list can be linked to and shared.
  // Only values the endpoint accepts are honoured; anything else is ignored.
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      filters
        .map((filter) => [filter.key, searchParams.get(filter.key) ?? ANY] as const)
        .filter(([key, value]) =>
          filters
            .find((filter) => filter.key === key)
            ?.options.some((option) => option.value === value)
        )
    )
  )
  const q = useDebounced(search.trim())

  const writeToUrl = (next: Record<string, string>) =>
    setSearchParams(
      (params) => {
        for (const filter of filters) {
          const value = next[filter.key]
          if (value && value !== ANY) params.set(filter.key, value)
          else params.delete(filter.key)
        }
        return params
      },
      { replace: true }
    )

  const choose = (key: string, value: string) => {
    setSelected((current) => {
      const next = { ...current, [key]: value }
      writeToUrl(next)
      return next
    })
  }

  const clearFilters = () => {
    setSelected({})
    writeToUrl({})
  }

  const active = Object.entries(selected).filter(([, value]) => value && value !== ANY)
  const filterQuery = Object.fromEntries(active)
  // Stable across renders, so it can key the query without re-fetching on every keystroke.
  const filterKey = JSON.stringify(filterQuery)

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [q, filterKey])

  const query = useQuery({
    queryKey: [path, q, filterKey, pagination],
    queryFn: () =>
      api<Paged<string, TData>>(path, {
        query: {
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
          ...(q ? { q } : {}),
          ...filterQuery,
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
              header: ({ column: col }) => (
                <DataGridColumnHeader column={col} />
              ),
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
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={selected[filter.key] ?? ANY}
              onValueChange={(value) => choose(filter.key, value)}
            >
              <SelectTrigger size="sm" aria-label={filter.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{`All ${filter.label.toLowerCase()}`}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {active.length ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
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
            emptyMessage={
              active.length || q ? "Nothing matches these filters" : emptyMessage
            }
            tableLayout={{ headerBackground: true, headerSticky: true }}
            tableClassNames={{ headerRow: GRID_CAPS_HEADER, bodyRow: "h-11" }}
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
