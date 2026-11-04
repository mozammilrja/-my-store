"use client"

import { ensureOk } from "@lib/util/cart-action"
import type { Customer, OrderSummary, Product } from "@lib/api/types"
import { addToCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { useWishlist } from "@lib/util/wishlist"
import { InvoiceDialog } from "@modules/account/invoice-dialog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ShirtIcon } from "lucide-react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

export function OverviewView({
  customer,
  orders,
  catalogProducts,
}: {
  customer: Customer
  orders: OrderSummary[]
  catalogProducts: Product[]
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderSummary | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { items: wishlistIds } = useWishlist()

  const firstName = customer.firstName || customer.email.split("@")[0] || "Valued Client"
  const defaultAddress = customer.addresses[0] ?? null
  const currency = orders[0]?.currency ?? "inr"

  // Analytics derived from real order documents
  const totalOrders = orders.length
  const activeOrders = orders.filter(
    (o) => o.status !== "canceled" && (o.fulfillmentStatus === "unfulfilled" || o.fulfillmentStatus === "shipped")
  )
  const deliveredOrders = orders.filter((o) => o.fulfillmentStatus === "delivered")
  const pendingReturns = orders.filter((o) => o.fulfillmentStatus === "returned" || !!o.returnRequest)
  const lifetimeSpend = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.total, 0)

  // Recent 2 orders for overview
  const recentOrders = orders.slice(0, 2)

  // Wishlist preview items
  const savedWishlistProducts = catalogProducts.filter((p) => wishlistIds.includes(p.id))
  const previewProducts =
    savedWishlistProducts.length > 0 ? savedWishlistProducts.slice(0, 3) : catalogProducts.slice(0, 3)

  const handleBuyAgain = (order: OrderSummary) => {
    startTransition(async () => {
      try {
        // Find line items or product variants
        const firstItem = order.items?.[0]
        const product = catalogProducts.find((p) => p.title === firstItem?.productTitle) ?? catalogProducts[0]
        const variantId = product?.variants?.[0]?.id
        if (variantId) {
          ensureOk(await addToCart({ variantId, quantity: 1, countryCode }))
          toast.success(`Added ${product.title} to your bag`)
        } else {
          toast.info("Item is currently viewing in catalog")
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Couldn't add item to bag")
      }
    })
  }

  const handleAddWishlistToBag = (product: Product) => {
    startTransition(async () => {
      try {
        const variantId = product.variants[0]?.id
        if (!variantId) throw new Error("No variant available")
        ensureOk(await addToCart({ variantId, quantity: 1, countryCode }))
        toast.success(`Added ${product.title} to your bag`)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to add to bag")
      }
    })
  }

  return (
    <div className="flex flex-col w-full gap-space-xl">
      {/* 1. Top Greeting & Membership Bar Banner */}
      <section className="relative w-full rounded-2xl bg-surface-container-lowest p-space-lg lg:p-space-xl shadow-sm overflow-hidden border border-surface-container-high/60">
        <div className="absolute -right-16 -top-24 w-80 h-80 rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase tracking-widest font-semibold shadow-2xs">
              <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
              <span>Atelier Privilege Gold Member &bull; 2,450 Tier Credits</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-primary font-medium tracking-tight capitalize">
              Welcome back, {firstName}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              Manage your orders, curations, atelier preferences, and personal wardrobe profile.
            </p>
          </div>

          {/* Privilege Progress Mini Gauge */}
          <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-3.5 rounded-xl shrink-0 border border-surface-container-high">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-variant"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-secondary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="78, 100"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute font-label-caps text-label-caps font-bold text-on-surface">78%</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant font-semibold">
                Platinum Threshold
              </span>
              <span className="font-body-sm text-body-sm font-medium text-on-surface">550 credits to Noir Tier</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Metric KPI Cards */}
      <section className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
          {/* Total Orders */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-surface-container-high/60">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">
                  Total Orders
                </span>
                <div className="font-headline-xl text-headline-xl font-normal text-on-surface tracking-tight">
                  {totalOrders}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors text-on-surface">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              </div>
            </div>
            <div className="pt-space-md mt-space-sm flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm border-t border-surface-container">
              <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
              <span>
                Lifetime spend{" "}
                <strong className="font-semibold text-on-surface">
                  {lifetimeSpend > 0 ? formatMoney(lifetimeSpend, currency) : "₹0"}
                </strong>
              </span>
            </div>
          </div>

          {/* Active Orders */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-surface-container-high/60">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">
                  Active Orders
                </span>
                <div className="font-headline-xl text-headline-xl font-normal text-on-surface tracking-tight">
                  {activeOrders.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors text-on-surface">
                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
              </div>
            </div>
            <div className="pt-space-md mt-space-sm flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm border-t border-surface-container">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>
                {activeOrders.length > 0 ? `${activeOrders.length} active consignment` : "All consignments delivered"}
              </span>
            </div>
          </div>

          {/* Delivered Orders */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-surface-container-high/60">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">
                  Delivered Orders
                </span>
                <div className="font-headline-xl text-headline-xl font-normal text-on-surface tracking-tight">
                  {deliveredOrders.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors text-on-surface">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
              </div>
            </div>
            <div className="pt-space-md mt-space-sm flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm border-t border-surface-container">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">event</span>
              <span>
                {deliveredOrders[0]
                  ? `Last delivered ${new Date(deliveredOrders[0].createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                  : "No completed orders"}
              </span>
            </div>
          </div>

          {/* Pending Returns */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group border border-surface-container-high/60">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">
                  Pending Returns
                </span>
                <div className="font-headline-xl text-headline-xl font-normal text-on-surface tracking-tight">
                  {pendingReturns.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors text-on-surface">
                <span className="material-symbols-outlined text-[20px]">sync</span>
              </div>
            </div>
            <div className="pt-space-md mt-space-sm flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm border-t border-surface-container">
              <span className="material-symbols-outlined text-[16px] text-secondary">hourglass_top</span>
              <span className="text-secondary font-medium">
                {pendingReturns.length > 0 ? "Under atelier inspection" : "Complimentary 14-day window"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Recent Orders Section */}
      <section className="w-full space-y-space-md">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-baseline gap-3">
            <h2 className="font-headline-lg text-headline-lg font-medium text-on-surface tracking-tight">
              Recent Orders
            </h2>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Latest Activity</span>
          </div>
          <LocalizedClientLink
            href="/account/orders"
            className="font-label-sm text-label-sm font-semibold uppercase text-secondary hover:text-on-secondary-container flex items-center gap-1 transition-colors"
          >
            <span>View All Orders</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </LocalizedClientLink>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 text-center flex flex-col items-center border border-dashed border-outline-variant">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3">
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            </div>
            <h3 className="font-headline-sm font-medium text-on-surface">No orders placed yet</h3>
            <p className="font-body-sm text-on-surface-variant max-w-sm mt-1 mb-4">
              Explore our current seasonal curations, structured blazers and mulberry silk dresses.
            </p>
            <LocalizedClientLink
              href="/store"
              className="h-10 px-6 bg-primary text-on-primary rounded font-label-sm uppercase font-semibold flex items-center gap-2"
            >
              Explore Collection
            </LocalizedClientLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-space-md">
            {recentOrders.map((order) => {
              const isShipped = order.fulfillmentStatus === "shipped"
              const isDelivered = order.fulfillmentStatus === "delivered"
              const firstItem = order.items?.[0]
              const title = firstItem?.productTitle ?? "Atelier Handcrafted Garment"
              const variantTitle = firstItem?.variantTitle ?? "Standard Cut &bull; M"
              const thumbnail =
                firstItem?.thumbnail ??
                order.thumbnails[0] ??
                "https://lh3.googleusercontent.com/aida-public/AB6AXuCwiwiLNrSr9m2RbjuEOjjFCzCksDNfNzRmlMvaGvbH8xCBoSIAtOHJN1y5SA_-i-DfVSK64yy_NI_X40d_qnRFOl_8jxW02Cc4pu-NRp49jCxaQMvLlMYobVBHtRJimrbb4yHKK3JBoyiy6voqn4-7gChEX7f49aP96ckD8lAMUEr9u6w2D923VcYOwaZf0_3ZGnJNB2_UQZFQb5msaeaR2Swpw1MakjU_caRy1vKJ"

              return (
                <div
                  key={order.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-xs hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg border border-surface-container-high/60"
                >
                  <div className="flex items-start gap-space-md">
                    <div className="w-24 h-32 rounded bg-surface-container-low overflow-hidden shrink-0 relative">
                      <Image
                        src={thumbnail}
                        alt={title}
                        fill
                        sizes="96px"
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col justify-between py-1 min-w-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">
                            #EVR-{order.displayId}
                          </span>
                          <span className="text-on-surface-variant text-[11px]">&bull;</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <h3 className="font-body-lg text-body-lg font-medium text-on-surface truncate">
                          {title}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate">
                          {variantTitle}
                        </p>
                      </div>
                      <div className="mt-space-sm flex items-center gap-3">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          {formatMoney(order.total, order.currency)}
                        </span>
                        <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant uppercase font-medium">
                          {order.paymentMethod === "cod" ? "Cash On Delivery" : "Prepaid Online"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col lg:items-end justify-between gap-space-md shrink-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low">
                      {isShipped ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                          <span className="font-label-sm text-label-sm font-medium text-on-surface">
                            Shipped &mdash; Arriving Soon
                          </span>
                        </>
                      ) : isDelivered ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] text-on-surface">check_circle</span>
                          <span className="font-label-sm text-label-sm font-medium text-on-surface">
                            Delivered Successfully
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-outline animate-pulse" />
                          <span className="font-label-sm text-label-sm font-medium text-on-surface">
                            Preparing Consignment
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-space-sm flex-wrap w-full lg:w-auto">
                      {isShipped ? (
                        <>
                          <LocalizedClientLink
                            href={`/account/track-orders?id=${order.id}`}
                            className="flex-1 lg:flex-initial h-10 px-5 bg-primary text-on-primary hover:bg-inverse-surface rounded font-label-sm text-label-sm uppercase font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                            <span>Track Order</span>
                          </LocalizedClientLink>
                          <LocalizedClientLink
                            href={`/account/orders/details/${order.id}`}
                            className="flex-1 lg:flex-initial h-10 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface rounded font-label-sm text-label-sm uppercase font-semibold transition-colors flex items-center justify-center border border-surface-container-high"
                          >
                            View Details
                          </LocalizedClientLink>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleBuyAgain(order)}
                            className="flex-1 lg:flex-initial h-10 px-4 bg-primary text-on-primary hover:bg-inverse-surface rounded font-label-sm text-label-sm uppercase font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">replay</span>
                            <span>Buy Again</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceOrder(order)
                              setInvoiceOpen(true)
                            }}
                            className="h-10 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface rounded font-label-sm text-label-sm uppercase font-semibold transition-colors flex items-center justify-center border border-surface-container-high cursor-pointer"
                            title="Download Invoice"
                          >
                            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                          </button>
                          <LocalizedClientLink
                            href={`/account/returns?orderId=${order.id}`}
                            className="h-10 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded font-label-sm text-label-sm uppercase font-semibold transition-colors flex items-center justify-center border border-surface-container-high"
                          >
                            Return Item
                          </LocalizedClientLink>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 4. Side-by-Side Dual Module: Address Preview & Wishlist */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter w-full">
        {/* Left: Default Shipping Address */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col justify-between border border-surface-container-high/60">
          <div>
            <div className="flex items-center justify-between pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">pin_drop</span>
                <h3 className="font-headline-sm text-headline-sm font-medium text-on-surface">Primary Address</h3>
              </div>
              <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-primary text-on-primary font-bold uppercase">
                Default
              </span>
            </div>

            {defaultAddress ? (
              <div className="mt-space-md p-space-md rounded-xl bg-surface-container-low space-y-2 border border-surface-container-high">
                <div className="flex items-center justify-between">
                  <span className="font-body-lg text-body-lg font-semibold text-on-surface">
                    {defaultAddress.firstName} {defaultAddress.lastName}
                  </span>
                  <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">Home</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {defaultAddress.address1}
                  {defaultAddress.address2 ? `, ${defaultAddress.address2}` : ""}
                  <br />
                  {defaultAddress.city}, {defaultAddress.province ? `${defaultAddress.province} ` : ""}
                  {defaultAddress.postalCode}
                </p>
                {defaultAddress.phone && (
                  <div className="pt-1 font-body-sm text-body-sm text-on-surface font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">phone</span>
                    <span>{defaultAddress.phone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-space-md p-space-md rounded-xl bg-surface-container-low text-center py-6 border border-dashed border-outline-variant">
                <p className="font-body-sm text-on-surface-variant">No address saved yet.</p>
              </div>
            )}
          </div>

          <div className="pt-space-lg mt-space-md flex items-center justify-between border-t border-surface-container">
            <LocalizedClientLink
              href="/account/addresses"
              className="font-label-sm text-label-sm text-secondary hover:text-on-secondary-container font-semibold uppercase flex items-center gap-1"
            >
              <span>Manage Addresses</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/account/addresses"
              className="h-9 px-3.5 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded font-label-sm text-label-sm uppercase font-semibold transition-colors flex items-center justify-center"
            >
              Add New
            </LocalizedClientLink>
          </div>
        </div>

        {/* Right: Wishlist Preview */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col justify-between border border-surface-container-high/60">
          <div>
            <div className="flex items-center justify-between pb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">favorite</span>
                <h3 className="font-headline-sm text-headline-sm font-medium text-on-surface">Saved in Wishlist</h3>
              </div>
              <LocalizedClientLink
                href="/account/wishlist"
                className="font-label-caps text-label-caps uppercase tracking-wider text-secondary font-bold hover:underline"
              >
                View All ({wishlistIds.length > 0 ? wishlistIds.length : previewProducts.length})
              </LocalizedClientLink>
            </div>

            <div className="mt-space-md divide-y divide-surface-container-high flex flex-col gap-space-sm">
              {previewProducts.map((prod) => (
                <div key={prod.id} className="pt-space-xs pb-space-sm flex items-center justify-between gap-space-md group">
                  <div className="flex items-center gap-space-md min-w-0">
                    <div className="w-14 h-16 rounded bg-surface-container-low overflow-hidden shrink-0 relative">
                      {prod.thumbnail || prod.images[0] ? (
                        <Image
                          src={(prod.thumbnail || prod.images[0])!}
                          alt={prod.title}
                          fill
                          sizes="56px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                          <ShirtIcon className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-body-md text-body-md font-medium text-on-surface truncate">
                        {prod.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          {prod.priceRange?.min ? formatMoney(prod.priceRange.min, prod.currency) : "Price on request"}
                        </span>
                        <span className="font-label-caps text-[9px] uppercase tracking-wider text-secondary font-bold">
                          In Stock
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAddWishlistToBag(prod)}
                    className="h-9 px-3.5 bg-primary text-on-primary hover:bg-inverse-surface rounded font-label-sm text-label-sm uppercase font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">keyboard_double_arrow_left</span>
                    <span className="hidden sm:inline">Add to Bag</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Quick Account Actions */}
      <section className="w-full">
        <div className="flex items-baseline justify-between mb-space-sm">
          <h3 className="font-headline-sm text-headline-sm font-medium text-on-surface">
            Atelier Services &amp; Account Shortcuts
          </h3>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Quick Management</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {/* Action 1: Invoices */}
          <button
            type="button"
            onClick={() => {
              if (orders[0]) {
                setSelectedInvoiceOrder(orders[0])
                setInvoiceOpen(true)
              } else {
                toast.info("No orders placed yet to generate statement")
              }
            }}
            className="p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md hover:bg-surface-container-low transition-all group flex items-start gap-space-sm border border-surface-container-high/60 text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container-low group-hover:bg-primary group-hover:text-on-primary transition-colors flex items-center justify-center shrink-0 text-on-surface">
              <span className="material-symbols-outlined text-[20px]">receipt</span>
            </div>
            <div className="min-w-0">
              <h4 className="font-label-md text-label-md font-semibold text-on-surface truncate">Annual Invoices</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Consolidated FY 2024-25 statement</p>
            </div>
          </button>

          {/* Action 2: Stylist */}
          <LocalizedClientLink
            href="/account/support"
            className="p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md hover:bg-surface-container-low transition-all group flex items-start gap-space-sm border border-surface-container-high/60"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container-low group-hover:bg-secondary group-hover:text-on-secondary transition-colors flex items-center justify-center shrink-0 text-on-surface">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            </div>
            <div className="min-w-0">
              <h4 className="font-label-md text-label-md font-semibold text-on-surface truncate">Atelier Stylist Session</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Complimentary 1-on-1 virtual styling</p>
            </div>
          </LocalizedClientLink>

          {/* Action 3: Payment Methods */}
          <LocalizedClientLink
            href="/account/payments"
            className="p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md hover:bg-surface-container-low transition-all group flex items-start gap-space-sm border border-surface-container-high/60"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container-low group-hover:bg-primary group-hover:text-on-primary transition-colors flex items-center justify-center shrink-0 text-on-surface">
              <span className="material-symbols-outlined text-[20px]">credit_card</span>
            </div>
            <div className="min-w-0">
              <h4 className="font-label-md text-label-md font-semibold text-on-surface truncate">Payment Methods</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">UPI &bull; Saved Cards</p>
            </div>
          </LocalizedClientLink>

          {/* Action 4: Notifications */}
          <LocalizedClientLink
            href="/account/notifications"
            className="p-space-md bg-surface-container-lowest rounded-xl shadow-xs hover:shadow-md hover:bg-surface-container-low transition-all group flex items-start gap-space-sm border border-surface-container-high/60"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container-low group-hover:bg-primary group-hover:text-on-primary transition-colors flex items-center justify-center shrink-0 text-on-surface">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div className="min-w-0">
              <h4 className="font-label-md text-label-md font-semibold text-on-surface truncate">Notification Settings</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Order updates via SMS &amp; WhatsApp</p>
            </div>
          </LocalizedClientLink>
        </div>
      </section>

      {/* Tax Invoice Modal */}
      <InvoiceDialog
        order={selectedInvoiceOrder}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />
    </div>
  )
}
