import type { HttpTypes } from "@medusajs/types"
import { ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { formatDate, formatMoney } from "@/lib/format"
import { LEGACY_ADMIN_URL } from "@/lib/sdk"

type OrderRow = HttpTypes.AdminOrder

const columns: GridColumn<OrderRow>[] = [
  {
    id: "display_id",
    header: "Order",
    size: 90,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">#{row.original.display_id}</span>
    ),
  },
  {
    id: "created_at",
    header: "Date",
    size: 130,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.created_at)}</span>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    size: 240,
    cell: ({ row }) => {
      const { customer, email } = row.original
      const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ")
      return (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{name || email || "Guest"}</span>
          {name && email ? (
            <span className="text-muted-foreground truncate text-xs">{email}</span>
          ) : null}
        </div>
      )
    },
  },
  {
    id: "payment_status",
    header: "Payment",
    size: 140,
    cell: ({ row }) => <StatusBadge status={row.original.payment_status} />,
  },
  {
    id: "fulfillment_status",
    header: "Fulfillment",
    size: 150,
    cell: ({ row }) => <StatusBadge status={row.original.fulfillment_status} />,
  },
  {
    id: "total",
    header: "Total",
    size: 120,
    meta: { headerClassName: "text-right", cellClassName: "text-right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(Number(row.original.total) || 0, row.original.currency_code)}
      </span>
    ),
  },
]

const OrdersPage = () => (
  <>
    <PageHeader title="Orders" description="Every order placed in your store." />
    <ResourceGrid<OrderRow>
      path="/admin/orders"
      resultKey="orders"
      fields="id,display_id,status,created_at,email,payment_status,fulfillment_status,total,currency_code,*customer"
      columns={columns}
      searchPlaceholder="Search orders"
      emptyMessage="No orders yet"
      onRowClick={(order) => window.open(`${LEGACY_ADMIN_URL}/orders/${order.id}`, "_blank")}
      toolbar={
        <Button variant="outline" size="sm" asChild>
          <a href={`${LEGACY_ADMIN_URL}/draft-orders`} target="_blank" rel="noreferrer">
            Draft orders
            <ExternalLink />
          </a>
        </Button>
      }
    />
  </>
)

export default OrdersPage
