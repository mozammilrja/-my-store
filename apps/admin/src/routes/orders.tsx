import { Link, useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import {
  ResourceGrid,
  type GridColumn,
  type GridFilter,
} from "@/components/resource-grid"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatMoney } from "@/lib/format"
import type { AdminOrder } from "@/lib/types"

const text = <Skeleton className="h-4 w-20" />
const short = <Skeleton className="h-4 w-12" />
const badge = <Skeleton className="h-5 w-16" />

/** The three facets `/admin/orders` filters on, with the values it accepts. */
const filters: GridFilter[] = [
  {
    key: "status",
    label: "Statuses",
    options: [
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
      { value: "canceled", label: "Canceled" },
    ],
  },
  {
    key: "payment",
    label: "Payments",
    options: [
      { value: "awaiting", label: "Awaiting" },
      { value: "paid", label: "Paid" },
      { value: "refunded", label: "Refunded" },
    ],
  },
  {
    key: "fulfillment",
    label: "Fulfillments",
    options: [
      { value: "unfulfilled", label: "Unfulfilled" },
      { value: "shipped", label: "Shipped" },
      { value: "delivered", label: "Delivered" },
      { value: "returned", label: "Returned" },
    ],
  },
]

const columns: GridColumn<AdminOrder>[] = [
  {
    id: "displayId",
    header: "Order",
    size: 90,
    meta: { skeleton: short },
    cell: ({ row }) => (
      <Link
        to={`/orders/${row.original.id}`}
        className="font-medium tabular-nums hover:underline"
      >
        #{row.original.displayId}
      </Link>
    ),
  },
  {
    id: "createdAt",
    header: "Date",
    size: 130,
    meta: { skeleton: text },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    size: 240,
    meta: { skeleton: <Skeleton className="h-4 w-40" /> },
    cell: ({ row }) => {
      const { shippingAddress, email, customerId } = row.original
      const name = [shippingAddress?.firstName, shippingAddress?.lastName]
        .filter(Boolean)
        .join(" ")
      return (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{name || email}</span>
          <span className="text-muted-foreground truncate text-xs">
            {name ? email : customerId ? "Account" : "Guest"}
          </span>
        </div>
      )
    },
  },
  {
    id: "paymentStatus",
    header: "Payment",
    size: 130,
    meta: { skeleton: badge },
    cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
  },
  {
    id: "fulfillmentStatus",
    header: "Fulfillment",
    size: 140,
    meta: { skeleton: badge },
    cell: ({ row }) => <StatusBadge status={row.original.fulfillmentStatus} />,
  },
  {
    id: "status",
    header: "Status",
    size: 120,
    meta: { skeleton: badge },
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "total",
    header: "Total",
    size: 120,
    meta: {
      headerClassName: "text-end [&>div]:justify-end",
      cellClassName: "text-end tabular-nums",
      skeleton: short,
    },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.totals.total, row.original.currency)}
      </span>
    ),
  },
]

const OrdersPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        eyebrow="Fulfillment & orders"
        title="Orders"
        description="Every order placed in your store, newest first."
      />
      <ResourceGrid<AdminOrder>
        path="/admin/orders"
        resultKey="orders"
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by number, email or last name"
        emptyMessage="No orders yet"
        onRowClick={(order) => navigate(`/orders/${order.id}`)}
      />
    </>
  )
}

export default OrdersPage
