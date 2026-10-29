import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/reui/alert"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { StatusBadge } from "@/components/status-badge"
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError, adminApi } from "@/lib/api"
import { formatDateTime, formatMoney } from "@/lib/format"
import type { Address, AdminOrder, FulfillmentStatus, PaymentStatus } from "@/lib/types"
import { toast } from "sonner"

/** The only moves the API accepts from each state, so the UI offers nothing it would refuse. */
const FULFILLMENT_NEXT: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  unfulfilled: ["shipped"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: [],
}
const PAYMENT_NEXT: Record<PaymentStatus, PaymentStatus[]> = {
  awaiting: ["paid"],
  paid: ["refunded"],
  refunded: [],
}

const ACTION_LABEL: Record<string, string> = {
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  returned: "Mark returned",
  paid: "Mark paid",
  refunded: "Mark refunded",
}

const AddressBlock = ({ title, address }: { title: string; address: Address }) => (
  <div className="flex flex-col gap-1">
    <span className="text-muted-foreground text-xs font-medium">{title}</span>
    <address className="text-sm not-italic">
      {address.firstName} {address.lastName}
      {address.company ? <br /> : null}
      {address.company}
      <br />
      {address.address1}
      {address.address2 ? <br /> : null}
      {address.address2}
      <br />
      {address.postalCode} {address.city}
      {address.province ? `, ${address.province}` : ""}
      <br />
      {address.countryCode.toUpperCase()}
      {address.phone ? <br /> : null}
      {address.phone}
    </address>
  </div>
)

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
    <span className={strong ? "font-medium tabular-nums" : "tabular-nums"}>{value}</span>
  </div>
)

const OrderSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
    <Skeleton className="h-96 rounded-xl xl:col-span-2" />
    <Skeleton className="h-96 rounded-xl" />
  </div>
)

const OrderDetailPage = () => {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await adminApi.order(id)).order,
  })

  const refresh = (order: AdminOrder) => {
    queryClient.setQueryData(["order", id], order)
    queryClient.invalidateQueries({ queryKey: ["/admin/orders"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] })
  }

  const onError = (caught: unknown) =>
    setActionError(caught instanceof ApiError ? caught.message : "Something went wrong.")

  const setStatus = useMutation({
    mutationFn: (body: { fulfillmentStatus?: FulfillmentStatus; paymentStatus?: PaymentStatus }) =>
      adminApi.setOrderStatus(id, body),
    onSuccess: ({ order }) => {
      setActionError(null)
      refresh(order)
      toast.success("Order updated")
    },
    onError,
  })

  const cancel = useMutation({
    mutationFn: () => adminApi.cancelOrder(id),
    onSuccess: ({ order }) => {
      setActionError(null)
      refresh(order)
      toast.success("Order canceled and stock returned")
    },
    onError,
  })

  const order = query.data
  const busy = setStatus.isPending || cancel.isPending

  const moves: { status: FulfillmentStatus | PaymentStatus; kind: "fulfillment" | "payment" }[] =
    order && order.status !== "canceled"
      ? [
          ...FULFILLMENT_NEXT[order.fulfillmentStatus].map((status) => ({
            status,
            kind: "fulfillment" as const,
          })),
          ...PAYMENT_NEXT[order.paymentStatus].map((status) => ({
            status,
            kind: "payment" as const,
          })),
        ]
      : []

  return (
    <>
      <PageHeader
        title={order ? `Order #${order.displayId}` : "Order"}
        description={order ? formatDateTime(order.createdAt) : "Loading the order"}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/orders">
              <ArrowLeft />
              All orders
            </Link>
          </Button>
        }
      />

      {query.isPending ? (
        <OrderSkeleton />
      ) : query.isError || !order ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription className="flex flex-col items-start gap-3">
            {query.error instanceof Error ? query.error.message : "This order could not be loaded."}
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {actionError ? (
            <Alert variant="destructive" className="animate-in fade-in duration-200">
              <TriangleAlert aria-hidden />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
            <StatusBadge status={order.fulfillmentStatus} />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {moves.map((move) => (
                <Button
                  key={move.status}
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    setStatus.mutate(
                      move.kind === "fulfillment"
                        ? { fulfillmentStatus: move.status as FulfillmentStatus }
                        : { paymentStatus: move.status as PaymentStatus }
                    )
                  }
                >
                  {setStatus.isPending ? <Spinner /> : null}
                  {ACTION_LABEL[move.status] ?? move.status}
                </Button>
              ))}
              {order.status !== "canceled" && order.fulfillmentStatus === "unfulfilled" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={busy}>
                      Cancel order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Order #{order.displayId} will be canceled and every item put back into
                        stock. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cancel.isPending}>Keep it</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={cancel.isPending}
                        onClick={(event) => {
                          event.preventDefault()
                          cancel.mutate()
                        }}
                      >
                        {cancel.isPending ? <Spinner /> : null}
                        Cancel order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
            <Frame className="xl:col-span-2">
              <FrameHeader>
                <FrameTitle>Items</FrameTitle>
                <FrameDescription>What the shopper ordered</FrameDescription>
              </FrameHeader>
              <FramePanel>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="bg-muted size-9 shrink-0 overflow-hidden border">
                              {item.thumbnail ? (
                                <img src={item.thumbnail} alt="" className="size-full object-cover" />
                              ) : null}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">{item.productTitle}</span>
                              <span className="text-muted-foreground truncate text-xs">
                                {item.variantTitle}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(item.unitPrice, order.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(item.total, order.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </FramePanel>
            </Frame>

            <div className="flex flex-col gap-4">
              <Frame>
                <FrameHeader>
                  <FrameTitle>Summary</FrameTitle>
                </FrameHeader>
                <FramePanel>
                  <div className="flex flex-col gap-2">
                    <Row label="Items" value={formatMoney(order.totals.itemSubtotal, order.currency)} />
                    {order.totals.discountTotal ? (
                      <Row
                        label={`Discount${order.promoCodes.length ? ` (${order.promoCodes.join(", ")})` : ""}`}
                        value={`-${formatMoney(order.totals.discountTotal, order.currency)}`}
                      />
                    ) : null}
                    <Row
                      label={`Delivery (${order.shippingOption.name})`}
                      value={formatMoney(order.totals.shippingTotal, order.currency)}
                    />
                    <Row label="Tax" value={formatMoney(order.totals.taxTotal, order.currency)} />
                    <Separator />
                    <Row label="Total" value={formatMoney(order.totals.total, order.currency)} strong />
                    <span className="text-muted-foreground text-xs">
                      Paid by cash on delivery
                    </span>
                  </div>
                </FramePanel>
              </Frame>

              <Frame>
                <FrameHeader>
                  <FrameTitle>Customer</FrameTitle>
                </FrameHeader>
                <FramePanel>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium break-all">{order.email}</span>
                      <span className="text-muted-foreground text-xs">
                        {order.customerId ? "Has an account" : "Guest checkout"}
                      </span>
                    </div>
                    <AddressBlock title="Delivery" address={order.shippingAddress} />
                    <AddressBlock title="Billing" address={order.billingAddress} />
                  </div>
                </FramePanel>
              </Frame>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default OrderDetailPage
