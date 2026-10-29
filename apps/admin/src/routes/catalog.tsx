import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import { Pencil, Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError, adminApi } from "@/lib/api"
import { GRID_CAPS_HEADER } from "@/lib/typography"
import { formatCount } from "@/lib/format"

/** One taxonomy row, whichever collection it came from. */
type Entry = { id: string; handle: string; label: string; productCount: number }

type Draft = { label: string; handle: string }

/** The API takes a handle; derive a sensible one so nobody has to invent it. */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)

type Handlers = {
  busy: boolean
  noun: string
  onEdit: (entry: Entry) => void
  onDelete: (entry: Entry) => void
}

const buildColumns = ({
  busy,
  noun,
  onEdit,
  onDelete,
}: Handlers): ColumnDef<DataGridFeatures, Entry>[] => [
  {
    id: "label",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
    size: 260,
    meta: { skeleton: <Skeleton className="h-4 w-32" /> },
    cell: ({ row }) => <span className="truncate font-medium">{row.original.label}</span>,
  },
  {
    id: "handle",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Handle" />,
    size: 240,
    meta: { skeleton: <Skeleton className="h-4 w-28" /> },
    cell: ({ row }) => (
      <span className="text-muted-foreground truncate">{row.original.handle}</span>
    ),
  },
  {
    id: "productCount",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Products" />,
    size: 120,
    meta: {
      headerClassName: "text-end [&>div]:justify-end",
      cellClassName: "text-end tabular-nums",
      skeleton: <Skeleton className="h-4 w-8" />,
    },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCount(row.original.productCount)}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    size: 110,
    meta: { cellClassName: "text-end", skeleton: <Skeleton className="size-8" /> },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          aria-label={`Rename ${row.original.label}`}
          onClick={() => onEdit(row.original)}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          aria-label={`Delete ${noun.toLowerCase()} ${row.original.label}`}
          onClick={() => onDelete(row.original)}
        >
          <Trash2 />
        </Button>
      </div>
    ),
  },
]

type SectionProps = {
  /** Singular noun for this taxonomy, e.g. "Category". */
  noun: string
  description: string
  queryKey: string
  load: () => Promise<Entry[]>
  create: (draft: Draft) => Promise<unknown>
  rename: (id: string, draft: Draft) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
}

/**
 * Categories and collections differ only in their field names, so one section
 * serves both: same grid, same dialogs, same copy shape.
 */
