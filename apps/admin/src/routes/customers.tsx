import type { HttpTypes } from "@medusajs/types"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { Badge } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { LEGACY_ADMIN_URL } from "@/lib/sdk"

type CustomerRow = HttpTypes.AdminCustomer

const columns: GridColumn<CustomerRow>[] = [
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
      const name = [row.original.first_name, row.original.last_name]
        .filter(Boolean)
        .join(" ")
      return name ? name : <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: "account",
    header: "Account",
    size: 140,
    cell: ({ row }) =>
      row.original.has_account ? (
        <Badge variant="success-light">Registered</Badge>
      ) : (
        <Badge variant="outline">Guest</Badge>
      ),
  },
  {
    id: "created_at",
    header: "Joined",
    size: 140,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.created_at)}</span>
    ),
  },
]

const CustomersPage = () => (
  <>
    <PageHeader
      title="Customers"
      description="Shoppers with an account and guests who checked out."
      actions={
        <Button size="sm" asChild>
          <a href={`${LEGACY_ADMIN_URL}/customers/create`} target="_blank" rel="noreferrer">
            <Plus />
            New customer
          </a>
        </Button>
      }
    />
    <ResourceGrid<CustomerRow>
      path="/admin/customers"
      resultKey="customers"
      fields="id,email,first_name,last_name,has_account,created_at"
      columns={columns}
      searchPlaceholder="Search customers"
      emptyMessage="No customers yet"
      onRowClick={(customer) =>
        window.open(`${LEGACY_ADMIN_URL}/customers/${customer.id}`, "_blank")
      }
    />
  </>
)

export default CustomersPage
