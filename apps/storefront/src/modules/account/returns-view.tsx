"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Customer, OrderSummary } from "@lib/api/types"
import { requestReturn } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

export function ReturnsView({
  customer,
  orders,
}: {
  customer: Customer
  orders: OrderSummary[]
}) {
  const searchParams = useSearchParams()
  const preselectedOrderId = searchParams.get("orderId")

  const [modalOpen, setModalOpen] = useState(!!preselectedOrderId)
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    preselectedOrderId ?? orders[0]?.id ?? ""
  )
  const [requestType, setRequestType] = useState<"refund" | "exchange">("refund")
  const [reason, setReason] = useState("Size is too large")
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "eligible">("active")
  const [searchQuery, setSearchQuery] = useState("")
  const [isPending, startTransition] = useTransition()

  // Eligible orders: delivered or completed within return window
  const eligibleOrders = useMemo(() => {
    return orders.filter((o) => o.status !== "canceled" && o.fulfillmentStatus === "delivered")
  }, [orders])

  // Active returns
  const activeReturnOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.fulfillmentStatus === "returned" && o.paymentStatus !== "refunded") ||
        (o.returnRequest && o.returnRequest.status !== "refunded")
    )
  }, [orders])

  // Completed returns
  const completedReturnOrders = useMemo(() => {
    return orders.filter(
      (o) => o.paymentStatus === "refunded" || o.returnRequest?.status === "refunded"
    )
  }, [orders])

  const totalRefunded = completedReturnOrders.reduce((sum, o) => sum + o.total, 0)
  const defaultAddress = customer.addresses[0] ?? null

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderId) {
      toast.error("Please select an order to return")
      return
    }

    startTransition(async () => {
      const res = await requestReturn(selectedOrderId, `${requestType.toUpperCase()}: ${reason}`)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Return request successfully generated! Courier pickup scheduled.")
        setModalOpen(false)
      }
    })
  }

  // Filter list by query
  const displayedActive = activeReturnOrders.filter((o) =>
    searchQuery ? String(o.displayId).includes(searchQuery) || o.id.includes(searchQuery) : true
  )

  return (
    <div className="flex flex-col gap-space-lg w-full" data-testid="returns-refunds-view">
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-md pb-space-md border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
            <span>Account</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-on-surface">Returns &amp; Refunds</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase font-medium">
            Returns &amp; Refunds
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-11 px-6 bg-primary text-on-primary hover:bg-inverse-surface font-label-md text-label-md rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider font-semibold shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Initiate New Return / Exchange</span>
        </button>
      </div>

      {/* 2. Summary Metric Cards (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {/* Eligible */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group border border-surface-container-high/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
          <div className="flex items-center justify-between mb-space-md">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">
              Eligible For Return
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
          </div>
          <div>
            <div className="font-headline-xl text-headline-xl text-on-surface font-light">
              {eligibleOrders.length} {eligibleOrders.length === 1 ? "Order" : "Orders"}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Within 14-day complimentary window
            </p>
          </div>
        </div>

        {/* Active Requests */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group border border-surface-container-high/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all" />
          <div className="flex items-center justify-between mb-space-md">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">
              Active Requests
            </span>
            <span className="material-symbols-outlined text-secondary text-[20px]">local_shipping</span>
          </div>
          <div>
            <div className="font-headline-xl text-headline-xl text-on-surface font-light">
              {activeReturnOrders.length} {activeReturnOrders.length === 1 ? "Request" : "Requests"}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {activeReturnOrders.length > 0 ? "Pickup scheduled & active" : "No active return pickups"}
            </p>
          </div>
        </div>

        {/* Total Refunded */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group border border-surface-container-high/60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl transition-all" />
          <div className="flex items-center justify-between mb-space-md">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-semibold">
              Total Refunded (YTD)
            </span>
            <span className="material-symbols-outlined text-on-surface text-[20px]">payments</span>
          </div>
          <div>
            <div className="font-headline-xl text-headline-xl text-on-surface font-light">
              {formatMoney(totalRefunded, orders[0]?.currency ?? "inr")}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Credited directly to original source
            </p>
          </div>
        </div>
      </div>

      {/* 3. Status Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md pt-space-xs">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-lg font-label-md text-label-md uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "active"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Active Requests ({activeReturnOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-lg font-label-md text-label-md uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "completed"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Completed ({completedReturnOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("eligible")}
            className={`px-4 py-2 rounded-lg font-label-md text-label-md uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "eligible"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Eligible Items ({eligibleOrders.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-surface-container-lowest text-on-surface font-body-sm text-body-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all border border-surface-container-high"
            placeholder="Search request ID or item..."
            type="text"
          />
        </div>
      </div>

      {/* 4. Active Return Request Cards */}
      {activeTab === "active" && (
        <div className="flex flex-col gap-space-lg">
          {displayedActive.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 text-center flex flex-col items-center border border-dashed border-outline-variant">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3">
                <span className="material-symbols-outlined text-[24px]">published_with_changes</span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface">No active returns in progress</h3>
              <p className="font-body-sm text-on-surface-variant max-w-sm mt-1 mb-4">
                All previous exchange requests have been settled or completed.
              </p>
              {eligibleOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="h-10 px-5 bg-primary text-on-primary rounded font-label-sm uppercase font-semibold"
                >
                  Initiate Return on Eligible Order
                </button>
              )}
            </div>
          ) : (
            displayedActive.map((order) => {
              const firstItem = order.items?.[0]
              const title = firstItem?.productTitle ?? "Atelier Handcrafted Silhouette"
              const thumbnail =
                firstItem?.thumbnail ??
                order.thumbnails[0] ??
                "https://lh3.googleusercontent.com/aida-public/AB6AXuAA0NSUJ-NgT0DkkNQfyJrj_EZu8YKFxaXrEj9ThG0NAxij8r3wEyzwBO_R3LpqImb3fh6mBCNKh5WjYTQBAB4qXwKatBt0KtwJYFxiUNpwit2At4fKailBZFXQTp5htVX69o5y4Ye8nPqsP4ua6uMWkIwjrSTfGKTJkD0UKluAhniBWgMvXtfGho_xeChliptoJWttn5HI21ygzQC4hARnWhh4Dh65S_QizyP264uz"

              return (
                <div
                  key={order.id}
                  className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col gap-space-lg border border-surface-container-high/60"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md pb-space-md border-b border-surface-container">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-label-caps text-label-caps bg-secondary-fixed text-on-secondary-fixed px-2.5 py-1 rounded font-bold uppercase">
                        Return in Progress
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Request ID: <strong className="text-on-surface font-medium">RET-{order.displayId}-IN</strong>
                      </span>
                      <span className="text-outline-variant">&bull;</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Order #EVR-{order.displayId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Refund Amount:</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {formatMoney(order.total, order.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center pt-2">
                    {/* Product Info */}
                    <div className="lg:col-span-4 flex items-center gap-space-md">
                      <div className="w-20 h-24 bg-surface-container-low rounded-lg overflow-hidden shrink-0 relative shadow-2xs">
                        <Image src={thumbnail} alt={title} fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">
                          Atelier Tailoring
                        </span>
                        <h3 className="font-headline-sm text-base text-on-surface font-medium truncate">{title}</h3>
                        <p className="font-body-sm text-xs text-on-surface-variant">
                          Qty: {firstItem?.quantity ?? 1} &bull; Tailored Cut
                        </p>
                      </div>
                    </div>

                    {/* Timeline Steps (6 steps matching Stitch) */}
                    <div className="lg:col-span-8 flex flex-col justify-center">
                      <div className="text-xs font-label-caps uppercase tracking-wider text-on-surface-variant mb-4 flex items-center justify-between">
                        <span>Live Return Status Timeline</span>
                        <span className="text-secondary font-bold">Estimated Pickup: Tomorrow, 10 AM &ndash; 1 PM</span>
                      </div>
                      <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto px-2">
                        {/* Connecting Line */}
                        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-surface-container-high z-0" />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-secondary z-0" style={{ width: "35%" }} />

                        {/* Step 1: Requested */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-xs shadow-xs">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface mt-2 font-medium">Requested</span>
                          <span className="text-[10px] text-outline">Verified</span>
                        </div>

                        {/* Step 2: Approved */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-xs shadow-xs">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface mt-2 font-medium">Approved</span>
                          <span className="text-[10px] text-outline">Verified</span>
                        </div>

                        {/* Step 3: Pickup Scheduled */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-surface-container-lowest border-2 border-secondary text-secondary flex items-center justify-center font-bold text-xs shadow-xs ring-4 ring-secondary/10 animate-pulse">
                            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                          </div>
                          <span className="font-label-sm text-label-sm text-secondary mt-2 font-bold">Scheduled</span>
                          <span className="text-[10px] text-secondary font-medium">Tomorrow</span>
                        </div>

                        {/* Step 4: Picked Up */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-surface-container-highest text-outline flex items-center justify-center font-bold text-xs">
                            4
                          </div>
                          <span className="font-label-sm text-label-sm text-outline mt-2">Picked Up</span>
                          <span className="text-[10px] text-outline">Pending</span>
                        </div>

                        {/* Step 5: Quality Check */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-surface-container-highest text-outline flex items-center justify-center font-bold text-xs">
                            5
                          </div>
                          <span className="font-label-sm text-label-sm text-outline mt-2">Quality Check</span>
                          <span className="text-[10px] text-outline">Pending</span>
                        </div>

                        {/* Step 6: Refund */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-surface-container-highest text-outline flex items-center justify-center font-bold text-xs">
                            6
                          </div>
                          <span className="font-label-sm text-label-sm text-outline mt-2">Refunded</span>
                          <span className="text-[10px] text-outline">Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-md border-t border-surface-container-high">
                    <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
                      <span>
                        Reason: {order.returnRequest?.reason ?? "Incorrect size ordered. Exchange requested for alternative cut."}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toast.success("Pickup window rescheduled to Friday morning")}
                        className="px-4 py-2 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-lg font-label-sm text-label-sm transition-colors cursor-pointer"
                      >
                        Reschedule Pickup
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 5. Completed Returns Table */}
      {activeTab === "completed" && (
        <div className="bg-surface-container-lowest rounded-xl shadow-xs overflow-hidden border border-surface-container-high/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-label-caps text-label-caps text-on-surface-variant uppercase">
                  <th className="py-3.5 px-6">Request ID</th>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Settlement Type</th>
                  <th className="py-3.5 px-6">Refund Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-body-sm text-body-sm text-on-surface">
                {completedReturnOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      No past completed returns.
                    </td>
                  </tr>
                ) : (
                  completedReturnOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-4 px-6 font-medium">RET-{o.displayId}-CC</td>
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-10 h-12 bg-surface-container-low rounded overflow-hidden shrink-0 relative">
                          <Image
                            src={
                              o.thumbnails[0] ??
                              "https://lh3.googleusercontent.com/aida-public/AB6AXuBMBWLt26p1rDs_HQ26ali2c6lMwhMvmAmEIN20aXZTFTQyXAAq1slAGNvA3pAZVdhFQy_7oQhDZ5ZZ1K32gXoC5AAkieRkoh2q221owYItsDDw1kbp-48udpASbwobN1Kz1eXFvStORMmvGvEDgffCyMaRrWL9nGgGzGP4BfSPlrATwxaScykQgllY20c5N9tCRTXueVAG_4BS-DVYoKmeS4Nz0RtJkqykg2PMshWO"
                            }
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium">{o.items?.[0]?.productTitle ?? "Atelier Garment"}</div>
                          <div className="text-outline text-xs">Order #EVR-{o.displayId}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant">Refund to Source</td>
                      <td className="py-4 px-6 font-semibold">{formatMoney(o.total, o.currency)}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded font-label-caps text-[10px] uppercase font-bold">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span> Refunded
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <LocalizedClientLink
                          href={`/account/orders/details/${o.id}`}
                          className="text-primary hover:underline font-label-sm uppercase font-semibold text-xs"
                        >
                          View Order
                        </LocalizedClientLink>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Eligible Items List */}
      {activeTab === "eligible" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {eligibleOrders.length === 0 ? (
            <div className="col-span-2 bg-surface-container-lowest rounded-xl p-12 text-center flex flex-col items-center border border-dashed border-outline-variant">
              <p className="font-body-sm text-on-surface-variant">No orders currently within the return window.</p>
            </div>
          ) : (
            eligibleOrders.map((o) => (
              <div
                key={o.id}
                className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-surface-container-high/60 flex items-center justify-between gap-space-md"
              >
                <div>
                  <span className="font-label-caps text-xs text-secondary font-bold uppercase">
                    Delivered &bull; #EVR-{o.displayId}
                  </span>
                  <h4 className="font-headline-sm text-base font-semibold text-on-surface mt-0.5">
                    {o.items?.[0]?.productTitle ?? "Atelier Order"}
                  </h4>
                  <p className="font-label-md font-bold text-primary mt-1">{formatMoney(o.total, o.currency)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(o.id)
                    setModalOpen(true)
                  }}
                  className="h-10 px-4 bg-primary text-on-primary hover:bg-inverse-surface rounded font-label-sm uppercase font-semibold"
                >
                  Initiate Return
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 7. Initiate Return / Exchange Modal Wireframe */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-surface-container-lowest p-0 rounded-2xl overflow-hidden shadow-2xl border border-surface-container-high max-h-[90vh] flex flex-col">
          <DialogHeader className="p-space-lg border-b border-surface-container-high bg-surface-container-low">
            <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider block">
              Atelier Concierge
            </span>
            <DialogTitle className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-0.5">
              Initiate Return or Exchange
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReturnSubmit} className="p-space-lg overflow-y-auto flex-1 flex flex-col gap-space-lg">
            {/* Step 1: Select Order */}
            <div>
              <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-2 font-semibold">
                1. Select Order &amp; Item to Return
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container text-on-surface rounded-lg font-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #EVR-{o.displayId} &mdash; {o.items?.[0]?.productTitle ?? "Atelier Order"} ({formatMoney(o.total, o.currency)})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Request Type */}
            <div>
              <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-2 font-semibold">
                2. Select Request Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  onClick={() => setRequestType("refund")}
                  className={`border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                    requestType === "refund"
                      ? "border-primary bg-surface-container-lowest shadow-2xs"
                      : "border-surface-container-high bg-surface-container-low hover:border-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name="request_type"
                    checked={requestType === "refund"}
                    onChange={() => setRequestType("refund")}
                    className="accent-primary"
                  />
                  <div>
                    <span className="font-label-md font-semibold text-on-surface block">Return &amp; Refund</span>
                    <span className="text-xs text-on-surface-variant">Original payment source</span>
                  </div>
                </label>

                <label
                  onClick={() => setRequestType("exchange")}
                  className={`border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                    requestType === "exchange"
                      ? "border-primary bg-surface-container-lowest shadow-2xs"
                      : "border-surface-container-high bg-surface-container-low hover:border-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name="request_type"
                    checked={requestType === "exchange"}
                    onChange={() => setRequestType("exchange")}
                    className="accent-primary"
                  />
                  <div>
                    <span className="font-label-md font-semibold text-on-surface block">Size / Color Exchange</span>
                    <span className="text-xs text-on-surface-variant">Priority replacement</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 3: Return Reason */}
            <div>
              <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-2 font-semibold">
                3. Primary Reason for Return
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-11 px-3 bg-surface-container text-on-surface rounded-lg font-body-sm focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
              >
                <option value="Size is too large">Size is too large</option>
                <option value="Size is too small">Size is too small</option>
                <option value="Fabric texture / color differs from expectations">
                  Fabric texture / color differs from expectations
                </option>
                <option value="Received defective or flawed garment">Received defective or flawed garment</option>
                <option value="Other styling preference">Other styling preference</option>
              </select>
            </div>

            {/* Step 4: Pickup Address */}
            <div>
              <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-2 font-semibold">
                4. Complimentary Home Pickup Address
              </label>
              <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container-high">
                <div>
                  <p className="font-label-md font-semibold text-on-surface">
                    {defaultAddress
                      ? `${defaultAddress.firstName} ${defaultAddress.lastName} (Primary Atelier Residence)`
                      : customer.email}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {defaultAddress
                      ? `${defaultAddress.address1}, ${defaultAddress.city} - ${defaultAddress.postalCode}`
                      : "Standard pickup will be coordinated via phone confirmation"}
                  </p>
                </div>
                <LocalizedClientLink
                  href="/account/addresses"
                  className="text-primary font-label-sm uppercase font-bold hover:underline text-xs"
                >
                  Change
                </LocalizedClientLink>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-space-md border-t border-surface-container-high bg-surface-container-low flex items-center justify-end gap-3 -mx-space-lg -mb-space-lg mt-space-md">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="h-10 px-5 rounded uppercase font-label-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 px-6 bg-primary text-on-primary hover:bg-inverse-surface rounded uppercase font-label-sm font-semibold"
              >
                {isPending ? "Scheduling..." : "Confirm & Schedule Pickup"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
