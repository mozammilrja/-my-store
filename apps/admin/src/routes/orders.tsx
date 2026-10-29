import { PageHeader } from "@/components/page-header"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { StatusBadge } from "@/components/status-badge"
import { formatDate, formatMoney } from "@/lib/format"
import type { AdminOrder } from "@/lib/types"

const columns: GridColumn<AdminOrder>[] = [
  {
    id: "displayId",
    header: "Order",
    size: 90,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">#{row.original.displayId}</span>
    ),
  },
  {
    id: "createdAt",
    header: "Date",
    size: 130,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    size: 240,
    cell: ({ row }) => {
      const { shippingAddress, email } = row.original
      const name = [shippingAddress?.firstName, shippingAddress?.lastName]
        .filter(Boolean)
        .join(" ")
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
    id: "paymentStatus",
    header: "Payment",
    size: 140,
    cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
  },
  {
    id: "fulfillmentStatus",
    header: "Fulfillment",
    size: 150,
    cell: ({ row }) => <StatusBadge status={row.original.fulfillmentStatus} />,
  },
  {
    id: "total",
    header: "Total",
    size: 120,
    meta: { headerClassName: "text-right", cellClassName: "text-right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.totals.total, row.original.currency)}
      </span>
    ),
  },
]

const OrdersPage = () => (
  <>
    <PageHeader title="Orders" description="Every order placed in your store." />
    <ResourceGrid<AdminOrder>
      path="/admin/orders"
      resultKey="orders"
      columns={columns}
      searchPlaceholder="Search orders"
      emptyMessage="No orders yet"
    />
  </>
)

export default OrdersPage