const TaxonomySection = ({
  noun,
  description,
  queryKey,
  load,
  create,
  rename,
  remove,
}: SectionProps) => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ label: "", handle: "" })
  /** The row being renamed, or "new" while creating. */
  const [editing, setEditing] = useState<Entry | "new" | null>(null)
  const [deleting, setDeleting] = useState<Entry | null>(null)

  const query = useQuery({ queryKey: [queryKey], queryFn: load })
  const rows = query.data ?? []

  const onError = (caught: unknown) =>
    setError(caught instanceof ApiError ? caught.message : "Something went wrong.")

  const done = (message: string) => {
    setError(null)
    setEditing(null)
    setDeleting(null)
    queryClient.invalidateQueries({ queryKey: [queryKey] })
    toast.success(message)
  }

  const save = useMutation({
    mutationFn: () =>
      editing === "new"
        ? create({ label: draft.label.trim(), handle: draft.handle.trim() })
        : rename(editing!.id, { label: draft.label.trim(), handle: draft.handle.trim() }),
    onSuccess: () => done(editing === "new" ? `${noun} created` : `${noun} saved`),
    onError,
  })

  const destroy = useMutation({
    mutationFn: () => remove(deleting!.id),
    onSuccess: () => done(`${noun} deleted`),
    onError,
  })

  const busy = save.isPending || destroy.isPending

  const columns = useMemo(
    () =>
      buildColumns({
        busy,
        noun,
        onEdit: (entry) => {
          setError(null)
          setDraft({ label: entry.label, handle: entry.handle })
          setEditing(entry)
        },
        onDelete: (entry) => {
          setError(null)
          setDeleting(entry)
        },
      }),
    [busy, noun]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 50 } },
  })

  const startCreate = () => {
    setError(null)
    setDraft({ label: "", handle: "" })
    setEditing("new")
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <TriangleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load this list</AlertTitle>
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
          <FrameHeader className="flex-row items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <FrameTitle>{`${noun}s`}</FrameTitle>
              <FrameDescription>{description}</FrameDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={startCreate}>
                <Plus />
                {`New ${noun.toLowerCase()}`}
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => query.refetch()}
                aria-label={`Refresh ${noun.toLowerCase()}s`}
              >
                <RefreshCw className={query.isFetching ? "animate-spin" : undefined} />
              </Button>
            </div>
          </FrameHeader>
          <FramePanel className="p-0">
            <DataGrid
              table={table}
              recordCount={rows.length}
              isLoading={query.isPending}
              emptyMessage={`No ${noun.toLowerCase()}s yet`}
              tableLayout={{ headerBackground: true }}
              tableClassNames={{ headerRow: GRID_CAPS_HEADER, bodyRow: "h-11" }}
            >
              <DataGridContainer>
                <DataGridScrollArea>
                  <DataGridTable />
                </DataGridScrollArea>
              </DataGridContainer>
            </DataGrid>
          </FramePanel>
        </Frame>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !save.isPending) setEditing(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              save.mutate()
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {editing === "new" ? `New ${noun.toLowerCase()}` : `Rename ${noun.toLowerCase()}`}
              </DialogTitle>
              <DialogDescription>
                The handle is what the storefront puts in its URL.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="taxonomy-label">Name</FieldLabel>
                <Input
                  id="taxonomy-label"
                  required
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) => ({
                      label: event.target.value,
                      // Follow the name until the handle is edited by hand.
                      handle:
                        current.handle === slugify(current.label)
                          ? slugify(event.target.value)
                          : current.handle,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="taxonomy-handle">Handle</FieldLabel>
                <Input
                  id="taxonomy-handle"
                  required
                  value={draft.handle}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, handle: event.target.value }))
                  }
                />
                <FieldDescription>Lowercase letters, numbers and dashes.</FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? <Spinner /> : null}
                {editing === "new" ? "Create" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !destroy.isPending) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete ${deleting?.label ?? ""}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {`A ${noun.toLowerCase()} still used by products cannot be deleted; move them first. Products themselves are never touched.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={destroy.isPending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={destroy.isPending}
              onClick={(event) => {
                event.preventDefault()
                destroy.mutate()
              }}
            >
              {destroy.isPending ? <Spinner /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const CatalogPage = () => (
  <>
    <PageHeader
        eyebrow="Catalog & inventory"
      title="Catalog"
      description="How products are grouped in the shop: categories and collections."
    />
    <Tabs defaultValue="categories">
      <TabsList>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="collections">Collections</TabsTrigger>
      </TabsList>
      <TabsContent value="categories">
        <TaxonomySection
          noun="Category"
          description="What shoppers browse by, like Dresses or Knitwear."
          queryKey="categories"
          load={async () =>
            (await adminApi.categories()).categories.map((category) => ({
              id: category.id,
              handle: category.handle,
              label: category.name,
              productCount: category.productCount,
            }))
          }
          create={({ label, handle }) => adminApi.createCategory({ name: label, handle })}
          rename={(id, { label, handle }) =>
            adminApi.updateCategory(id, { name: label, handle })
          }
          remove={(id) => adminApi.deleteCategory(id)}
        />
      </TabsContent>
      <TabsContent value="collections">
        <TaxonomySection
          noun="Collection"
          description="Curated groups, like a season or a campaign drop."
          queryKey="collections"
          load={async () =>
            (await adminApi.collections()).collections.map((collection) => ({
              id: collection.id,
              handle: collection.handle,
              label: collection.title,
              productCount: collection.productCount,
            }))
          }
          create={({ label, handle }) =>
            adminApi.createCollection({ title: label, handle })
          }
          rename={(id, { label, handle }) =>
            adminApi.updateCollection(id, { title: label, handle })
          }
          remove={(id) => adminApi.deleteCollection(id)}
        />
      </TabsContent>
    </Tabs>
  </>
)

export default CatalogPage
