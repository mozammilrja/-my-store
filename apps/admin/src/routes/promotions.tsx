import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import { Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { PromotionCreateDialog } from "@/components/promotion-create-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
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
import { Frame, FramePanel } from "@/components/reui/frame"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { ApiError, adminApi } from "@/lib/api"
import { GRID_CAPS_HEADER } from "@/lib/typography"
import { formatCount, formatDate, formatMoney } from "@/lib/format"
import type { AdminPromotion } from "@/lib/types"

/** A percentage reads as a percentage; a fixed amount reads in its own currency. */
const formatDiscount = (promotion: AdminPromotion) =>
  promotion.type === "percentage"
    ? `${promotion.value}% off`
    : `${formatMoney(promotion.value, promotion.currency)} off`

const formatWindow = (promotion: AdminPromotion) => {
  if (!promotion.startsAt && !promotion.endsAt) return "Always on"
  if (promotion.startsAt && promotion.endsAt)
    return `${formatDate(promotion.startsAt)} to ${formatDate(promotion.endsAt)}`
  return promotion.startsAt
    ? `From ${formatDate(promotion.startsAt)}`
    : `Until ${formatDate(promotion.endsAt)}`
}

type Handlers = {
  busy: boolean
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}

const buildColumns = ({
  busy,
  onToggle,
  onDelete,
}: Handlers): ColumnDef<DataGridFeatures, AdminPromotion>[] => [
  {
    id: "code",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Code" />,
    size: 160,
    meta: { skeleton: <Skeleton className="h-4 w-20" /> },
    cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
  },
  {
    id: "discount",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Discount" />,
    size: 150,
    meta: { skeleton: <Skeleton className="h-4 w-16" /> },
    cell: ({ row }) => <span className="tabular-nums">{formatDiscount(row.original)}</span>,
  },
  {
    id: "window",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Runs" />,
    size: 200,
    meta: { skeleton: <Skeleton className="h-4 w-28" /> },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatWindow(row.original)}</span>
    ),
  },
  {
    id: "usage",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Used" />,
    size: 110,
    meta: {
      headerClassName: "text-end [&>div]:justify-end",
      cellClassName: "text-end tabular-nums",
      skeleton: <Skeleton className="h-4 w-10" />,
    },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCount(row.original.usageCount)}
        {row.original.usageLimit ? ` / ${formatCount(row.original.usageLimit)}` : ""}
      </span>
    ),
  },
  {
    id: "active",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Live" />,
    size: 140,
    meta: { skeleton: <Skeleton className="h-5 w-16" /> },
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Switch
          checked={row.original.active}
          disabled={busy}
          aria-label={`${row.original.active ? "Switch off" : "Switch on"} ${row.original.code}`}
          onCheckedChange={(active) => onToggle(row.original.id, active)}
        />
        <Badge variant={row.original.active ? "success-light" : "outline"}>
          {row.original.active ? "Live" : "Off"}
        </Badge>
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    size: 60,
    meta: { cellClassName: "text-end", skeleton: <Skeleton className="size-8" /> },
    cell: ({ row }) => (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${row.original.code}`}
            disabled={busy}
          >
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {row.original.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Shoppers who enter this code will be told it is unknown. A code that has
              already been used cannot be deleted; switch it off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                onDelete(row.original.id)
              }}
            >
              {busy ? <Spinner /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
  },
]

const PromotionsPage = () => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => (await adminApi.promotions()).promotions,
  })

  const onError = (caught: unknown) =>
    setError(caught instanceof ApiError ? caught.message : "Something went wrong.")

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["promotions"] })

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.setPromotionActive(id, active),
    onSuccess: ({ promotion }) => {
      setError(null)
      refresh()
      toast.success(promotion.active ? "Code switched on" : "Code switched off")
    },
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deletePromotion(id),
    onSuccess: () => {
      setError(null)
      refresh()
      toast.success("Code deleted")
    },
    onError,
  })

  const rows = query.data ?? []
  const busy = setActive.isPending || remove.isPending

  const columns = useMemo(
    () =>
      buildColumns({
        busy,
        onToggle: (id, active) => setActive.mutate({ id, active }),
        onDelete: (id) => remove.mutate(id),
      }),
    // The mutate functions are stable; only the busy flag re-renders the cells.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  })

  return (
    <>
      <PageHeader
        eyebrow="Customers & marketing"
        title="Promotions"
        description="Discount codes shoppers can enter at checkout."
        actions={
          <>
            <PromotionCreateDialog
              onCreated={() => {
                setError(null)
                refresh()
              }}
              trigger={
                <Button size="sm">
                  <Plus />
                  New code
                </Button>
              }
            />
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => query.refetch()}
              aria-label="Refresh promotions"
            >
              <RefreshCw className={query.isFetching ? "animate-spin" : undefined} />
            </Button>
          </>
        }
      />

      {error ? (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <TriangleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the codes</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {query.error instanceof Error ? query.error.message : "Something went wrong."}
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              <RefreshCw />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Frame>
          <FramePanel className="p-0">
            <DataGrid
              table={table}
              recordCount={rows.length}
              isLoading={query.isPending}
              emptyMessage="No discount codes yet"
              tableLayout={{ headerBackground: true }}
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
          </FramePanel>
        </Frame>
      )}
    </>
  )
}

export default PromotionsPage
