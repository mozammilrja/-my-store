"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Container } from "@/components/store/container"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { TruckIcon, PackageCheckIcon } from "lucide-react"
import { Icon } from "@/components/ui/icon"

export default function OrderTrackingPage() {
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "in"
  const router = useRouter()
  const [orderId, setOrderId] = useState("")
  const [email, setEmail] = useState("")
  const [searched, setSearched] = useState(false)

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId) return
    const cleanId = orderId.trim()
    if (cleanId.startsWith("order_")) {
      router.push(`/${countryCode}/order/${cleanId}/confirmed`)
    } else {
      setSearched(true)
    }
  }

  return (
    <Container className="py-12 md:py-20 max-w-4xl">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">
              Consignment &amp; Dispatch Status
            </span>
            <span className="w-8 h-px bg-outline-variant" />
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
              Everwear Logistics
            </span>
          </div>
          <h1 className="font-display-hero text-3xl sm:text-5xl font-light text-on-surface tracking-tight">
            Track Your Order
          </h1>
          <p className="font-body-lg text-body-md sm:text-body-lg text-on-surface-variant max-w-2xl mt-1">
            Enter your order reference number and associated email address to view real-time courier dispatch status, tracking checkpoints, and estimated delivery dates.
          </p>
        </div>

        {/* Tracking Card */}
        <div className="p-6 sm:p-10 rounded-xl bg-surface-container-lowest border border-border/60 shadow-sm flex flex-col gap-6">
          <form onSubmit={handleTrack} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="orderId" className="font-label-sm text-xs uppercase tracking-wider text-on-surface font-semibold">
                Order ID / Tracking Number
              </label>
              <input
                id="orderId"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. order_01HQ..."
                required
                className="h-12 px-4 rounded border border-border bg-surface-container-low font-body-md text-sm text-on-surface placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="font-label-sm text-xs uppercase tracking-wider text-on-surface font-semibold">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                className="h-12 px-4 rounded border border-border bg-surface-container-low font-body-md text-sm text-on-surface placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <TruckIcon className="size-4 shrink-0" aria-hidden />
                <span>Track Consignment</span>
              </button>
            </div>
          </form>

          {searched && (
            <div className="mt-4 p-5 rounded-lg bg-surface-container-low border border-border/80 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary font-semibold font-label-sm">
                <PackageCheckIcon className="size-5 shrink-0" aria-hidden />
                <span>Status for #{orderId}: Prepared for Dispatch</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Your order is currently undergoing hand inspection and bespoke atelier packaging. Estimated delivery within 2–4 business days.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                <div>
                  <span className="font-label-caps text-[10px] uppercase text-muted-foreground block">Carrier</span>
                  <span className="font-body-sm text-sm font-medium text-on-surface">BlueDart Express Air</span>
                </div>
                <div>
                  <span className="font-label-caps text-[10px] uppercase text-muted-foreground block">Last Checkpoint</span>
                  <span className="font-body-sm text-sm font-medium text-on-surface">Central Fulfillment Hub</span>
                </div>
                <div>
                  <span className="font-label-caps text-[10px] uppercase text-muted-foreground block">Service Guarantee</span>
                  <span className="font-body-sm text-sm font-medium text-on-surface">OTP-verified delivery</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Helpful links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <LocalizedClientLink
            href="/shipping"
            className="p-4 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-1 border border-border/40"
          >
            <Icon name="schedule" size={22} className="text-primary" />
            <span className="font-label-sm font-semibold text-on-surface mt-1">Shipping &amp; Transit Times</span>
            <span className="font-body-sm text-xs text-on-surface-variant">Review metro &amp; standard shipping delivery windows.</span>
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/returns"
            className="p-4 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-1 border border-border/40"
          >
            <Icon name="assignment_return" size={22} className="text-primary" />
            <span className="font-label-sm font-semibold text-on-surface mt-1">Returns &amp; Exchanges</span>
            <span className="font-body-sm text-xs text-on-surface-variant">Initiate a 14-day doorstep exchange or return.</span>
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/contact"
            className="p-4 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-1 border border-border/40"
          >
            <Icon name="support_agent" size={22} className="text-primary" />
            <span className="font-label-sm font-semibold text-on-surface mt-1">Live Concierge Desk</span>
            <span className="font-body-sm text-xs text-on-surface-variant">Connect directly with our dedicated customer team.</span>
          </LocalizedClientLink>
        </div>
      </div>
    </Container>
  )
}
