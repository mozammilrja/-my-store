"use client"

import { ensureOk } from "@lib/util/cart-action"
import type { Customer, OrderSummary, Product } from "@lib/api/types"
import { addToCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { StoreSelect } from "@/components/store/store-select"

export function OrdersListView({
  customer,
  orders,
  catalogProducts,
}: {
  customer: Customer
  orders: OrderSummary[]
  catalogProducts: Product[]
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTab, setSelectedTab] = useState<"all" | "processing" | "shipped" | "delivered" | "canceled" | "returns">("all")
  const [timeFilter, setTimeFilter] = useState("all")
  const [sortOption, setSortOption] = useState<"recent" | "oldest" | "highest">("recent")
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const pageSize = 5
  const customerName = customer.firstName
    ? `${customer.firstName} ${customer.lastName ?? ""}`.trim()
    : "Valued Client"

  // Counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      processing: orders.filter((o) => o.status !== "canceled" && o.fulfillmentStatus === "unfulfilled").length,
      shipped: orders.filter((o) => o.fulfillmentStatus === "shipped").length,
      delivered: orders.filter((o) => o.fulfillmentStatus === "delivered").length,
      canceled: orders.filter((o) => o.status === "canceled").length,
      returns: orders.filter((o) => o.fulfillmentStatus === "returned" || !!o.returnRequest).length,
    }
  }, [orders])

  // Filtered & sorted orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Status Tab
    if (selectedTab === "processing") {
      result = result.filter((o) => o.status !== "canceled" && o.fulfillmentStatus === "unfulfilled")
    } else if (selectedTab === "shipped") {
      result = result.filter((o) => o.fulfillmentStatus === "shipped")
    } else if (selectedTab === "delivered") {
      result = result.filter((o) => o.fulfillmentStatus === "delivered")
    } else if (selectedTab === "canceled") {
      result = result.filter((o) => o.status === "canceled")
    } else if (selectedTab === "returns") {
      result = result.filter((o) => o.fulfillmentStatus === "returned" || !!o.returnRequest)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((o) => {
        const idMatch = o.id.toLowerCase().includes(q) || String(o.displayId).includes(q)
        const itemMatch = o.items?.some((i) => i.productTitle.toLowerCase().includes(q))
        return idMatch || itemMatch
      })
    }

    // Time filter
    if (timeFilter === "6m") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      result = result.filter((o) => new Date(o.createdAt) >= sixMonthsAgo)
    } else if (timeFilter === "2025") {
      result = result.filter((o) => new Date(o.createdAt).getFullYear() === 2025)
    } else if (timeFilter === "2024") {
      result = result.filter((o) => new Date(o.createdAt).getFullYear() === 2024)
    }

    // Sort
    if (sortOption === "recent") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortOption === "oldest") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else if (sortOption === "highest") {
      result.sort((a, b) => b.total - a.total)
    }

    return result
  }, [orders, selectedTab, searchQuery, timeFilter, sortOption])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleBuyAgain = (order: OrderSummary) => {
    startTransition(async () => {
      try {
        const firstItem = order.items?.[0]
        const product = catalogProducts.find((p) => p.title === firstItem?.productTitle) ?? catalogProducts[0]
        const variantId = product?.variants?.[0]?.id
        if (variantId) {
          ensureOk(await addToCart({ variantId, quantity: 1, countryCode }))
          toast.success(`Re-ordered ${product.title}`)
        } else {
          toast.info("Viewing product details")
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Couldn't add item to bag")
      }
    })
  }

  return (
    <div className="flex flex-col w-full" data-testid="my-orders-view">
      {/* 1. Top Editorial Header & Operational Overview */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-gutter pb-space-lg">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-2 mb-space-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="font-label-caps text-label-caps text-secondary uppercase font-bold tracking-[0.16em]">
              Wardrobe Archives &amp; Settlements
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase tracking-tight font-medium">
            My Orders
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1.5">
            Track active consignments, initiate effortless 14-day home pick-up returns, retrieve GST invoices, and reorder archived wardrobe staples.
          </p>
        </div>

        {/* Quick Concierge Metric Badges */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex items-center gap-3 border border-surface-container-high/60">
            <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Active Dispatches
              </span>
              <span className="font-label-md text-label-md text-on-surface font-bold">
                {tabCounts.shipped} En Route
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex items-center gap-3 border border-surface-container-high/60">
            <div className="w-9 h-9 rounded bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Atelier Shield
              </span>
              <span className="font-label-md text-label-md text-on-surface font-bold">100% Insured Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Filter & Search Command Strip */}
      <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs mb-space-lg flex flex-col gap-space-md border border-surface-container-high/60">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-space-sm">
          {/* Search Bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-11 pl-10 pr-4 bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-lg focus:outline-none focus:bg-surface-container-lowest transition-colors border border-surface-container-high"
              placeholder="Search by Order ID (e.g. EVR-89241), Product Name, or SKU..."
              type="text"
            />
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            {/* Date Range Filter */}
            <StoreSelect
              variant="pill"
              align="end"
              aria-label="Filter orders by date"
              value={timeFilter}
              onValueChange={(v) => {
                setTimeFilter(v)
                setCurrentPage(1)
              }}
              options={[
                { value: "all", label: "Archive (All Time)" },
                { value: "6m", label: "Past 6 Months" },
                { value: "2025", label: "Year 2025" },
                { value: "2024", label: "Year 2024" },
              ]}
            />

            {/* Sort Option */}
            <StoreSelect
              variant="pill"
              align="end"
              aria-label="Sort orders"
              value={sortOption}
              onValueChange={(v) => setSortOption(v as "recent" | "oldest" | "highest")}
              leading={
                <span aria-hidden className="material-symbols-outlined text-[16px] text-outline">
                  swap_vert
                </span>
              }
              options={[
                { value: "recent", label: "Most Recent First" },
                { value: "oldest", label: "Oldest First" },
                { value: "highest", label: "Highest Value" },
              ]}
            />
          </div>
        </div>

        {/* Segmented Tab Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pt-space-xs no-scrollbar">
          {(
            [
              { id: "all", label: "All Orders", count: tabCounts.all },
              { id: "processing", label: "Processing", count: tabCounts.processing },
              { id: "shipped", label: "Shipped", count: tabCounts.shipped },
              { id: "delivered", label: "Delivered", count: tabCounts.delivered },
              { id: "canceled", label: "Cancelled", count: tabCounts.canceled },
              { id: "returns", label: "Returns & Refunds", count: tabCounts.returns },
            ] as const
          ).map((tab) => {
            const active = selectedTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedTab(tab.id)
                  setCurrentPage(1)
                }}
                className={`h-8 px-3.5 rounded-lg font-label-sm text-label-sm whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  active
                    ? "bg-primary text-on-primary font-semibold"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-label-caps px-1.5 py-0.5 rounded-full ${
                    active
                      ? "bg-surface-container-lowest/20 text-on-primary font-semibold"
                      : tab.id === "shipped" && tab.count > 0
                      ? "bg-secondary-fixed text-on-secondary-fixed font-bold"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 3. Orders Stack List */}
      <div className="flex flex-col gap-space-lg">
        {paginatedOrders.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center flex flex-col items-center border border-dashed border-outline-variant">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3">
              <span className="material-symbols-outlined text-[28px]">search_off</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm font-medium text-on-surface">No matching consignments found</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mt-1 mb-4">
              Try adjusting your search terms or filters to view your archival wardrobe ledger.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSelectedTab("all")
                setTimeFilter("all")
              }}
              className="h-10 px-5 bg-surface-container-low hover:bg-surface-container text-on-surface rounded font-label-sm text-label-sm uppercase font-semibold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          paginatedOrders.map((order) => {
            const isShipped = order.fulfillmentStatus === "shipped"
            const isDelivered = order.fulfillmentStatus === "delivered"
            const isReturned = order.fulfillmentStatus === "returned" || !!order.returnRequest
            const isCanceled = order.status === "canceled"
            const items = order.items && order.items.length > 0 ? order.items : []
            const firstItem = items[0]
            const title = firstItem?.productTitle ?? "Atelier Handcrafted Silhouette"
            const variantTitle = firstItem?.variantTitle ?? "Tailored Cut &bull; M"
            const thumbnail =
              firstItem?.thumbnail ??
              order.thumbnails[0] ??
              "https://lh3.googleusercontent.com/aida-public/AB6AXuCH5B4tpOlHOFPEeuOnpcEZx-cXi__62VB8A_gfHsNZgJTPaAKXMf2OF0ZQTaDWNlNOebzSMyBYuHWthq7Sn_Qn0cxGCXVABrolR4iizmYH_fryHN-wecvR7C0i4d9fO0MzB_N7XOOGrP1UPhVw3g8r8Sonp4wSMm7NwYvpFJQkqYcokCZFK7SA7jrV7gjHE2JFZnKt8QhJro4T4mY9OwGe5_IO61mS-PSyjtyunj6L"

            const orderDateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })

            return (
              <article
                key={order.id}
                className="bg-surface-container-lowest rounded-xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md border border-surface-container-high/60"
              >
                {/* Order Header Bar */}
                <div className="bg-surface-container-low px-gutter py-space-md flex flex-wrap items-center justify-between gap-space-md border-b border-surface-container-high">
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-gutter">
                    <div className="flex flex-col">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                        Order Ref.
                      </span>
                      <span className="font-label-md text-label-md text-primary font-bold tracking-tight">
                        #EVR-{order.displayId}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                        Placed Date
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface font-medium">{orderDateStr}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                        Settlement
                      </span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        {formatMoney(order.total, order.currency)}{" "}
                        <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                          &bull; {order.paymentMethod === "cod" ? "Cash On Delivery" : "Prepaid Online"}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                        Consignee
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface font-medium">{customerName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <LocalizedClientLink
                      href={`/order/${order.id}/track`}
                      className="h-9 px-3 rounded bg-surface-container hover:bg-surface-variant text-on-surface font-label-sm text-label-sm uppercase flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                      <span>Track</span>
                    </LocalizedClientLink>
                    <LocalizedClientLink
                      href={`/order/${order.id}/invoice`}
                      className="h-9 px-3 rounded bg-surface-container hover:bg-surface-variant text-on-surface font-label-sm text-label-sm uppercase flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      <span>Tax Invoice</span>
                    </LocalizedClientLink>
                    <LocalizedClientLink
                      href={`/account/orders/details/${order.id}`}
                      className="h-9 px-3 rounded bg-surface-container hover:bg-surface-variant text-on-surface font-label-sm text-label-sm uppercase flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Order Details</span>
                    </LocalizedClientLink>
                  </div>
                </div>

                {/* Live Transit Status Banner */}
                {isShipped && (
                  <div className="px-gutter py-3.5 bg-surface-container-high/60 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-container-high">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-secondary-container animate-pulse flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-label-caps text-label-caps uppercase font-bold text-on-secondary-fixed-variant">
                          IN TRANSIT
                        </span>
                        <span className="text-on-surface-variant text-xs">&bull;</span>
                        <span className="font-body-sm text-body-sm text-on-surface font-medium">
                          Expected Delivery <strong className="text-primary font-semibold">Scheduled via Priority Air</strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-[16px] text-secondary">local_shipping</span>
                      <span>Courier: <strong className="text-on-surface font-medium">Blue Dart Express</strong></span>
                      <span className="text-on-surface-variant text-xs">&bull;</span>
                      <span className="font-label-caps uppercase text-label-caps text-outline bg-surface-container px-2 py-0.5 rounded">
                        AWB #{order.shipment?.awb ?? `BLR-${order.displayId}904`}
                      </span>
                    </div>
                  </div>
                )}

                {isDelivered && (
                  <div className="px-gutter py-3 bg-surface-container-high/30 flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant border-b border-surface-container-high">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                    <span>
                      DELIVERED via Atelier Signature Courier. 14-day complimentary home pick-up exchange eligible.
                    </span>
                  </div>
                )}

                {isReturned && (
                  <div className="px-gutter py-3 bg-secondary-fixed/30 flex items-center gap-2 font-body-sm text-body-sm text-on-secondary-fixed border-b border-secondary-fixed">
                    <span className="material-symbols-outlined text-secondary text-[18px]">sync</span>
                    <span>Return or exchange in active verification. Atelier logistics assigned.</span>
                  </div>
                )}

                {isCanceled && (
                  <div className="px-gutter py-3 bg-error-container/30 flex items-center gap-2 font-body-sm text-body-sm text-on-error-container border-b border-error-container">
                    <span className="material-symbols-outlined text-error text-[18px]">cancel</span>
                    <span>Order Cancelled &bull; Settlement refunded to original payment method.</span>
                  </div>
                )}

                {/* Product Item Detail Row */}
                <div className="p-gutter flex flex-col lg:flex-row lg:items-center justify-between gap-gutter">
                  <div className="flex items-start gap-gutter flex-1 min-w-0">
                    <div className="w-24 h-32 sm:w-28 sm:h-36 bg-surface-container shrink-0 rounded-lg overflow-hidden relative shadow-xs">
                      <Image
                        src={thumbnail}
                        alt={title}
                        fill
                        sizes="112px"
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <span className="absolute top-2 left-2 bg-primary text-on-primary font-label-caps text-[9px] uppercase px-1.5 py-0.5 rounded font-bold">
                        {isShipped ? "En Route" : isDelivered ? "Archived" : "Curated"}
                      </span>
                    </div>

                    <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                      <div>
                        <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">
                          Everwear Atelier Contemporary
                        </span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate mt-0.5">
                          {title}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Tailored capsule garment featuring fine artisan stitching, natural drape and signature finishing.
                        </p>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md mt-2 font-label-sm text-label-sm text-on-surface-variant">
                          <span>
                            Variant: <strong className="text-on-surface font-semibold">{variantTitle}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Qty: <strong className="text-on-surface font-semibold">{firstItem?.quantity ?? order.itemCount}</strong>
                          </span>
                          <span>&bull;</span>
                          <span className="text-outline">SKU: EVR-ATELIER-0{order.displayId}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                          {formatMoney(order.total, order.currency)}
                        </span>
                        <span className="font-label-caps text-[10px] bg-secondary-fixed text-on-secondary-fixed px-1.5 py-0.5 rounded font-bold uppercase">
                          Atelier Privileged Delivery
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-start gap-2.5 shrink-0 pt-space-sm lg:pt-0">
                    {isShipped ? (
                      <LocalizedClientLink
                        href={`/account/track-orders?id=${order.id}`}
                        className="w-full sm:w-auto lg:w-48 h-11 px-5 rounded-lg bg-primary text-on-primary hover:bg-inverse-surface font-label-sm text-label-sm uppercase font-semibold flex items-center justify-center gap-2 shadow-xs transition-all duration-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">near_me</span>
                        <span>Track Shipment</span>
                      </LocalizedClientLink>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleBuyAgain(order)}
                        className="w-full sm:w-auto lg:w-48 h-10 px-4 rounded-lg bg-primary text-on-primary hover:bg-inverse-surface font-label-sm text-label-sm uppercase font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]">repeat</span>
                        <span>Buy Again</span>
                      </button>
                    )}

                    <LocalizedClientLink
                      href={`/account/returns?orderId=${order.id}`}
                      className="w-full sm:w-auto lg:w-48 h-10 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm uppercase flex items-center justify-center gap-1.5 transition-colors border border-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      <span>Return / Exchange</span>
                    </LocalizedClientLink>

                    <LocalizedClientLink
                      href="/account/support"
                      className="w-full sm:w-auto lg:w-48 h-9 px-3 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-sm text-label-sm uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">support_agent</span>
                      <span>Need Help?</span>
                    </LocalizedClientLink>
                  </div>
                </div>

                {/* Linear Micro Progress Tracker Indicator */}
                <div className="px-gutter pb-gutter pt-space-xs">
                  <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-sm border border-surface-container-high">
                    <div className="flex flex-wrap items-center justify-between text-on-surface-variant font-label-caps text-label-caps uppercase font-semibold gap-2">
                      <span className="text-secondary font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Order Confirmed
                      </span>
                      <span className={`flex items-center gap-1 ${isShipped || isDelivered ? "text-secondary font-bold" : "text-outline"}`}>
                        <span className="material-symbols-outlined text-[14px]">{isShipped || isDelivered ? "check_circle" : "radio_button_unchecked"}</span>
                        Dispatched Bangalore Hub
                      </span>
                      <span className={`flex items-center gap-1 ${isShipped ? "text-primary font-bold" : isDelivered ? "text-secondary font-bold" : "text-outline"}`}>
                        <span className="material-symbols-outlined text-[14px]">{isDelivered ? "check_circle" : isShipped ? "local_shipping" : "radio_button_unchecked"}</span>
                        In Transit
                      </span>
                      <span className={`${isDelivered ? "text-secondary font-bold" : "text-outline"} flex items-center gap-1`}>
                        <span className="material-symbols-outlined text-[14px]">{isDelivered ? "check_circle" : "radio_button_unchecked"}</span>
                        {isDelivered ? "Delivered" : "Final Delivery"}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden flex">
                      <div
                        className="bg-secondary h-full rounded-full transition-all duration-700"
                        style={{
                          width: isDelivered ? "100%" : isShipped ? "70%" : isCanceled ? "0%" : "25%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* 4. Editorial Pagination & Ledger Footer */}
      {totalPages > 1 && (
        <section className="mt-space-xl pt-space-lg bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-space-md border border-surface-container-high/60">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              Showing {(currentPage - 1) * pageSize + 1}&ndash;{Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Displaying archival page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-10 px-3.5 rounded-lg bg-surface-container-low text-on-surface disabled:text-outline disabled:cursor-not-allowed font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-surface-container-high cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1
                const active = pageNum === currentPage
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-label-sm text-label-sm font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low hover:bg-surface-container text-on-surface border border-surface-container-high"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-10 px-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface disabled:text-outline disabled:cursor-not-allowed font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-surface-container-high cursor-pointer"
            >
              <span>Next</span>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </section>
      )}

      {/* 5. Concierge Assistance Callout Footer */}
      <aside className="mt-space-lg bg-surface-container-low p-gutter rounded-xl flex flex-col md:flex-row items-center justify-between gap-gutter border border-surface-container-high">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">support_agent</span>
          </div>
          <div className="flex flex-col">
            <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Require concierge assistance with an order?
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Our dedicated atelier specialists are available 24/7 to manage bespoke tailoring alterations, dispatch rerouting, or priority returns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm shrink-0 w-full sm:w-auto">
          <LocalizedClientLink
            href="/account/support"
            className="flex-1 sm:flex-initial h-11 px-5 rounded-lg bg-primary text-on-primary hover:bg-inverse-surface font-label-sm text-label-sm uppercase font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>Initiate Live Chat</span>
          </LocalizedClientLink>
          <a
            href="tel:+9118002004890"
            className="flex-1 sm:flex-initial h-11 px-4 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface font-label-sm text-label-sm uppercase transition-colors flex items-center justify-center gap-1 border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[18px]">call</span>
            <span>Call Advisory</span>
          </a>
        </div>
      </aside>
    </div>
  )
}
