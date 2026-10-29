import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminApi } from "@/lib/api"
import { formatCount, formatDate, formatDateTime, formatMoney } from "@/lib/format"

const CustomerDetailPage = () => {
  const { id = "" } = useParams()
  const navigate = useNavigate()

  const query = useQuery({
    queryKey: ["customer", id],
    queryFn: () => adminApi.customer(id),
  })

  const customer = query.data?.customer
  const orders = query.data?.orders ?? []
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ")

  return (
    <>
      <PageHeader
        eyebrow="Customers & marketing"
        title={name || customer?.email || "Customer"}
        description={customer ? `Joined ${formatDate(customer.createdAt)}` : "Loading the customer"}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/customers">
              <ArrowLeft />
              All customers
            </Link>
          </Button>
        }
      />

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72 xl:col-span-2" />
        </div>
      ) : query.isError || !customer ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription className="flex flex-col items-start gap-3">
            {query.error instanceof Error
              ? query.error.message
              : "This customer could not be loaded."}
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Frame>
              <FrameHeader>
                <FrameTitle>Profile</FrameTitle>
              </FrameHeader>
              <FramePanel>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">Email</span>
                    <span className="text-sm break-all">{customer.email}</span>
                  </div>
                  {customer.phone ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs font-medium">Phone</span>
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">Account</span>
                    <div>
                      {customer.hasAccount ? (
                        <Badge variant="success-light">Registered</Badge>
                      ) : (
                        <Badge variant="outline">Guest</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </FramePanel>
            </Frame>

            <Frame>
              <FrameHeader>
                <FrameTitle>Addresses</FrameTitle>
                <FrameDescription>Saved for faster checkout</FrameDescription>
              </FrameHeader>
              <FramePanel>
                {customer.addresses.length ? (
                  <div className="flex flex-col gap-4">
                    {customer.addresses.map((address) => (
                      <address key={address.id} className="text-sm not-italic">
                        {address.firstName} {address.lastName}
                        <br />
                        {address.address1}
                        <br />
                        {address.postalCode} {address.city}
                        <br />
                        {address.countryCode.toUpperCase()}
                      </address>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">No saved addresses</span>
                )}
              </FramePanel>
            </Frame>
          </div>

          <Frame className="xl:col-span-2">
            <FrameHeader>
              <FrameTitle>Orders</FrameTitle>
              <FrameDescription>
                {formatCount(orders.length)} order{orders.length === 1 ? "" : "s"} placed
              </FrameDescription>
            </FrameHeader>
            <FramePanel>
              {orders.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium tabular-nums">#{order.displayId}</span>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(order.createdAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.paymentStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.fulfillmentStatus} />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(order.totals.total, order.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground flex min-h-32 items-center justify-center text-sm">
                  This customer has not ordered yet
                </div>
              )}
            </FramePanel>
          </Frame>
        </div>
      )}
    </>
  )
}

export default CustomerDetailPage
