import { Link, useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/reui/badge"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCount, formatDate } from "@/lib/format"
import type { AdminCustomer } from "@/lib/types"

const columns: GridColumn<AdminCustomer>[] = [
  {
    id: "email",
    header: "Email",
    size: 280,
    meta: { skeleton: <Skeleton className="h-4 w-48" /> },
    cell: ({ row }) => (
      <Link
        to={`/customers/${row.original.id}`}
        className="truncate font-medium hover:underline"
      >
        {row.original.email}
      </Link>
    ),
  },
  {
    id: "name",
    header: "Name",
    size: 200,
    meta: { skeleton: <Skeleton className="h-4 w-32" /> },
    cell: ({ row }) => {
      const name = [row.original.firstName, row.original.lastName]
        .filter(Boolean)
        .join(" ")
      return name ? name : <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: "account",
    header: "Account",
    size: 130,
    meta: { skeleton: <Skeleton className="h-5 w-16" /> },
    cell: ({ row }) =>
      row.original.hasAccount ? (
        <Badge variant="success-light">Registered</Badge>
      ) : (
        <Badge variant="outline">Guest</Badge>
      ),
  },
  {
    id: "orders",
    header: "Orders",
    size: 100,
    meta: {
      headerClassName: "text-end [&>div]:justify-end",
      cellClassName: "text-end tabular-nums",
      skeleton: <Skeleton className="h-4 w-8" />,
    },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCount(row.original.orderCount)}</span>
    ),
  },
  {
    id: "createdAt",
    header: "Joined",
    size: 140,
    meta: { skeleton: <Skeleton className="h-4 w-20" /> },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
]

const CustomersPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        eyebrow="Customers & marketing"
        title="Customers"
        description="Shoppers with an account and guests who checked out."
      />
      <ResourceGrid<AdminCustomer>
        path="/admin/customers"
        resultKey="customers"
        columns={columns}
        searchPlaceholder="Search by email or name"
        emptyMessage="No customers yet"
        onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
      />
    </>
  )
}

export default CustomersPage
