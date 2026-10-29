import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import { Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useMe } from "@/hooks/use-me"
import { ApiError, adminApi } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { GRID_CAPS_HEADER } from "@/lib/typography"
import type { AdminUserRow } from "@/lib/types"

type Handlers = {
  canManage: boolean
  busy: boolean
  currentId?: string
  onRole: (user: AdminUserRow, role: "owner" | "staff") => void
  onDelete: (user: AdminUserRow) => void
}

const buildColumns = ({
  canManage,
  busy,
  currentId,
  onRole,
  onDelete,
}: Handlers): ColumnDef<DataGridFeatures, AdminUserRow>[] => [
  {
    id: "email",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
    size: 280,
    meta: { skeleton: <Skeleton className="h-4 w-48" /> },
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{row.original.email}</span>
        {row.original.id === currentId ? (
          <span className="text-muted-foreground text-xs">That is you</span>
        ) : null}
      </div>
    ),
  },
  {
    id: "name",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Name" />,
    size: 200,
    meta: { skeleton: <Skeleton className="h-4 w-32" /> },
    cell: ({ row }) =>
      row.original.name ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: "role",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
    size: 180,
    meta: { skeleton: <Skeleton className="h-5 w-20" /> },
    cell: ({ row }) =>
      canManage ? (
        <Select
          value={row.original.role}
          disabled={busy}
          onValueChange={(value) => onRole(row.original, value as "owner" | "staff")}
        >
          <SelectTrigger size="sm" aria-label={`Role for ${row.original.email}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Badge variant={row.original.role === "owner" ? "info-light" : "outline"}>
          {row.original.role === "owner" ? "Owner" : "Staff"}
        </Badge>
      ),
  },
  {
    id: "createdAt",
    header: ({ column }) => <DataGridColumnHeader column={column} title="Added" />,
    size: 140,
    meta: { skeleton: <Skeleton className="h-4 w-20" /> },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    size: 60,
    meta: { cellClassName: "text-end", skeleton: <Skeleton className="size-8" /> },
    cell: ({ row }) =>
      canManage && row.original.id !== currentId ? (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          aria-label={`Remove ${row.original.email}`}
          onClick={() => onDelete(row.original)}
        >
          <Trash2 />
        </Button>
      ) : null,
  },
]

const EMPTY = { email: "", password: "", name: "", role: "staff" as "owner" | "staff" }

const UsersPage = () => {
  const queryClient = useQueryClient()
  const me = useMe()
  const canManage = me.data?.role === "owner"
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY)
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null)

  const query = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await adminApi.users()).users,
  })
  const rows = query.data ?? []

  const onError = (caught: unknown) =>
    setError(caught instanceof ApiError ? caught.message : "Something went wrong.")

  const done = (message: string) => {
    setError(null)
    setCreating(false)
    setDeleting(null)
    setDraft(EMPTY)
    queryClient.invalidateQueries({ queryKey: ["users"] })
    toast.success(message)
  }

  const create = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        email: draft.email.trim(),
        password: draft.password,
        ...(draft.name.trim() ? { name: draft.name.trim() } : {}),
        role: draft.role,
      }),
    onSuccess: () => done("Admin added"),
    onError,
  })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "owner" | "staff" }) =>
      adminApi.updateUser(id, { role }),
    onSuccess: () => done("Role updated"),
    onError,
  })

  const remove = useMutation({
    mutationFn: () => adminApi.deleteUser(deleting!.id),
    onSuccess: () => done("Admin removed"),
    onError,
  })

  const busy = create.isPending || setRole.isPending || remove.isPending

  const columns = useMemo(
    () =>
      buildColumns({
        canManage,
        busy,
        currentId: me.data?.id,
        onRole: (user, role) => setRole.mutate({ id: user.id, role }),
        onDelete: (user) => {
          setError(null)
          setDeleting(user)
        },
      }),
    // The mutate functions are stable; only these flags re-render the cells.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, busy, me.data?.id]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.id,
  })

  return (
    <>
      <PageHeader
        eyebrow="Customers & admin"
        title="Users & roles"
        description="Who can sign in to this dashboard, and what they may do."
        actions={
          <>
            {canManage ? (
              <Dialog
                open={creating}
                onOpenChange={(open) => {
                  if (create.isPending) return
                  setCreating(open)
                  if (!open) {
                    setDraft(EMPTY)
                    setError(null)
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus />
                    Add admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <form
                    onSubmit={(event: FormEvent) => {
                      event.preventDefault()
                      create.mutate()
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle>Add an admin</DialogTitle>
                      <DialogDescription>
                        They can sign in straight away with this password.
                      </DialogDescription>
                    </DialogHeader>
                    <FieldGroup>
                      {error ? (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ) : null}
                      <Field>
                        <FieldLabel htmlFor="user-email">Email</FieldLabel>
                        <Input
                          id="user-email"
                          type="email"
                          required
                          autoComplete="off"
                          value={draft.email}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, email: event.target.value }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="user-name">Name</FieldLabel>
                        <Input
                          id="user-name"
                          value={draft.name}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="user-password">Password</FieldLabel>
                        <Input
                          id="user-password"
                          type="password"
                          required
                          minLength={12}
                          autoComplete="new-password"
                          value={draft.password}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                        />
                        <FieldDescription>At least 12 characters.</FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="user-role">Role</FieldLabel>
                        <Select
                          value={draft.role}
                          onValueChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              role: value as "owner" | "staff",
                            }))
                          }
                        >
                          <SelectTrigger id="user-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          Only an owner can manage users and settings.
                        </FieldDescription>
                      </Field>
                    </FieldGroup>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={create.isPending}
                        onClick={() => setCreating(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={create.isPending}>
                        {create.isPending ? <Spinner /> : null}
                        Add admin
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => query.refetch()}
              aria-label="Refresh users"
            >
              <RefreshCw className={query.isFetching ? "animate-spin" : undefined} />
            </Button>
          </>
        }
      />

      {!canManage && !me.isPending ? (
        <Alert variant="info">
          <AlertDescription>
            Staff accounts can see who has access; only an owner can change it.
          </AlertDescription>
        </Alert>
      ) : null}

      {error && !creating ? (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <TriangleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the admins</AlertTitle>
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
              emptyMessage="No admin accounts"
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

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this dashboard immediately. Orders and products they
              touched are unaffected. The last owner cannot be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Keep access</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault()
                remove.mutate()
              }}
            >
              {remove.isPending ? <Spinner /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default UsersPage
