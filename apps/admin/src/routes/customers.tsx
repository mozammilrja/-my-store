import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/reui/badge"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { formatDate } from "@/lib/format"
import type { AdminCustomer } from "@/lib/types"

const columns: GridColumn<AdminCustomer>[] = [
  {
    id: "email",
    header: "Email",
    size: 280,
    cell: ({ row }) => <span className="truncate font-medium">{row.original.email}</span>,
  },
  {
    id: "name",
    header: "Name",
    size: 200,
    cell: ({ row }) => {
      const name = [row.original.firstName, row.original.lastName].filter(Boolean).join(" ")
      return name ? name : <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: "account",
    header: "Account",
    size: 140,
    cell: ({ row }) =>
      row.original.hasAccount ? (
        <Badge variant="success-light">Registered</Badge>
      ) : (
        <Badge variant="outline">Guest</Badge>
      ),
  },
  {
    id: "createdAt",
    header: "Joined",
    size: 140,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
]

const CustomersPage = () => (
  <>
    <PageHeader
      title="Customers"
      description="Shoppers with an account and guests who checked out."
    />
    <ResourceGrid<AdminCustomer>
      path="/admin/customers"
      resultKey="customers"
      columns={columns}
      searchPlaceholder="Search customers"
      emptyMessage="No customers yet"
    />
  </>
)

export default CustomersPage
